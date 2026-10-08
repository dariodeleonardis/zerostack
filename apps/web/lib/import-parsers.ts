// Lettura degli export delle altre piattaforme: funzioni pure, senza database, provate in
// scripts/test-functions.ts. Il risultato è sempre lo stesso (iscritti + articoli), e la scrittura
// su ZeroStack sta in lib/import.ts.
import { strFromU8, unzipSync } from "fflate";
import { parseCsvRecords, slugify } from "@zerostack/shared";
import type { ImportPlatformId } from "./import-platforms";

export interface ImportedSubscriber {
  email: string;
  paid: boolean;
}

export interface ImportedPost {
  title: string;
  subtitle: string | null;
  slug: string;
  /** HTML originale, con il paywall già convertito nel divisore di ZeroStack. Da ripulire prima di salvarlo. */
  html: string;
  access: "FREE" | "PAID_SUBSCRIBERS";
  published: boolean;
  date: Date | null;
}

export interface ParsedExport {
  subscribers: ImportedSubscriber[];
  subscribersFound: number;
  subscribersSkippedDisabled: number;
  posts: ImportedPost[];
  postsWithoutHtml: number;
}

const MAX_SUBSCRIBERS = 200_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PAYWALL_DIVIDER = '<hr class="paywall-divider" data-paywall="true">';

/** File dell'export: uno ZIP (se ne tengono CSV, HTML, XML e JSON) oppure un file singolo. */
export function readExport(data: Uint8Array, filename: string): Map<string, string> {
  const isZip = data[0] === 0x50 && data[1] === 0x4b; // "PK"
  if (!isZip) return new Map([[filename || "subscribers.csv", strFromU8(data)]]);
  const files = unzipSync(data, {
    // Solo quello che serve (niente immagini, niente cartelle di sistema di macOS).
    filter: (f) => !f.name.startsWith("__MACOSX/") && /\.(csv|html|xml|json)$/i.test(f.name)
  });
  return new Map(Object.entries(files).map(([name, bytes]) => [name, strFromU8(bytes)]));
}

const truthy = (v: string | undefined) => /^(true|1|yes|t)$/i.test((v ?? "").trim());

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
    }
    return NAMED[code.toLowerCase()] ?? whole;
  });
}

const textOf = (html: string) => decodeEntities(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();

const validDate = (d: Date) => (Number.isNaN(d.getTime()) ? null : d);

// --- Iscritti --------------------------------------------------------------------------------

const EMAIL_KEYS = ["email", "email address", "email_address", "e-mail", "emailaddress", "subscriber email", "subscriber"];
const STATUS_KEYS = ["status", "state", "subscriber_type", "subscription_status", "member status"];
// Chi non riceveva più le email (disiscritti, rimbalzi, spam, mai confermati): non si importa.
const INACTIVE = /^(unsubscribed|cancell?ed|bounced|cleaned|complained|spam|spam_complaint|inactive|unactivated|removed|blocked|unconfirmed|disabled|junk)$/i;
const TIER_KEYS = ["plan", "status", "tier", "tiers", "subscription_tier", "subscription_premium_tier_names", "subscriber_type"];
const PAID_TIER = /\b(paid|premium|gifted|comp|complimentary|founding|churning)\b/i;
// Mailchimp mette disiscritti e rimbalzati in file a parte nello stesso ZIP.
const INACTIVE_FILE = /(^|[\/_.-])(unsubscribed|cleaned|bounced|nonsubscribed)/i;

function readSubscribers(rows: Record<string, string>[], out: ParsedExport, seen: Set<string>) {
  const emailKey = EMAIL_KEYS.find((k) => k in (rows[0] ?? {}));
  if (!emailKey) return;
  for (const row of rows) {
    if (out.subscribersFound >= MAX_SUBSCRIBERS) return;
    const email = (row[emailKey] ?? "").trim().toLowerCase();
    if (!EMAIL.test(email) || email.length > 254) continue;
    out.subscribersFound++;
    const status = STATUS_KEYS.map((k) => (row[k] ?? "").trim()).find(Boolean) ?? "";
    // Substack: email_disabled; Ghost: subscribed_to_emails.
    if (truthy(row.email_disabled) || /^false$/i.test((row.subscribed_to_emails ?? "").trim()) || INACTIVE.test(status)) {
      out.subscribersSkippedDisabled++;
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    const plan = (row.plan ?? "").trim().toLowerCase();
    const paid =
      truthy(row.active_subscription) ||
      Boolean((row.stripe_customer_id ?? "").trim()) ||
      truthy(row.complimentary_plan) ||
      (plan !== "" && plan !== "free") ||
      TIER_KEYS.some((k) => PAID_TIER.test(row[k] ?? ""));
    out.subscribers.push({ email, paid });
  }
}

function subscribersFromCsvFiles(files: Map<string, string>, out: ParsedExport, skip?: (rows: Record<string, string>[]) => boolean) {
  const seen = new Set(out.subscribers.map((s) => s.email));
  for (const [name, content] of Array.from(files)) {
    if (!/\.csv$/i.test(name) || INACTIVE_FILE.test(name)) continue;
    const rows = parseCsvRecords(content);
    if (skip?.(rows)) continue;
    readSubscribers(rows, out, seen);
  }
}

// --- Substack --------------------------------------------------------------------------------

/**
 * Substack segna il punto del paywall con un blocco vuoto (classe o componente "paywall"):
 * lo si converte nel divisore di ZeroStack prima della pulizia dell'HTML.
 */
export function convertSubstackPaywall(html: string): string {
  return html.replace(/<div\b[^>]*(?:class="[^"]*paywall[^"]*"|data-component-name="[^"]*paywall[^"]*")[^>]*>\s*<\/div>/i, PAYWALL_DIVIDER);
}

function parseSubstack(files: Map<string, string>, out: ParsedExport) {
  const htmlByPostId = new Map<string, string>();
  for (const [name, content] of Array.from(files)) {
    const match = /(?:^|\/)posts\/([^/]+)\.html$/i.exec(name);
    if (match) htmlByPostId.set(match[1], content);
  }
  const isPosts = (rows: Record<string, string>[]) => "post_id" in (rows[0] ?? {});
  subscribersFromCsvFiles(files, out, isPosts);

  for (const [name, content] of Array.from(files)) {
    if (!/\.csv$/i.test(name)) continue;
    const rows = parseCsvRecords(content);
    if (!isPosts(rows)) continue;
    for (const row of rows) {
      const postId = row.post_id ?? "";
      const title = (row.title ?? "").trim();
      if (!postId || !title) continue;
      if ((row.type ?? "newsletter").toLowerCase() === "thread") continue; // le discussioni non sono articoli
      const html = htmlByPostId.get(postId);
      if (!html) {
        out.postsWithoutHtml++;
        continue;
      }
      const audience = (row.audience ?? "everyone").toLowerCase();
      out.posts.push({
        title,
        subtitle: row.subtitle || null,
        // post_id di Substack: "123456.titolo-del-post". Si tiene lo stesso slug: i vecchi link restano simili.
        slug: slugify(postId.includes(".") ? postId.slice(postId.indexOf(".") + 1) : title) || slugify(title) || `post-${postId}`,
        html: convertSubstackPaywall(html),
        access: audience === "only_paid" || audience === "founding" ? "PAID_SUBSCRIBERS" : "FREE",
        published: truthy(row.is_published),
        date: validDate(new Date(row.post_date || row.email_sent_at || ""))
      });
    }
  }
}

// --- WordPress (WXR) -------------------------------------------------------------------------

/** Contenuto di un tag XML: le sezioni CDATA (anche spezzate in più pezzi) restano com'erano, il resto si decodifica. */
function xmlField(block: string, tag: string): string {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(block);
  if (!match) return "";
  const inner = match[1];
  return inner.includes("<![CDATA[") ? inner.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1") : decodeEntities(inner);
}

/** L'editor classico di WordPress salva il testo senza <p>: i paragrafi sono separati da righe vuote. */
export function wpAutoParagraphs(html: string): string {
  const withoutCaptions = html.replace(/\[\/?caption[^\]]*\]/g, "");
  if (/<(p|div|h[1-6]|ul|ol|blockquote|figure|table|pre)\b/i.test(withoutCaptions)) return withoutCaptions;
  return withoutCaptions
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

function wpDate(value: string): Date | null {
  const v = value.trim();
  if (!v || v.startsWith("0000")) return null;
  return validDate(new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v) ? `${v.replace(" ", "T")}Z` : v));
}

function parseWordpress(files: Map<string, string>, out: ParsedExport) {
  for (const [name, content] of Array.from(files)) {
    if (!/\.xml$/i.test(name)) continue;
    for (const item of content.match(/<item\b[\s\S]*?<\/item>/g) ?? []) {
      if (xmlField(item, "wp:post_type").trim() !== "post") continue; // pagine, menu, allegati
      const status = xmlField(item, "wp:status").trim();
      if (["trash", "auto-draft", "inherit"].includes(status)) continue;
      const title = xmlField(item, "title").trim();
      const body = xmlField(item, "content:encoded");
      if (!title && !body.trim()) continue;
      if (!body.trim()) {
        out.postsWithoutHtml++;
        continue;
      }
      let slug = xmlField(item, "wp:post_name").trim();
      try {
        slug = decodeURIComponent(slug);
      } catch {
        // slug con percentuali non valide: si rifà dal titolo
      }
      const excerpt = textOf(xmlField(item, "excerpt:encoded"));
      out.posts.push({
        title: title || "Senza titolo",
        subtitle: excerpt || null,
        slug: slugify(slug) || slugify(title) || `post-${xmlField(item, "wp:post_id").trim()}`,
        html: wpAutoParagraphs(body),
        access: "FREE",
        // Gli articoli protetti da password arrivano come bozze: decidi tu se e come pubblicarli.
        published: status === "publish" && !xmlField(item, "wp:post_password").trim(),
        date: wpDate(xmlField(item, "wp:post_date_gmt")) ?? wpDate(xmlField(item, "pubDate"))
      });
    }
  }
}

// --- Ghost -----------------------------------------------------------------------------------

/** Ghost segna la fine dell'anteprima pubblica con il commento <!--members-only-->. */
export function convertGhostPaywall(html: string): string {
  return html.replace(/<!--\s*members-only\s*-->/i, PAYWALL_DIVIDER);
}

interface GhostPost {
  title?: string;
  slug?: string;
  html?: string | null;
  type?: string;
  status?: string;
  visibility?: string;
  published_at?: string | null;
  custom_excerpt?: string | null;
}

function parseGhost(files: Map<string, string>, out: ParsedExport) {
  subscribersFromCsvFiles(files, out);
  for (const [name, content] of Array.from(files)) {
    if (!/\.json$/i.test(name)) continue;
    let data: { db?: { data?: { posts?: GhostPost[] } }[]; data?: { posts?: GhostPost[] } };
    try {
      data = JSON.parse(content);
    } catch {
      continue;
    }
    const posts = data.db?.[0]?.data?.posts ?? data.data?.posts ?? [];
    for (const p of posts) {
      if (p.type && p.type !== "post") continue;
      const title = (p.title ?? "").trim();
      if (!title) continue;
      if (!p.html) {
        out.postsWithoutHtml++;
        continue;
      }
      const visibility = (p.visibility ?? "public").toLowerCase();
      out.posts.push({
        title,
        subtitle: p.custom_excerpt?.trim() || null,
        slug: slugify(p.slug ?? "") || slugify(title),
        html: convertGhostPaywall(p.html),
        access: visibility === "paid" || visibility === "tiers" ? "PAID_SUBSCRIBERS" : "FREE",
        published: p.status === "published",
        date: p.published_at ? validDate(new Date(p.published_at)) : null
      });
    }
  }
}

// --- Medium ----------------------------------------------------------------------------------

function parseMedium(files: Map<string, string>, out: ParsedExport) {
  for (const [name, html] of Array.from(files)) {
    const match = /(?:^|\/)posts\/([^/]+)\.html$/i.exec(name);
    if (!match) continue;
    const title = textOf(/<h1\b[^>]*class="[^"]*p-name[^"]*"[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? "");
    const bodyMatch = /<section\b[^>]*data-field="body"[^>]*>([\s\S]*)<\/section>\s*<footer/i.exec(html);
    if (!title && !bodyMatch) continue;
    if (!bodyMatch) {
      out.postsWithoutHtml++;
      continue;
    }
    // Medium ripete titolo e sottotitolo in testa al corpo.
    const body = bodyMatch[1]
      .replace(/<h[1-4]\b[^>]*graf--title[^>]*>[\s\S]*?<\/h[1-4]>/i, "")
      .replace(/<h[1-4]\b[^>]*graf--subtitle[^>]*>[\s\S]*?<\/h[1-4]>/i, "");
    const subtitle = textOf(/<section\b[^>]*data-field="subtitle"[^>]*>([\s\S]*?)<\/section>/i.exec(html)?.[1] ?? "");
    const canonical = /<a\b[^>]*href="([^"]+)"[^>]*class="[^"]*p-canonical/i.exec(html)?.[1] ?? "";
    // https://medium.com/@autore/titolo-del-pezzo-1a2b3c4d5e6f: si toglie l'identificativo finale.
    const fromUrl = (canonical.split("?")[0].split("/").pop() ?? "").replace(/-[0-9a-f]{8,12}$/i, "");
    const datetime = /<time\b[^>]*class="[^"]*dt-published[^"]*"[^>]*datetime="([^"]+)"/i.exec(html)?.[1];
    out.posts.push({
      title: title || "Senza titolo",
      subtitle: subtitle || null,
      slug: slugify(fromUrl) || slugify(title) || slugify(match[1]),
      html: body,
      access: "FREE",
      published: !/^draft_/i.test(match[1]),
      date: datetime ? validDate(new Date(datetime)) : null
    });
  }
}

// --- Ingresso --------------------------------------------------------------------------------

export function parseExport(platform: ImportPlatformId, files: Map<string, string>): ParsedExport {
  const out: ParsedExport = { subscribers: [], subscribersFound: 0, subscribersSkippedDisabled: 0, posts: [], postsWithoutHtml: 0 };
  if (platform === "substack") parseSubstack(files, out);
  else if (platform === "wordpress") parseWordpress(files, out);
  else if (platform === "ghost") parseGhost(files, out);
  else if (platform === "medium") parseMedium(files, out);
  else subscribersFromCsvFiles(files, out);
  return out;
}
