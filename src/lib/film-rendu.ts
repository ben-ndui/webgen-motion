import type { DeclinaisonDuFilm, FilmSpec } from "../../remotion/film/spec";
import { type DossiersDuFilm, dossiersDuFilm, problemesDeLaDeclinaison } from "./film-etat";
import { chargerFilm, getFilmsDir } from "./film-loader";
import { etatDesMedias } from "./film-medias";
import { estNomSur, fichiersDuRendu } from "./film-store";

/**
 * Ce que le runner (`scripts/render-film.ts`) et la route
 * (`/api/motion/film/render`) vérifient AVANT de lancer Remotion. Une seule
 * implémentation : la route répond 400 tout de suite, le runner refuse aussi
 * quand on l'appelle à la main. Serveur seulement.
 */

export type RequeteDeRendu = { filmId: string; declinaison: string };

export type LectureDeRequete = { ok: true; requete: RequeteDeRendu } | { ok: false; erreur: string };

/** Valide le corps JSON de la route. Rien d'autre que deux noms sûrs. */
export function lireRequeteDeRendu(corps: unknown): LectureDeRequete {
  if (typeof corps !== "object" || corps === null || Array.isArray(corps)) {
    return { ok: false, erreur: "Corps JSON attendu : { filmId, declinaison }" };
  }
  const { filmId, declinaison } = corps as Record<string, unknown>;
  if (!estNomSur(filmId)) return { ok: false, erreur: "filmId manquant ou invalide" };
  if (!estNomSur(declinaison)) return { ok: false, erreur: "declinaison manquante ou invalide" };
  return { ok: true, requete: { filmId, declinaison } };
}

export type RenduPrepare = {
  ok: true;
  spec: FilmSpec;
  declinaison: DeclinaisonDuFilm;
  dossierPublic: string;
  dossierDeSortie: string;
  sortie: string;
  partiel: string;
  verrou: string;
};

export type RenduRefuse = { ok: false; statut: 400 | 404; erreurs: string[] };

export type OptionsDePreparation = { dossierDesFiches?: string; dossiers?: DossiersDuFilm };

export function preparerRendu(
  filmId: string,
  nomDeDeclinaison: string,
  options: OptionsDePreparation = {},
): RenduPrepare | RenduRefuse {
  if (!estNomSur(filmId)) return { ok: false, statut: 400, erreurs: ["id de film invalide"] };
  if (!estNomSur(nomDeDeclinaison)) return { ok: false, statut: 400, erreurs: ["nom de déclinaison invalide"] };

  const dossierDesFiches = options.dossierDesFiches ?? getFilmsDir();
  const fiche = chargerFilm(filmId, dossierDesFiches);
  if (!fiche) return { ok: false, statut: 404, erreurs: [`fiche introuvable : films/${filmId}.json`] };
  if (fiche.etat === "invalide") return { ok: false, statut: 400, erreurs: fiche.erreurs };

  const { spec } = fiche;
  const declinaison = spec.declinaisons.find((candidate) => candidate.nom === nomDeDeclinaison);
  if (!declinaison) {
    const connues = spec.declinaisons.map((candidate) => candidate.nom).join(", ");
    return { ok: false, statut: 400, erreurs: [`déclinaison inconnue : « ${nomDeDeclinaison} » (connues : ${connues})`] };
  }

  const dossiers = options.dossiers ?? dossiersDuFilm(filmId);
  const medias = etatDesMedias(spec, dossiers.public, [declinaison.langue]);
  const problemes = problemesDeLaDeclinaison(spec, medias, declinaison.langue);
  if (problemes.length > 0) return { ok: false, statut: 400, erreurs: problemes };

  const fichiers = fichiersDuRendu(dossiers.sortie, declinaison.nom);
  return {
    ok: true,
    spec,
    declinaison,
    dossierPublic: medias.dossierPublic,
    dossierDeSortie: dossiers.sortie,
    sortie: fichiers.livrable,
    partiel: fichiers.partiel,
    verrou: fichiers.verrou,
  };
}

export type EvenementDeRendu =
  | { type: "phase"; label: string }
  | { type: "progress"; frames: number; total: number; label: string };

/**
 * Traduit une ligne de sortie du runner (bannières + CLI Remotion) en
 * événement NDJSON pour l'écran. `null` : ligne sans intérêt pour l'écran.
 */
export function lireLigneDuRendu(ligne: string): EvenementDeRendu | null {
  if (!ligne) return null;
  if (ligne.startsWith("▶ Film")) return { type: "phase", label: "Préparation du rendu…" };

  let m = ligne.match(/^Bundling (\d+)%/);
  if (m) return { type: "phase", label: `Bundling de la composition · ${m[1]}%…` };

  m = ligne.match(/^Rendered (\d+)\/(\d+)/);
  if (m) {
    const frames = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    return { type: "progress", frames, total, label: `Rendu image par image · ${frames}/${total}` };
  }

  m = ligne.match(/^Encoded (\d+)\/(\d+)/);
  if (m) {
    const frames = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    return { type: "progress", frames, total, label: `Encodage h264 · ${frames}/${total}` };
  }

  if (ligne.startsWith("✓ Done")) return { type: "phase", label: "Finalisation…" };
  return null;
}
