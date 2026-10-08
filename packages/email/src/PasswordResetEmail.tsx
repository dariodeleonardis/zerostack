import * as React from "react";
import { PlatformButton, PlatformEmail, PlatformText } from "./PlatformLayout";

interface PasswordResetEmailProps {
  name?: string;
  resetUrl: string;
  validMinutes: number;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({ name, resetUrl, validMinutes }) => (
  <PlatformEmail
    preview="Imposta una nuova password per ZeroStack"
    title="Nuova password"
    note="Non hai chiesto tu il cambio? Ignora questa email: la password attuale resta valida."
  >
    <PlatformText>
      Ciao{name ? ` ${name}` : ""}, abbiamo ricevuto una richiesta per reimpostare la password del tuo account ZeroStack.
    </PlatformText>
    <PlatformButton href={resetUrl}>Scegli una nuova password</PlatformButton>
    <PlatformText small>
      Il link vale {validMinutes} minuti e si può usare una volta sola. Dopo il cambio, tutte le sessioni aperte verranno chiuse.
    </PlatformText>
  </PlatformEmail>
);
