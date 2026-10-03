"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, Save, KeyRound, Camera } from "lucide-react";
import { uploadFile } from "../../../components/upload";

interface Profile {
  name: string;
  email: string;
  handle: string;
  bio: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
}

const card = "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm";
const input = "mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base focus:border-ink focus:outline-none";

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

function Notice({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return <p className={`rounded-xl px-3 py-2 text-xs font-semibold ${tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{children}</p>;
}

export function ProfileForms({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [profileMsg, setProfileMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending("profile");
    const { ok, data } = await send("/api/account/profile", "PATCH", { name, bio, avatarUrl });
    setPending(null);
    setProfileMsg(ok ? { tone: "ok", text: "Profilo salvato" } : { tone: "error", text: data.error ?? "Salvataggio non riuscito" });
    if (ok) router.refresh();
  };

  const changeAvatar = async (file: File | undefined) => {
    if (!file) return;
    setPending("avatar");
    try {
      setAvatarUrl((await uploadFile(file, "image")).url);
      setProfileMsg({ tone: "ok", text: "Foto caricata: ricordati di salvare" });
    } catch (err) {
      setProfileMsg({ tone: "error", text: err instanceof Error ? err.message : "Caricamento non riuscito" });
    } finally {
      setPending(null);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending("password");
    const { ok, data } = await send("/api/account/password", "POST", { currentPassword, newPassword });
    setPending(null);
    if (ok) {
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMsg({ tone: "ok", text: "Password cambiata. Le altre sessioni sono state chiuse." });
    } else setPasswordMsg({ tone: "error", text: data.error ?? "Cambio non riuscito" });
  };

  const deleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm("Cancellare definitivamente l'account e tutti i dati? Non si torna indietro.")) return;
    setPending("delete");
    const { ok, data } = await send("/api/account/delete", "POST", { password: deletePassword, confirm: deleteConfirm });
    setPending(null);
    if (ok) window.location.assign("/");
    else setDeleteMsg(data.error ?? "Cancellazione non riuscita");
  };

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className={`${card} space-y-4`}>
        <h2 className="font-display text-lg font-extrabold text-gray-900">Profilo pubblico</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-saffron-100 text-xl font-bold text-ink-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            <Camera className="h-3.5 w-3.5" /> {pending === "avatar" ? "Caricamento..." : "Cambia foto"}
            <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => changeAvatar(e.target.files?.[0])} />
          </label>
          {avatarUrl && (
            <button type="button" onClick={() => setAvatarUrl(null)} className="text-xs font-semibold text-gray-500 hover:text-rose-600">
              Togli
            </button>
          )}
        </div>
        <label className="block text-sm font-semibold text-ink">
          Nome
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Bio
          <textarea className={input} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} />
        </label>
        <p className="text-xs text-gray-500">
          Email: <strong>{profile.email}</strong> {profile.emailVerified ? "(confermata)" : "(da confermare)"} · Nome utente: <strong>@{profile.handle}</strong>
        </p>
        {profileMsg && <Notice tone={profileMsg.tone}>{profileMsg.text}</Notice>}
        <button type="submit" disabled={pending !== null} className="flex items-center gap-2 rounded-xl bg-ink-600 px-4 py-2 text-sm font-bold text-white hover:bg-ink-700 disabled:opacity-50">
          <Save className="h-4 w-4" /> Salva profilo
        </button>
      </form>

      <form onSubmit={changePassword} className={`${card} space-y-4`}>
        <h2 className="font-display text-lg font-extrabold text-gray-900">Password</h2>
        <label className="block text-sm font-semibold text-ink">
          Password attuale
          <input className={input} type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Nuova password (almeno 10 caratteri)
          <input className={input} type="password" autoComplete="new-password" minLength={10} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </label>
        {passwordMsg && <Notice tone={passwordMsg.tone}>{passwordMsg.text}</Notice>}
        <button type="submit" disabled={pending !== null} className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <KeyRound className="h-4 w-4" /> Cambia password
        </button>
      </form>

      <section className={`${card} space-y-3`}>
        <h2 className="font-display text-lg font-extrabold text-gray-900">I tuoi dati</h2>
        <p className="text-sm text-gray-600">Scarica in un file tutto ciò che ZeroStack conserva su di te: account, pubblicazioni, articoli, abbonamenti, dati di fatturazione e iscrizioni.</p>
        <a href="/api/account/export" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
          <Download className="h-4 w-4" /> Scarica i miei dati
        </a>
      </section>

      <form onSubmit={deleteAccount} className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50/50 p-6">
        <h2 className="font-display text-lg font-extrabold text-rose-900">Cancella l&apos;account</h2>
        <p className="text-sm text-rose-900">
          Cancella per sempre account, pubblicazioni che possiedi con articoli e iscritti, e le tue iscrizioni alle newsletter. I tuoi abbonamenti a pagamento vengono
          disdetti subito.
        </p>
        <label className="block text-xs font-bold text-rose-900">
          Password
          <input className={input} type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} required />
        </label>
        <label className="block text-xs font-bold text-rose-900">
          Scrivi ELIMINA per confermare
          <input className={input} value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} required />
        </label>
        {deleteMsg && <Notice tone="error">{deleteMsg}</Notice>}
        <button type="submit" disabled={pending !== null || deleteConfirm !== "ELIMINA"} className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50">
          <Trash2 className="h-4 w-4" /> Cancella definitivamente
        </button>
      </form>
    </div>
  );
}
