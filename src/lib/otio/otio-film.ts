import {
  type MediaSurLeDisque,
  type OtioMarker,
  type OtioTimeline,
  type OtioTrackChild,
  clip,
  gap,
  marker,
  timeline,
  track,
} from "./elements";

/**
 * Le film de marque en timeline OTIO, à ouvrir dans DaVinci Resolve.
 * Module pur : il traduit le montage que GEN MOTION a décidé.
 *
 * Le film n'a pas de vidéo source : chaque plan est une animation que
 * GEN MOTION dessine (textes, logo, écrans). La piste « Plans » découpe donc
 * le RENDU du film aux frontières des plans, pour les déplacer, les raccourcir
 * ou en retirer un. Ce qui se retouche vraiment, ce sont les deux pistes
 * son : chaque réplique de voix off à sa place, et la musique, avec un repère
 * partout où GEN MOTION la baisse.
 */

export type PlanDuFilmPlace = {
  // Nom lisible du plan (« Le problème »), son début et sa durée en images,
  // et s'il entre par un glissement (dessiné dans le rendu).
  nom: string;
  debut: number;
  duree: number;
  glissement: boolean;
};

export type RepliquePlacee = MediaSurLeDisque & { texte: string; debut: number; fin: number };

export type EntreeDuFilm = {
  nom: string;
  fps: number;
  // Durée totale du film, en images.
  duree: number;
  plans: PlanDuFilmPlace[];
  // Le rendu du film par GEN MOTION : sans lui, il n'y a rien à montrer.
  rendu: MediaSurLeDisque;
  repliques: RepliquePlacee[];
  musique: (MediaSurLeDisque & { premierTempsSec: number; volume: number; sousLaVoix: number; fondu: number }) | null;
};

function pisteDesPlans(entree: EntreeDuFilm): OtioTrackChild[] {
  const { fps, rendu } = entree;
  return entree.plans.map((plan) => {
    const reperes: OtioMarker[] = plan.glissement
      ? [marker(fps, "Entre par un glissement (dessiné dans le rendu GEN MOTION)", plan.debut / fps, "PURPLE")]
      : [];
    return clip(fps, plan.nom, rendu.chemin, plan.debut / fps, plan.duree / fps, rendu.dureeSec, reperes);
  });
}

// Ce que le film joue VRAIMENT d'une réplique, en images : jamais plus que
// son fichier (la durée notée dans la fiche peut dépasser de quelques images
// le fichier mesuré), et jamais après la fin du film, où le rendu la coupe.
function dureeJouee(replique: RepliquePlacee, entree: EntreeDuFilm): number {
  const prevue = replique.fin - replique.debut;
  const duFichier = replique.dureeSec === null ? prevue : Math.floor(replique.dureeSec * entree.fps);
  return Math.min(prevue, duFichier, entree.duree - replique.debut);
}

function pisteDeLaVoix(entree: EntreeDuFilm): OtioTrackChild[] {
  const { fps } = entree;
  const enfants: OtioTrackChild[] = [];
  let curseur = 0;
  // voixPlacees a déjà écarté les répliques qui se chevauchaient (un souffle
  // entre deux) : elles se posent bout à bout, avec du vide entre.
  for (const replique of [...entree.repliques].sort((a, b) => a.debut - b.debut)) {
    const duree = dureeJouee(replique, entree);
    if (duree <= 0) continue;
    if (replique.debut > curseur) enfants.push(gap(fps, (replique.debut - curseur) / fps, "Silence"));
    enfants.push(clip(fps, replique.texte, replique.chemin, 0, duree / fps, replique.dureeSec));
    curseur = replique.debut + duree;
  }
  return enfants;
}

function pisteDeMusique(entree: EntreeDuFilm): OtioTrackChild[] {
  const { fps, musique, duree } = entree;
  if (!musique) return [];
  const debut = musique.premierTempsSec;
  const pourcentage = Math.round(musique.sousLaVoix * 100);
  const reperes = entree.repliques.map((replique) =>
    marker(fps, `Musique à ${pourcentage} % : voix off`, debut + replique.debut / fps, "BLUE", replique.texte, (replique.fin - replique.debut) / fps),
  );
  reperes.push(marker(fps, "Fondu de sortie de la musique", debut + (duree - musique.fondu) / fps, "BLUE", "", musique.fondu / fps));
  const nom = musique.volume === 1 ? "Musique" : `Musique (volume ${Math.round(musique.volume * 100)} %)`;
  return [clip(fps, nom, musique.chemin, debut, duree / fps, musique.dureeSec, reperes)];
}

export function timelineDuFilm(entree: EntreeDuFilm): OtioTimeline {
  const pistes = [track("Video", "Plans", pisteDesPlans(entree))];
  const voix = pisteDeLaVoix(entree);
  if (voix.length > 0) pistes.push(track("Audio", "Voix off", voix));
  const musique = pisteDeMusique(entree);
  if (musique.length > 0) pistes.push(track("Audio", "Musique", musique));
  return timeline(entree.fps, entree.nom, { film: entree.nom }, pistes);
}
