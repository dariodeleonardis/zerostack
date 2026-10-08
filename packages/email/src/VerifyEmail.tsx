import * as React from "react";
import { PlatformButton, PlatformEmail, PlatformText } from "./PlatformLayout";

interface VerifyEmailProps {
  name?: string;
  verifyUrl: string;
}

export const VerifyEmail: React.FC<VerifyEmailProps> = ({ name, verifyUrl }) => (
  <PlatformEmail
    preview="Conferma il tuo indirizzo email su ZeroStack"
    title="Conferma la tua email"
    note="Non ti sei registrato tu? Ignora questa email: senza conferma l'account non può inviare nulla."
  >
    <PlatformText>
      Ciao{name ? ` ${name}` : ""}, benvenuto su ZeroStack. Conferma che questo indirizzo è tuo: servirà per inviare le tue newsletter e ricevere i pagamenti.
    </PlatformText>
    <PlatformButton href={verifyUrl}>Conferma l&apos;indirizzo</PlatformButton>
    <PlatformText small>Il link vale 48 ore.</PlatformText>
  </PlatformEmail>
);
