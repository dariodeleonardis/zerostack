"use client";

import React, { useState } from "react";
import { MailWarning } from "lucide-react";

export function VerifyEmailBanner({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const resend = async () => {
    setState("sending");
    const res = await fetch("/api/auth/verify-email/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setState("sent");
    else {
      setState("error");
      setMessage(data.error ?? "Invio non riuscito");
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2">
        <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Conferma <strong>{email}</strong> con il link che ti abbiamo mandato: finché non lo fai puoi scrivere e pubblicare, ma non inviare
          newsletter né collegare Stripe.
        </span>
      </p>
      {state === "sent" ? (
        <span className="text-xs font-bold">Email inviata</span>
      ) : (
        <button type="button" onClick={resend} disabled={state === "sending"} className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50">
          {state === "sending" ? "Invio..." : "Rimanda l'email"}
        </button>
      )}
      {state === "error" && <span className="text-xs font-semibold text-rose-700">{message}</span>}
    </div>
  );
}
