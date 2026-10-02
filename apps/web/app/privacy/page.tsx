import React from "react";
import type { Metadata } from "next";
import { LegalPage } from "../../components/LegalPage";
import { legalEntity } from "../../lib/legal";

export const metadata: Metadata = { title: "Informativa privacy | ZeroStack" };
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const e = legalEntity();
  return (
    <LegalPage title="Informativa sulla privacy" updatedAt={e.updatedAt}>
      <p>
        Questa informativa spiega come ZeroStack tratta i dati personali ai sensi del Regolamento (UE) 2016/679 (GDPR) e del D.Lgs. 196/2003.
      </p>

      <h2>Chi tratta i dati</h2>
      <p>
        <strong>Per gli account della piattaforma</strong> (autori e lettori registrati) il titolare del trattamento è {e.name}, P.IVA {e.vat}, con sede in {e.address},
        contattabile a {e.email}.
      </p>
      <p>
        <strong>Per gli iscritti alle newsletter</strong> il titolare è l&apos;autore della pubblicazione a cui ti iscrivi: è lui che decide cosa inviarti. ZeroStack tratta
        quei dati per suo conto come responsabile del trattamento (art. 28 GDPR), solo per spedire le newsletter e gestire le iscrizioni.
      </p>

      <h2>Quali dati e perché</h2>
      <ul>
        <li><strong>Account</strong>: nome, email, nome utente, password (conservata solo come impronta crittografica), bio e foto se le inserisci. Servono a fornirti il servizio (art. 6.1.b).</li>
        <li><strong>Iscrizioni alle newsletter</strong>: email, nome se lo dai, data di iscrizione e di conferma. Base: il tuo consenso, confermato con la doppia verifica via email (art. 6.1.a).</li>
        <li><strong>Abbonamenti e fatturazione</strong>: piano, stato dell&apos;abbonamento e, se richiedi la fattura, codice fiscale, partita IVA, codice SDI o PEC e indirizzo. Base: contratto e obblighi fiscali (art. 6.1.b e 6.1.c). I dati della carta non passano da ZeroStack: li tratta Stripe.</li>
        <li><strong>Contenuti</strong>: articoli, commenti, immagini e audio che pubblichi.</li>
        <li><strong>Sicurezza</strong>: indirizzo IP e dati tecnici delle richieste, conservati per brevi periodi per prevenire abusi (limiti ai tentativi di accesso). Base: legittimo interesse (art. 6.1.f).</li>
      </ul>

      <h2>A chi vengono comunicati</h2>
      <p>Solo ai fornitori necessari al servizio, nominati responsabili o autonomi titolari:</p>
      <ul>
        <li>fornitore del server e dell&apos;archivio dei file (in Unione Europea);</li>
        <li>fornitore del servizio di invio email (per esempio Brevo, turboSMTP o Resend, secondo la configurazione);</li>
        <li>Stripe, per i pagamenti, come titolare autonomo del trattamento dei dati di pagamento;</li>
        <li>l&apos;autore della pubblicazione a cui sei iscritto o abbonato, per le iscrizioni e gli abbonamenti che lo riguardano.</li>
      </ul>
      <p>ZeroStack non vende i dati e non li usa per pubblicità.</p>

      <h2>Per quanto tempo</h2>
      <ul>
        <li>Account e contenuti: finché l&apos;account esiste; li cancelli quando vuoi dal tuo profilo.</li>
        <li>Iscrizioni: fino alla disiscrizione, possibile con un clic da ogni email.</li>
        <li>Dati fiscali legati a pagamenti: per il tempo richiesto dalla legge (di norma 10 anni).</li>
        <li>Dati tecnici di sicurezza: al massimo qualche giorno.</li>
      </ul>

      <h2>Cookie</h2>
      <p>
        ZeroStack usa solo i cookie tecnici necessari al servizio, elencati nella <a href="/cookie">pagina sui cookie</a>, dove puoi anche rivedere le tue preferenze. Se un giorno ti chiederemo un
        consenso per cookie facoltativi, terremo per 24 mesi un registro della tua scelta legato solo a un codice casuale, senza IP né account, per poterla dimostrare
        (obbligo legale, art. 6.1.c e art. 7.1).
      </p>

      <h2>I tuoi diritti</h2>
      <p>
        Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opporti al trattamento (artt. 15-22 GDPR). Dal tuo profilo puoi già scaricare tutti i tuoi dati e
        cancellare l&apos;account; per il resto scrivi a {e.email}. Hai anche diritto di reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).
      </p>
    </LegalPage>
  );
}
