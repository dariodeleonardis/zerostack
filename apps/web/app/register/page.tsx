import React from "react";
import RegisterClient from "./RegisterClient";
import { GoogleButton } from "../../components/GoogleButton";

// Dinamica: il pulsante di Google dipende dalle chiavi lette a ogni richiesta, non alla build.
export const dynamic = "force-dynamic";

export default function RegisterPage({ searchParams }: { searchParams: { next?: string; errore?: string } }) {
  return (
    <RegisterClient
      google={<GoogleButton next={searchParams.next} error={searchParams.errore} label="Registrati con Google" />}
    />
  );
}
