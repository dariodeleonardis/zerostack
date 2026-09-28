import { prisma } from "@zerostack/database";
import { createTransportFromEnv } from "@zerostack/email";
import { defaultOptions, runOnce } from "./campaigns";

/**
 * Worker di ZeroStack: ogni pochi secondi pubblica i post programmati arrivati alla loro ora
 * e spedisce le campagne in attesa. La coda è il database stesso (EmailCampaign/EmailDelivery):
 * niente da perdere se Redis si riavvia, e si riparte da dove ci si era fermati.
 *   npm run start --workspace=@zerostack/worker        (continuo)
 *   npm run once --workspace=@zerostack/worker         (un giro e basta: test e cron)
 */
const once = process.argv.includes("--once");
const pollMs = Number(process.env.WORKER_POLL_SECONDS || 5) * 1000;

async function main() {
  const transport = createTransportFromEnv();
  const options = defaultOptions();
  options.log(`avviato (provider email: ${transport.name}${once ? ", un solo giro" : `, controllo ogni ${pollMs / 1000}s`})`);

  let stopping = false;
  const stop = () => {
    stopping = true;
    options.log("arresto richiesto: chiudo il giro in corso");
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);

  do {
    try {
      await runOnce(prisma, transport, options);
    } catch (err) {
      // Un errore (per esempio il database che si riavvia) non deve fermare il worker.
      console.error("[worker] giro non riuscito:", err instanceof Error ? err.message : err);
      if (once) process.exitCode = 1;
    }
    if (!once && !stopping) await options.sleep(pollMs);
  } while (!once && !stopping);

  await prisma.$disconnect();
}

main();
