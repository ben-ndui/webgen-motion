import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Layout partagé pour les pages légales — DA noir & blanc strict
 * alignée landing. Header sticky minimal, contenu lisible centré,
 * footer simple avec liens inter-pages légales.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-950">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="font-semibold text-sm tracking-tight">
              GEN MOTION
              <span className="hidden sm:inline ml-2 text-zinc-400 font-normal">
                — Smooth &amp; Design
              </span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-950 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-6 lg:px-10 pt-16 sm:pt-20 pb-20 prose prose-zinc">
          {children}
        </article>
      </main>

      <footer className="border-t border-zinc-200 bg-zinc-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 py-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-600">
          <Link href="/mentions-legales" className="hover:text-zinc-950 transition-colors">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="hover:text-zinc-950 transition-colors">
            Confidentialité
          </Link>
          <Link href="/cgu" className="hover:text-zinc-950 transition-colors">
            CGU
          </Link>
          <Link href="/cgv" className="hover:text-zinc-950 transition-colors">
            CGV
          </Link>
          <Link href="/about" className="hover:text-zinc-950 transition-colors">
            À propos
          </Link>
          <span className="ml-auto text-zinc-400 font-mono">
            genmotion.app · Smooth &amp; Design · Nice
          </span>
        </div>
      </footer>
    </div>
  );
}
