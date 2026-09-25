import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Link
} from "@react-email/components";

interface SubscriptionEmailProps {
  publicationName: string;
  tierName: string;
  amountFormatted: string;
  interval: string;
  ragioneSociale?: string;
  codiceFiscaleOiva?: string;
  sdiPec?: string;
  portalUrl: string;
}

export const SubscriptionConfirmationEmail: React.FC<SubscriptionEmailProps> = ({
  publicationName = "Tech & Futuro Italia",
  tierName = "Abbonato Premium",
  amountFormatted = "7,00 €",
  interval = "al mese",
  ragioneSociale = "Mario Rossi",
  codiceFiscaleOiva = "RSSMRA85M01H501Z",
  sdiPec = "SDI: M5UXCR1",
  portalUrl = "https://zerostack.it/account/billing"
}) => {
  return (
    <Html lang="it">
      <Head />
      <Preview>Conferma abbonamento: {publicationName} ({tierName})</Preview>
      <Body style={{ backgroundColor: "#F9FAFB", padding: "20px 0", fontFamily: "sans-serif" }}>
        <Container style={{ backgroundColor: "#FFFFFF", padding: "32px", borderRadius: "8px", maxWidth: "560px", margin: "0 auto", border: "1px solid #E5E7EB" }}>
          <Heading as="h2" style={{ color: "#111827", marginTop: 0 }}>
            🎉 Il tuo abbonamento è attivo!
          </Heading>
          <Text style={{ fontSize: "16px", color: "#374151" }}>
            Grazie per aver scelto di sostenere il lavoro di <strong>{publicationName}</strong>. Da questo momento hai accesso illimitato a tutti i contenuti e le funzionalità riservate.
          </Text>

          <Section style={{ backgroundColor: "#F3F4F6", padding: "16px 20px", borderRadius: "6px", margin: "20px 0" }}>
            <Text style={{ margin: "4px 0", fontSize: "14px" }}><strong>Piano:</strong> {tierName}</Text>
            <Text style={{ margin: "4px 0", fontSize: "14px" }}><strong>Importo:</strong> {amountFormatted} ({interval})</Text>
            <Text style={{ margin: "4px 0", fontSize: "14px" }}><strong>Intestatario:</strong> {ragioneSociale}</Text>
            <Text style={{ margin: "4px 0", fontSize: "14px" }}><strong>Codice Fiscale / P.IVA:</strong> {codiceFiscaleOiva}</Text>
            {sdiPec && <Text style={{ margin: "4px 0", fontSize: "14px" }}><strong>Destinatario Fiscale:</strong> {sdiPec}</Text>}
          </Section>

          <Text style={{ fontSize: "14px", color: "#4B5563" }}>
            Se hai inserito dati aziendali, la fattura elettronica verrà recapitata direttamente nel tuo cassetto fiscale dell'Agenzia delle Entrate secondo le tempistiche standard.
          </Text>

          <Hr style={{ borderColor: "#E5E7EB", margin: "24px 0" }} />
          <Text style={{ fontSize: "13px", color: "#6B7280", textAlign: "center" }}>
            Puoi gestire il tuo metodo di pagamento o disdire in ogni momento dalla tua <Link href={portalUrl} style={{ color: "#0066FF" }}>Area Personale</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};
