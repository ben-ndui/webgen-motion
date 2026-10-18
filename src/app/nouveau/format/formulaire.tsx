"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import type { FormatProposable } from "@/lib/formats/catalogue";
import ChoixDeCases from "../../_components/choix-de-cases";

export default function FormulaireNouveauFormat({ formats }: { formats: FormatProposable[] }) {
  const router = useRouter();
  const [format, setFormat] = useState(formats[0]?.nom ?? "");
  const [nom, setNom] = useState("");
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);

  async function creer() {
    setEnvoi(true);
    setErreurs([]);
    try {
      const reponse = await fetch("/api/motion/formats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, nom }),
      });
      const corps = (await reponse.json().catch(() => ({}))) as { id?: string; erreurs?: string[] };
      if (!reponse.ok || !corps.id) {
        const refus = reponse.status === 403 ? "GEN MOTION n'a pas reconnu cette fenêtre : ferme l'application et relance-la." : "La création a échoué, réessaie.";
        setErreurs(corps.erreurs ?? [refus]);
        setEnvoi(false);
        return;
      }
      // `envoi` reste vrai : on navigue, pas la peine de laisser le bouton
      // recliquable pendant que la page du projet se charge (double création).
      router.push(`/format/${corps.id}`);
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
          <span className="font-semibold">Nouveau format</span>
        </nav>
      </header>

      <main data-wm-id="nouveau.format.page" className="max-w-xl mx-auto px-6 py-12 space-y-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">Nouveau</p>
          <h1 className="text-3xl font-semibold tracking-tight">Choisir un format</h1>
          <p className="text-sm text-muted mt-1">Le projet part d&apos;un exemple du format, que tu remplaces par ton contenu.</p>
        </div>

        <ChoixDeCases
          titre="Format"
          options={formats.map((f) => ({ valeur: f.nom, libelle: f.libelle, aide: f.pourQui }))}
          valeurs={[format]}
          onChange={(valeurs) => setFormat(valeurs[0] ?? "")}
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Le nom de la vidéo</span>
          <input
            className="h-10 rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent focus:shadow-[var(--ring)]"
            value={nom}
            maxLength={40}
            placeholder="10 ANS, le clip"
            autoFocus
            onChange={(evenement) => setNom(evenement.target.value)}
          />
        </label>

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
            disabled={envoi || !nom.trim() || !format}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {envoi ? "Création…" : "Créer et ouvrir"}
          </button>
        </div>
      </main>
    </div>
  );
}
