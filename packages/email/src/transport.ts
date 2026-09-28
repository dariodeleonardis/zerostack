import { mkdir, writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import path from "path";
import nodemailer from "nodemailer";

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface OutgoingEmail {
  from: EmailAddress;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
}

export interface EmailTransport {
  readonly name: string;
  send(message: OutgoingEmail): Promise<{ messageId?: string }>;
}

/**
 * Errore di invio. `permanent` vuol dire che riprovare non serve (indirizzo rifiutato,
 * richiesta non valida); gli altri (rete, 429, 5xx) si possono ritentare.
 */
export class EmailSendError extends Error {
  constructor(message: string, readonly permanent: boolean) {
    super(message);
    this.name = "EmailSendError";
  }
}

function formatAddress({ email, name }: EmailAddress): string {
  if (!name) return email;
  // Virgolette e barre nel nome romperebbero l'intestazione From.
  return `"${name.replace(/["\\\r\n]/g, "")}" <${email}>`;
}

async function httpError(provider: string, res: Response): Promise<EmailSendError> {
  const body = (await res.text().catch(() => "")).slice(0, 300);
  const permanent = res.status >= 400 && res.status < 500 && res.status !== 429;
  return new EmailSendError(`${provider} ${res.status}: ${body}`, permanent);
}

/** Brevo (ex Sendinblue), server UE: https://developers.brevo.com/reference/sendtransacemail */
export function brevoTransport(apiKey: string): EmailTransport {
  return {
    name: "brevo",
    async send(msg) {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: { email: msg.from.email, name: msg.from.name },
          to: [{ email: msg.to }],
          replyTo: msg.replyTo ? { email: msg.replyTo } : undefined,
          subject: msg.subject,
          htmlContent: msg.html,
          textContent: msg.text,
          headers: msg.headers
        })
      });
      if (!res.ok) throw await httpError("Brevo", res);
      const data = (await res.json().catch(() => ({}))) as { messageId?: string };
      return { messageId: data.messageId };
    }
  };
}

/** Resend: https://resend.com/docs/api-reference/emails/send-email */
export function resendTransport(apiKey: string): EmailTransport {
  return {
    name: "resend",
    async send(msg) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: formatAddress(msg.from),
          to: [msg.to],
          reply_to: msg.replyTo,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          headers: msg.headers
        })
      });
      if (!res.ok) throw await httpError("Resend", res);
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      return { messageId: data.id };
    }
  };
}

export function smtpTransport(options: { host: string; port: number; user?: string; pass?: string }): EmailTransport {
  const transporter = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.port === 465,
    auth: options.user ? { user: options.user, pass: options.pass } : undefined
  });
  return {
    name: "smtp",
    async send(msg) {
      try {
        const info = await transporter.sendMail({
          from: formatAddress(msg.from),
          to: msg.to,
          replyTo: msg.replyTo,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          headers: msg.headers
        });
        return { messageId: info.messageId };
      } catch (err) {
        const code = (err as { responseCode?: number }).responseCode;
        // 5xx SMTP = rifiuto definitivo (casella inesistente), 4xx = temporaneo
        throw new EmailSendError(err instanceof Error ? err.message : String(err), typeof code === "number" && code >= 500);
      }
    }
  };
}

/**
 * Per sviluppo e test: non spedisce niente. Scrive una riga nel log e, se c'è `dir`,
 * un file JSON per messaggio (i test end to end leggono da lì i link di conferma).
 */
export function logTransport(dir?: string): EmailTransport {
  return {
    name: "log",
    async send(msg) {
      const messageId = `log-${Date.now()}-${randomBytes(4).toString("hex")}`;
      console.log(`[email:log] a ${msg.to} — ${msg.subject}`);
      if (dir) {
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, `${messageId}.json`), JSON.stringify({ messageId, ...msg }, null, 2));
      }
      return { messageId };
    }
  };
}

/**
 * Il provider si sceglie esplicitamente con EMAIL_PROVIDER (brevo | resend | smtp | log):
 * dedurlo dalle chiavi presenti manderebbe in produzione i valori segnaposto di .env.example.
 */
export function createTransportFromEnv(env: NodeJS.ProcessEnv = process.env): EmailTransport {
  const provider = (env.EMAIL_PROVIDER || "log").toLowerCase();
  switch (provider) {
    case "brevo":
      if (!env.BREVO_API_KEY) throw new Error("EMAIL_PROVIDER=brevo ma BREVO_API_KEY è vuota");
      return brevoTransport(env.BREVO_API_KEY);
    case "resend":
      if (!env.RESEND_API_KEY) throw new Error("EMAIL_PROVIDER=resend ma RESEND_API_KEY è vuota");
      return resendTransport(env.RESEND_API_KEY);
    case "smtp":
      if (!env.SMTP_HOST) throw new Error("EMAIL_PROVIDER=smtp ma SMTP_HOST è vuoto");
      return smtpTransport({ host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 587), user: env.SMTP_USER, pass: env.SMTP_PASS });
    case "log":
      if (env.NODE_ENV === "production") {
        console.warn("[email] EMAIL_PROVIDER non impostato: in produzione le email NON vengono spedite");
      }
      return logTransport(env.EMAIL_LOG_DIR);
    default:
      throw new Error(`EMAIL_PROVIDER sconosciuto: ${provider}`);
  }
}

/** Indirizzo mittente della piattaforma; il nome visualizzato è quello della pubblicazione. */
export function platformSender(name: string, env: NodeJS.ProcessEnv = process.env): EmailAddress {
  const domain = (env.APP_DOMAIN || env.NEXT_PUBLIC_ROOT_DOMAIN || "zerostack.it").toLowerCase();
  return { email: env.EMAIL_FROM || `newsletter@${domain}`, name };
}
