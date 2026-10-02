import React from "react";
import LoginClient from "./LoginClient";
import { GoogleButton } from "../../components/GoogleButton";

// Dinamica: il pulsante di Google dipende dalle chiavi lette a ogni richiesta, non alla build.
export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }: { searchParams: { next?: string; errore?: string } }) {
  return <LoginClient google={<GoogleButton next={searchParams.next} error={searchParams.errore} />} />;
}
