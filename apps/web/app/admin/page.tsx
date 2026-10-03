import React from "react";
import { prisma } from "@zerostack/database";
import { checkHealth, type Check as HealthCheck } from "../../lib/health";
import { AdminAction } from "./AdminAction";
import { CourtesyPanel } from "./CourtesyPanel";
import { COURTESY_MESSAGE_MAX, DEFAULT_COURTESY_MESSAGE, getCourtesy } from "../../lib/courtesy";
import { LegalPanel } from "./LegalPanel";
import { LEGAL_LIMITS, legalEntity } from "../../lib/legal";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 font-display text-4xl font-extrabold tracking-tight text-gray-900">{new Intl.NumberFormat("it-IT").format(value)}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Check({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={ok ? "text-emerald-600" : "text-amber-600"}>{ok ? "✓" : "!"}</span>
      <span>
        <strong className="text-gray-900">{label}</strong> <span className="text-gray-500">— {detail}</span>
      </span>
    </li>
  );
}

const HEALTH_LABELS: Record<string, string> = { database: "Database", redis: "Redis", worker: "Worker (newsletter e post programmati)", backup: "Backup", offsite: "Copia dei backup su Google Drive" };

function ago(seconds?: number): string {
  if (seconds === undefined) return "";
  if (seconds < 120) return ` · ${seconds} s fa`;
  if (seconds < 7200) return ` · ${Math.round(seconds / 60)} min fa`;
  return ` · ${Math.round(seconds / 3600)} ore fa`;
}

function describe(c: HealthCheck): string {
  const base = c.state === "ok" ? "funziona" : c.state === "skipped" ? "non attivo" : "problema";
  return `${base}${c.detail ? `: ${c.detail}` : ""}${ago(c.ageSeconds)}`;
}

export default async function AdminOverviewPage() {
  const [health, courtesy, legal] = await Promise.all([checkHealth(), getCourtesy(), legalEntity()]);
  // "[da completare]" non va riproposto come valore: il campo resta vuoto da riempire.
  const legalInput = (v: string) => (v === "[da completare]" ? "" : v);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [users, unverified, suspendedUsers, publications, suspendedPubs, subscribers, paid, sent, failedCampaigns] = await Promise.all([
    prisma.user.count(),
    // Gli amministratori non si contano: è il pannello che stanno guardando (Dario, 1/10).
    prisma.user.count({ where: { emailVerified: null, role: { notIn: ["ADMIN", "SUPERADMIN"] } } }),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
    prisma.publication.count(),
    prisma.publication.count({ where: { suspendedAt: { not: null } } }),
    prisma.newsletterSubscriber.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { isPaid: true, status: { in: ["ACTIVE", "TRIALING"] } } }),
    prisma.emailDelivery.count({ where: { status: "SENT", createdAt: { gte: monthAgo } } }),
    prisma.emailCampaign.count({ where: { status: "FAILED" } })
  ]);

  const env = process.env;
  const provider = (env.EMAIL_PROVIDER || "log").toLowerCase();
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Panoramica</h1>
      <CourtesyPanel
        enabled={courtesy.enabled}
        customMessage={courtesy.customMessage}
        defaultMessage={DEFAULT_COURTESY_MESSAGE}
        maxLength={COURTESY_MESSAGE_MAX}
      />
      <LegalPanel
        initial={{ name: legalInput(legal.name), vat: legalInput(legal.vat), address: legalInput(legal.address), email: legalInput(legal.email) }}
        updatedAt={legal.updatedAt}
        limits={LEGAL_LIMITS}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Utenti" value={users} hint={`${unverified} senza email confermata · ${suspendedUsers} sospesi`} />
        <Stat label="Pubblicazioni" value={publications} hint={`${suspendedPubs} sospese`} />
        <Stat label="Iscritti attivi" value={subscribers} hint={`${paid} abbonamenti pagati`} />
        <Stat label="Email inviate" value={sent} hint={`ultimi 30 giorni · ${failedCampaigns} campagne interrotte`} />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Stato del sistema</h2>
        <p className="mt-1 text-xs text-gray-500">Lo stesso controllo è su /api/health: collegalo a un servizio di monitoraggio per ricevere un avviso se qualcosa si ferma.</p>
        <ul className="mt-4 space-y-2">
          {Object.entries(health.checks).map(([name, c]) => (
            <Check key={name} ok={c.state !== "fail"} label={HEALTH_LABELS[name] ?? name} detail={describe(c)} />
          ))}
          <Check
            ok={Boolean(env.ERROR_REPORTING_DSN || env.SENTRY_DSN)}
            label="Segnalazione errori"
            detail={env.ERROR_REPORTING_DSN || env.SENTRY_DSN ? "attiva (Sentry/GlitchTip)" : "manca ERROR_REPORTING_DSN: gli errori restano solo nei log"}
          />
        </ul>
        <div className="mt-4">
          <AdminAction url="/api/admin/test-error" body={{}} label="Invia un errore di prova" showMessage />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Configurazione</h2>
        <ul className="mt-4 space-y-2">
          <Check ok={provider !== "log"} label="Invio email" detail={provider === "log" ? "EMAIL_PROVIDER non impostato: le email non partono" : `provider ${provider}`} />
          <Check ok={Boolean(env.EMAIL_WEBHOOK_TOKEN || env.RESEND_WEBHOOK_SECRET)} label="Webhook rimbalzi" detail={env.EMAIL_WEBHOOK_TOKEN || env.RESEND_WEBHOOK_SECRET ? "configurato" : "manca EMAIL_WEBHOOK_TOKEN (o RESEND_WEBHOOK_SECRET)"} />
          <Check ok={Boolean(env.STRIPE_SECRET_KEY)} label="Pagamenti Stripe" detail={env.STRIPE_SECRET_KEY ? "chiave presente" : "manca STRIPE_SECRET_KEY"} />
          <Check ok={Boolean(env.STRIPE_WEBHOOK_SECRET || env.STRIPE_CONNECT_WEBHOOK_SECRET)} label="Webhook Stripe" detail={env.STRIPE_WEBHOOK_SECRET || env.STRIPE_CONNECT_WEBHOOK_SECRET ? "segreto presente" : "manca il segreto: gli abbonamenti non si attivano"} />
          <Check ok label="File caricati" detail={(env.STORAGE_DRIVER || "local") === "s3" ? `S3 (${env.S3_BUCKET ?? "?"})` : `disco del server (${env.UPLOAD_DIR || "./uploads"}): da includere nei backup`} />
          <Check ok={Boolean(env.LEGAL_ENTITY_NAME && env.LEGAL_VAT_NUMBER && env.LEGAL_CONTACT_EMAIL)} label="Pagine legali" detail={env.LEGAL_ENTITY_NAME ? "dati del gestore presenti" : "mancano LEGAL_ENTITY_NAME, LEGAL_VAT_NUMBER, LEGAL_ADDRESS, LEGAL_CONTACT_EMAIL"} />
        </ul>
      </section>
    </div>
  );
}
