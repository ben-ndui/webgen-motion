import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { ParolesDuKaraoke } from "../../../remotion/film/karaoke/spec";
import { erreursDesParoles } from "../../../remotion/film/karaoke/validerKaraoke";
import type { DeclinaisonDuFilm } from "../../../remotion/film/spec";
import { estNomSur, fichiersDuRendu } from "../film-store";
import { CATALOGUE, type FicheDeFormat, type NomDeFormat } from "./catalogue";
import { chargerProjet } from "./format-loader";
import { getFormatOutDir, getFormatPublicDir, getFormatsDir } from "./format-store";

/**
 * Ce que le runner (`scripts/render-format.ts`) et la route
 * (`/api/motion/formats/render`) vérifient AVANT de lancer Remotion : une
 * seule implémentation. Serveur seulement.
 */

export type RenduDeFormatPrepare = {
  ok: true;
  format: NomDeFormat;
  composition: "Explainer" | "Conte" | "Karaoke";
  spec: FicheDeFormat["spec"];
  declinaison: DeclinaisonDuFilm;
  dossierPublic: string;
  dossierDeSortie: string;
  sortie: string;
  partiel: string;
  verrou: string;
};

export type RenduDeFormatRefuse = { ok: false; statut: 400 | 404; erreurs: string[] };

export type OptionsDuRendu = { dossierDesFiches?: string; dossierPublic?: string; dossierDeSortie?: string };

/** Le corps de la route : deux noms sûrs, rien d'autre n'est lu. */
export function lireRequeteDeRenduDeFormat(corps: unknown): { ok: true; id: string; declinaison: string } | { ok: false; erreur: string } {
  if (typeof corps !== "object" || corps === null || Array.isArray(corps)) return { ok: false, erreur: "Corps JSON attendu : { id, declinaison }" };
  const { id, declinaison } = corps as Record<string, unknown>;
  if (!estNomSur(id)) return { ok: false, erreur: "id manquant ou invalide" };
  if (!estNomSur(declinaison)) return { ok: false, erreur: "declinaison manquante ou invalide" };
  return { ok: true, id, declinaison };
}

/** Le karaoké : paroles calées présentes, et pas sur le brouillon de whisper (le texte affiché est celui de l'artiste). */
function problemesDesParoles(fiche: FicheDeFormat, dossierPublic: string): string[] {
  if (fiche.format !== "karaoke") return [];
  const fichier = join(dossierPublic, fiche.spec.paroles);
  if (!existsSync(fichier)) return [];
  try {
    return erreursDesParoles(JSON.parse(readFileSync(fichier, "utf-8")) as ParolesDuKaraoke, fiche.spec, true);
  } catch (erreur) {
    return [`paroles illisibles (${fiche.spec.paroles}) : ${(erreur as Error).message}`];
  }
}

export function preparerRenduDeFormat(id: string, nomDeDeclinaison: string, options: OptionsDuRendu = {}): RenduDeFormatPrepare | RenduDeFormatRefuse {
  if (!estNomSur(id)) return { ok: false, statut: 400, erreurs: ["id de projet invalide"] };
  if (!estNomSur(nomDeDeclinaison)) return { ok: false, statut: 400, erreurs: ["nom de déclinaison invalide"] };
  const projet = chargerProjet(id, options.dossierDesFiches ?? getFormatsDir());
  if (!projet) return { ok: false, statut: 404, erreurs: [`projet introuvable : ${id}`] };
  if (projet.etat === "invalide") return { ok: false, statut: 400, erreurs: projet.erreurs };

  const { fiche } = projet;
  const erreurs: string[] = [];
  if (fiche.spec.exemple) erreurs.push("le projet porte encore le contenu d'EXEMPLE du format : le remplacer par le sien");
  const declinaison = fiche.spec.declinaisons.find((candidate) => candidate.nom === nomDeDeclinaison);
  if (!declinaison) {
    const connues = fiche.spec.declinaisons.map((candidate) => candidate.nom).join(", ");
    erreurs.push(`déclinaison inconnue : « ${nomDeDeclinaison} » (connues : ${connues})`);
  }
  const dossierPublic = options.dossierPublic ?? getFormatPublicDir(id);
  const definition = CATALOGUE[fiche.format];
  for (const media of (definition.mediasAttendus as (spec: FicheDeFormat["spec"]) => string[])(fiche.spec)) {
    if (!existsSync(join(dossierPublic, media))) erreurs.push(`fichier absent : ${join(dossierPublic, media)}`);
  }
  erreurs.push(...problemesDesParoles(fiche, dossierPublic));
  if (erreurs.length > 0 || !declinaison) return { ok: false, statut: 400, erreurs };

  const dossierDeSortie = options.dossierDeSortie ?? getFormatOutDir(id);
  const fichiers = fichiersDuRendu(dossierDeSortie, declinaison.nom);
  return {
    ok: true,
    format: fiche.format,
    composition: definition.composition,
    spec: fiche.spec,
    declinaison,
    dossierPublic,
    dossierDeSortie,
    sortie: fichiers.livrable,
    partiel: fichiers.partiel,
    verrou: fichiers.verrou,
  };
}
