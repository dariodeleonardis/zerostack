import * as React from "react";
import { Html, Head, Preview, Body, Container, Section, Text, Heading, Hr, Button } from "@react-email/components";

interface PasswordResetEmailProps {
  name?: string;
  resetUrl: string;
  validMinutes: number;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({ name, resetUrl, validMinutes }) => (
  <Html lang="it">
    <Head />
    <Preview>Imposta una nuova password per ZeroStack</Preview>
    <Body style={{ backgroundColor: "#F9FAFB", padding: "20px 0", fontFamily: "sans-serif" }}>
      <Container style={{ backgroundColor: "#FFFFFF", padding: "32px", borderRadius: "8px", maxWidth: "560px", margin: "0 auto", border: "1px solid #E5E7EB" }}>
        <Heading as="h2" style={{ color: "#111827", marginTop: 0 }}>
          Nuova password
        </Heading>
        <Text style={{ fontSize: "16px", color: "#374151", lineHeight: 1.6 }}>
          Ciao {name || ""}, abbiamo ricevuto una richiesta per reimpostare la password del tuo account ZeroStack.
        </Text>
        <Section style={{ textAlign: "center", margin: "28px 0" }}>
          <Button
            style={{ backgroundColor: "#111827", color: "#FFFFFF", padding: "12px 28px", borderRadius: "6px", textDecoration: "none", fontWeight: 600 }}
            href={resetUrl}
          >
            Scegli una nuova password
          </Button>
        </Section>
        <Text style={{ fontSize: "14px", color: "#4B5563", lineHeight: 1.6 }}>
          Il link vale {validMinutes} minuti e si può usare una volta sola. Dopo il cambio, tutte le sessioni aperte verranno chiuse.
        </Text>
        <Hr style={{ borderColor: "#E5E7EB", margin: "24px 0" }} />
        <Text style={{ fontSize: "12px", color: "#9CA3AF", textAlign: "center" }}>
          Non hai chiesto tu il cambio? Ignora questa email: la password attuale resta valida.
        </Text>
      </Container>
    </Body>
  </Html>
);
