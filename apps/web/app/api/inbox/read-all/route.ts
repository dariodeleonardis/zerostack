import { NextResponse } from "next/server";
import { getCurrentUser, isSameOriginJson } from "../../../../lib/auth";
import { markAllRead } from "../../../../lib/inbox";

/** "Segna tutto come letto" della Posta. */
export async function POST(req: Request) {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi prima" }, { status: 401 });
  const marked = await markAllRead(user);
  return NextResponse.json({ ok: true, marked });
}
