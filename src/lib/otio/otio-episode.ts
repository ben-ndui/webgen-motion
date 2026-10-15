import {
  FONDU_DE_LA_MUSIQUE,
  type MontageDeLEpisode,
  MUSIQUE_SOUS_UNE_REPLIQUE,
} from "../../../remotion/film/cinema/montage";
import {
  type OtioMarker,
  type OtioTimeline,
  type OtioTrackChild,
  clip,
  dissolve,
  gap,
  marker,
  timeline,
  track,
} from "./elements";

/**
 * L'épisode d'une série en timeline OTIO, à ouvrir dans DaVinci Resolve ou
 * Premiere. Module pur : il traduit le montage que GEN MOTION a déjà décidé
 * (montage.ts), il n'en prend aucune décision.
 *
 * Ce qui se retrouve dans le logiciel de montage :
 * - piste « Plans » : chaque morceau de plan à sa place, avec sa découpe ;
 *   le fondu entre deux scènes devient un fondu enchaîné ;
 * - piste « Son des plans » : le son des mêmes vidéos (les répliques) ;
 * - piste « Musique » : calée sur son premier temps, avec un repère sur
 *   chaque réplique (la musique y est baissée) ;
 * - le logo, qui est une animation GEN MOTION, est repris du rendu de
 *   l'épisode ; sans rendu, un emplacement repéré le remplace.
 */

/** Un fichier sur le disque et sa durée (null si on n'a pas pu la mesurer). */
export type MediaSurLeDisque = { chemin: string; dureeSec: number | null };

export type EntreeDeLEpisode = {
  nom: string;
  fps: number;
  montage: MontageDeLEpisode;
  // Le fichier d'un plan (chemin dans public/) → où il est sur le disque.
  mediaDuPlan: (fichier: string) => MediaSurLeDisque;
  musique: (MediaSurLeDisque & { premierTempsSec: number; volume: number }) | null;
  // Le rendu de l'épisode par GEN MOTION, d'où vient le logo.
  rendu: MediaSurLeDisque | null;
};

const VIOLET = "PURPLE";

function pistesDesPlans(entree: EntreeDeLEpisode): { image: OtioTrackChild[]; son: OtioTrackChild[] } {
  const { fps, montage } = entree;
  const image: OtioTrackChild[] = [];
  const son: OtioTrackChild[] = [];
  montage.morceaux.forEach((morceau, index) => {
    const suivant = montage.morceaux[index + 1];
    // La coupe tombe là où le morceau suivant (ou le logo) commence ; le fondu
    // déborde ensuite sur les images du plan qui sort, au-delà de la coupe.
    const coupe = suivant ? suivant.debut : montage.debutDuLogo;
    const visible = Math.max(1, coupe - morceau.debut);
    const media = entree.mediaDuPlan(morceau.fichier);
    const reperes: OtioMarker[] = [];
    if (index === 0 && montage.objetImagine) {
      reperes.push(marker(fps, "APERÇU : un objet de cet épisode est imaginé", morceau.depuis / fps, "RED", "Le rendu GEN MOTION porte la mention « APERÇU » tant que le plan n'est pas généré avec la photo du vrai produit."));
    }
    const nom = morceau.replique ? `${morceau.planId} (réplique)` : morceau.planId;
    image.push(clip(fps, nom, media.chemin, morceau.depuis / fps, visible / fps, media.dureeSec, reperes));
    son.push(clip(fps, nom, media.chemin, morceau.depuis / fps, visible / fps, media.dureeSec));
    if (suivant && suivant.fondu > 0) {
      image.push(dissolve(fps, "Fondu entre deux scènes", 0, suivant.fondu / fps));
      son.push(dissolve(fps, "Fondu entre deux scènes", 0, suivant.fondu / fps));
    }
  });
  return { image, son };
}

function logo(entree: EntreeDeLEpisode): OtioTrackChild {
  const { fps, montage, rendu } = entree;
  const debutSec = montage.debutDuLogo / fps;
  const dureeSec = (montage.duree - montage.debutDuLogo) / fps;
  if (!rendu) {
    return gap(fps, dureeSec, "Logo", [
      marker(fps, "Logo : rends l'épisode dans GEN MOTION pour qu'il apparaisse ici", 0, VIOLET),
    ]);
  }
  return clip(fps, "Logo (rendu GEN MOTION)", rendu.chemin, debutSec, dureeSec, rendu.dureeSec, [
    marker(fps, "Le logo se construit : animation reprise du rendu de l'épisode", debutSec, VIOLET),
  ]);
}

function pisteDeMusique(entree: EntreeDeLEpisode): OtioTrackChild[] {
  const { fps, montage, musique } = entree;
  if (!musique) return [];
  const debut = musique.premierTempsSec;
  const reperes = montage.morceaux
    .filter((morceau) => morceau.replique)
    .map((morceau) =>
      marker(fps, `Musique à ${Math.round(MUSIQUE_SOUS_UNE_REPLIQUE * 100)} % : réplique`, debut + morceau.debut / fps, "BLUE", "", morceau.duree / fps),
    );
  reperes.push(marker(fps, "Fondu de sortie de la musique", debut + (montage.duree - FONDU_DE_LA_MUSIQUE) / fps, "BLUE", "", FONDU_DE_LA_MUSIQUE / fps));
  const nom = musique.volume === 1 ? "Musique" : `Musique (volume ${Math.round(musique.volume * 100)} %)`;
  return [clip(fps, nom, musique.chemin, debut, montage.duree / fps, musique.dureeSec, reperes)];
}

export function timelineDeLEpisode(entree: EntreeDeLEpisode): OtioTimeline {
  const { image, son } = pistesDesPlans(entree);
  const musique = pisteDeMusique(entree);
  const pistes = [track("Video", "Plans", [...image, logo(entree)]), track("Audio", "Son des plans", son)];
  if (musique.length > 0) pistes.push(track("Audio", "Musique", musique));
  return timeline(entree.fps, entree.nom, { episode: entree.nom }, pistes);
}
