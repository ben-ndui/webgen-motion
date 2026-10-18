"use client";

import { useTelechargementDeModele } from "@/lib/use-telechargement-de-modele";

import type { EtatWhisper } from "./page";

// Mo décimaux, comme les libellés (« 490 Mo ») et le compteur du calage mot à mot.
const MO = 1_000_000;

/** Un modèle : présent, ou à télécharger avec sa progression et ses refus dits en clair. */
export default function ModeleWhisper({ modele, onTelecharge }: { modele: EtatWhisper["modeles"][number]; onTelecharge: () => void }) {
  const { etat, telecharger: lancer } = useTelechargementDeModele("/api/motion/whisper/telecharger", modele.octets, { modele: modele.nom });

  async function telecharger() {
    if (await lancer()) onTelecharge();
  }

  const pourcent = etat.type === "telechargement" ? Math.floor((etat.recus / etat.total) * 100) : 0;
  return (
    <li className="rounded-xl border border-line p-4 space-y-2" data-wm-id="setup.paroles.modele">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{modele.nom === "medium" ? "Modèle medium" : "Modèle small"}</p>
          <p className="text-xs text-muted">{modele.libelle}</p>
        </div>
        {modele.present ? (
          <span className="text-sm text-accent" role="status">Téléchargé</span>
        ) : (
          <button type="button" disabled={etat.type === "telechargement"} onClick={() => void telecharger()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed">
            {etat.type === "telechargement" ? "Téléchargement…" : "Télécharger"}
          </button>
        )}
      </div>
      {etat.type === "telechargement" && (
        <div role="status">
          <progress className="w-full" max={100} value={pourcent} aria-label={`Téléchargement du modèle ${modele.nom}`} />
          <p className="text-xs text-muted">{pourcent} % · {Math.round(etat.recus / MO)} / {Math.round(etat.total / MO)} Mo</p>
        </div>
      )}
      {etat.type === "erreur" && <p className="text-sm text-ink border-l-2 border-ink pl-3" role="alert">{etat.message}</p>}
    </li>
  );
}
