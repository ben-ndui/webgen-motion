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
  // `libelle` : ce que la personne comprend (jamais un nom de fichier) ; `geste` : déposer un
  // fichier, ou passer par l'éditeur (les paroles calées, que l'app fabrique elle-même).
  medias: { relatif: string; present: boolean; libelle: string; geste: "depot" | "editeur" }[];
  // `libelle` : ce que la personne lit (« Teaser (réseaux) »), pas le nom du fichier rendu.
  declinaisons: { nom: string; libelle: string; langue: string; version: string; rendu: { url: string; octets: number } | null }[];
};

export type Dossiers = { public: (id: string) => string; sortie: (id: string) => string };

const DOSSIERS_PAR_DEFAUT: Dossiers = { public: getFormatPublicDir, sortie: getFormatOutDir };

/**
 * Un fichier attendu, dit pour une personne : le 16/10, la page affichait
 * « paroles/paroles.json · à déposer », et un artiste cherchait quel .json
 * fournir alors que l'app le fabrique elle-même au calage (remarque de Ben).
 */
function presentationDuMedia(fiche: FicheDeFormat, relatif: string): { libelle: string; geste: "depot" | "editeur" } {
  if (fiche.format === "karaoke" && relatif === fiche.spec.paroles) return { libelle: "Tes paroles, calées sur ton morceau", geste: "editeur" };
  if (fiche.format === "karaoke" && relatif.startsWith("fond/")) {
    return { libelle: relatif.includes("court") ? "Ton décor sur mesure (teaser 9:16)" : "Ton décor sur mesure (clip 16:9)", geste: "editeur" };
  }
  if (fiche.format === "karaoke") return { libelle: "Ton morceau", geste: "depot" };
  if (relatif === fiche.spec.musique.fichier) return { libelle: "La musique", geste: "depot" };
  return { libelle: "Une image", geste: "depot" };
}

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
    ...presentationDuMedia(fiche, relatif),
  }));
  const declinaisons = fiche.spec.declinaisons.map((declinaison) => {
    const livrable = fichiersDuRendu(dossiers.sortie(projet.id), declinaison.nom).livrable;
    const infos = existsSync(livrable) ? statSync(livrable) : null;
    const libelle =
      fiche.format === "karaoke" ? (declinaison.version === "court" ? "Teaser (réseaux)" : "Clip complet (YouTube)") : declinaison.nom;
    return {
      nom: declinaison.nom,
      libelle,
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
