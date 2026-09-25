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
    <aside aria-label="Consenso Privacy e Cookie GDPR" className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-4 shadow-xl sm:left-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex-1 text-sm text-gray-600">
          <p className="font-semibold text-gray-900">Privacy & Sovranità dei Dati (GDPR)</p>
          <p className="mt-1 text-xs leading-relaxed">
            ZeroStack non vende i tuoi dati e non usa cookie invasivi di terze parti. Tutti i dati restano sul server VPS scelto dal creator in conformità al Regolamento Europeo.
          </p>
        </div>
        <button
          onClick={handleAccept}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          <Check className="h-3.5 w-3.5" />
          Accetta
        </button>
      </div>
    </aside>
  );
};
