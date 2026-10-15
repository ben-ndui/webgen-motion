import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { monterLEpisode } from "../../../remotion/film/cinema/montage";
import { IMAGES_PAR_SECONDE } from "../../../remotion/film/lib/tempo";
import { fichiersDuRendu } from "../film-store";
import { probeDurationSec } from "../otio/export-otio";
import { type MediaSurLeDisque, timelineDeLEpisode } from "../otio/otio-episode";
import { LIEUX_PAR_DEFAUT, type Lieux, type Refus, ficheAvecCinema } from "./lieux";

export type ExportDeLEpisode = { ok: true; chemin: string; nomDuFichier: string; logoInclus: boolean };

type Sonde = (chemin: string) => number | null;

/**
 * Écrit `out/<déclinaison>.episode-<id>.otio` : l'épisode tel que GEN MOTION
 * l'a monté, à ouvrir dans DaVinci Resolve. Refuse tant qu'un
 * plan n'a pas sa vidéo sur le disque (le monteur ouvrirait des médias
 * hors ligne). Le logo n'y est que si l'épisode a déjà été rendu.
 */
export function exporterLEpisodeEnOtio(
  id: string,
  declinaison: string,
  episodeId: string,
  partiel: Partial<Lieux> = {},
  sonder: Sonde = probeDurationSec,
): ExportDeLEpisode | Refus {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const fiche = ficheAvecCinema(id, lieux);
  if (!fiche.ok) return fiche;
  const { spec, cinema } = fiche;
  if (!spec.declinaisons.some((d) => d.nom === declinaison)) return { ok: false, statut: 404, raison: `Déclinaison « ${declinaison} » introuvable.` };
  const episode = cinema.episodes.find((e) => e.id === episodeId);
  if (!episode) return { ok: false, statut: 404, raison: `Épisode « ${episodeId} » introuvable dans la série.` };

  let montage;
  try {
    montage = monterLEpisode(cinema, episodeId, spec.musique.tempo, IMAGES_PAR_SECONDE);
  } catch (erreur) {
    // Un plan pas encore généré : le message dit lequel.
    return { ok: false, statut: 409, raison: (erreur as Error).message };
  }

  const dossierPublic = lieux.public(id);
  const media = (fichier: string): MediaSurLeDisque => {
    const chemin = join(dossierPublic, fichier);
    return { chemin, dureeSec: sonder(chemin) };
  };
  const absent = montage.morceaux.find((morceau) => !existsSync(join(dossierPublic, morceau.fichier)));
  if (absent) return { ok: false, statut: 409, raison: `La vidéo du plan « ${absent.planId} » manque sur le disque : régénère-le.` };

  const cheminDeLaMusique = join(dossierPublic, spec.musique.fichier);
  const musique = existsSync(cheminDeLaMusique)
    ? { ...media(spec.musique.fichier), premierTempsSec: spec.musique.premierTemps, volume: spec.musique.volume ?? 1 }
    : null;

  const dossierDeSortie = join(lieux.dossier(id), "out");
  const rendu = fichiersDuRendu(dossierDeSortie, declinaison, "episode", episodeId).livrable;
  const timeline = timelineDeLEpisode({
    nom: `${episode.titre} (${declinaison})`,
    fps: IMAGES_PAR_SECONDE,
    montage,
    mediaDuPlan: media,
    musique,
    rendu: existsSync(rendu) ? { chemin: rendu, dureeSec: sonder(rendu) } : null,
  });

  const nomDuFichier = `${declinaison}.episode-${episodeId}.otio`;
  const chemin = join(dossierDeSortie, nomDuFichier);
  mkdirSync(dossierDeSortie, { recursive: true });
  writeFileSync(chemin, JSON.stringify(timeline, null, 2));
  return { ok: true, chemin, nomDuFichier, logoInclus: existsSync(rendu) };
}
