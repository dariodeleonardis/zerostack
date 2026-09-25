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
  Link,
  Hr,
  Img,
  Button
} from "@react-email/components";

interface NewsletterEmailProps {
  publicationName: string;
  publicationLogoUrl?: string;
  postTitle: string;
  postSubtitle?: string;
  authorName: string;
  authorAvatarUrl?: string;
  publishedDate: string;
  contentHtml: string;
  postUrl: string;
  hasPaywall?: boolean;
  unsubscribeUrl: string;
  primaryColor?: string;
}

export const NewsletterEmail: React.FC<NewsletterEmailProps> = ({
  publicationName = "Tech & Futuro Italia",
  publicationLogoUrl,
  postTitle = "Il futuro del publishing indipendente",
  postSubtitle,
  authorName = "Dario De Leonardis",
  publishedDate = "25 Settembre 2026",
  contentHtml = "<p>Grazie per leggere questa edizione...</p>",
  postUrl = "https://zerostack.it",
  hasPaywall = false,
  unsubscribeUrl = "https://zerostack.it/unsubscribe",
  primaryColor = "#0066FF"
}) => {
  return (
    <Html lang="it">
      <Head />
      <Preview>{postTitle}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Header Pubblicazione */}
          <Section style={headerSection}>
            {publicationLogoUrl ? (
              <Img src={publicationLogoUrl} width="48" height="48" alt={publicationName} style={logoStyle} />
            ) : null}
            <Heading as="h3" style={{ ...publicationTitleStyle, color: primaryColor }}>
              {publicationName}
            </Heading>
          </Section>

          <Hr style={dividerStyle} />

          {/* Dettagli Articolo */}
          <Section style={contentSection}>
            <Heading as="h1" style={titleStyle}>
              {postTitle}
            </Heading>
            {postSubtitle && <Text style={subtitleStyle}>{postSubtitle}</Text>}

            <Text style={metaStyle}>
              Di <strong>{authorName}</strong> &bull; {publishedDate}
            </Text>

            {/* Corpo dell'articolo */}
            <div
              style={bodyContentStyle}
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            {/* Blocco Paywall se presente */}
            {hasPaywall && (
              <Section style={paywallBoxStyle}>
                <Heading as="h3" style={{ marginTop: 0 }}>
                  🔒 Continua a leggere con l'abbonamento Premium
                </Heading>
                <Text style={{ color: "#4B5563", fontSize: "15px" }}>
                  Questa edizione approfondita è riservata ai sostenitori di {publicationName}.
                </Text>
                <Button
                  style={{ ...buttonStyle, backgroundColor: primaryColor }}
                  href={postUrl}
                >
                  Sblocca l'articolo completo
                </Button>
              </Section>
            )}

            <Section style={{ textAlign: "center", marginTop: "32px" }}>
              <Button style={{ ...secondaryButtonStyle, borderColor: primaryColor, color: primaryColor }} href={postUrl}>
                Leggi o commenta sul web
              </Button>
            </Section>
          </Section>

          <Hr style={dividerStyle} />

          {/* Footer conforme GDPR */}
          <Section style={footerSection}>
            <Text style={footerText}>
              Ricevi questa email perché sei iscritto a <strong>{publicationName}</strong>.
            </Text>
            <Text style={footerText}>
              ZeroStack &bull; Piattaforma conforme al GDPR con server in Unione Europea.
            </Text>
            <Text style={footerLinks}>
              <Link href={postUrl} style={footerLink}>Visualizza nel browser</Link> &bull;{" "}
              <Link href={unsubscribeUrl} style={footerLink}>Disiscriviti con 1 clic</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const mainStyle = {
  backgroundColor: "#FAFAFA",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: "20px 0"
};

const containerStyle = {
  backgroundColor: "#FFFFFF",
  borderRadius: "8px",
  border: "1px solid #E5E7EB",
  maxWidth: "600px",
  margin: "0 auto",
  padding: "32px 28px"
};

const headerSection = {
  textAlign: "center" as const,
  marginBottom: "16px"
};

const logoStyle = {
  borderRadius: "8px",
  margin: "0 auto 8px"
};

const publicationTitleStyle = {
  fontSize: "20px",
  fontWeight: "700",
  letterSpacing: "-0.02em",
  margin: 0
};

const dividerStyle = {
  borderColor: "#E5E7EB",
  margin: "24px 0"
};

const contentSection = {
  padding: "0 4px"
};

const titleStyle = {
  fontSize: "28px",
  lineHeight: "1.25",
  fontWeight: "800",
  color: "#111827",
  marginBottom: "12px",
  letterSpacing: "-0.03em"
};

const subtitleStyle = {
  fontSize: "17px",
  lineHeight: "1.4",
  color: "#4B5563",
  marginBottom: "16px"
};

const metaStyle = {
  fontSize: "13px",
  color: "#6B7280",
  marginBottom: "24px"
};

const bodyContentStyle = {
  fontSize: "16px",
  lineHeight: "1.7",
  color: "#1F2937"
};

const paywallBoxStyle = {
  backgroundColor: "#F9FAFB",
  border: "1px solid #E5E7EB",
  borderRadius: "8px",
  padding: "24px",
  textAlign: "center" as const,
  marginTop: "24px"
};

const buttonStyle = {
  color: "#FFFFFF",
  borderRadius: "6px",
  padding: "12px 24px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
  marginTop: "12px"
};

const secondaryButtonStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid",
  borderRadius: "6px",
  padding: "10px 20px",
  fontWeight: "500",
  textDecoration: "none",
  display: "inline-block"
};

const footerSection = {
  textAlign: "center" as const,
  paddingTop: "8px"
};

const footerText = {
  fontSize: "12px",
  color: "#9CA3AF",
  margin: "4px 0"
};

const footerLinks = {
  fontSize: "12px",
  color: "#9CA3AF",
  marginTop: "12px"
};

const footerLink = {
  color: "#6B7280",
  textDecoration: "underline"
};
