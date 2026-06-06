import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Cog,
  Film,
  Mic,
} from "lucide-react";
import { getAllTours } from "@/lib/tour-loader";
import { getCategory } from "@/lib/motion-categories";
import { getPublicConfig } from "@/lib/config";
import { formatDuration } from "@/lib/format-duration";
import NewTourButton from "../_components/new-tour-button";
import GenerateWithAiButton from "../_components/generate-with-ai-button";
import ScaffoldFromProjectButton from "../_components/scaffold-from-project-button";
import SettingsMenu from "../_components/settings-menu";
import ThemeToggle from "../_components/theme-toggle";
import TourCard from "../_components/tour-card";

/**
 * Dashboard / Hub. Tours grid + quick actions + status chips.
 * Used to live at `/`, moved to `/dashboard` once the landing page
 * took over the root path. The breadcrumb stays "Tours" because
 * the hub IS the tours surface.
 */
export default function DashboardPage() {
  const tours = getAllTours();
  const totalSec = tours.reduce((acc, t) => acc + t.estimatedSec, 0);
  const config = getPublicConfig();

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
                title="Retour à la landing"
              >
                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white grid place-items-center group-hover:bg-slate-800 transition-colors">
                  <Film className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
                <span className="font-semibold text-sm tracking-tight">
                  GEN MOTION
                </span>
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <Link
                href="/dashboard"
                className="text-sm text-slate-500 font-medium hover:text-slate-900 transition-colors"
              >
                Tours
              </Link>
            </div>

            {/* Right actions — clean : juste status au glance +
             *  Settings dropdown qui contient tout le reste (Config,
             *  Outils, External). */}
            <div className="flex items-center gap-2">
              <ConfigChip configured={config.configured} />
              <ThemeToggle />
              <SettingsMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Setup banner — only when nothing is configured */}
      {!config.configured && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-2.5 flex items-center gap-3 flex-wrap">
            <Mic className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <p className="text-xs text-amber-900 flex-1 min-w-0">
              <span className="font-semibold">Setup recommandé</span> · choisis
              ton backend voix off (ElevenLabs cloud ou Voicebox local).
            </p>
            <Link
              href="/setup"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900 text-white text-[11px] font-medium hover:bg-amber-800 transition-colors"
            >
              Configurer
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Main */}
      <main
        data-wm-id="dashboard.page"
        className="flex-1 max-w-7xl 2xl:max-w-[1600px] mx-auto w-full px-6 lg:px-8 py-8"
      >
        {/* Page header — compact, no hero */}
        <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Tours
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {tours.length === 0
                ? "Aucun tour. Drop un JSON dans tours/."
                : `${tours.length} tour${tours.length > 1 ? "s" : ""} · ${formatDuration(totalSec)} cumulés · prêts à filmer`}
            </p>
          </div>
          <div className="flex items-center gap-2" data-wm-id="dashboard.actions">
            <ScaffoldFromProjectButton />
            <GenerateWithAiButton />
            <NewTourButton />
          </div>
        </div>

        {/* Tours grid */}
        {tours.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            data-wm-id="dashboard.tours-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
          >
            {tours.map((t) => {
              const firstSection = t.steps.find(
                (s): s is Extract<typeof s, { type: "section" }> =>
                  s.type === "section",
              );
              const cat = getCategory(firstSection?.categoryId);
              return <TourCard key={t.id} tour={t} cat={cat ?? null} />;
            })}
          </div>
        )}
      </main>

      {/* Tiny footer */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-12 flex items-center justify-between text-xs text-slate-500">
          <p>
            <span className="font-medium text-slate-700">GEN MOTION</span> ·
            Smooth &amp; Design · local-first
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wider uppercase hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Landing
          </Link>
        </div>
      </footer>
    </div>
  );
}

function ConfigChip({ configured }: { configured: boolean }) {
  return (
    <Link
      href="/setup"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        configured
          ? "text-emerald-700 hover:bg-emerald-50"
          : "text-amber-700 hover:bg-amber-50"
      }`}
      title={configured ? "Backend voix off OK" : "Setup requis"}
    >
      {configured ? (
        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
      ) : (
        <Cog className="w-3.5 h-3.5" />
      )}
      {configured ? "Configuré" : "Setup"}
    </Link>
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
        Clique sur <strong>Nouveau tour</strong> ci-dessus pour scaffolder
        un fichier <code className="px-1.5 py-0.5 bg-white border border-border rounded text-slate-700">tours/&lt;id&gt;.json</code>{" "}
        ou drop-en un à la main dans le dossier <code className="px-1.5 py-0.5 bg-white border border-border rounded text-slate-700">tours/</code>.
      </p>
    </div>
  );
}
