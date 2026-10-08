import * as React from "react";
import { Html, Head, Preview, Body, Container, Section, Text, Heading, Hr, Button } from "react-email";

/**
 * Cornice delle email della piattaforma (conferma dell'indirizzo, nuova password), nello stile del
 * sito: inchiostro, carta e zafferano, Bodoni per il marchio e i titoli (apps/web/tailwind.config.js).
 * I caratteri del sito non si caricano nelle email: si ripiega su Didot/Georgia e su Helvetica/Arial.
 * Le email delle pubblicazioni usano invece i colori dell'autore.
 */
export const ZS = {
  ink: "#141210",
  inkSoft: "#5E574C",
  muted: "#7A7265",
  paper: "#F6F1E7",
  card: "#FBF8F2",
  rule: "#E4DED2",
  saffron: "#F2B705",
  display: '"Bodoni Moda", Didot, "Bodoni 72", Georgia, serif',
  sans: 'Archivo, "Helvetica Neue", Helvetica, Arial, sans-serif'
};

export function PlatformEmail({ preview, title, children, note }: { preview: string; title: string; children: React.ReactNode; note: string }) {
  return (
    <Html lang="it">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: ZS.paper, margin: 0, padding: "24px 0", fontFamily: ZS.sans, color: ZS.ink }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: ZS.card, border: `1px solid ${ZS.rule}` }}>
          <Section style={{ backgroundColor: ZS.ink, padding: "18px 32px", borderBottom: `3px solid ${ZS.saffron}` }}>
            <Text style={{ margin: 0, fontFamily: ZS.display, fontSize: "26px", lineHeight: 1, color: ZS.paper, letterSpacing: "-0.5px" }}>
              <span style={{ fontWeight: 800 }}>Zero</span>
              <span style={{ fontStyle: "italic" }}>Stack</span>
              <span style={{ color: ZS.saffron }}>.</span>
            </Text>
          </Section>
          <Section style={{ padding: "32px" }}>
            <Heading as="h1" style={{ fontFamily: ZS.display, fontSize: "30px", fontWeight: 800, lineHeight: 1.15, color: ZS.ink, margin: "0 0 16px" }}>
              {title}
            </Heading>
            {children}
            <Hr style={{ borderTop: `1px solid ${ZS.rule}`, margin: "28px 0 16px" }} />
            <Text style={{ fontSize: "12px", lineHeight: 1.5, color: ZS.muted, margin: 0 }}>{note}</Text>
          </Section>
        </Container>
        <Text style={{ textAlign: "center", fontSize: "11px", color: ZS.muted, margin: "16px 0 0" }}>
          ZeroStack · newsletter, blog e podcast indipendenti · zerostack.it
        </Text>
      </Body>
    </Html>
  );
}

export function PlatformText({ children, small = false }: { children: React.ReactNode; small?: boolean }) {
  return <Text style={{ fontSize: small ? "14px" : "16px", lineHeight: 1.6, color: small ? ZS.inkSoft : ZS.ink, margin: "0 0 14px" }}>{children}</Text>;
}

export function PlatformButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ margin: "26px 0" }}>
      <Button
        href={href}
        style={{ backgroundColor: ZS.saffron, color: ZS.ink, padding: "13px 26px", borderRadius: "999px", fontWeight: 700, fontSize: "15px", textDecoration: "none" }}
      >
        {children}
      </Button>
    </Section>
  );
}
