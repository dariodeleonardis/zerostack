import React from "react";
import type { Metadata } from "next";
import { LegalPage } from "../../components/LegalPage";
import { CookiePreferencesButton } from "../../components/CookieConsent";
import { legalEntity } from "../../lib/legal";
import { CATEGORIES, OPTIONAL_SERVICES, TECHNICAL_COOKIES, type CookieEntry } from "../../lib/consent";

export const metadata: Metadata = { title: "Cookie | ZeroStack" };
export const dynamic = "force-dynamic";

function CookieTable({ cookies }: { cookies: CookieEntry[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>A cosa serve</th>
          <th>Durata</th>
        </tr>
      </thead>
      <tbody>
        {cookies.map((c) => (
          <tr key={c.name}>
            <td><code>{c.name}</code></td>
            <td>{c.purpose}</td>
            <td>{c.duration}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CookiePage() {
  const e = legalEntity();
  return (
    <LegalPage title="Cookie" updatedAt={e.updatedAt}>
      <p>
        Questa pagina elenca i cookie che ZeroStack usa su zerostack.it, sui sottodomini delle pubblicazioni e sui domini personalizzati degli autori. Il titolare è {e.name}
        (vedi l&apos;<a href="/privacy">informativa sulla privacy</a>).
      </p>

      <h2>Cookie tecnici</h2>
      <p>Sono necessari al funzionamento del sito e, per legge, non richiedono il tuo consenso.</p>
      <CookieTable cookies={TECHNICAL_COOKIES} />

      <h2>Cookie facoltativi</h2>
      {OPTIONAL_SERVICES.length === 0 ? (
        <p>
          Nessuno. ZeroStack non usa cookie di profilazione, di statistica o di terze parti, e non incorpora contenuti di altri siti che ne installino. Per questo non ti chiediamo
          il consenso e non vedi un banner.
        </p>
      ) : (
        CATEGORIES.map((cat) => {
          const services = OPTIONAL_SERVICES.filter((s) => s.category === cat.id);
          if (services.length === 0) return null;
          return (
            <section key={cat.id}>
              <h3>{cat.label}</h3>
              <p>{cat.description} Si attivano solo se dai il consenso.</p>
              {services.map((s) => (
                <div key={s.id}>
                  <p>
                    <strong>{s.name}</strong>, fornito da {s.provider} (<a href={s.privacyUrl} rel="noopener noreferrer" target="_blank">informativa</a>).
                  </p>
                  <CookieTable cookies={s.cookies} />
                </div>
              ))}
            </section>
          );
        })
      )}

      <h2>Statistiche</h2>
      <p>
        Le statistiche di lettura delle pubblicazioni non usano cookie né altri identificativi salvati nel tuo dispositivo: il server calcola un codice che cambia ogni giorno e
        da cui non si risale al tuo indirizzo IP.
      </p>

      <h2>Pagamenti</h2>
      <p>
        Quando ti abboni, il pagamento avviene sulle pagine di Stripe, che installa i propri cookie tecnici e antifrode come titolare autonomo, secondo la sua{" "}
        <a href="https://stripe.com/it/cookie-settings" rel="noopener noreferrer" target="_blank">informativa sui cookie</a>.
      </p>

      <h2>Registro delle scelte</h2>
      <p>
        Quando scegli sui cookie facoltativi, il browser salva in <code>zs_consent</code> un codice casuale e noi conserviamo, insieme a quel codice, la data, la versione
        dell&apos;elenco dei servizi, le categorie accettate e il sito su cui hai scelto. Non salviamo il tuo indirizzo IP né il tuo account. Serve a dimostrare il consenso e
        si cancella dopo 24 mesi. Il codice lo trovi nel pannello delle preferenze.
      </p>

      <h2>Come cambiare le tue scelte</h2>
      <p>
        Puoi rivedere le preferenze in ogni momento con il pulsante qui sotto o con &quot;Preferenze cookie&quot; in fondo a ogni pagina. Puoi anche cancellare i cookie dalle
        impostazioni del browser: se cancelli <code>zs_session</code> esci dal tuo account.
      </p>
      <p>
        <CookiePreferencesButton className="rounded-lg border border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50" />
      </p>
      <p>Per informazioni: {e.email}.</p>
    </LegalPage>
  );
}
