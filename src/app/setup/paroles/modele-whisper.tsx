"use client";

import { useState } from "react";

import type { EtatWhisper } from "./page";

type Etat = { type: "repos" } | { type: "telechargement"; recus: number; total: number } | { type: "erreur"; message: string };

const MO = 1024 * 1024;

/** Un modèle : présent, ou à télécharger avec sa progression et ses refus dits en clair. */
export default function ModeleWhisper({ modele, onTelecharge }: { modele: EtatWhisper["modeles"][number]; onTelecharge: () => void }) {
  const [etat, setEtat] = useState<Etat>({ type: "repos" });

  async function telecharger() {
    setEtat({ type: "telechargement", recus: 0, total: modele.octets });
    let conclu = false;
    try {
      const reponse = await fetch("/api/motion/whisper/telecharger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modele: modele.nom }),
      });
      if (!reponse.ok || !reponse.body) {
        const corps = (await reponse.json().catch(() => ({}))) as { error?: string };
        setEtat({ type: "erreur", message: corps.error ?? `Téléchargement refusé (${reponse.status}).` });
        return;
      }
      const lecteur = reponse.body.getReader();
      const decodeur = new TextDecoder();
      let tampon = "";
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        tampon += decodeur.decode(value, { stream: true });
        const lignes = tampon.split("\n");
        tampon = lignes.pop() ?? "";
        for (const ligne of lignes.filter(Boolean)) {
          const evenement = JSON.parse(ligne) as { type: string; recus?: number; total?: number; message?: string };
          if (evenement.type === "progress") setEtat({ type: "telechargement", recus: evenement.recus ?? 0, total: evenement.total ?? modele.octets });
          if (evenement.type === "error") { conclu = true; setEtat({ type: "erreur", message: evenement.message ?? "Téléchargement en échec." }); }
          if (evenement.type === "done") { conclu = true; setEtat({ type: "repos" }); onTelecharge(); }
        }
      }
      // Un flux fermé sans « done » ni « error » n'est pas un succès.
      if (!conclu) setEtat({ type: "erreur", message: "Le téléchargement s'est arrêté sans résultat : relance-le." });
    } catch {
      setEtat({ type: "erreur", message: "GEN MOTION ne répond pas : vérifie que l'application est lancée." });
    }
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
