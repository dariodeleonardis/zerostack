import React from "react";
import Link from "next/link";
import { PenSquare, Compass, Radio, MessageSquare, Inbox, ShieldCheck } from "lucide-react";

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Badge Made in Italy / 0% fee */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white shadow-sm">
              Z
            </span>
            <span>ZeroStack</span>
          </Link>
          <span className="hidden rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 md:inline-flex items-center gap-1 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" /> 0% Fee &bull; 100% Tuo
          </span>
        </div>

        {/* Navigation links */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/inbox"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            <Inbox className="h-4 w-4" />
            Posta
          </Link>
          <Link
            href="/notes"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            <MessageSquare className="h-4 w-4" />
            Note
          </Link>
          <Link
            href="/podcasts"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            <Radio className="h-4 w-4" />
            Podcast
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            <Compass className="h-4 w-4" />
            Esplora
          </Link>
        </nav>

        {/* Right CTA Actions */}
        {/* Right CTA Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
          >
            SuperAdmin
          </Link>
          <Link
            href="/studio"
            className="text-xs font-semibold text-gray-700 transition hover:text-gray-900"
          >
            Studio Creator
          </Link>
          <Link
            href="/account/subscriptions"
            className="text-xs font-semibold text-gray-500 transition hover:text-gray-900"
          >
            Abbonamenti
          </Link>
          <Link
            href="/account/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 hover:ring-2 hover:ring-blue-600 transition"
            title="Il tuo profilo"
          >
            D
          </Link>
          <Link
            href="/studio/posts/new"
            className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <PenSquare className="h-3.5 w-3.5" />
            <span>Scrivi</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
