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
  Button,
  Hr,
  Link
} from "@react-email/components";

interface WelcomeEmailProps {
  publicationName: string;
  subscriberName?: string;
  confirmUrl: string;
  primaryColor?: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  publicationName = "Tech & Futuro Italia",
  subscriberName,
  confirmUrl = "https://zerostack.it/confirm",
  primaryColor = "#0066FF"
}) => {
  return (
    <Html lang="it">
      <Head />
      <Preview>Conferma la tua iscrizione a {publicationName}</Preview>
      <Body style={{ backgroundColor: "#F9FAFB", padding: "20px 0", fontFamily: "sans-serif" }}>
        <Container style={{ backgroundColor: "#FFFFFF", padding: "32px", borderRadius: "8px", maxWidth: "560px", margin: "0 auto", border: "1px solid #E5E7EB" }}>
          <Heading as="h2" style={{ color: "#111827", marginTop: 0 }}>
            Benvenuto su {publicationName}
          </Heading>
          <Text style={{ fontSize: "16px", color: "#374151", lineHeight: 1.6 }}>
            Ciao {subscriberName || "lettore"}, grazie per esserti iscritto!
          </Text>
          <Text style={{ fontSize: "15px", color: "#4B5563", lineHeight: 1.6 }}>
            Per garantire la sicurezza della tua casella di posta e rispettare la normativa sulla privacy (Double Opt-in GDPR), ti chiediamo di confermare il tuo indirizzo email cliccando sul pulsante qui sotto:
          </Text>
          <Section style={{ textAlign: "center", margin: "28px 0" }}>
            <Button
              style={{ backgroundColor: primaryColor, color: "#FFFFFF", padding: "12px 28px", borderRadius: "6px", textDecoration: "none", fontWeight: 600 }}
              href={confirmUrl}
            >
              Conferma la mia iscrizione
            </Button>
          </Section>
          <Hr style={{ borderColor: "#E5E7EB", margin: "24px 0" }} />
          <Text style={{ fontSize: "12px", color: "#9CA3AF", textAlign: "center" }}>
            Se non hai richiesto tu l'iscrizione a {publicationName}, ignora semplicemente questo messaggio.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};
