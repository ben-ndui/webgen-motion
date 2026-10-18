"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Film } from "lucide-react";

import type { DirectionDuFilm, Langue, VersionDuFilm } from "../../../../remotion/film/spec";
import ChoixDeCases from "../../_components/choix-de-cases";
import { FORMATS_DU_FILM, LANGUES_DU_FILM, STYLES } from "../../_components/choix-du-film";

/**
 * Nouveau film de marque — page pleine (plus un popup : porte orpheline de
 * 3 boutons « Nouveau » dans le dashboard, corrigée le 18/10/2026). Quatre
 * choix simples, puis l'assistant /film/[id]/creer prend le relais.
 */
export default function FormulaireNouveauFilm() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [site, setSite] = useState("");
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
        const refus = reponse.status === 403 ? "GEN MOTION n'a pas reconnu cette fenêtre : ferme l'application et relance-la." : "La création a échoué, réessaie.";
        setErreurs(corps.erreurs ?? [refus]);
        setEnvoi(false);
        return;
      }
      // `envoi` reste vrai : on navigue, pas la peine de laisser le bouton
      // recliquable pendant que l'assistant se charge (double création).
      const suite = site.trim() ? `?site=${encodeURIComponent(site.trim())}` : "";
      router.push(`/film/${corps.id}/creer${suite}`);
    } catch {
      setErreurs(["GEN MOTION ne répond pas : vérifie que l'application est lancée."]);
      setEnvoi(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line">
        <nav className="max-w-xl mx-auto px-6 py-5 flex items-center gap-3 text-sm" aria-label="Fil d'Ariane">
          <Link href="/dashboard" className="text-muted hover:text-ink transition">← Mes vidéos</Link>
          <span className="text-faint">/</span>
          <span className="font-semibold">Nouveau film</span>
        </nav>
      </header>

      <main data-wm-id="nouveau.film.page" className="max-w-xl mx-auto px-6 py-12 space-y-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">Nouveau</p>
          <h1 className="text-3xl font-semibold tracking-tight">Créer un film de marque</h1>
          <p className="text-sm text-muted mt-1">Quatre choix, puis on te guide étape par étape.</p>
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

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Le lien de ton site (facultatif)</span>
          <input
            className="h-10 rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent focus:shadow-[var(--ring)]"
            value={site}
            inputMode="url"
            placeholder="monsite.fr"
            onChange={(evenement) => setSite(evenement.target.value)}
          />
          <span className="text-[11px] text-muted">GEN MOTION y prendra les captures, tes couleurs, ton logo, et proposera tes textes.</span>
        </label>

        <ChoixDeCases titre="Langues" multiple options={LANGUES_DU_FILM} valeurs={langues} onChange={(v) => setLangues(v as Langue[])} />
        <ChoixDeCases titre="Formats" multiple options={FORMATS_DU_FILM} valeurs={formats} onChange={(v) => setFormats(v as VersionDuFilm[])} />
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
          <Link href="/dashboard" className="px-4 py-2 rounded-full text-sm text-ink-soft hover:bg-surface-2">
            Annuler
          </Link>
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
      </main>
    </div>
  );
}
