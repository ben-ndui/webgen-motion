import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Film,
  Monitor,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { getAllTours } from "@/lib/tour-loader";
import { getCategory } from "@/lib/motion-categories";

/**
 * Hub. Mirrors the WebGen admin pattern: sticky top bar + compact
 * grid. Designed to fit in a single viewport on a 14" screen — no
 * scroll for the typical 4-tour catalogue.
 */
export default function HubPage() {
  const tours = getAllTours();
  const totalSec = tours.reduce((acc, t) => acc + t.estimatedSec, 0);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand + breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                className="shrink-0 flex items-center gap-2 group"
              >
                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white grid place-items-center group-hover:bg-slate-800 transition-colors">
                  <Film className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
                <span className="font-semibold text-sm tracking-tight">
                  webgen-motion
                </span>
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-sm text-slate-500 font-medium">Tours</span>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/ben-ndui/webgen-motion"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                GitHub
              </a>
              <Link
                href="/settings"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Configurer
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-8 py-8">
        {/* Page header — compact, no hero */}
        <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Tours
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {tours.length === 0
                ? "Aucun tour. Drop un JSON dans tours/."
                : `${tours.length} tour${tours.length > 1 ? "s" : ""} · ${totalSec}s cumulés · prêts à filmer`}
            </p>
          </div>
          <button
            disabled
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sprint 2 : éditeur de tours visuel"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Nouveau tour
          </button>
        </div>

        {/* Tours grid */}
        {tours.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tours.map((t) => {
              const firstSection = t.steps.find(
                (s): s is Extract<typeof s, { type: "section" }> =>
                  s.type === "section",
              );
              const cat = getCategory(firstSection?.categoryId);
              const isPortrait = t.format === "9:16";
              return (
                <Link
                  key={t.id}
                  href={`/tour/${t.id}`}
                  className="group bg-white border border-border rounded-2xl overflow-hidden hover:border-border-strong hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  {/* Cat color accent strip */}
                  {cat ? (
                    <div
                      className="h-1.5"
                      style={{ backgroundColor: cat.bgColor }}
                    />
                  ) : (
                    <div className="h-1.5 bg-slate-200" />
                  )}

                  <div className="p-5">
                    {/* Header row : format chip + title */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono uppercase tracking-wider">
                        {isPortrait ? (
                          <Smartphone className="w-3 h-3" />
                        ) : (
                          <Monitor className="w-3 h-3" />
                        )}
                        {t.format ?? "16:9"}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                    </div>

                    {/* Title + description */}
                    <h3 className="text-base font-semibold text-slate-900 leading-tight mb-1 line-clamp-1">
                      {t.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                      {t.description}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                      <span>{t.steps.length} steps</span>
                      <span>·</span>
                      <span>~{t.estimatedSec}s</span>
                      {cat && (
                        <>
                          <span>·</span>
                          <span style={{ color: cat.bgColor }}>
                            {cat.label}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Tiny footer */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-12 flex items-center justify-between text-xs text-slate-500">
          <p>
            <span className="font-medium text-slate-700">webgen-motion</span> ·
            Smooth &amp; Design · v0.1 · local-first
          </p>
          <p className="font-mono text-[10px] tracking-wider uppercase">
            ⌘ + K · Quick actions (bientôt)
          </p>
        </div>
      </footer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border p-12 flex flex-col items-center justify-center gap-3 text-center bg-surface-muted">
      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white grid place-items-center">
        <Film className="w-5 h-5" />
      </div>
      <p className="text-base font-semibold text-slate-900">
        Aucun tour défini
      </p>
      <p className="text-xs text-slate-500 max-w-md leading-relaxed">
        Crée un fichier{" "}
        <code className="px-1.5 py-0.5 bg-white border border-border rounded text-slate-700">
          tours/&lt;id&gt;.json
        </code>{" "}
        à la racine du projet. Schéma : voir{" "}
        <code className="px-1.5 py-0.5 bg-white border border-border rounded text-slate-700">
          src/lib/types/tour.ts
        </code>
        .
      </p>
    </div>
  );
}
