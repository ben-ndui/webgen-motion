import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { fichiersDuRendu } from "../film-store";
import { CATALOGUE, type FicheDeFormat, type NomDeFormat } from "./catalogue";
import type { ProjetDeFormat } from "./format-loader";
import { getFormatOutDir, getFormatPublicDir, urlDuRenduDeFormat } from "./format-store";

/**
 * L'état d'un projet de format, tel que l'écran le montre : un statut, les
 * fichiers attendus (présents ou non, chemin exact), et un rendu par
 * déclinaison. Tiré du DISQUE à chaque lecture. SERVEUR SEULEMENT.
 */

export type StatutDuProjet = "invalide" | "exemple" | "medias-manquants" | "pret" | "rendu";

export type ResumeDuProjet = {
  id: string;
  format: NomDeFormat | null;
  libelle: string;
  statut: StatutDuProjet;
  erreurs: string[];
  medias: { relatif: string; present: boolean }[];
  declinaisons: { nom: string; langue: string; version: string; rendu: { url: string; octets: number } | null }[];
};

export type Dossiers = { public: (id: string) => string; sortie: (id: string) => string };

const DOSSIERS_PAR_DEFAUT: Dossiers = { public: getFormatPublicDir, sortie: getFormatOutDir };

export function resumerProjet(projet: ProjetDeFormat, dossiers: Dossiers = DOSSIERS_PAR_DEFAUT): ResumeDuProjet {
  if (projet.etat === "invalide") {
    const libelle = projet.format ? CATALOGUE[projet.format].libelle : "Format inconnu";
    return { id: projet.id, format: projet.format, libelle, statut: "invalide", erreurs: projet.erreurs, medias: [], declinaisons: [] };
  }
  const fiche: FicheDeFormat = projet.fiche;
  const definition = CATALOGUE[fiche.format];
  const medias = (definition.mediasAttendus as (s: unknown) => string[])(fiche.spec).map((relatif) => ({
    relatif,
    present: existsSync(join(dossiers.public(projet.id), relatif)),
  }));
  const declinaisons = fiche.spec.declinaisons.map((declinaison) => {
    const livrable = fichiersDuRendu(dossiers.sortie(projet.id), declinaison.nom).livrable;
    const infos = existsSync(livrable) ? statSync(livrable) : null;
    return {
      nom: declinaison.nom,
      langue: declinaison.langue,
      version: declinaison.version,
      rendu: infos ? { url: urlDuRenduDeFormat(projet.id, declinaison.nom, Math.round(infos.mtimeMs)), octets: infos.size } : null,
    };
  });
  const statut: StatutDuProjet = fiche.spec.exemple
    ? "exemple"
    : medias.some((media) => !media.present)
      ? "medias-manquants"
      : declinaisons.some((d) => d.rendu)
        ? "rendu"
        : "pret";
  return { id: projet.id, format: fiche.format, libelle: definition.libelle, statut, erreurs: [], medias, declinaisons };
}
