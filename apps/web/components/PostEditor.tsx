"use client";

import React, { useRef, useState } from "react";
import { audioDuration, uploadFile } from "./upload";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorContent, Node, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowLeft,
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  ImageIcon,
  Lock,
  Save,
  Send,
  Calendar,
  Mail,
  Check,
  ExternalLink,
  Mic,
  Trash2
} from "lucide-react";

// Il divisore del paywall: nel testo salvato diventa <hr class="paywall-divider" data-paywall="true">,
// lo stesso che la pagina articolo e il worker delle email usano per tagliare il testo.
const PaywallDivider = Node.create({
  name: "paywallDivider",
  group: "block",
  atom: true,
  selectable: true,
  // Priorità più alta dell'<hr> normale (50), altrimenti StarterKit se lo prende e perde l'attributo.
  parseHTML: () => [{ tag: "hr[data-paywall]", priority: 60 }],
  renderHTML: () => ["hr", { class: "paywall-divider", "data-paywall": "true" }]
});

export interface EditorPublication {
  id: string;
  name: string;
  role: "OWNER" | "EDITOR" | "CONTRIBUTOR";
}

export interface EditorPost {
  id: string;
  publicationId: string;
  title: string;
  subtitle: string | null;
  contentHtml: string;
  access: "FREE" | "PAID_SUBSCRIBERS" | "FOUNDING_MEMBERS" | "TIER_SPECIFIC";
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  scheduledAt: string | null;
  emailOnPublish: boolean;
  url: string;
  campaign: { status: string; sentCount: number; recipientsCount: number } | null;
  coverImageUrl: string | null;
  podcast: { audioUrl: string; durationSeconds: number } | null;
}

type Action = "draft" | "schedule" | "publish";

// <input type="datetime-local"> lavora nell'ora locale del browser, senza fuso.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`rounded-lg p-2 transition disabled:opacity-40 ${active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const hasPaywall = editor.getHTML().includes("data-paywall");

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Indirizzo del link (vuoto per toglierlo)", previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const addImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const media = await uploadFile(file, "image");
      editor.chain().focus().setImage({ src: media.url, alt: file.name.replace(/\.[^.]+$/, "") }).run();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Caricamento non riuscito");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-gray-200 bg-white/95 px-2 py-1.5 backdrop-blur">
      <ToolbarButton title="Grassetto" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Corsivo" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Titolo di sezione" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Sottotitolo di sezione" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Elenco puntato" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Elenco numerato" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Citazione" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Link" active={editor.isActive("link")} onClick={setLink}>
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title={uploading ? "Caricamento..." : "Inserisci un'immagine"} disabled={uploading} onClick={() => fileInput.current?.click()}>
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => addImage(e.target.files?.[0])} />
      <span className="mx-1 h-5 w-px bg-gray-200" />
      <button
        type="button"
        disabled={hasPaywall}
        onClick={() => editor.chain().focus().insertContent([{ type: "paywallDivider" }, { type: "paragraph" }]).run()}
        title="Quello che scrivi sotto il divisore lo leggono solo gli abbonati paganti"
        className="flex items-center gap-1.5 rounded-lg border border-saffron-200 bg-saffron-50 px-2.5 py-1.5 text-xs font-bold text-ink-700 hover:bg-saffron-100 disabled:opacity-40"
      >
        <Lock className="h-3.5 w-3.5" />
        {hasPaywall ? "Paywall inserito" : "Inserisci paywall"}
      </button>
    </div>
  );
}

const STATUS_LABEL: Record<EditorPost["status"], string> = {
  DRAFT: "Bozza",
  SCHEDULED: "Programmato",
  PUBLISHED: "Pubblicato",
  ARCHIVED: "Archiviato"
};

export function PostEditor({ publications, post }: { publications: EditorPublication[]; post?: EditorPost }) {
  const router = useRouter();
  const [publicationId, setPublicationId] = useState(post?.publicationId ?? publications[0]?.id ?? "");
  const [title, setTitle] = useState(post?.title ?? "");
  const [subtitle, setSubtitle] = useState(post?.subtitle ?? "");
  const [access, setAccess] = useState<"FREE" | "PAID_SUBSCRIBERS">(post && post.access !== "FREE" ? "PAID_SUBSCRIBERS" : "FREE");
  const [sendEmail, setSendEmail] = useState(post ? post.status !== "SCHEDULED" || post.emailOnPublish : true);
  const [scheduledAt, setScheduledAt] = useState(toLocalInput(post?.scheduledAt ?? null));
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(post?.coverImageUrl ?? null);
  const [podcast, setPodcast] = useState<{ audioUrl: string; durationSeconds: number } | null>(post?.podcast ?? null);
  const [mediaBusy, setMediaBusy] = useState<"cover" | "audio" | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isPublished = post?.status === "PUBLISHED";
  const role = publications.find((p) => p.id === publicationId)?.role;
  const canPublish = role === "OWNER" || role === "EDITOR";

  const editor = useEditor({
    // Il server non ha un DOM: l'editor si crea solo nel browser, niente differenze di idratazione.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      LinkExtension.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Image,
      Placeholder.configure({ placeholder: "Scrivi qui il tuo articolo…" }),
      PaywallDivider
    ],
    content: post?.contentHtml ?? "",
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none min-h-[420px] px-4 py-4 font-serif text-gray-900 focus:outline-none"
      }
    }
  });

  const uploadCover = async (file: File | undefined) => {
    if (!file) return;
    setMediaBusy("cover");
    setError(null);
    try {
      setCoverImageUrl((await uploadFile(file, "image")).url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Caricamento non riuscito");
    } finally {
      setMediaBusy(null);
    }
  };

  const uploadAudio = async (file: File | undefined) => {
    if (!file) return;
    setMediaBusy("audio");
    setError(null);
    try {
      const [media, durationSeconds] = await Promise.all([uploadFile(file, "audio"), audioDuration(file)]);
      setPodcast({ audioUrl: media.url, durationSeconds });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Caricamento non riuscito");
    } finally {
      setMediaBusy(null);
    }
  };

  const save = async (action: Action) => {
    if (!editor) return;
    setError(null);
    setNotice(null);
    if (action === "publish" && !isPublished && sendEmail && !window.confirm("Pubblicare adesso e inviare l'email a tutti gli iscritti?")) return;

    setPending(action);
    try {
      const res = await fetch(post ? `/api/posts/${post.id}` : "/api/posts", {
        method: post ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicationId,
          title,
          subtitle: subtitle || undefined,
          contentHtml: editor.getHTML(),
          access,
          action,
          sendEmail,
          scheduledAt: action === "schedule" && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          coverImageUrl,
          podcast
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Salvataggio non riuscito");
        return;
      }
      if (action === "draft") setNotice("Bozza salvata");
      else if (action === "schedule") setNotice("Programmato: uscirà all'ora scelta");
      else setNotice(isPublished ? "Articolo aggiornato" : data.campaignId ? "Pubblicato: l'invio email è partito" : "Pubblicato");

      if (!post) router.replace(`/studio/posts/${data.post.id}`);
      else router.refresh();
    } catch {
      setError("Connessione non riuscita. Riprova.");
    } finally {
      setPending(null);
    }
  };

  if (publications.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">Prima crea una pubblicazione</h1>
        <p className="mt-2 text-sm text-gray-600">Ogni articolo appartiene a una pubblicazione con il suo indirizzo e i suoi iscritti.</p>
        <Link href="/studio/publications/new" className="mt-6 inline-block rounded-xl bg-ink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-ink-700">
          Crea la pubblicazione
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/studio" className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Pannello
          </Link>
          {post && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-700">{STATUS_LABEL[post.status]}</span>
          )}
          {isPublished && post && (
            <a href={post.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-ink-600 hover:underline">
              Apri <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isPublished && (
            <button
              type="button"
              onClick={() => save("draft")}
              disabled={pending !== null || !editor}
              className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {pending === "draft" ? "Salvataggio..." : "Salva bozza"}
            </button>
          )}
          <button
            type="button"
            onClick={() => save("publish")}
            disabled={pending !== null || !editor || !canPublish}
            title={canPublish ? undefined : "Solo proprietari ed editor possono pubblicare"}
            className="flex items-center gap-2 rounded-xl bg-ink-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-ink-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {pending === "publish" ? "Invio..." : isPublished ? "Aggiorna" : sendEmail ? "Pubblica e invia" : "Pubblica"}
          </button>
        </div>
      </div>

      {(error || notice) && (
        <div
          role="status"
          className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {!error && <Check className="h-4 w-4" />}
          {error ?? notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <input
            type="text"
            placeholder="Titolo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full border-none bg-transparent font-display text-4xl font-extrabold tracking-tight text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-0"
          />
          <input
            type="text"
            placeholder="Sottotitolo (facoltativo)"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            maxLength={300}
            className="w-full border-none bg-transparent text-lg font-medium text-gray-600 placeholder-gray-300 focus:outline-none focus:ring-0"
          />
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {editor ? <Toolbar editor={editor} /> : <div className="h-11 border-b border-gray-200" />}
            <EditorContent editor={editor} />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="border-b border-gray-100 pb-3 text-sm font-bold text-gray-900">Pubblicazione</h3>
            <select
              value={publicationId}
              onChange={(e) => setPublicationId(e.target.value)}
              disabled={Boolean(post)}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
            >
              {publications.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="border-b border-gray-100 pb-3 text-sm font-bold text-gray-900">Copertina e podcast</h3>
            <div className="mt-4 space-y-4">
              {coverImageUrl ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImageUrl} alt="Copertina" className="aspect-video w-full rounded-lg object-cover" />
                  <button type="button" onClick={() => setCoverImageUrl(null)} className="mt-2 flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-rose-600">
                    <Trash2 className="h-3.5 w-3.5" /> Togli copertina
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-4 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                  <ImageIcon className="h-4 w-4" /> {mediaBusy === "cover" ? "Caricamento..." : "Carica una copertina"}
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" disabled={mediaBusy !== null} onChange={(e) => uploadCover(e.target.files?.[0])} />
                </label>
              )}

              {podcast ? (
                <div>
                  <audio controls src={podcast.audioUrl} className="w-full" />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Episodio podcast{podcast.durationSeconds ? ` · ${Math.floor(podcast.durationSeconds / 60)} min ${podcast.durationSeconds % 60} s` : ""} · finisce nel feed per Apple Podcasts e Spotify se l&apos;articolo è gratuito
                  </p>
                  <button type="button" onClick={() => setPodcast(null)} className="mt-1 flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-rose-600">
                    <Trash2 className="h-3.5 w-3.5" /> Togli audio
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-4 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                  <Mic className="h-4 w-4" /> {mediaBusy === "audio" ? "Caricamento audio..." : "Aggiungi un audio (podcast)"}
                  <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav" className="hidden" disabled={mediaBusy !== null} onChange={(e) => uploadAudio(e.target.files?.[0])} />
                </label>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="border-b border-gray-100 pb-3 text-sm font-bold text-gray-900">Chi può leggere</h3>
            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-700">
                <input type="radio" name="access" checked={access === "FREE"} onChange={() => setAccess("FREE")} />
                <span>Tutti i lettori</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-700">
                <input type="radio" name="access" checked={access === "PAID_SUBSCRIBERS"} onChange={() => setAccess("PAID_SUBSCRIBERS")} />
                <span className="flex items-center gap-1 text-ink-700">
                  <Lock className="h-3 w-3" /> Solo abbonati paganti
                </span>
              </label>
              {access === "PAID_SUBSCRIBERS" && (
                <p className="text-[11px] leading-relaxed text-gray-500">
                  Con il divisore del paywall chi non paga legge la parte sopra. Senza divisore vede solo titolo e invito ad abbonarsi.
                </p>
              )}
            </div>
          </div>

          {!isPublished && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="border-b border-gray-100 pb-3 text-sm font-bold text-gray-900">Invio</h3>
              <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-700">
                <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-ink-600" /> Invia per email agli iscritti
                </span>
              </label>

              <div className="mt-5 border-t border-gray-100 pt-4">
                <label className="text-xs font-semibold text-gray-700" htmlFor="scheduledAt">
                  Oppure programma l'uscita
                </label>
                <input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => save("schedule")}
                  disabled={pending !== null || !editor || !scheduledAt || !canPublish}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Calendar className="h-4 w-4" /> {pending === "schedule" ? "Salvataggio..." : "Programma"}
                </button>
              </div>
            </div>
          )}

          {post?.campaign && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-xs text-gray-600 shadow-sm">
              <h3 className="border-b border-gray-100 pb-3 text-sm font-bold text-gray-900">Email</h3>
              <p className="mt-3">
                Stato: <strong>{post.campaign.status}</strong> — {post.campaign.sentCount} inviate su {post.campaign.recipientsCount}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
