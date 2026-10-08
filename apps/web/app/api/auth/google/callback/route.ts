import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { platformUrlFromEnv } from "@zerostack/shared";
import { clientIp, createSession } from "../../../../../lib/auth";
import { allowAttempt } from "../../../../../lib/rate-limit";
import { getCourtesy } from "../../../../../lib/courtesy";
import {
  OAUTH_COOKIE,
  OAUTH_COOKIE_PATH,
  RegistrationClosedError,
  UnverifiedGoogleEmailError,
  fetchGoogleProfile,
  isGoogleConfigured,
  readOAuthCookie,
  sameState,
  userFromGoogle
} from "../../../../../lib/google-oauth";

export const dynamic = "force-dynamic";

/**
 * Ritorno da Google: si controlla lo stato (contro la falsificazione della richiesta), si scambia
 * il codice con il profilo, si trova o si crea l'utente e si apre la sessione. Ogni errore torna
 * alla pagina di accesso con un motivo leggibile, mai con il dettaglio tecnico.
 */
export async function GET(req: Request) {
  const platform = platformUrlFromEnv();
  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${platform}/login?errore=${reason}`);
    res.cookies.set(OAUTH_COOKIE, "", { path: OAUTH_COOKIE_PATH, maxAge: 0 });
    return res;
  };
  if (!isGoogleConfigured()) return fail("google-spento");
  if (!(await allowAttempt(`google-login:${clientIp(req)}`, 30, 15 * 60))) return fail("troppi-tentativi");

  const params = new URL(req.url).searchParams;
  if (params.get("error")) return fail("google-annullato");
  const saved = readOAuthCookie(cookies().get(OAUTH_COOKIE)?.value);
  const state = params.get("state") ?? "";
  const code = params.get("code") ?? "";
  if (!saved || !state || !code || !sameState(saved.state, state)) return fail("google-scaduto");

  try {
    const profile = await fetchGoogleProfile(code, saved.verifier);
    // Con la pagina di cortesia accesa le iscrizioni sono chiuse anche da qui, come da /register.
    const user = await userFromGoogle(profile, !(await getCourtesy()).enabled);
    if (user.suspendedAt) return fail("sospeso");
    await createSession(user.id);
    const target = saved.next || (user.created ? "/studio/publications/new" : "/studio");
    const res = NextResponse.redirect(`${platform}${target}`);
    res.cookies.set(OAUTH_COOKIE, "", { path: OAUTH_COOKIE_PATH, maxAge: 0 });
    return res;
  } catch (err) {
    if (err instanceof UnverifiedGoogleEmailError) return fail("google-email-non-verificata");
    if (err instanceof RegistrationClosedError) return fail("iscrizioni-chiuse");
    console.error("[google] accesso non riuscito:", err instanceof Error ? err.message : err);
    return fail("google-errore");
  }
}
