import { NextResponse } from "next/server";
import { platformUrlFromEnv } from "@zerostack/shared";
import { OAUTH_COOKIE, OAUTH_COOKIE_PATH, isGoogleConfigured, startAuthorization } from "../../../../../lib/google-oauth";
import { safeNext } from "../../../../../lib/safe-next";

export const dynamic = "force-dynamic";

/** Primo passo dell'accesso con Google: si prepara lo stato e si manda il browser da Google. */
export async function GET(req: Request) {
  const platform = platformUrlFromEnv();
  if (!isGoogleConfigured()) return NextResponse.redirect(`${platform}/login?errore=google-spento`);
  const next = safeNext(new URL(req.url).searchParams.get("next"), "");
  const { url, cookie } = startAuthorization(next);
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: OAUTH_COOKIE_PATH,
    maxAge: 600
  });
  return res;
}
