import { NextResponse } from "next/server";
import { destroySession, isSameOriginJson } from "../../../../lib/auth";

export async function POST(req: Request) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
