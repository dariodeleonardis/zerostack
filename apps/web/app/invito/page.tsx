import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "../../lib/auth";
import { findInvite } from "../../lib/team";
import { ROLE_HINT, ROLE_LABEL } from "../../lib/team-roles";
import { AcceptInvite } from "./AcceptInvite";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invito | ZeroStack", robots: { index: false } };

function Frame({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <p className="kicker text-saffron-800">{kicker}</p>
      <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">{title}</h1>
      <div className="mt-5 space-y-5 text-lg text-gray-700">{children}</div>
    </div>
  );
}

export default async function InvitePage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token ?? "";
  const invite = token ? await findInvite(token) : null;
  if (!invite) {
    return (
      <Frame kicker="Invito" title="Invito non più valido">
        <p>È scaduto, è già stato usato oppure è stato annullato. Chiedine uno nuovo a chi ti ha invitato.</p>
      </Frame>
    );
  }

  const user = await getCurrentUser();
  const role = ROLE_LABEL[invite.role].toLowerCase();
  const here = `/invito?token=${encodeURIComponent(token)}`;
  const intro = (
    <p>
      {invite.invitedBy?.name ?? "Il proprietario"} ti invita a far parte di <strong>{invite.publication.name}</strong> come <strong>{role}</strong>: {ROLE_HINT[invite.role]}.
    </p>
  );

  if (!user) {
    return (
      <Frame kicker="Invito alla squadra" title={invite.publication.name}>
        {intro}
        <p>Per accettare entra con l&apos;indirizzo a cui è arrivato l&apos;invito, oppure crea un account con quell&apos;indirizzo.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/login?next=${encodeURIComponent(here)}`} className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper hover:bg-ink-700">
            Entra
          </Link>
          <Link href={`/register?next=${encodeURIComponent(here)}`} className="rounded-full border-2 border-ink px-6 py-3 text-sm font-bold hover:bg-ink hover:text-paper">
            Crea un account
          </Link>
        </div>
      </Frame>
    );
  }

  if (user.email.toLowerCase() !== invite.email) {
    return (
      <Frame kicker="Invito alla squadra" title={invite.publication.name}>
        {intro}
        <p>Questo invito è per un altro indirizzo email. Esci ed entra con l&apos;account a cui è arrivato.</p>
      </Frame>
    );
  }

  return (
    <Frame kicker="Invito alla squadra" title={invite.publication.name}>
      {intro}
      <AcceptInvite token={token} />
    </Frame>
  );
}
