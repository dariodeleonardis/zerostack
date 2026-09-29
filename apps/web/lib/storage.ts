import { mkdir, rm, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { platformUrlFromEnv } from "@zerostack/shared";

export type MediaKind = "image" | "audio";

export interface DetectedType {
  kind: MediaKind;
  ext: string;
  contentType: string;
}

export const MAX_BYTES: Record<MediaKind, number> = {
  image: 10 * 1024 * 1024,
  audio: 150 * 1024 * 1024
};

const ascii = (buf: Uint8Array, start: number, end: number) => String.fromCharCode.apply(null, Array.from(buf.subarray(start, end)));

/**
 * Tipo del file dai primi byte, non dal nome né dal tipo dichiarato dal browser (entrambi falsificabili).
 * Niente SVG: può contenere script ed eseguirsi sull'origine della piattaforma.
 */
export function detectType(buf: Uint8Array): DetectedType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { kind: "image", ext: "jpg", contentType: "image/jpeg" };
  if (buf[0] === 0x89 && ascii(buf, 1, 4) === "PNG") return { kind: "image", ext: "png", contentType: "image/png" };
  if (ascii(buf, 0, 4) === "GIF8") return { kind: "image", ext: "gif", contentType: "image/gif" };
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 12) === "WEBP") return { kind: "image", ext: "webp", contentType: "image/webp" };
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 12) === "WAVE") return { kind: "audio", ext: "wav", contentType: "audio/wav" };
  if (ascii(buf, 0, 4) === "OggS") return { kind: "audio", ext: "ogg", contentType: "audio/ogg" };
  if (ascii(buf, 0, 3) === "ID3" || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return { kind: "audio", ext: "mp3", contentType: "audio/mpeg" };
  // Contenitore MP4 (ftyp): solo le varianti audio, niente video.
  if (ascii(buf, 4, 8) === "ftyp" && /^(M4A |M4B |mp42|isom|dash)$/.test(ascii(buf, 8, 12))) {
    return { kind: "audio", ext: "m4a", contentType: "audio/mp4" };
  }
  return null;
}

// Chiave dei file: tipo/anno/mese/uuid.estensione. Serve anche a bloccare i percorsi inventati (../).
export const KEY_PATTERN = /^(image|audio)\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|png|gif|webp|mp3|m4a|ogg|wav)$/;

export function newKey(type: DetectedType, now = new Date()): string {
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${type.kind}/${now.getUTCFullYear()}/${month}/${randomUUID()}.${type.ext}`;
}

export interface Storage {
  readonly driver: "local" | "s3";
  put(key: string, data: Uint8Array, contentType: string): Promise<string>;
  remove(key: string): Promise<void>;
}

/** Disco del server: i file si servono da /api/media/<chiave> (vedi la route). */
export function localDir(): string {
  return path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
}

function localStorage(): Storage {
  const dir = localDir();
  return {
    driver: "local",
    async put(key, data) {
      const file = path.join(dir, key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, data);
      return `${platformUrlFromEnv()}/api/media/${key}`;
    },
    async remove(key) {
      await rm(path.join(dir, key), { force: true });
    }
  };
}

export function localFilePath(key: string): string {
  return path.join(localDir(), key);
}

/** Qualsiasi storage compatibile S3: Cloudflare R2, Scaleway, AWS, MinIO. */
function s3Storage(): Storage {
  const bucket = process.env.S3_BUCKET;
  const publicUrl = process.env.S3_PUBLIC_URL?.replace(/\/+$/, "");
  if (!bucket || !publicUrl || !process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
    throw new Error("STORAGE_DRIVER=s3 richiede S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY e S3_PUBLIC_URL");
  }
  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY }
  });
  return {
    driver: "s3",
    async put(key, data, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" })
      );
      return `${publicUrl}/${key}`;
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    }
  };
}

let storage: Storage | null = null;

/** STORAGE_DRIVER=local (default, disco del server) oppure s3. */
export function getStorage(): Storage {
  storage ??= (process.env.STORAGE_DRIVER || "local").toLowerCase() === "s3" ? s3Storage() : localStorage();
  return storage;
}
