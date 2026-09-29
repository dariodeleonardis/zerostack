"use client";

import React, { useState, useEffect } from "react";
import { Shield, Check } from "lucide-react";

export const GdprBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("zerostack_gdpr_consent");
    if (!consent) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("zerostack_gdpr_consent", "accepted");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <aside aria-label="Informativa cookie" className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-4 shadow-xl sm:left-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex-1 text-sm text-gray-600">
          <p className="font-semibold text-gray-900">Cookie e privacy</p>
          <p className="mt-1 text-xs leading-relaxed">
            Usiamo solo cookie tecnici per tenerti collegato: niente profilazione né tracciamento di terze parti.{" "}
            <a href="/cookie" className="underline">Dettagli</a> · <a href="/privacy" className="underline">Privacy</a>
          </p>
        </div>
        <button
          onClick={handleAccept}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          <Check className="h-3.5 w-3.5" />
          Ho capito
        </button>
      </div>
    </aside>
  );
};
