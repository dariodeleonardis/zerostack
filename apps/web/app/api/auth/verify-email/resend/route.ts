import { NextResponse } from "next/server";
import { getCurrentUser, isSameOriginJson } from "../../../../../lib/auth";
import { allowAttempt } from "../../../../../lib/rate-limit";
import { sendVerificationEmail } from "../../../../../lib/email-verification";

export async function POST(req: Request) {
  if (!isSameOriginJson(req)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Accedi prima" }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });
  if (!(await allowAttempt(`verify-resend:${user.id}`, 3, 60 * 60))) {
    return NextResponse.json({ error: "Hai già chiesto diverse email: controlla anche lo spam, o riprova tra un'ora." }, { status: 429 });
  }
  try {
    await sendVerificationEmail(user);
  } catch (err) {
    console.error("[verify-email/resend]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invio non riuscito. Riprova tra poco." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
