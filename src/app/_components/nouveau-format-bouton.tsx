"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

import ChoixDeCases from "./choix-de-cases";

export type FormatProposable = { nom: string; libelle: string; pourQui: string };

/**
 * « Nouvelle vidéo » : on choisit un format du catalogue, on lui donne un nom,
 * et le projet s'ouvre. Le nom du fichier se déduit du nom : rien de technique
 * à saisir.
 */
export default function NouveauFormatBouton({ formats }: { formats: FormatProposable[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
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
        return;
      }
      router.push(`/format/${corps.id}`);
    } catch {
      setErreurs(["GEN MOTION ne répond pas : vérifie que l'application est lancée."]);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOuvert(true)} data-wm-id="hub.format.nouveau">
        <Plus /> Nouvelle vidéo
      </button>
      {ouvert && (
        <div className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOuvert(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nouveau-format-titre"
            className="bg-surface rounded-2xl shadow-2xl border border-line w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(evenement) => evenement.stopPropagation()}
            data-wm-id="hub.format.nouveau.fenetre"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">Nouveau</p>
                <h2 id="nouveau-format-titre" className="text-lg font-semibold text-ink">Choisir un format</h2>
                <p className="text-sm text-muted mt-1">Le projet part d&apos;un exemple du format, que tu remplaces par ton contenu.</p>
              </div>
              <button type="button" onClick={() => setOuvert(false)} className="text-faint hover:text-ink-soft" aria-label="Fermer">
                <X className="w-5 h-5" />
              </button>
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
              <button type="button" className="px-4 py-2 rounded-full text-sm text-ink-soft hover:bg-surface-2" onClick={() => setOuvert(false)}>
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void creer()}
                disabled={envoi || !nom.trim() || !format}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {envoi ? "Création…" : "Créer et ouvrir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
