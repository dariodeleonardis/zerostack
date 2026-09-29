// Aiuti per i test end to end: conferma dell'email di un account appena registrato,
// seguendo il link dell'email scritta su file dal trasporto "log" (EMAIL_LOG_DIR).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export async function findMail(mailDir, address, subjectPattern, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const files = await readdir(mailDir).catch(() => []);
    for (const f of files.sort()) {
      const m = JSON.parse(await readFile(path.join(mailDir, f), "utf8"));
      if (m.to === address && subjectPattern.test(m.subject)) return m;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

/** Segue il link di conferma dell'indirizzo; restituisce lo status HTTP della conferma (200 se riuscita). */
export async function confirmEmail(baseUrl, mailDir, address) {
  const mail = await findMail(mailDir, address, /^Conferma il tuo indirizzo email$/);
  const link = mail?.text.match(/https?:\/\/\S+\/api\/auth\/verify-email\?token=[\w-]+/)?.[0];
  if (!link) throw new Error(`Email di conferma non trovata per ${address}`);
  const res = await fetch(`${baseUrl}${new URL(link).pathname}${new URL(link).search}`);
  return res.status;
}
