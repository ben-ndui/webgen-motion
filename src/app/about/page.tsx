import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LEGAL } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "À propos — GEN MOTION",
  description: "GEN MOTION est un produit Smooth & Design, atelier digital basé à Nice.",
};

export default function About() {
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
        <section className="border-b border-zinc-200">
          <div className="max-w-3xl mx-auto px-6 lg:px-10 pt-20 sm:pt-28 pb-16">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-8">
              À propos · WebGen ecosystem · 2026
            </p>
            <h1 className="text-[44px] sm:text-[72px] font-medium leading-[0.95] tracking-[-0.04em] text-zinc-950 mb-10">
              On code vos idées.
              <br />
              <span className="text-zinc-400">Vous changez le monde.</span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-700 leading-relaxed max-w-2xl mb-6">
              <strong className="text-zinc-950 font-medium">GEN MOTION</strong> est un
              produit{" "}
              <a
                href="https://www.smoothandesign.fr"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-950 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-950 transition-colors"
              >
                Smooth &amp; Design
              </a>
              , atelier digital basé à <strong className="text-zinc-950 font-medium">Nice</strong>{" "}
              fondé par <strong className="text-zinc-950 font-medium">Ben NDUI</strong>.
              On conçoit et développe des outils, des sites et des apps
              mobiles pour des founders, des studios et des agences
              indépendantes — souvent en partant d&apos;une note vocale et en
              shipping en quelques semaines.
            </p>
            <p className="text-base sm:text-lg text-zinc-700 leading-relaxed max-w-2xl mb-6">
              GEN MOTION fait partie du <strong className="text-zinc-950 font-medium">WebGen
              ecosystem</strong> — une suite d&apos;outils internes que nous
              utilisons quotidiennement pour livrer plus vite et plus propre.
              Tous sont conçus <strong className="text-zinc-950 font-medium">local-first</strong> :
              vos données restent sur votre machine.
            </p>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-2xl">
              <strong className="text-zinc-700 font-medium">Open-source · MIT · made in Nice.</strong>{" "}
              GEN MOTION est sur{" "}
              <a
                href="https://github.com/ben-ndui/webgen-motion"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-700 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-950 transition-colors"
              >
                GitHub
              </a>
              . La Studio Edition débloque les outils pro.
            </p>
          </div>
        </section>

        <section className="border-b border-zinc-200">
          <div className="max-w-3xl mx-auto px-6 lg:px-10 py-16 sm:py-20">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-8">
              Deux éditions
            </p>
            <h2 className="text-3xl sm:text-4xl font-medium leading-tight tracking-[-0.02em] text-zinc-950 mb-8">
              Community gratuite.
              <br />
              <span className="text-zinc-400">Studio pour aller plus loin.</span>
            </h2>
            <p className="text-base text-zinc-700 leading-relaxed max-w-2xl mb-5">
              La <strong className="text-zinc-950 font-medium">Community Edition</strong>{" "}
              est gratuite et couvre l&apos;essentiel : capture E2E, voix off,
              compose 2D, formats 16:9 + 9:16, deux presets compose. C&apos;est
              l&apos;outil que nous utilisons en interne pour nos propres promo
              videos.
            </p>
            <p className="text-base text-zinc-700 leading-relaxed max-w-2xl">
              La <strong className="text-zinc-950 font-medium">Studio Edition</strong>{" "}
              ({LEGAL.product.editions.studio.price}, paiement unique perpétuel)
              débloque les frames 3D, les presets Cinematic & Glitch, le
              multi-format export et la music library. Pas d&apos;abonnement,
              pas de tracking, pas de SaaS lock-in — un seul paiement, mises à
              jour à vie.
            </p>
          </div>
        </section>

        <section className="border-b border-zinc-200">
          <div className="max-w-3xl mx-auto px-6 lg:px-10 py-16 sm:py-20">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-8">
              Contact
            </p>
            <dl className="space-y-4 text-base">
              <Pair label="Email" value={LEGAL.publisher.contactEmail} href={`mailto:${LEGAL.publisher.contactEmail}`} />
              <Pair label="Site Smooth & Design" value="smoothandesign.fr" href="https://www.smoothandesign.fr" external />
              <Pair label="Repo GitHub" value="github.com/ben-ndui/webgen-motion" href={LEGAL.product.repo} external />
              <Pair label="Adresse" value={`${LEGAL.publisher.address.street}, ${LEGAL.publisher.address.postalCode} ${LEGAL.publisher.address.city}`} />
            </dl>
          </div>
        </section>

        <footer className="bg-zinc-950 text-zinc-300">
          <div className="max-w-3xl mx-auto px-6 lg:px-10 py-12 flex flex-wrap gap-x-6 gap-y-3 text-xs">
            <Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
            <Link href="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link href="/cgu" className="hover:text-white transition-colors">CGU</Link>
            <Link href="/cgv" className="hover:text-white transition-colors">CGV</Link>
            <span className="ml-auto text-zinc-500 font-mono">genmotion.app · {LEGAL.lastUpdated}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Pair({ label, value, href, external }: { label: string; value: string; href?: string; external?: boolean }) {
  return (
    <div className="grid grid-cols-12 gap-4">
      <dt className="col-span-4 sm:col-span-3 text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-500 pt-1">
        {label}
      </dt>
      <dd className="col-span-8 sm:col-span-9">
        {href ? (
          <a
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer" : undefined}
            className="text-zinc-950 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-950 transition-colors"
          >
            {value}
          </a>
        ) : (
          <span className="text-zinc-950">{value}</span>
        )}
      </dd>
    </div>
  );
}
