import React from "react";
import type { Metadata } from "next";
import { LegalPage } from "../../components/LegalPage";
import { legalEntity } from "../../lib/legal";

export const metadata: Metadata = { title: "Cookie | ZeroStack" };
export const dynamic = "force-dynamic";

export default function CookiePage() {
  const e = legalEntity();
  return (
    <LegalPage title="Cookie" updatedAt={e.updatedAt}>
      <p>ZeroStack usa solo cookie tecnici, necessari al funzionamento. Non usa cookie di profilazione né strumenti di tracciamento di terze parti, quindi non serve il tuo consenso.</p>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>A cosa serve</th>
            <th>Durata</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>zs_session</code></td>
            <td>Ti tiene collegato al tuo account, anche sui sottodomini delle pubblicazioni. È visibile solo al server (HttpOnly).</td>
            <td>30 giorni, o fino a quando esci</td>
          </tr>
        </tbody>
      </table>
      <p>
        Nel browser resta inoltre una preferenza locale (<code>zerostack_gdpr_consent</code>) per non mostrarti di nuovo l&apos;avviso sui cookie. Le statistiche delle pubblicazioni
        sono anonime e non usano cookie. Per informazioni: {e.email}.
      </p>
    </LegalPage>
  );
}
