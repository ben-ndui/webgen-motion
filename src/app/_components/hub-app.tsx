"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import type { Reglage } from "@/lib/reglages/etat-des-reglages";

import HubConsole from "./hub-console";
import PastilleDesReglages from "./reglages/pastille-des-reglages";
import ScaffoldFromProjectButton from "./scaffold-from-project-button";
import GenerateWithAiButton from "./generate-with-ai-button";
import SettingsMenu from "./settings-menu";
import DeviceIndicator from "./device-indicator";
import HubFilms, { type HubFilm } from "./hub-films";
import HubFormats, { type HubFormat } from "./hub-formats";
import type { HubTour } from "./hub-tour-card";
import HubToursGrid from "./hub-tours-grid";
import { useToursFiltres } from "./hub-tours-filtres";
import { Caret, FilmIco, FormatIco, NewTourIco, Plus, Search, ScaffoldIco, SerieIco, SparkIco } from "./hub-icons";

export type { HubTour };

/**
 * Un seul bouton pour toute création (tour, film, format) : il contenait
 * trois boutons séparés dans le dashboard avant le 18/10/2026, et le clic
 * ouvrait un popup — remplacés par de vraies pages (porte orpheline +
 * popup cassé signalés par Ben).
 */
function CreateControl({ profilSerie }: { profilSerie: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  // Profil « série » (install cliente, cf. /setup/interface) : un seul geste
  // possible, pas la peine d'un menu déroulant pour une unique option.
  if (profilSerie) {
    return (
      <Link href="/nouveau/serie" className="btn btn-primary create-main" data-wm-id="hub.action.new.serie">
        <Plus /> Nouvelle série
      </Link>
    );
  }
  return (
    <div className="create" ref={ref} data-wm-id="hub.action.create">
      <button
        className="btn btn-primary create-main"
        data-wm-id="hub.action.new"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Plus /> Nouveau <Caret />
      </button>
      <div className={"menu" + (open ? " open" : "")} role="menu">
        <Link href="/nouveau/tour" className="menu-item" data-wm-id="hub.action.new.tour" onClick={() => setOpen(false)}>
          <span className="mi-ic"><NewTourIco /></span>
          <span><span className="mi-t">Nouveau tour</span><span className="mi-d">Partir d&apos;une page blanche, étape par étape.</span></span>
        </Link>
        <Link href="/nouveau/film" className="menu-item" data-wm-id="hub.action.new.film" onClick={() => setOpen(false)}>
          <span className="mi-ic"><FilmIco /></span>
          <span><span className="mi-t">Nouveau film</span><span className="mi-d">Le film de ta marque, à partir de ton site.</span></span>
        </Link>
        <Link href="/nouveau/serie" className="menu-item" data-wm-id="hub.action.new.serie" onClick={() => setOpen(false)}>
          <span className="mi-ic"><SerieIco /></span>
          <span><span className="mi-t">Nouvelle série</span><span className="mi-d">Dépose la bible de ta cliente, importe-la tout de suite.</span></span>
        </Link>
        <Link href="/nouveau/format" className="menu-item" data-wm-id="hub.action.new.format" onClick={() => setOpen(false)}>
          <span className="mi-ic"><FormatIco /></span>
          <span><span className="mi-t">Nouveau format</span><span className="mi-d">Explainer, conte à compteur, clip karaoké.</span></span>
        </Link>
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
  profilSerie = false,
}: {
  tours: HubTour[];
  edition: string;
  // Absent : pas de pastille (vitrine publique, sans réglages à faire).
  reglages?: Reglage[];
  // null : section masquée (vitrine publique).
  films?: HubFilm[] | null;
  filmsError?: string | null;
  // Absent ou projets null : section masquée (vitrine publique).
  formats?: { projets: HubFormat[] | null; error: string | null };
  // Profil « série » (réglage /setup/interface) : dashboard allégé pour une
  // cliente qui ne fait que des séries IA — tours et formats masqués.
  profilSerie?: boolean;
}) {
  const { fmt, setFmt, cat, setCat, q, setQ, sort, setSort, searchRef, cats, list } = useToursFiltres(tours);
  const isStudio = edition === "studio";

  return (
    <div className="gm-hub" data-wm-id="hub.page">

      <main className="main" data-wm-id="hub.main">
        <header className="topbar" data-wm-id="hub.topbar">
          <div className="brand"><span className="brand-mark" /><span className="brand-name">GEN&nbsp;MOTION</span></div>
          {!profilSerie && <h1 className="page-title">Tours <span className="n">{list.length}</span></h1>}
          <div className="topbar-spacer" />
          {!profilSerie && (
            <label className="search" data-wm-id="hub.search">
              <Search />
              <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un tour…" />
              <kbd>/</kbd>
            </label>
          )}
          {reglages && <PastilleDesReglages reglages={reglages} />}
          <CreateControl profilSerie={profilSerie} />
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

        {!profilSerie && (
          <HubToursGrid fmt={fmt} setFmt={setFmt} cat={cat} setCat={setCat} sort={sort} setSort={setSort} cats={cats} list={list} />
        )}

        {films !== null && <HubFilms films={films} error={filmsError} />}
        {formats && formats.projets !== null && <HubFormats projets={formats.projets} error={formats.error} />}
      </main>

      {/* Le bas de l'écran : la barre de navigation, ou la console IA à sa place. */}
      <HubConsole actif="videos" />
    </div>
  );
}
