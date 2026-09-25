import { NextResponse } from "next/server";
import { transcribeAudio } from "../../../../lib/transcription";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { audioUrl, language = "it" } = body;

    const result = await transcribeAudio(audioUrl || "mock-audio.mp3", { language });

    return NextResponse.json({
      success: true,
      transcription: result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Errore durante la trascrizione" }, { status: 500 });
  }
}
