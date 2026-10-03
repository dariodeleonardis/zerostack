"use client";

import React, { useState } from "react";
import { Share2, Check } from "lucide-react";

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Appunti non disponibili (http o permesso negato): niente da fare.
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1 rounded-full border border-gray-200 p-2 text-xs text-gray-600 hover:bg-gray-50"
      title="Copia link"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
    </button>
  );
}
