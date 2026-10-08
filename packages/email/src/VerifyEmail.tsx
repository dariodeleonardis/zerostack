import * as React from "react";
import { Html, Head, Preview, Body, Container, Section, Text, Heading, Hr, Button } from "react-email";

interface VerifyEmailProps {
  name?: string;
  verifyUrl: string;
}

export const VerifyEmail: React.FC<VerifyEmailProps> = ({ name, verifyUrl }) => (
  <Html lang="it">
    <Head />
    <Preview>Conferma il tuo indirizzo email su ZeroStack</Preview>
    <Body style={{ backgroundColor: "#F9FAFB", padding: "20px 0", fontFamily: "sans-serif" }}>
      <Container style={{ backgroundColor: "#FFFFFF", padding: "32px", borderRadius: "8px", maxWidth: "560px", margin: "0 auto", border: "1px solid #E5E7EB" }}>
        <Heading as="h2" style={{ color: "#111827", marginTop: 0 }}>
          Conferma la tua email
        </Heading>
        <Text style={{ fontSize: "16px", color: "#374151", lineHeight: 1.6 }}>
          Ciao {name || ""}, benvenuto su ZeroStack. Conferma che questo indirizzo è tuo: servirà per inviare le tue newsletter e ricevere i pagamenti.
        </Text>
        <Section style={{ textAlign: "center", margin: "28px 0" }}>
          <Button
            style={{ backgroundColor: "#2563EB", color: "#FFFFFF", padding: "12px 28px", borderRadius: "6px", textDecoration: "none", fontWeight: 600 }}
            href={verifyUrl}
          >
            Conferma l&apos;indirizzo
          </Button>
        </Section>
        <Hr style={{ borderColor: "#E5E7EB", margin: "24px 0" }} />
        <Text style={{ fontSize: "12px", color: "#9CA3AF", textAlign: "center" }}>
          Non ti sei registrato tu? Ignora questa email: senza conferma l&apos;account non può inviare nulla.
        </Text>
      </Container>
    </Body>
  </Html>
);
