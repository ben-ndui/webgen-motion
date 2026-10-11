import { Audio, Sequence, staticFile } from "remotion";

import type { Intervalle } from "../lib/sourdine";
import type { LigneDeVoix } from "../spec";

// La voix entre un demi-temps après le début du plan : le plan s'installe,
// puis on parle.
export function decalageDeVoix(imagesParTemps: number): number {
  return Math.round(imagesParTemps / 2);
}

type Place = { id: string; debut: number };

/** Les lignes jouées (générées, et dont le plan est dans ce montage), en images. */
export function voixPlacees(lignes: LigneDeVoix[], places: Place[], fps: number, decalage: number): (Intervalle & { fichier: string; plan: string })[] {
  const resultat: (Intervalle & { fichier: string; plan: string })[] = [];
  for (const ligne of lignes) {
    const place = places.find((p) => p.id === ligne.plan);
    if (!place || !ligne.fichier || !ligne.duree) continue;
    const debut = place.debut + decalage;
    resultat.push({ debut, fin: debut + Math.round(ligne.duree * fps), fichier: ligne.fichier, plan: ligne.plan });
  }
  return resultat;
}

/** La voix off : une piste par ligne, posée au début de son plan. */
export function VoixOff({ voix }: { voix: (Intervalle & { fichier: string; plan: string })[] }) {
  return (
    <>
      {voix.map((ligne) => (
        <Sequence key={ligne.plan} from={ligne.debut} durationInFrames={ligne.fin - ligne.debut + 1} name={`voix-${ligne.plan}`}>
          <Audio src={staticFile(ligne.fichier)} />
        </Sequence>
      ))}
    </>
  );
}
