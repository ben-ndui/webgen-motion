"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { HubTour } from "./hub-tour-card";

export const SORTS = { recent: "Récents", name: "Nom A→Z", dur: "Durée", steps: "Étapes" } as const;
export type SortKey = keyof typeof SORTS;

/**
 * Filtres + tri de la grille de tours (format, catégorie, recherche, tri) :
 * extrait de HubApp pour rester sous 250 lignes. Le raccourci clavier « / »
 * focus la recherche depuis n'importe où dans le hub.
 */
export function useToursFiltres(tours: HubTour[]) {
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

  return { fmt, setFmt, cat, setCat, q, setQ, sort, setSort, searchRef, cats, list };
}
