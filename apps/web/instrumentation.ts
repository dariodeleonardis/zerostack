/** Eseguito da Next all'avvio del server: attiva la segnalazione degli errori (ERROR_REPORTING_DSN). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { installErrorReporting } = await import("@zerostack/shared/src/monitoring");
  installErrorReporting("web");
}
