import { randomBytes } from "crypto";
import { prisma } from "@zerostack/database";
import { platformSender } from "@zerostack/email";
import { platformUrlFromEnv } from "@zerostack/shared";
import { emailTransport } from "./email";
import { hashToken } from "./email-verification";
import { ROLE_HINT, ROLE_LABEL } from "./team-roles";

/**
 * Squadra di una pubblicazione (T4, 3/10/2026). Regole:
 * - invita, cambia ruolo e toglie solo il proprietario, e solo con l'email confermata (contro lo spam);
 * - i ruoli assegnabili sono editor e collaboratore: il proprietario resta uno;
 * - l'invito vale 7 giorni e lo accetta solo chi è entrato con l'indirizzo invitato;
 * - chi fa parte della squadra può uscirne da sé, il proprietario no.
 */
export const INVITE_DAYS = 7;
/** Persone in squadra più inviti in attesa, proprietario compreso. */
export const TEAM_MAX = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

export async function memberRole(userId: string, publicationId: string) {
  const row = await prisma.publicationMember.findUnique({
    where: { publicationId_userId: { publicationId, userId } },
    select: { role: true }
  });
  return row?.role ?? null;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Crea (o rinnova, con un token nuovo) l'invito e lo spedisce. Gli errori d'invio li gestisce chi chiama. */
export async function sendInvite(input: {
  publication: { id: string; name: string };
  inviter: { id: string; name: string };
  email: string;
  role: "EDITOR" | "CONTRIBUTOR";
}): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const data = {
    role: input.role,
    tokenHash: hashToken(token),
    invitedById: input.inviter.id,
    expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000)
  };
  await prisma.publicationInvite.upsert({
    where: { publicationId_email: { publicationId: input.publication.id, email: input.email } },
    create: { publicationId: input.publication.id, email: input.email, ...data },
    update: data
  });
  const url = `${platformUrlFromEnv()}/invito?token=${token}`;
  const role = ROLE_LABEL[input.role].toLowerCase();
  await emailTransport().send({
    from: platformSender("ZeroStack"),
    to: input.email,
    subject: `${input.inviter.name} ti invita nella squadra di ${input.publication.name}`,
    text: `${input.inviter.name} ti invita a far parte di «${input.publication.name}» su ZeroStack come ${role} (${ROLE_HINT[input.role]}).\n\nAccetta l'invito: ${url}\n\nIl link vale ${INVITE_DAYS} giorni. Se non conosci chi ti invita, ignora questa email.`,
    html: `<p><strong>${escapeHtml(input.inviter.name)}</strong> ti invita a far parte di «${escapeHtml(input.publication.name)}» su ZeroStack come <strong>${role}</strong> (${ROLE_HINT[input.role]}).</p><p><a href="${escapeHtml(url)}">Accetta l'invito</a></p><p>Il link vale ${INVITE_DAYS} giorni. Se non conosci chi ti invita, ignora questa email.</p>`
  });
}

/** Invito ancora valido per questo token, con quel che serve alla pagina di accettazione. */
export function findInvite(token: string) {
  return prisma.publicationInvite.findFirst({
    where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() }, publication: { suspendedAt: null } },
    select: {
      id: true,
      email: true,
      role: true,
      publicationId: true,
      publication: { select: { name: true } },
      invitedBy: { select: { name: true } }
    }
  });
}

export type AcceptResult = { ok: true; publicationId: string } | { ok: false; status: number; error: string };

/** Accetta l'invito: diventa un membro (o resta tale, se lo era già) e l'invito sparisce. */
export async function acceptInvite(user: { id: string; email: string }, token: string): Promise<AcceptResult> {
  const invite = await findInvite(token);
  if (!invite) return { ok: false, status: 404, error: "Invito scaduto o già usato: chiedine uno nuovo a chi ti ha invitato" };
  if (invite.email !== user.email.toLowerCase()) {
    return { ok: false, status: 403, error: "Questo invito è per un altro indirizzo email: entra con l'account a cui è arrivato" };
  }
  await prisma.$transaction(async (tx) => {
    const existing = await tx.publicationMember.findUnique({
      where: { publicationId_userId: { publicationId: invite.publicationId, userId: user.id } },
      select: { id: true }
    });
    if (!existing) await tx.publicationMember.create({ data: { publicationId: invite.publicationId, userId: user.id, role: invite.role } });
    await tx.publicationInvite.delete({ where: { id: invite.id } });
  });
  return { ok: true, publicationId: invite.publicationId };
}
