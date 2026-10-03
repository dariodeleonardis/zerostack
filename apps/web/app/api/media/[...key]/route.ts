import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { prisma } from "@zerostack/database";
import { KEY_PATTERN, localFilePath } from "../../../../lib/storage";

export const dynamic = "force-dynamic";

/**
 * File caricati sul disco del server (STORAGE_DRIVER=local). Con S3 gli URL puntano direttamente
 * allo storage e questa route non serve. Supporta Range: i lettori podcast saltano avanti e indietro.
 */
export async function GET(req: Request, { params }: { params: { key: string[] } }) {
  const key = params.key.join("/");
  if (!KEY_PATTERN.test(key)) return new Response("Non trovato", { status: 404 });

  const media = await prisma.media.findUnique({ where: { key }, select: { contentType: true } });
  if (!media) return new Response("Non trovato", { status: 404 });

  const file = localFilePath(key);
  let size: number;
  try {
    size = (await stat(file)).size;
  } catch {
    return new Response("Non trovato", { status: 404 });
  }

  const headers: Record<string, string> = {
    "content-type": media.contentType,
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    "content-disposition": "inline"
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    // "bytes=100-" dal byte 100 alla fine; "bytes=-500" gli ultimi 500 byte.
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) }
    });
  }

  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(stream, { status: 200, headers: { ...headers, "content-length": String(size) } });
}
