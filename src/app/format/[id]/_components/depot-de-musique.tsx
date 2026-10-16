"use client";

import { useState } from "react";

type Props = { id: string; karaoke: boolean; onDepose: () => void };

/**
 * Déposer la musique : le serveur la range et la mesure (tempo, premier
 * temps). Pour un karaoké, c'est LE morceau de l'artiste. L'envoi dit son
 * état : en cours, refusé (avec la raison du serveur), ou fait.
 */
export default function DepotDeMusique({ id, karaoke, onDepose }: Props) {
  const [etat, setEtat] = useState<{ type: "repos" } | { type: "envoi" } | { type: "erreur"; message: string } | { type: "fait" }>({ type: "repos" });

  async function envoyer(fichier: File) {
    setEtat({ type: "envoi" });
    const formulaire = new FormData();
    formulaire.set("fichier", fichier);
    try {
      const reponse = await fetch(`/api/motion/formats/${encodeURIComponent(id)}/media`, { method: "POST", body: formulaire });
      const corps = (await reponse.json().catch(() => ({}))) as { erreur?: string };
      if (!reponse.ok) {
        setEtat({ type: "erreur", message: corps.erreur ?? `Dépôt refusé (${reponse.status})` });
        return;
      }
      setEtat({ type: "fait" });
      onDepose();
    } catch {
      setEtat({ type: "erreur", message: "GEN MOTION ne répond pas : vérifie que l'application est lancée." });
    }
  }

  return (
    <div className="film-depot" data-wm-id="format.depot-musique">
      <label className="film-btn">
        {karaoke ? "Déposer ton morceau" : "Déposer la musique"}
        <input
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
          hidden
          disabled={etat.type === "envoi"}
          onChange={(evenement) => {
            const fichier = evenement.target.files?.[0];
            if (fichier) void envoyer(fichier);
            evenement.target.value = "";
          }}
        />
      </label>
      {etat.type === "envoi" && <p role="status" className="film-muted">Envoi et mesure du tempo…</p>}
      {etat.type === "erreur" && <p role="alert" className="film-alert">{etat.message}</p>}
      {etat.type === "fait" && <p role="status" className="film-muted">Déposé et mesuré.</p>}
    </div>
  );
}
