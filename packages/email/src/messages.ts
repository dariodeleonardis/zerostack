import * as React from "react";
import { render } from "@react-email/render";
import { NewsletterEmail } from "./NewsletterEmail";
import { WelcomeEmail } from "./WelcomeEmail";
import { platformSender, type OutgoingEmail } from "./transport";

interface PublicationInfo {
  name: string;
  primaryColor?: string | null;
  logoUrl?: string | null;
  replyTo?: string | null;
}

function renderBoth(element: React.ReactElement): { html: string; text: string } {
  return { html: render(element), text: render(element, { plainText: true }) };
}

/** Email della doppia conferma (double opt-in). */
export function buildConfirmationEmail(input: {
  to: string;
  subscriberName?: string | null;
  publication: PublicationInfo;
  confirmUrl: string;
}): OutgoingEmail {
  const { html, text } = renderBoth(
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
export function buildNewsletterEmail(input: {
  to: string;
  publication: PublicationInfo;
  post: { title: string; subtitle?: string | null; authorName: string; publishedAt: Date };
  contentHtml: string;
  hasPaywall: boolean;
  postUrl: string;
  unsubscribeUrl: string;
  oneClickUrl: string;
}): OutgoingEmail {
  const publishedDate = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(
    input.post.publishedAt
  );
  const { html, text } = renderBoth(
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
    }
  };
}
