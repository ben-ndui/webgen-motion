"use client";

import { useState } from "react";

type Props = {
  filmId: string;
  episodeId: string;
  declinaison: string;
  // Enregistre la fiche avant l'export : le serveur exporte ce qui est sur le disque.
  avantDExporter: () => Promise<boolean>;
};

type Etat =
  | { type: "repos" }
  | { type: "en-cours" }
  | { type: "fait"; nomDuFichier: string; chemin: string; logoInclus: boolean }
  | { type: "erreur"; message: string };

function telecharger(contenu: Blob, nomDuFichier: string): void {
  const url = URL.createObjectURL(contenu);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomDuFichier;
  lien.click();
  URL.revokeObjectURL(url);
}

/**
 * Ouvrir l'épisode monté dans DaVinci Resolve ou Premiere : un fichier .otio
 * avec les plans, leurs découpes, les fondus, le son et la musique, à
 * retoucher dans un vrai logiciel de montage. Studio Edition.
 */
export default function ExportVersLeMontage({ filmId, episodeId, declinaison, avantDExporter }: Props) {
  const [etat, setEtat] = useState<Etat>({ type: "repos" });

  const exporter = async () => {
    if (!(await avantDExporter())) return;
    setEtat({ type: "en-cours" });
    try {
      const reponse = await fetch(`/api/motion/film/${encodeURIComponent(filmId)}/cinema/episodes/${encodeURIComponent(episodeId)}/otio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declinaison }),
      });
      if (!reponse.ok) {
        const corps = (await reponse.json().catch(() => null)) as { erreur?: string } | null;
        setEtat({ type: "erreur", message: corps?.erreur ?? `L'export a échoué (erreur ${reponse.status}).` });
        return;
      }
      const nomDuFichier = `${declinaison}.episode-${episodeId}.otio`;
      telecharger(await reponse.blob(), nomDuFichier);
      setEtat({
        type: "fait",
        nomDuFichier,
        chemin: decodeURIComponent(reponse.headers.get("X-Chemin-Otio") ?? ""),
        logoInclus: reponse.headers.get("X-Logo-Inclus") === "oui",
      });
    } catch (erreur) {
      setEtat({ type: "erreur", message: `L'export n'a pas pu joindre GEN MOTION : ${(erreur as Error).message}` });
    }
  };

  return (
    <div className="export-montage">
      <button type="button" className="film-btn film-btn-ghost" disabled={etat.type === "en-cours"} onClick={() => void exporter()}>
        {etat.type === "en-cours" ? "Export…" : "Ouvrir dans DaVinci Resolve ou Premiere (.otio)"}
      </button>
      {etat.type === "fait" && (
        <div className="champ-aide" role="status">
          <p>
            {etat.nomDuFichier} téléchargé. Dans Resolve : Fichier, Importer, Timeline. Dans Premiere : Fichier, Importer.
            {etat.chemin && <> Il est aussi enregistré ici : <code>{etat.chemin}</code></>}
          </p>
          {!etat.logoInclus && <p>Le logo n&apos;y est pas encore : rends l&apos;épisode, puis exporte à nouveau.</p>}
        </div>
      )}
      {etat.type === "erreur" && (
        <p className="depot-erreur" role="alert">
          {etat.message}
        </p>
      )}
    </div>
  );
}
