import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { getCurrentUser, isSameOriginJson } from "../../../../../lib/auth";
import { VERIFY_FIRST } from "../../../../../lib/email-verification";
import { allowAttempt } from "../../../../../lib/rate-limit";
import { memberRole, normalizeEmail, sendInvite, TEAM_MAX } from "../../../../../lib/team";
import { invitableRole } from "../../../../../lib/team-roles";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * Squadra di una pubblicazione (T4). Un solo indirizzo, l'azione nel corpo:
 * invite { email, role } · revoke { inviteId } · role { memberId, role } · remove { memberId } · leave.
 * Tutto spetta al proprietario tranne "leave"; a chi non fa parte della pubblicazione risponde 404.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOriginJson(req)) return bad("Richiesta non valida");
  const user = await getCurrentUser();
  if (!user) return bad("Accedi prima", 401);
  const role = await memberRole(user.id, params.id);
  if (!role) return bad("Pubblicazione non trovata", 404);
  const body = await req.json().catch(() => null);
  const action = body?.action;

  if (action === "leave") {
    if (role === "OWNER") return bad("Il proprietario non può lasciare la sua pubblicazione");
    await prisma.publicationMember.delete({ where: { publicationId_userId: { publicationId: params.id, userId: user.id } } });
    return NextResponse.json({ ok: true });
  }

  if (role !== "OWNER") return bad("Solo il proprietario gestisce la squadra", 403);

  if (action === "invite") {
    if (!user.emailVerified) return NextResponse.json({ error: VERIFY_FIRST, code: "email_not_verified" }, { status: 403 });
    const email = normalizeEmail(body.email);
    const newRole = invitableRole(body.role);
    if (!email) return bad("Scrivi un indirizzo email valido");
    if (!newRole) return bad("Scegli il ruolo: editor o collaboratore");
    const publication = await prisma.publication.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, suspendedAt: true, _count: { select: { members: true, invites: true } } }
    });
    if (!publication || publication.suspendedAt) return bad("Pubblicazione non trovata", 404);
    const already = await prisma.publicationMember.findFirst({
      where: { publicationId: params.id, user: { email: { equals: email, mode: "insensitive" } } },
      select: { id: true }
    });
    if (already) return bad("Questa persona fa già parte della squadra", 409);
    const renewing = await prisma.publicationInvite.findUnique({ where: { publicationId_email: { publicationId: params.id, email } }, select: { id: true } });
    if (!renewing && publication._count.members + publication._count.invites >= TEAM_MAX) {
      return bad(`La squadra ha già ${TEAM_MAX} persone fra membri e inviti in attesa`);
    }
    if (!(await allowAttempt(`team-invite:${user.id}`, 20, 60 * 60))) return bad("Troppi inviti in poco tempo: riprova fra un'ora", 429);
    try {
      await sendInvite({ publication, inviter: user, email, role: newRole });
    } catch (err) {
      console.error("[squadra] invito non spedito:", err instanceof Error ? err.message : err);
      return bad("Invito salvato ma l'email non è partita: riprova fra poco", 502);
    }
    return NextResponse.json({ ok: true }, { status: renewing ? 200 : 201 });
  }

  if (action === "revoke") {
    const { count } = await prisma.publicationInvite.deleteMany({ where: { id: String(body.inviteId ?? ""), publicationId: params.id } });
    return count ? NextResponse.json({ ok: true }) : bad("Invito non trovato", 404);
  }

  if (action === "role" || action === "remove") {
    const member = await prisma.publicationMember.findFirst({
      where: { id: String(body.memberId ?? ""), publicationId: params.id },
      select: { id: true, role: true }
    });
    if (!member) return bad("Persona non trovata", 404);
    if (member.role === "OWNER") return bad("Il ruolo del proprietario non si cambia");
    if (action === "remove") {
      await prisma.publicationMember.delete({ where: { id: member.id } });
      return NextResponse.json({ ok: true });
    }
    const newRole = invitableRole(body.role);
    if (!newRole) return bad("Scegli il ruolo: editor o collaboratore");
    await prisma.publicationMember.update({ where: { id: member.id }, data: { role: newRole } });
    return NextResponse.json({ ok: true });
  }

  return bad("Azione sconosciuta");
}
