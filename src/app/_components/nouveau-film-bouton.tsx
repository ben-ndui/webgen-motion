"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Film, Plus, X } from "lucide-react";

import type { DirectionDuFilm, Langue, VersionDuFilm } from "../../../remotion/film/spec";
import ChoixDeCases from "./choix-de-cases";

const LANGUES: { valeur: Langue; libelle: string }[] = [
  { valeur: "fr", libelle: "Français" },
  { valeur: "en", libelle: "Anglais" },
];
const FORMATS: { valeur: VersionDuFilm; libelle: string; aide: string }[] = [
  { valeur: "court", libelle: "Vertical 9:16", aide: "Instagram, TikTok, Reels" },
  { valeur: "long", libelle: "Horizontal 16:9", aide: "Site, YouTube, présentation" },
];
const STYLES: { valeur: DirectionDuFilm; libelle: string; aide: string }[] = [
  { valeur: "marque", libelle: "Marque", aide: "Sobre, tes couleurs" },
  { valeur: "editorial", libelle: "Éditorial", aide: "Clair, lettres fortes" },
  { valeur: "nocturne", libelle: "Nocturne", aide: "Sombre, lettres fines" },
];

/**
 * « Nouveau film » : quatre choix simples, puis l'assistant prend le relais.
 * Le nom du fichier se déduit du nom du film : rien de technique à saisir.
 */
export default function NouveauFilmBouton() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [langues, setLangues] = useState<Langue[]>(["fr"]);
  const [formats, setFormats] = useState<VersionDuFilm[]>(["court"]);
  const [direction, setDirection] = useState<DirectionDuFilm>("marque");
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);

  async function creer() {
    setEnvoi(true);
    setErreurs([]);
    try {
      const reponse = await fetch("/api/motion/film", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, langues, formats, direction }),
      });
      const corps = (await reponse.json().catch(() => ({}))) as { id?: string; erreurs?: string[] };
      if (!reponse.ok || !corps.id) {
        setErreurs(corps.erreurs ?? ["La création a échoué, réessaie."]);
        return;
      }
      router.push(`/film/${corps.id}/creer`);
    } catch {
      setErreurs(["GEN MOTION ne répond pas : vérifie que l'application est lancée."]);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOuvert(true)} data-wm-id="hub.film.nouveau">
        <Plus /> Nouveau film
      </button>
      {ouvert && (
        <div className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOuvert(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nouveau-film-titre"
            className="bg-surface rounded-2xl shadow-2xl border border-line w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(evenement) => evenement.stopPropagation()}
            data-wm-id="hub.film.nouveau.fenetre"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">Nouveau</p>
                <h2 id="nouveau-film-titre" className="text-lg font-semibold text-ink">
                  Créer un film de marque
                </h2>
                <p className="text-sm text-muted mt-1">Quatre choix, puis on te guide étape par étape.</p>
              </div>
              <button type="button" onClick={() => setOuvert(false)} className="text-faint hover:text-ink-soft" aria-label="Fermer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Le nom de ta marque ou de ton produit</span>
              <input
                className="h-10 rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent focus:shadow-[var(--ring)]"
                value={nom}
                maxLength={40}
                placeholder="Maison Saya"
                autoFocus
                onChange={(evenement) => setNom(evenement.target.value)}
              />
            </label>

            <ChoixDeCases titre="Langues" multiple options={LANGUES} valeurs={langues} onChange={(v) => setLangues(v as Langue[])} />
            <ChoixDeCases titre="Formats" multiple options={FORMATS} valeurs={formats} onChange={(v) => setFormats(v as VersionDuFilm[])} />
            <ChoixDeCases
              titre="Style"
              options={STYLES.map((style) => ({ ...style, image: `/film/styles/${style.valeur}.jpg` }))}
              valeurs={[direction]}
              onChange={(v) => setDirection(v[0] as DirectionDuFilm)}
            />

            {erreurs.length > 0 && (
              <ul role="alert" className="text-sm text-ink border-l-2 border-ink pl-3 space-y-1">
                {erreurs.map((erreur) => (
                  <li key={erreur}>{erreur}</li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" className="px-4 py-2 rounded-full text-sm text-ink-soft hover:bg-surface-2" onClick={() => setOuvert(false)}>
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void creer()}
                disabled={envoi || !nom.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Film className="w-3.5 h-3.5" />
                {envoi ? "Création…" : "Créer et continuer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
