// Test end to end delle operazioni di produzione: controllo di salute, battito del worker,
// segnalazione degli errori (protocollo Sentry) e backup cifrati con copia su S3 e ripristino.
// Stesso ambiente di scripts/run-e2e.sh: il server web deve avere ERROR_REPORTING_DSN verso 127.0.0.1:12112.
import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";
import { startErrorCollector, startS3Mock } from "./lib/service-mocks.mjs";
import { findMail } from "./lib/test-auth.mjs";

const BASE = process.env.ZS_BASE_URL || "http://localhost:3000";
const MAIL_DIR = process.env.EMAIL_LOG_DIR;
const DSN_PORT = 12112;
const S3_PORT = 12113;
const run = Math.random().toString(36).slice(2, 8);
const prisma = new PrismaClient();
const exec = promisify(execFile);
const collector = await startErrorCollector(DSN_PORT);
const s3 = await startS3Mock(S3_PORT);
const work = await mkdtemp(path.join(os.tmpdir(), "zs-ops-"));

let passed = 0;
let failed = 0;
function assert(condition, name, details = "") {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.error(`  ❌ ${name} ${details}`);
  }
}

async function call(method, urlPath, { body, cookie } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}${urlPath}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, text, json, cookie: res.headers.get("set-cookie")?.split(";")[0] };
}

const waitFor = async (predicate, ms = 5000) => {
  for (let t = 0; t < ms; t += 100) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return predicate();
};

const tsx = (script, args, env) =>
  exec("npx", ["tsx", script, ...args], { env: { ...process.env, ...env }, cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }).then(
    (r) => ({ code: 0, out: r.stdout + r.stderr }),
    (e) => ({ code: e.code ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` })
  );

const backupEnv = {
  ERROR_REPORTING_DSN: `http://chiave-pubblica@127.0.0.1:${DSN_PORT}/7`,
  BACKUP_DIR: path.join(work, "backups"),
  UPLOAD_DIR: path.join(work, "uploads"),
  STORAGE_DRIVER: "local",
  BACKUP_PASSPHRASE: `passphrase-${run}`,
  BACKUP_S3_BUCKET: "backup-zs",
  BACKUP_S3_ENDPOINT: `http://127.0.0.1:${S3_PORT}`,
  BACKUP_S3_FORCE_PATH_STYLE: "true",
  BACKUP_S3_REGION: "eu-central-1",
  BACKUP_S3_ACCESS_KEY: "chiave",
  BACKUP_S3_SECRET_KEY: "segreto",
  ALERT_EMAIL: `allarmi-${run}@example.it`
};

try {
  console.log(`\n🧪 Operazioni end to end su ${BASE} (giro ${run})\n`);

  // ------------------------------------------------------------------ salute
  const live = await call("GET", "/api/health/live");
  assert(live.status === 200 && live.json?.status === "ok", "Healthcheck del container: sito e database rispondono");

  const worker = await tsx("apps/worker/src/index.ts", ["--once"], {});
  const beat = await prisma.systemStatus.findUnique({ where: { key: "worker" } });
  assert(worker.code === 0 && beat?.ok && Date.now() - beat.updatedAt.getTime() < 60_000, "Il worker registra il suo battito a ogni giro", worker.out.slice(-300));

  const healthy = await call("GET", "/api/health");
  assert(
    healthy.status === 200 && healthy.json?.status === "ok" && healthy.json.checks.database.state === "ok" && healthy.json.checks.redis.state === "ok" && healthy.json.checks.worker.state === "ok",
    "Controllo completo: database, Redis e worker a posto",
    healthy.text.slice(0, 300)
  );
  assert(!healthy.text.includes("detail"), "La risposta pubblica non mostra dettagli interni");

  await prisma.$executeRaw`UPDATE "SystemStatus" SET "updatedAt" = now() - interval '1 hour' WHERE key = 'worker'`;
  const stale = await call("GET", "/api/health");
  assert(stale.status === 503 && stale.json?.checks.worker.state === "fail" && stale.json.checks.worker.ageSeconds >= 3600, "Worker fermo da un'ora: il controllo risponde 503");
  await prisma.$executeRaw`UPDATE "SystemStatus" SET "updatedAt" = now() WHERE key = 'worker'`;

  // ------------------------------------------------------------------ segnalazione errori
  const adminCookie = (await call("POST", "/api/auth/register", { body: { name: "Admin ops", email: `admin-${run}@example.it`, handle: `admin-ops-${run}`, password: "password-molto-lunga" } })).cookie;
  await prisma.user.update({ where: { email: `admin-${run}@example.it` }, data: { role: "ADMIN" } });
  const panel = await call("GET", "/admin", { cookie: adminCookie });
  assert(panel.status === 200 && panel.text.includes("Stato del sistema") && panel.text.includes("Invia un errore di prova"), "Il pannello admin mostra lo stato del sistema");

  const trigger = await call("POST", "/api/admin/test-error", { cookie: adminCookie, body: {} });
  const arrived = await waitFor(() => collector.events.some((e) => e.event.exception?.values?.[0]?.value?.includes(`admin-${run}@example.it`)));
  const report = collector.events.find((e) => e.event.exception?.values?.[0]?.value?.includes(`admin-${run}@example.it`));
  assert(trigger.status === 200 && trigger.json?.configured === true && arrived, "L'errore di prova arriva al servizio di segnalazione", trigger.text.slice(0, 200));
  assert(
    report?.project === "7" && report.auth?.includes("sentry_key=chiave-pubblica") && report.event.tags?.service === "web" && report.event.exception.values[0].stacktrace.frames.length > 0,
    "Formato Sentry: progetto, chiave, servizio e stack"
  );
  const reader = await call("POST", "/api/auth/register", { body: { name: "Lettore ops", email: `lettore-${run}@example.it`, handle: `lettore-ops-${run}`, password: "password-molto-lunga" } });
  assert((await call("POST", "/api/admin/test-error", { cookie: reader.cookie, body: {} })).status === 404, "Solo gli amministratori possono mandare l'errore di prova");

  // ------------------------------------------------------------------ backup
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.join(backupEnv.UPLOAD_DIR, "image", "2026", "09"), { recursive: true });
  await writeFile(path.join(backupEnv.UPLOAD_DIR, "image", "2026", "09", `file-${run}.txt`), `contenuto ${run}`);

  // Primo giro rotto apposta: credenziali S3 mancanti.
  const broken = await tsx("apps/worker/src/backup.ts", [], { ...backupEnv, BACKUP_S3_ACCESS_KEY: "" });
  const brokenStatus = await prisma.systemStatus.findUnique({ where: { key: "backup" } });
  assert(broken.code !== 0 && brokenStatus?.ok === false && brokenStatus.detail?.includes("BACKUP_S3_ACCESS_KEY"), "Backup non riuscito: esce con errore e lo registra");
  const alertMail = await findMail(MAIL_DIR, backupEnv.ALERT_EMAIL, /Backup/);
  assert(Boolean(alertMail), "Arriva l'email di allarme all'indirizzo ALERT_EMAIL");
  assert(await waitFor(() => collector.events.some((e) => e.event.tags?.source === "backup")), "Il fallimento del backup arriva anche al servizio di segnalazione");
  assert((await call("GET", "/api/health")).json?.checks.backup.state === "fail", "Il controllo di salute segnala il backup fallito");

  const ok = await tsx("apps/worker/src/backup.ts", [], backupEnv);
  const files = (await readdir(backupEnv.BACKUP_DIR)).filter((f) => !f.endsWith(".partial")).sort();
  // L'ultimo di ciascun tipo: il giro rotto qui sopra ha già lasciato un dump locale.
  const dbFile = files.filter((f) => /^zerostack-db-.*\.dump\.enc$/.test(f)).pop();
  const upFile = files.filter((f) => /^zerostack-uploads-.*\.tar\.gz\.enc$/.test(f)).pop();
  assert(ok.code === 0 && dbFile && upFile, "Backup di database e file caricati, cifrati", ok.out.slice(-400));
  const remote = s3.buckets.get("backup-zs");
  assert(remote?.has(`zerostack/${dbFile}`) && remote.has(`zerostack/${upFile}`), "Copia su S3 esterno");
  const status = await prisma.systemStatus.findUnique({ where: { key: "backup" } });
  assert(status?.ok && status.detail?.includes("s3://backup-zs/zerostack/"), "Stato del backup aggiornato");
  const health = await call("GET", "/api/health");
  assert(health.json?.checks.backup.state === "ok", "Il controllo di salute vede il backup riuscito");

  // Ripristino: si scarica la copia remota, si decifra, si carica in un database nuovo.
  const remoteDump = path.join(work, "remoto.dump.enc");
  await writeFile(remoteDump, remote.get(`zerostack/${dbFile}`).body);
  const wrong = await tsx("apps/worker/src/backup.ts", ["decrypt", remoteDump, path.join(work, "x.dump")], { BACKUP_PASSPHRASE: "sbagliata" });
  assert(wrong.code !== 0 && wrong.out.includes("decifratura non riuscita"), "Con la passphrase sbagliata non si decifra");
  const plain = path.join(work, "db.dump");
  const dec = await tsx("apps/worker/src/backup.ts", ["decrypt", remoteDump, plain], { BACKUP_PASSPHRASE: backupEnv.BACKUP_PASSPHRASE });
  const base = new URL(process.env.DATABASE_URL);
  base.search = "";
  const restoreDb = `zs_restore_${run}`;
  await prisma.$executeRawUnsafe(`CREATE DATABASE ${restoreDb}`);
  const target = new URL(base);
  target.pathname = `/${restoreDb}`;
  const restored = await exec("pg_restore", ["--no-owner", "--no-acl", "-d", target.toString(), plain]).then(
    () => true,
    (e) => (console.error(e.stderr), false)
  );
  const count = restored ? await exec("psql", ["-tA", target.toString(), "-c", `SELECT count(*) FROM "User" WHERE email = 'admin-${run}@example.it'`]) : { stdout: "" };
  assert(dec.code === 0 && restored && count.stdout.trim() === "1", "Ripristino: il database decifrato contiene i dati di oggi", dec.out.slice(-200));
  await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${restoreDb}`);

  const tgz = path.join(work, "uploads.tgz");
  await tsx("apps/worker/src/backup.ts", ["decrypt", path.join(backupEnv.BACKUP_DIR, upFile), tgz], { BACKUP_PASSPHRASE: backupEnv.BACKUP_PASSPHRASE });
  const listing = await exec("tar", ["-tzf", tgz]);
  assert(listing.stdout.includes(`image/2026/09/file-${run}.txt`), "Ripristino: l'archivio dei file contiene i caricamenti");
} catch (err) {
  failed++;
  console.error("  ❌ Errore inatteso:", err);
} finally {
  await collector.close();
  await s3.close();
  await prisma.$disconnect();
  await rm(work, { recursive: true, force: true });
}

console.log(`\n📊 ${passed}/${passed + failed} superati\n`);
process.exit(failed === 0 ? 0 : 1);
