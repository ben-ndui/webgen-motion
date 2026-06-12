"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import HubConsole from "./hub-console";
import NewTourButton from "./new-tour-button";
import ScaffoldFromProjectButton from "./scaffold-from-project-button";
import GenerateWithAiButton from "./generate-with-ai-button";
import TourCardMenu from "./tour-card-menu";
import SettingsMenu from "./settings-menu";

export interface HubTour {
  id: string;
  name: string;
  fmt: "16:9" | "9:16";
  steps: number;
  dur: string;
  cat: string;
  status: "draft" | "ready" | "rendered";
}

const STATUS_LABEL = { draft: "Brouillon", ready: "Prêt", rendered: "Rendu" } as const;
const SORTS = { recent: "Récents", name: "Nom A→Z", dur: "Durée", steps: "Étapes" } as const;
type SortKey = keyof typeof SORTS;

/* icons — load-bearing only */
const Caret = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>;
const Search = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>;
const Film = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4" /></svg>;
const Gear = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8M4.6 9a1.6 1.6 0 0 0-.3-1.8" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>;
const Plus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
const NewTourIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="14" height="14" rx="2" /><path d="m22 8-6 4 6 4V8Z" /></svg>;
const ScaffoldIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>;
const SparkIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;

function Thumb({ tour }: { tour: HubTour }) {
  const phone = tour.fmt === "9:16";
  const body = (
    <div className="dev-body">
      <div className="b lg" />
      <div className="b w1" />
      {!phone && <div className="dev-accent" />}
      <div className="b w3" />
      <div className="b w2" />
      {phone && <div className="dev-accent" />}
    </div>
  );
  return (
    <div className="thumb" data-wm-id="hub.card.thumb">
      <div className="thumb-tl"><span className="fbadge">{tour.fmt}</span></div>
      <div className="thumb-br"><span className="dur">{tour.dur}</span></div>
      {phone ? (
        <div className="device phone">{body}</div>
      ) : (
        <div className="device mac">
          <div className="dev-bar"><i /><i /><i /></div>
          {body}
        </div>
      )}
      <div className="thumb-play"><span /></div>
    </div>
  );
}

function TourCard({ tour }: { tour: HubTour }) {
  return (
    <Link className="tcard" href={`/tour/${tour.id}`} data-wm-id="hub.card">
      <Thumb tour={tour} />
      <div className="tbody">
        <div className="tbody-top">
          <h3 className="tname">{tour.name}</h3>
          <TourCardMenu tourId={tour.id} tourName={tour.name} />
        </div>
        <div className="tmeta">
          <span className="tcat">{tour.cat}</span>
          <span>{tour.steps} étapes</span>
          <span className="sep" />
          <span>{tour.dur}</span>
          <span className="sep" />
          <span>{tour.fmt}</span>
        </div>
        <div className="tfoot">
          <span className={"status " + tour.status}>
            <span className="sdot" />{STATUS_LABEL[tour.status]}
          </span>
        </div>
      </div>
    </Link>
  );
}

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
  configured = true,
}: {
  tours: HubTour[];
  edition: string;
  configured?: boolean;
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
      <aside className="sidebar" data-wm-id="hub.sidebar">
        <div className="brand"><span className="brand-mark" /><span className="brand-name">GEN&nbsp;MOTION</span></div>
        <div className="side-new"><CreateControl /></div>
        <nav className="nav" data-wm-id="hub.nav">
          <span className="nav-item active"><Film /> Tours <span className="count">{tours.length}</span></span>
          <Link className="nav-item" href="/setup"><Gear /> Réglages</Link>
        </nav>
        <div className="side-foot">
          <div className="license" data-wm-id="hub.license">
            <span className="license-badge">{isStudio ? "S" : "C"}</span>
            <span className="license-meta">
              <b>{isStudio ? "Studio Edition" : "Community"}</b>
              <span>{isStudio ? "Licence perpétuelle · à jour" : "Fair-code · FSL"}</span>
            </span>
          </div>
        </div>
      </aside>

      <main className="main" data-wm-id="hub.main">
        <header className="topbar" data-wm-id="hub.topbar">
          <h1 className="page-title">Tours <span className="n">{list.length}</span></h1>
          <div className="topbar-spacer" />
          <label className="search" data-wm-id="hub.search">
            <Search />
            <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un tour…" />
            <kbd>/</kbd>
          </label>
          {configured ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-accent bg-accent-soft border border-accent-line"
              data-wm-id="hub.config-chip"
              title="Voix off configurée"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />
              Configuré
            </span>
          ) : (
            <Link
              href="/setup"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted border border-line hover:border-line-strong hover:text-ink transition-colors"
              data-wm-id="hub.config-chip"
              title="Lance le wizard de configuration"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-line-strong" aria-hidden />
              Setup
            </Link>
          )}
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
      </main>

      {/* Director's Console du hub — drawer bas / flottant / fenêtre
          séparée (chrome fixed, ne touche pas la grille du hub) */}
      <HubConsole />
    </div>
  );
}
