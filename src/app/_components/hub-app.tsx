"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import type { Reglage } from "@/lib/reglages/etat-des-reglages";

import HubConsole from "./hub-console";
import PastilleDesReglages from "./reglages/pastille-des-reglages";
import NewTourButton from "./new-tour-button";
import ScaffoldFromProjectButton from "./scaffold-from-project-button";
import GenerateWithAiButton from "./generate-with-ai-button";
import SettingsMenu from "./settings-menu";
import DeviceIndicator from "./device-indicator";
import HubFilms, { type HubFilm } from "./hub-films";
import HubFormats, { type HubFormat } from "./hub-formats";
import type { FormatProposable } from "./nouveau-format-bouton";
import TourCard, { type HubTour } from "./hub-tour-card";

export type { HubTour };

const SORTS = { recent: "Récents", name: "Nom A→Z", dur: "Durée", steps: "Étapes" } as const;
type SortKey = keyof typeof SORTS;

/* icons — load-bearing only */
const Caret = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>;
const Search = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>;
const Plus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
const NewTourIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="14" height="14" rx="2" /><path d="m22 8-6 4 6 4V8Z" /></svg>;
const ScaffoldIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>;
const SparkIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;

function CreateControl() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="create" ref={ref} data-wm-id="hub.action.create">
      <NewTourButton
        trigger={(openModal) => (
          <button className="btn btn-primary" data-wm-id="hub.action.new" onClick={openModal}>
            <Plus /> Nouveau tour
          </button>
        )}
      />
      <button className="create-caret" aria-label="Plus d'options" onClick={() => setOpen((o) => !o)}>
        <Caret />
      </button>
      <div className={"menu" + (open ? " open" : "")}>
        <NewTourButton
          trigger={(openModal) => (
            <button className="menu-item" data-wm-id="hub.action.new" onClick={() => { setOpen(false); openModal(); }}>
              <span className="mi-ic"><NewTourIco /></span>
              <span><span className="mi-t">Nouveau tour</span><span className="mi-d">Partir d&apos;une page blanche, étape par étape.</span></span>
            </button>
          )}
        />
        <ScaffoldFromProjectButton
          trigger={(openModal) => (
            <button className="menu-item" data-wm-id="hub.action.scaffold" onClick={() => { setOpen(false); openModal(); }}>
              <span className="mi-ic"><ScaffoldIco /></span>
              <span><span className="mi-t">Scaffold projet</span><span className="mi-d">Générer la structure depuis une URL ou un repo.</span></span>
            </button>
          )}
        />
        <GenerateWithAiButton
          trigger={(openModal) => (
            <button className="menu-item" data-wm-id="hub.action.generate" onClick={() => { setOpen(false); openModal(); }}>
              <span className="mi-ic"><SparkIco /></span>
              <span><span className="mi-t">Générer avec IA</span><span className="mi-d">Décrivez le tour — l&apos;agent écrit le script.</span></span>
            </button>
          )}
        />
      </div>
    </div>
  );
}

export default function HubApp({
  tours,
  edition,
  reglages,
  films = [],
  filmsError = null,
  formats,
}: {
  tours: HubTour[];
  edition: string;
  // Absent : pas de pastille (vitrine publique, sans réglages à faire).
  reglages?: Reglage[];
  // null : section masquée (vitrine publique).
  films?: HubFilm[] | null;
  filmsError?: string | null;
  // Absent ou projets null : section masquée (vitrine publique).
  formats?: { projets: HubFormat[] | null; formats: FormatProposable[]; error: string | null };
}) {
  const [fmt, setFmt] = useState<"all" | "16:9" | "9:16">("all");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cats = useMemo(() => Array.from(new Set(tours.map((t) => t.cat))), [tours]);
  const list = useMemo(() => {
    let r = tours.filter(
      (t) =>
        (fmt === "all" || t.fmt === fmt) &&
        (cat === "all" || t.cat === cat) &&
        (q.trim() === "" ||
          t.name.toLowerCase().includes(q.toLowerCase()) ||
          t.cat.toLowerCase().includes(q.toLowerCase())),
    );
    const toSec = (d: string) => d.split(":").reduce((a, b) => a * 60 + +b, 0);
    if (sort === "name") r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "dur") r = [...r].sort((a, b) => toSec(b.dur) - toSec(a.dur));
    if (sort === "steps") r = [...r].sort((a, b) => b.steps - a.steps);
    return r;
  }, [tours, fmt, cat, q, sort]);

  const isStudio = edition === "studio";

  return (
    <div className="gm-hub" data-wm-id="hub.page">

      <main className="main" data-wm-id="hub.main">
        <header className="topbar" data-wm-id="hub.topbar">
          <div className="brand"><span className="brand-mark" /><span className="brand-name">GEN&nbsp;MOTION</span></div>
          <h1 className="page-title">Tours <span className="n">{list.length}</span></h1>
          <div className="topbar-spacer" />
          <label className="search" data-wm-id="hub.search">
            <Search />
            <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un tour…" />
            <kbd>/</kbd>
          </label>
          {reglages && <PastilleDesReglages reglages={reglages} />}
          <CreateControl />
          <Link
            className="edition"
            href="/setup/license"
            data-wm-id="hub.license"
            title={isStudio ? "Licence perpétuelle, à jour" : "Fair-code, FSL : passer à Studio"}
          >
            {isStudio ? "Studio" : "Community"}
          </Link>
          <DeviceIndicator />
          <SettingsMenu />
          <ThemeToggle />
        </header>

        <div className="toolbar" data-wm-id="hub.filters">
          <div className="segmented" role="tablist" aria-label="Format">
            {(["all", "16:9", "9:16"] as const).map((f) => (
              <button key={f} className={"seg" + (fmt === f ? " active" : "")} onClick={() => setFmt(f)}>
                {f === "all" ? "Tous" : f}
              </button>
            ))}
          </div>
          <button className={"chip" + (cat === "all" ? " active" : "")} onClick={() => setCat("all")}>
            Toutes catégories
          </button>
          {cats.map((c) => (
            <button key={c} className={"chip" + (cat === c ? " active" : "")} onClick={() => setCat(c)}>
              <span className="dot" />{c}
            </button>
          ))}
          <div className="toolbar-spacer" />
          <button
            className="select"
            data-wm-id="hub.sort"
            onClick={() => {
              const keys = Object.keys(SORTS) as SortKey[];
              setSort(keys[(keys.indexOf(sort) + 1) % keys.length]);
            }}
          >
            Trier&nbsp;: {SORTS[sort]} <Caret />
          </button>
        </div>

        <div className="grid-wrap">
          <div className="grid" data-wm-id="hub.grid">
            {list.length === 0 ? (
              <div className="empty">
                <span className="ec"><Search /></span>
                <h3>Aucun tour ne correspond</h3>
                <p>Ajustez les filtres ou la recherche — ou lancez un nouveau tour pour commencer.</p>
              </div>
            ) : (
              list.map((tour) => <TourCard key={tour.id} tour={tour} />)
            )}
          </div>
        </div>

        {films !== null && <HubFilms films={films} error={filmsError} />}
        {formats && formats.projets !== null && <HubFormats projets={formats.projets} formats={formats.formats} error={formats.error} />}
      </main>

      {/* Le bas de l'écran : la barre de navigation, ou la console IA à sa place. */}
      <HubConsole actif="videos" />
    </div>
  );
}
