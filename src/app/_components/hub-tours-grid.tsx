"use client";

import { Caret, Search } from "./hub-icons";
import { SORTS, type SortKey } from "./hub-tours-filtres";
import TourCard, { type HubTour } from "./hub-tour-card";

type Props = {
  fmt: "all" | "16:9" | "9:16";
  setFmt: (fmt: "all" | "16:9" | "9:16") => void;
  cat: string;
  setCat: (cat: string) => void;
  sort: SortKey;
  setSort: (sort: SortKey) => void;
  cats: string[];
  list: HubTour[];
};

/**
 * Filtres (format, catégorie, tri) + grille des tours. L'état des filtres
 * vit dans HubApp (le header en a besoin pour la recherche et le compteur),
 * et descend ici en props — pas un second `useToursFiltres` qui diverergerait
 * du champ de recherche du header.
 */
export default function HubToursGrid({ fmt, setFmt, cat, setCat, sort, setSort, cats, list }: Props) {
  return (
    <>
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
    </>
  );
}
