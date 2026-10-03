import { randomBytes } from "crypto";
import { promises as dns } from "dns";
import { readFile } from "fs/promises";

export const VERIFY_PREFIX = "zerostack-verify=";

export function verificationRecordName(domain: string): string {
  return `_zerostack.${domain}`;
}

export function newVerifyToken(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Record TXT di un nome DNS. ZS_FAKE_DNS_FILE (solo per i test end to end) sostituisce il DNS con un file
 * JSON {"nome": ["valore"]}, riletto a ogni chiamata: in un test non si possono creare record veri.
 */
export async function resolveTxt(name: string): Promise<string[]> {
  if (process.env.ZS_FAKE_DNS_FILE) {
    const fake = JSON.parse(await readFile(process.env.ZS_FAKE_DNS_FILE, "utf8").catch(() => "{}")) as Record<string, string[]>;
    return fake[name] ?? [];
  }
  try {
    // Un record TXT lungo arriva spezzato in più stringhe: si riuniscono.
    return (await dns.resolveTxt(name)).map((chunks) => chunks.join(""));
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ESERVFAIL") return [];
    throw err;
  }
}

export async function hasVerificationRecord(domain: string, token: string): Promise<boolean> {
  const values = await resolveTxt(verificationRecordName(domain));
  return values.some((v) => v.trim() === `${VERIFY_PREFIX}${token}`);
}
