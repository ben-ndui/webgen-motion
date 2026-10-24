"use client";

import { useEffect, useState } from "react";

type Profil = "complet" | "serie";
type Etat = Profil | "chargement" | "erreur";

const OPTIONS: { valeur: Profil; titre: string; detail: string }[] = [
  {
    valeur: "complet",
    titre: "Complet",
    detail: "Tours, films de marque, séries IA et formats : tout le dashboard, comme aujourd'hui.",
  },
  {
    valeur: "serie",
    titre: "Série",
    detail:
      "Dashboard allégé pour une cliente qui ne fait que des séries IA : tours et formats masqués, " +
      "seuls les films ayant une série apparaissent, « + Nouveau » ne propose plus que « Nouvelle série ».",
  },
];

async function lireLeProfil(): Promise<Etat> {
  try {
    const reponse = await fetch("/api/motion/config");
    if (!reponse.ok) return "erreur";
    const config = (await reponse.json()) as { profilInterface?: Profil };
    return config.profilInterface ?? "complet";
  } catch {
    return "erreur";
  }
}

/**
 * Le profil d'interface : installé tel quel pour Ben, basculé en « Série »
 * sur l'install d'une cliente comme Brigitte qui n'utilise que les séries IA.
 */
export default function ChoixDuProfil() {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [enCours, setEnCours] = useState<Profil | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let affiche = true;
    void lireLeProfil().then((valeur) => {
      if (affiche) setEtat(valeur);
    });
    return () => {
      affiche = false;
    };
  }, []);

  async function choisir(profil: Profil) {
    if (etat === profil) return;
    const precedent = etat;
    setEtat(profil); // optimiste
    setEnCours(profil);
    setErreur(null);
    try {
      const reponse = await fetch("/api/motion/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interface: { profil } }),
      });
      if (!reponse.ok) throw new Error(`Erreur ${reponse.status}`);
    } catch (e) {
      setEtat(precedent); // rollback
      setErreur(`Le profil n'a pas été enregistré : ${(e as Error).message}. Réessaie.`);
    } finally {
      setEnCours(null);
    }
  }

  if (etat === "chargement") {
    return (
      <p className="text-sm text-muted" role="status">
        Lecture de tes réglages…
      </p>
    );
  }

  if (etat === "erreur") {
    return (
      <p className="text-sm text-ink border-l-2 border-ink pl-3" role="alert">
        Tes réglages ne se lisent pas. Ferme GEN MOTION et relance-le.
      </p>
    );
  }

  return (
    <div role="radiogroup" aria-label="Profil d'interface" className="space-y-3">
      {OPTIONS.map((option) => {
        const selectionne = etat === option.valeur;
        return (
          <button
            key={option.valeur}
            type="button"
            role="radio"
            aria-checked={selectionne}
            disabled={enCours !== null}
            onClick={() => void choisir(option.valeur)}
            className={`w-full text-left rounded-xl border p-4 transition-colors ${
              selectionne ? "border-ink bg-surface-2" : "border-line hover:bg-surface-2"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-ink">{option.titre}</span>
              {selectionne && <span className="text-xs text-muted">{enCours === option.valeur ? "Enregistrement…" : "Actif"}</span>}
            </div>
            <p className="mt-1 text-sm text-muted leading-relaxed">{option.detail}</p>
          </button>
        );
      })}
      {erreur && (
        <p className="text-sm text-ink border-l-2 border-ink pl-3" role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
}
