"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Lock, Eye, Mail, Calendar, Sparkles, Check } from "lucide-react";
import Link from "next/link";

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [access, setAccess] = useState<"FREE" | "PAID_SUBSCRIBERS">("FREE");
  const [sendEmail, setSendEmail] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  const insertPaywallDivider = () => {
    const dividerTag = "\n\n<!-- PAYWALL DIVIDER -->\n<hr class=\"paywall-divider\" data-paywall=\"true\" />\n\n";
    setContent((prev) => prev + dividerTag);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("Inserisci almeno un titolo e il contenuto del post.");
      return;
    }

    setIsPublishing(true);

    try {
      // Simula chiamata di pubblicazione e invio email
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subtitle,
          contentHtml: content.replace(/\n/g, "<br/>"),
          hasPaywall: content.includes("paywall-divider"),
          sendEmail
        })
      });

      if (res.ok) {
        setPublishedSuccess(true);
        setTimeout(() => {
          router.push("/studio");
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      alert("Errore nella pubblicazione del post.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Top action bar */}
      <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <Link
          href="/studio"
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Torna al Pannello
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={insertPaywallDivider}
            className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition shadow-sm"
            title="Tutto ciò che sta sotto questo divisore sarà visibile solo a chi sottoscrive un abbonamento a pagamento"
          >
            <Lock className="h-3.5 w-3.5" />
            Inserisci Blocco Paywall
          </button>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {publishedSuccess ? (
              <>
                <Check className="h-4 w-4" /> Pubblicato!
              </>
            ) : isPublishing ? (
              "Invio in corso..."
            ) : (
              <>
                <Send className="h-4 w-4" /> Pubblica & Invia
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <input
            type="text"
            placeholder="Titolo dell'articolo o della newsletter..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-none bg-transparent text-3xl font-black text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-0"
          />

          <input
            type="text"
            placeholder="Sottotitolo descrittivo..."
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full border-none bg-transparent text-lg font-medium text-gray-600 placeholder-gray-300 focus:outline-none focus:ring-0"
          />

          <hr className="border-gray-200" />

          <textarea
            placeholder="Scrivi qui il tuo articolo, newsletter o note... Puoi formattare con HTML o Markdown. Usa il pulsante 'Inserisci Blocco Paywall' per nascondere la seconda parte del post ai non abbonati."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={18}
            className="w-full resize-y rounded-xl border border-gray-200 p-4 font-serif text-base leading-relaxed text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Sidebar Impostazioni di Invio */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-3">
              Destinatari & Accesso
            </h3>

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="access"
                  checked={access === "FREE"}
                  onChange={() => setAccess("FREE")}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Tutti i lettori (Pubblico & Gratuito)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="access"
                  checked={access === "PAID_SUBSCRIBERS"}
                  onChange={() => setAccess("PAID_SUBSCRIBERS")}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1 text-purple-700">
                  <Lock className="h-3 w-3" /> Solo Abbonati a Pagamento
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-3">
              Invio Email Newsletter
            </h3>

            <div className="mt-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-600" /> Invia email a tutti gli iscritti
                </span>
              </label>
              <p className="mt-2 text-[11px] text-gray-400">
                L'email verrà recapitata con il template responsive di ZeroStack rispettando le direttive antispam e il GDPR.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
