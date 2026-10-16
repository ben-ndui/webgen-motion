import type { DeclinaisonDuFilm, FilmSpec } from "../../remotion/film/spec";
import { type DossiersDuFilm, dossiersDuFilm, problemesDeLaDeclinaison } from "./film-etat";
import { chargerFilm, getFilmsDir } from "./film-loader";
import { etatDesMedias } from "./film-medias";
import { type TypeDeRendu, estNomSur, estTypeDeRendu, fichiersDuRendu } from "./film-store";

/**
 * Ce que le runner (`scripts/render-film.ts`) et la route
 * (`/api/motion/film/render`) vérifient AVANT de lancer Remotion. Une seule
 * implémentation : la route répond 400 tout de suite, le runner refuse aussi
 * quand on l'appelle à la main. Serveur seulement.
 */

export type RequeteDeRendu = { filmId: string; declinaison: string; rendu: TypeDeRendu; episode?: string };

export type LectureDeRequete = { ok: true; requete: RequeteDeRendu } | { ok: false; erreur: string };

/**
 * Valide le corps JSON de la route : deux noms sûrs, et le type de rendu
 * (« film » par défaut, « bibliotheque », ou « episode » avec l'id sûr de
 * l'épisode). Rien d'autre n'est lu.
 */
export function lireRequeteDeRendu(corps: unknown): LectureDeRequete {
  if (typeof corps !== "object" || corps === null || Array.isArray(corps)) {
    return { ok: false, erreur: "Corps JSON attendu : { filmId, declinaison, rendu? }" };
  }
  const { filmId, declinaison, rendu, episode } = corps as Record<string, unknown>;
  if (!estNomSur(filmId)) return { ok: false, erreur: "filmId manquant ou invalide" };
  if (!estNomSur(declinaison)) return { ok: false, erreur: "declinaison manquante ou invalide" };
  if (rendu !== undefined && !estTypeDeRendu(rendu)) {
    return { ok: false, erreur: "rendu invalide : « film », « bibliotheque » ou « episode »" };
  }
  if (rendu === "episode") {
    if (!estNomSur(episode)) return { ok: false, erreur: "episode manquant ou invalide" };
    return { ok: true, requete: { filmId, declinaison, rendu, episode } };
  }
  return { ok: true, requete: { filmId, declinaison, rendu: rendu ?? "film" } };
}

/** La composition Remotion de chaque type de rendu (remotion/film/CompositionFilm.tsx). */
export const COMPOSITION_DU_RENDU: Record<TypeDeRendu, "Film" | "Bibliotheque" | "Episode"> = {
  film: "Film",
  bibliotheque: "Bibliotheque",
  episode: "Episode",
};

export type RenduPrepare = {
  ok: true;
  type: TypeDeRendu;
  composition: "Film" | "Bibliotheque" | "Episode";
  // Seulement pour un rendu d'épisode.
  episode?: string;
  spec: FilmSpec;
  declinaison: DeclinaisonDuFilm;
  dossierPublic: string;
  dossierDeSortie: string;
  sortie: string;
  partiel: string;
  verrou: string;
};

export type RenduRefuse = { ok: false; statut: 400 | 404; erreurs: string[] };

export type OptionsDePreparation = { dossierDesFiches?: string; dossiers?: DossiersDuFilm; type?: TypeDeRendu; episode?: string };

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

  const type = options.type ?? "film";
  const dossiers = options.dossiers ?? dossiersDuFilm(filmId);
  const medias = etatDesMedias(spec, dossiers.public, [declinaison.langue]);
  const problemes = problemesDeLaDeclinaison(spec, medias, declinaison.langue, type, options.episode);
  if (problemes.length > 0) return { ok: false, statut: 400, erreurs: problemes };

  const fichiers = fichiersDuRendu(dossiers.sortie, declinaison.nom, type, options.episode);
  return {
    ok: true,
    type,
    composition: COMPOSITION_DU_RENDU[type],
    episode: options.episode,
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
  // « ▶ Film … » ou « ▶ Explainer … » : la bannière de début des deux runners.
  if (ligne.startsWith("▶ ")) return { type: "phase", label: "Préparation du rendu…" };

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
