import React from "react";
import type { Metadata } from "next";
import { LegalPage } from "../../components/LegalPage";
import { legalEntity } from "../../lib/legal";
import { percentWithArticle, platformFeePercent } from "@zerostack/shared";

export const metadata: Metadata = { title: "Termini di servizio | ZeroStack" };
export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const e = await legalEntity();
  return (
    <LegalPage title="Termini di servizio" updatedAt={e.updatedAt}>
      <p>
        ZeroStack è una piattaforma per pubblicare newsletter, articoli e podcast, gestita da <strong>{e.name}</strong> (P.IVA {e.vat}, {e.address}). Usando il servizio accetti questi termini.
      </p>

      <h2>Account</h2>
      <p>
        Per scrivere o abbonarti serve un account con un indirizzo email tuo, da confermare. Sei responsabile di ciò che succede con il tuo account e di tenere riservata la password.
      </p>

      <h2>Contenuti degli autori</h2>
      <p>
        I contenuti restano dei loro autori, che ne sono responsabili. Pubblicandoli concedi a ZeroStack solo i diritti necessari per ospitarli, mostrarli e spedirli agli iscritti.
        È vietato pubblicare contenuti illeciti, che violano diritti altrui, che incitano all&apos;odio o alla violenza, o inviare comunicazioni a persone che non si sono iscritte.
      </p>
      <p>
        Chi importa una lista di iscritti da un&apos;altra piattaforma garantisce di averla raccolta con il consenso delle persone e resta titolare di quei dati.
      </p>

      <h2>Abbonamenti e pagamenti</h2>
      <p>
        Gli abbonamenti a pagamento si stipulano tra lettore e autore: il pagamento arriva direttamente sul conto Stripe dell&apos;autore, che è il venditore ed emette gli eventuali
        documenti fiscali. Su ogni pagamento ZeroStack trattiene una commissione {percentWithArticle(platformFeePercent(), "del")} dell&apos;importo, a titolo di corrispettivo per il
        servizio; Stripe applica le sue commissioni sui pagamenti. Le pubblicazioni gratuite e le iscrizioni gratuite non hanno costi. Le disdette valgono dalla fine del periodo già pagato.
      </p>

      <h2>Sospensione</h2>
      <p>
        Possiamo sospendere account o pubblicazioni che violano questi termini o la legge, o che mettono a rischio il servizio (per esempio con invii di spam), avvisando quando
        possibile. Puoi cancellare il tuo account in qualsiasi momento dal profilo.
      </p>

      <h2>Responsabilità</h2>
      <p>
        Il servizio è fornito con la massima cura ma senza garanzia di disponibilità ininterrotta. Nei limiti di legge, ZeroStack non risponde dei contenuti degli autori né di danni
        indiretti derivanti dall&apos;uso del servizio.
      </p>

      <h2>Legge applicabile</h2>
      <p>
        Si applica la legge italiana. Per i consumatori resta competente il foro del luogo di residenza. Per domande: {e.email}.
      </p>
    </LegalPage>
  );
}
