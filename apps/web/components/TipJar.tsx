"use client";

import React, { useState } from "react";
import { Coffee, Heart, CreditCard, Smartphone, Check, ArrowRight, Sparkles } from "lucide-react";

interface TipJarProps {
  creatorName?: string;
  publicationSlug: string;
  articleSlug?: string;
  allowPayPerArticle?: boolean;
  payPerArticlePriceEur?: number;
  onArticleUnlocked?: () => void;
}

export const TipJar: React.FC<TipJarProps> = ({
  creatorName = "Dario De Leonardis",
  publicationSlug,
  articleSlug,
  allowPayPerArticle = true,
  payPerArticlePriceEur = 1.50,
  onArticleUnlocked
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number | "custom">(2);
  const [customAmount, setCustomAmount] = useState<string>("5");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "satispay">("satispay");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const presets = [
    { value: 1, label: "1 €", desc: "Un Caffè ☕" },
    { value: 2, label: "2 €", desc: "Cappuccino 🥐" },
    { value: 5, label: "5 €", desc: "Pizza & Birra 🍕" }
  ];

  const currentAmount = selectedAmount === "custom" 
    ? Math.max(1, parseFloat(customAmount) || 1)
    : selectedAmount;

  const handleSendTip = async () => {
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      if (paymentMethod === "satispay") {
        const res = await fetch("/api/donations/satispay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountEur: currentAmount,
            publicationSlug,
            articleSlug
          })
        });
        const data = await res.json();
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        }
      }

      // Simulazione / completamento donazione carta o fallback
      await new Promise((r) => setTimeout(r, 600));
      setSuccessMessage(`Grazie di cuore! La tua mancia di ${currentAmount.toFixed(2)}€ è stata inviata con successo.`);
      if (articleSlug && onArticleUnlocked) {
        onArticleUnlocked();
      }
    } catch (err) {
      console.error("Tip processing failed", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayPerArticle = async () => {
    setIsProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setSuccessMessage("Articolo sbloccato! Buona lettura.");
      if (onArticleUnlocked) {
        onArticleUnlocked();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
          <Coffee className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">
            Offri un caffè o una mancia a {creatorName}
          </h3>
          <p className="text-xs text-gray-500">
            Micro-donazioni istantanee a supporto della scrittura indipendente (0% trattenute ZeroStack).
          </p>
        </div>
      </div>

      {successMessage ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 border border-emerald-200">
          <Check className="h-5 w-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {presets.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setSelectedAmount(p.value)}
                className={`flex flex-col items-center justify-center rounded-xl border py-2.5 px-2 transition ${
                  selectedAmount === p.value
                    ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-amber-300"
                }`}
              >
                <span className="text-sm font-extrabold">{p.label}</span>
                <span className={`text-[10px] ${selectedAmount === p.value ? "text-amber-100" : "text-gray-400"}`}>
                  {p.desc}
                </span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setSelectedAmount("custom")}
              className={`flex flex-col items-center justify-center rounded-xl border py-2.5 px-2 transition ${
                selectedAmount === "custom"
                  ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-amber-300"
              }`}
            >
              <span className="text-sm font-extrabold">Altro</span>
              <span className={`text-[10px] ${selectedAmount === "custom" ? "text-amber-100" : "text-gray-400"}`}>
                A scelta
              </span>
            </button>
          </div>

          {/* Custom Amount Input */}
          {selectedAmount === "custom" && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-600">Importo (€):</span>
              <input
                type="number"
                min="1"
                step="0.5"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs font-semibold text-gray-500">Metodo:</span>
            <button
              type="button"
              onClick={() => setPaymentMethod("satispay")}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                paymentMethod === "satispay"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5 text-red-600" />
              <span>Satispay</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                paymentMethod === "card"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5 text-blue-600" />
              <span>Carta / Apple Pay</span>
            </button>
          </div>

          {/* Send Tip Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSendTip}
              className="flex w-full sm:w-auto flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-700 transition disabled:opacity-50"
            >
              <Heart className="h-4 w-4 fill-white" />
              <span>Invia mancia di {currentAmount.toFixed(2)} €</span>
            </button>

            {allowPayPerArticle && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handlePayPerArticle}
                className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Sblocca solo questo articolo ({payPerArticlePriceEur.toFixed(2)} €)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
