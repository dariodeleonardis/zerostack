import { spawn } from "child_process";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { createReadStream, createWriteStream, existsSync } from "fs";
import { mkdir, open, readdir, rename, rm, stat } from "fs/promises";
import path from "path";
import { PassThrough, Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { prisma } from "@zerostack/database";
import { createTransportFromEnv, platformSender } from "@zerostack/email";
import { captureException, installErrorReporting } from "@zerostack/shared/src/monitoring";
import { envNumber } from "@zerostack/shared/src/env";

/**
 * Backup di ZeroStack: database (pg_dump) e file caricati (se stanno sul disco del server).
 *   tsx src/backup.ts                      un backup adesso
 *   tsx src/backup.ts --loop               servizio: un backup ogni BACKUP_INTERVAL_HOURS (24)
 *   tsx src/backup.ts decrypt <in> <out>   decifra un file per il ripristino
 *
 * I file vanno in BACKUP_DIR e, se c'è BACKUP_S3_BUCKET, anche su uno storage S3 esterno
 * (un backup sullo stesso server non protegge da un server perso). Con BACKUP_PASSPHRASE
 * sono cifrati (AES-256-GCM): senza passphrase non si ripristinano, va conservata altrove.
 */

const MAGIC = Buffer.from("ZSBK1");
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

const log = (msg: string) => console.log(`[backup] ${new Date().toISOString()} ${msg}`);

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

/** Cifra un flusso: MAGIC | salt | iv | dati | tag. */
function encryptStream(passphrase: string): Transform {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv);
  let headerSent = false;
  return new Transform({
    transform(chunk, _enc, done) {
      if (!headerSent) {
        this.push(Buffer.concat([MAGIC, salt, iv]));
        headerSent = true;
      }
      done(null, cipher.update(chunk));
    },
    flush(done) {
      if (!headerSent) this.push(Buffer.concat([MAGIC, salt, iv]));
      this.push(cipher.final());
      done(null, cipher.getAuthTag());
    }
  });
}

/** Decifra un file creato da encryptStream. Se il file è stato alterato o la passphrase è sbagliata, fallisce. */
export async function decryptFile(input: string, output: string, passphrase: string): Promise<void> {
  const size = (await stat(input)).size;
  const fh = await open(input, "r");
  const head = Buffer.alloc(MAGIC.length + SALT_LEN + IV_LEN);
  const tag = Buffer.alloc(TAG_LEN);
  try {
    await fh.read(head, 0, head.length, 0);
    await fh.read(tag, 0, TAG_LEN, size - TAG_LEN);
  } finally {
    await fh.close();
  }
  if (!head.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("non è un backup cifrato di ZeroStack");
  const salt = head.subarray(MAGIC.length, MAGIC.length + SALT_LEN);
  const iv = head.subarray(MAGIC.length + SALT_LEN);
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv);
  decipher.setAuthTag(tag);
  const partial = `${output}.partial`;
  try {
    await pipeline(createReadStream(input, { start: head.length, end: size - TAG_LEN - 1 }), decipher, createWriteStream(partial));
  } catch (err) {
    await rm(partial, { force: true });
    throw new Error(`decifratura non riuscita (passphrase sbagliata o file danneggiato): ${err instanceof Error ? err.message : err}`);
  }
  await rename(partial, output);
}

/** Avvia un comando e restituisce il suo stdout come flusso; se il comando fallisce, il flusso va in errore. */
function commandStream(cmd: string, args: string[], env: NodeJS.ProcessEnv = process.env): Readable {
  const child = spawn(cmd, args, { env, stdio: ["ignore", "pipe", "pipe"] });
  const out = new PassThrough();
  let stderr = "";
  child.stderr.on("data", (d) => (stderr = (stderr + d.toString()).slice(-2000)));
  child.stdout.pipe(out, { end: false });
  child.on("error", (err) => out.destroy(err));
  child.on("close", (code) => {
    if (code === 0) out.end();
    else out.destroy(new Error(`${cmd} è uscito con codice ${code}: ${stderr.trim().slice(-500)}`));
  });
  return out;
}

/** pg_dump non accetta i parametri di Prisma nella URL (?schema=public, ?connection_limit=...). */
export function pgUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.search = "";
  return url.toString();
}

function s3Target(): { client: S3Client; bucket: string; prefix: string } | null {
  const bucket = process.env.BACKUP_S3_BUCKET;
  if (!bucket) return null;
  const accessKeyId = process.env.BACKUP_S3_ACCESS_KEY;
  const secretAccessKey = process.env.BACKUP_S3_SECRET_KEY;
  if (!accessKeyId || !secretAccessKey) throw new Error("BACKUP_S3_BUCKET richiede BACKUP_S3_ACCESS_KEY e BACKUP_S3_SECRET_KEY");
  return {
    client: new S3Client({
      region: process.env.BACKUP_S3_REGION || "auto",
      endpoint: process.env.BACKUP_S3_ENDPOINT || undefined,
      forcePathStyle: process.env.BACKUP_S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId, secretAccessKey }
    }),
    bucket,
    prefix: (process.env.BACKUP_S3_PREFIX ?? "zerostack/").replace(/^\/+/, "")
  };
}

const human = (bytes: number) =>
  bytes > 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : bytes > 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

interface Written {
  file: string;
  size: number;
}

async function writeArtifact(source: Readable, dir: string, name: string): Promise<Written> {
  const passphrase = process.env.BACKUP_PASSPHRASE;
  const file = path.join(dir, passphrase ? `${name}.enc` : name);
  const partial = `${file}.partial`;
  try {
    if (passphrase) await pipeline(source, encryptStream(passphrase), createWriteStream(partial));
    else await pipeline(source, createWriteStream(partial));
  } catch (err) {
    await rm(partial, { force: true });
    throw err;
  }
  await rename(partial, file);
  return { file, size: (await stat(file)).size };
}

const BACKUP_NAME = /^zerostack-(db|uploads)-(\d{8}T\d{6}Z)\./;

async function pruneLocal(dir: string, keepDays: number): Promise<number> {
  const cutoff = Date.now() - keepDays * 86_400_000;
  let removed = 0;
  for (const name of await readdir(dir)) {
    if (!BACKUP_NAME.test(name) && !name.endsWith(".partial")) continue;
    const full = path.join(dir, name);
    if ((await stat(full)).mtimeMs < cutoff) {
      await rm(full, { force: true });
      removed++;
    }
  }
  return removed;
}

async function pruneS3(target: NonNullable<ReturnType<typeof s3Target>>, keepDays: number): Promise<number> {
  const cutoff = Date.now() - keepDays * 86_400_000;
  let removed = 0;
  let token: string | undefined;
  do {
    const page = await target.client.send(new ListObjectsV2Command({ Bucket: target.bucket, Prefix: target.prefix, ContinuationToken: token }));
    const old = (page.Contents ?? []).filter((o) => o.Key && BACKUP_NAME.test(path.basename(o.Key)) && (o.LastModified?.getTime() ?? Infinity) < cutoff);
    if (old.length > 0) {
      await target.client.send(new DeleteObjectsCommand({ Bucket: target.bucket, Delete: { Objects: old.map((o) => ({ Key: o.Key! })) } }));
      removed += old.length;
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return removed;
}

export async function runBackup(now = new Date()): Promise<string> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("manca DATABASE_URL");
  const dir = path.resolve(process.env.BACKUP_DIR || "./backups");
  await mkdir(dir, { recursive: true });
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const written: Written[] = [];

  // Formato "custom" di pg_dump: compresso, e pg_restore può ripristinare anche solo alcune tabelle.
  written.push(await writeArtifact(commandStream("pg_dump", ["--format=custom", "--no-owner", "--no-acl", pgUrl(databaseUrl)]), dir, `zerostack-db-${stamp}.dump`));

  const uploadDir = process.env.UPLOAD_DIR;
  const localFiles = (process.env.STORAGE_DRIVER || "local").toLowerCase() === "local";
  if (localFiles && uploadDir && existsSync(uploadDir)) {
    written.push(await writeArtifact(commandStream("tar", ["-czf", "-", "-C", uploadDir, "."]), dir, `zerostack-uploads-${stamp}.tar.gz`));
  }

  const keepDays = envNumber(process.env, "BACKUP_KEEP_DAYS", 14, { min: 1, max: 3650 });
  const target = s3Target();
  let offsite = "";
  if (target) {
    for (const w of written) {
      await new Upload({
        client: target.client,
        params: { Bucket: target.bucket, Key: `${target.prefix}${path.basename(w.file)}`, Body: createReadStream(w.file) }
      }).done();
    }
    const removed = await pruneS3(target, keepDays);
    offsite = ` · copiati su s3://${target.bucket}/${target.prefix}${removed ? ` (${removed} vecchi rimossi)` : ""}`;
  }
  await pruneLocal(dir, keepDays);

  const summary = written.map((w) => `${path.basename(w.file)} ${human(w.size)}`).join(", ") + offsite;
  if (!process.env.BACKUP_PASSPHRASE) log("attenzione: BACKUP_PASSPHRASE non impostata, i file non sono cifrati");
  return summary;
}

async function recordStatus(ok: boolean, detail: string) {
  await prisma.systemStatus.upsert({ where: { key: "backup" }, create: { key: "backup", ok, detail }, update: { ok, detail } });
}

async function alert(err: unknown) {
  const to = process.env.ALERT_EMAIL;
  if (!to) return;
  const message = err instanceof Error ? err.message : String(err);
  try {
    await createTransportFromEnv().send({
      from: platformSender("ZeroStack"),
      to,
      subject: "Backup di ZeroStack non riuscito",
      text: `Il backup automatico non è riuscito.\n\n${message}\n\nIl prossimo tentativo parte tra poco; controlla i log del servizio di backup.`,
      html: `<p>Il backup automatico non è riuscito.</p><pre>${message.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!)}</pre><p>Il prossimo tentativo parte tra poco; controlla i log del servizio di backup.</p>`
    });
  } catch (mailErr) {
    log(`avviso via email non riuscito: ${mailErr instanceof Error ? mailErr.message : mailErr}`);
  }
}

async function backupOnce(): Promise<boolean> {
  try {
    const summary = await runBackup();
    await recordStatus(true, summary);
    log(`completato: ${summary}`);
    return true;
  } catch (err) {
    log(`NON riuscito: ${err instanceof Error ? err.message : err}`);
    await recordStatus(false, (err instanceof Error ? err.message : String(err)).slice(0, 300)).catch(() => undefined);
    await captureException(err, { tags: { source: "backup" } });
    await alert(err);
    return false;
  }
}

async function loop() {
  const intervalMs = envNumber(process.env, "BACKUP_INTERVAL_HOURS", 24, { min: 1, max: 24 * 31 }) * 3_600_000;
  const retryMs = 30 * 60_000;
  let stopping = false;
  process.on("SIGTERM", () => (stopping = true));
  process.on("SIGINT", () => (stopping = true));
  log(`servizio avviato: un backup ogni ${intervalMs / 3_600_000} ore`);
  while (!stopping) {
    // Si parte dall'ultimo backup riuscito registrato: un riavvio del container non ne fa uno in più.
    const last = await prisma.systemStatus.findUnique({ where: { key: "backup" } }).catch(() => null);
    const due = !last || !last.ok ? true : Date.now() - last.updatedAt.getTime() >= intervalMs;
    let waitMs = 10 * 60_000;
    if (due) {
      const ok = await backupOnce();
      if (!ok) waitMs = retryMs;
    }
    for (let slept = 0; slept < waitMs && !stopping; slept += 5000) await new Promise((r) => setTimeout(r, 5000));
  }
}

async function main() {
  installErrorReporting("backup");
  const [command, ...args] = process.argv.slice(2);
  if (command === "decrypt") {
    const passphrase = process.env.BACKUP_PASSPHRASE;
    if (!passphrase || args.length !== 2) {
      console.error("uso: BACKUP_PASSPHRASE=... tsx src/backup.ts decrypt <file.enc> <file-in-chiaro>");
      process.exit(2);
    }
    await decryptFile(args[0], args[1], passphrase);
    log(`decifrato in ${args[1]}`);
  } else if (command === "--loop") {
    await loop();
  } else {
    if (!(await backupOnce())) process.exitCode = 1;
  }
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[backup] ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });
}
