"use client";

import { useState } from "react";

type Props = {
  // La route d'export (film ou épisode) et la déclinaison à exporter.
  url: string;
  declinaison: string;
  nomDuFichier: string;
  // Enregistre la fiche avant l'export, quand l'écran la modifie : le serveur
  // exporte ce qui est sur le disque.
  avantDExporter?: () => Promise<boolean>;
};

type Etat =
  | { type: "repos" }
  | { type: "en-cours" }
  | { type: "fait"; chemin: string; logoManquant: boolean }
  | { type: "erreur"; message: string };

const TOUJOURS_PRET = async () => true;

function telecharger(contenu: Blob, nomDuFichier: string): void {
  const url = URL.createObjectURL(contenu);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomDuFichier;
  lien.click();
  URL.revokeObjectURL(url);
}

/**
 * Ouvrir le montage dans DaVinci Resolve : un fichier .otio avec les plans,
 * le son et la musique sur leurs pistes, à retoucher dans un vrai logiciel
 * de montage. Studio Edition. Premiere n'est pas annoncé tant qu'il n'est pas
 * testé (son import .otio est récent).
 */
export default function ExportVersLeMontage({ url, declinaison, nomDuFichier, avantDExporter = TOUJOURS_PRET }: Props) {
  const [etat, setEtat] = useState<Etat>({ type: "repos" });

  const exporter = async () => {
    if (!(await avantDExporter())) return;
    setEtat({ type: "en-cours" });
    try {
      const reponse = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ declinaison }) });
      if (!reponse.ok) {
        const corps = (await reponse.json().catch(() => null)) as { erreur?: string } | null;
        setEtat({ type: "erreur", message: corps?.erreur ?? `L'export a échoué (erreur ${reponse.status}).` });
        return;
      }
      telecharger(await reponse.blob(), nomDuFichier);
      setEtat({
        type: "fait",
        chemin: decodeURIComponent(reponse.headers.get("X-Chemin-Otio") ?? ""),
        logoManquant: reponse.headers.get("X-Logo-Inclus") === "non",
      });
    } catch (erreur) {
      setEtat({ type: "erreur", message: `L'export n'a pas pu joindre GEN MOTION : ${(erreur as Error).message}` });
    }
  };

  return (
    <div className="export-montage">
      <button type="button" className="film-btn film-btn-ghost" disabled={etat.type === "en-cours"} onClick={() => void exporter()}>
        {etat.type === "en-cours" ? "Export…" : "Ouvrir dans DaVinci Resolve (.otio)"}
      </button>
      {etat.type === "fait" && (
        <div className="film-muted" role="status">
          <p>
            {nomDuFichier} téléchargé. Dans Resolve : Fichier, Importer, Timeline.
            {etat.chemin && <> Il est aussi enregistré ici : <code>{etat.chemin}</code></>}
          </p>
          {etat.logoManquant && <p>Le logo n&apos;y est pas encore : rends l&apos;épisode, puis exporte à nouveau.</p>}
        </div>
      )}
      {etat.type === "erreur" && (
        <p className="film-alert" role="alert">
          {etat.message}
        </p>
      )}
    </div>
  );
}
