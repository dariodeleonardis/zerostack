import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { getCurrentUser } from "../../../lib/auth";
import { allowAttempt } from "../../../lib/rate-limit";
import { detectType, getStorage, MAX_BYTES, newKey } from "../../../lib/storage";

/** Caricamento di un'immagine o di un audio (multipart, campo "file"). Risponde con l'URL pubblico. */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  try {
    if (origin && new URL(origin).host !== req.headers.get("host")) throw new Error();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accedi per caricare file" }, { status: 401 });
  }
  if (!(await allowAttempt(`upload:${user.id}`, 60, 60 * 60))) {
    return NextResponse.json({ error: "Troppi caricamenti in un'ora. Riprova più tardi." }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Scegli un file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES.audio) {
    return NextResponse.json({ error: "File troppo grande" }, { status: 413 });
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const type = detectType(data);
  if (!type) {
    return NextResponse.json({ error: "Formato non supportato: immagini JPG, PNG, GIF, WebP o audio MP3, M4A, OGG, WAV" }, { status: 415 });
  }
  if (data.length > MAX_BYTES[type.kind]) {
    return NextResponse.json({ error: type.kind === "image" ? "Immagine troppo grande (massimo 10 MB)" : "Audio troppo grande (massimo 150 MB)" }, { status: 413 });
  }
  const wanted = form?.get("kind");
  if (typeof wanted === "string" && wanted && wanted !== type.kind) {
    return NextResponse.json({ error: wanted === "image" ? "Serve un'immagine" : "Serve un file audio" }, { status: 415 });
  }

  const key = newKey(type);
  let url: string;
  try {
    url = await getStorage().put(key, data, type.contentType);
  } catch (err) {
    console.error("[uploads]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Salvataggio del file non riuscito" }, { status: 502 });
  }
  const media = await prisma.media.create({
    data: { ownerId: user.id, key, url, contentType: type.contentType, size: data.length, kind: type.kind },
    select: { id: true, url: true, kind: true, contentType: true, size: true }
  });
  return NextResponse.json({ media }, { status: 201 });
}
