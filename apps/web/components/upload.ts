export interface UploadedMedia {
  id: string;
  url: string;
  kind: "image" | "audio";
  contentType: string;
  size: number;
}

/** Carica un file su /api/uploads. `kind` fa rifiutare al server i file del tipo sbagliato. */
export async function uploadFile(file: File, kind: "image" | "audio"): Promise<UploadedMedia> {
  const body = new FormData();
  body.set("file", file);
  body.set("kind", kind);
  const res = await fetch("/api/uploads", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Caricamento non riuscito");
  return data.media as UploadedMedia;
}

/** Durata di un audio letta dal browser, in secondi (0 se non si riesce). */
export function audioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    audio.src = url;
  });
}
