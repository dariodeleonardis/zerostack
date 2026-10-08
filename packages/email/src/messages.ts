import * as React from "react";
import { render } from "react-email";
import { NewsletterEmail } from "./NewsletterEmail";
import { WelcomeEmail } from "./WelcomeEmail";
import { PasswordResetEmail } from "./PasswordResetEmail";
import { VerifyEmail } from "./VerifyEmail";
import { platformSender, type OutgoingEmail } from "./transport";

interface PublicationInfo {
  name: string;
  primaryColor?: string | null;
  logoUrl?: string | null;
  replyTo?: string | null;
}

// Da react-email 1.0 render è asincrono: tutte le build* restituiscono una Promise.
async function renderBoth(element: React.ReactElement): Promise<{ html: string; text: string }> {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { html, text };
}

/** Email della doppia conferma (double opt-in). */
export async function buildConfirmationEmail(input: {
  to: string;
  subscriberName?: string | null;
  publication: PublicationInfo;
  confirmUrl: string;
}): Promise<OutgoingEmail> {
  const { html, text } = await renderBoth(
    React.createElement(WelcomeEmail, {
      publicationName: input.publication.name,
      subscriberName: input.subscriberName ?? undefined,
      confirmUrl: input.confirmUrl,
      primaryColor: input.publication.primaryColor ?? undefined
    })
  );
  return {
    from: platformSender(input.publication.name),
    to: input.to,
    replyTo: input.publication.replyTo ?? undefined,
    subject: `Conferma la tua iscrizione a ${input.publication.name}`,
    html,
    text
  };
}

/**
 * Una edizione della newsletter per un destinatario. `unsubscribeUrl` è la pagina con il pulsante,
 * `oneClickUrl` riceve la POST "List-Unsubscribe=One-Click" dei client di posta (RFC 8058):
 * Gmail e Yahoo la richiedono a chi spedisce in massa.
 */
export async function buildNewsletterEmail(input: {
  to: string;
  /** Finisce nei tag del provider: i webhook dei rimbalzi sanno da quale pubblicazione veniva l'email. */
  publicationId?: string;
  publication: PublicationInfo;
  post: { title: string; subtitle?: string | null; authorName: string; publishedAt: Date };
  contentHtml: string;
  hasPaywall: boolean;
  postUrl: string;
  unsubscribeUrl: string;
  oneClickUrl: string;
}): Promise<OutgoingEmail> {
  const publishedDate = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(
    input.post.publishedAt
  );
  const { html, text } = await renderBoth(
    React.createElement(NewsletterEmail, {
      publicationName: input.publication.name,
      publicationLogoUrl: input.publication.logoUrl ?? undefined,
      postTitle: input.post.title,
      postSubtitle: input.post.subtitle ?? undefined,
      authorName: input.post.authorName,
      publishedDate,
      contentHtml: input.contentHtml,
      postUrl: input.postUrl,
      hasPaywall: input.hasPaywall,
      unsubscribeUrl: input.unsubscribeUrl,
      primaryColor: input.publication.primaryColor ?? undefined
    })
  );
  return {
    from: platformSender(input.publication.name),
    to: input.to,
    replyTo: input.publication.replyTo ?? undefined,
    subject: input.post.title,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${input.oneClickUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
    },
    ...(input.publicationId ? { tags: { publication: input.publicationId } } : {})
  };
}

/** Email per reimpostare la password: mittente della piattaforma, non di una pubblicazione. */
export async function buildPasswordResetEmail(input: { to: string; name?: string | null; resetUrl: string; validMinutes: number }): Promise<OutgoingEmail> {
  const { html, text } = await renderBoth(
    React.createElement(PasswordResetEmail, { name: input.name ?? undefined, resetUrl: input.resetUrl, validMinutes: input.validMinutes })
  );
  return { from: platformSender("ZeroStack"), to: input.to, subject: "Imposta una nuova password", html, text };
}

/** Conferma dell'indirizzo dopo la registrazione. */
export async function buildVerifyEmail(input: { to: string; name?: string | null; verifyUrl: string }): Promise<OutgoingEmail> {
  const { html, text } = await renderBoth(React.createElement(VerifyEmail, { name: input.name ?? undefined, verifyUrl: input.verifyUrl }));
  return { from: platformSender("ZeroStack"), to: input.to, subject: "Conferma il tuo indirizzo email", html, text };
}
