import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { getCurrentUser } from "../../../lib/auth";
import { allowAttempt } from "../../../lib/rate-limit";
import { detectType, formatMb, getStorage, mediaLimits, newKey } from "../../../lib/storage";

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

  const limits = mediaLimits();
  const largest = Math.max(limits.maxBytes.image, limits.maxBytes.audio);
  const tooBig = `File troppo grande: immagini fino a ${formatMb(limits.maxBytes.image)}, audio fino a ${formatMb(limits.maxBytes.audio)}`;
  // Prima di leggere il corpo: un file enorme non deve nemmeno entrare in memoria (il VPS ha 4 GB).
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > largest + 1024 * 1024) {
    return NextResponse.json({ error: tooBig }, { status: 413 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Scegli un file" }, { status: 400 });
  }
  if (file.size > largest) {
    return NextResponse.json({ error: tooBig }, { status: 413 });
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const type = detectType(data);
  if (!type) {
    return NextResponse.json({ error: "Formato non supportato: immagini JPG, PNG, GIF, WebP o audio MP3, M4A, OGG, WAV" }, { status: 415 });
  }
  if (data.length > limits.maxBytes[type.kind]) {
    const max = formatMb(limits.maxBytes[type.kind]);
    return NextResponse.json({ error: type.kind === "image" ? `Immagine troppo grande (massimo ${max})` : `Audio troppo grande (massimo ${max})` }, { status: 413 });
  }
  const wanted = form?.get("kind");
  if (typeof wanted === "string" && wanted && wanted !== type.kind) {
    return NextResponse.json({ error: wanted === "image" ? "Serve un'immagine" : "Serve un file audio" }, { status: 415 });
  }
  if (type.kind === "audio" && limits.audioQuotaBytes !== null) {
    const used = await prisma.media.aggregate({ where: { ownerId: user.id, kind: "audio" }, _sum: { size: true } });
    if ((used._sum.size ?? 0) + data.length > limits.audioQuotaBytes) {
      return NextResponse.json(
        { error: `Hai raggiunto lo spazio per l'audio (${formatMb(limits.audioQuotaBytes)} in tutto). Elimina qualche episodio o scrivici.` },
        { status: 413 }
      );
    }
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
