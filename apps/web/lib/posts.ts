import DOMPurify from "isomorphic-dompurify";

// Le regole del paywall stanno in @zerostack/shared: le usano anche il worker e le email.
export { splitAtPaywall, canReadFullPost, isSubscriptionActive } from "@zerostack/shared";
export type { PostAccessLevel } from "@zerostack/shared";

/**
 * Il testo degli articoli è HTML scritto dagli autori, e la pagina si apre anche su zerostack.it/p/...:
 * uno <script> o un onerror lì girerebbe con la sessione di chi legge. Si tiene solo la formattazione.
 */
export function sanitizePostHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
    FORBID_ATTR: ["style"]
  });
}
