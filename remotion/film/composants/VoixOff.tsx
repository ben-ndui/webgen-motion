import { Audio, Sequence, staticFile } from "remotion";

import { imageDuTemps } from "../lib/tempo";
import type { Intervalle } from "../lib/sourdine";
import type { Repere } from "../reperes";
import type { LigneDeVoix } from "../spec";

export type VoixPlacee = Intervalle & { fichier: string; repere: string };

type Place = { id: string; debut: number };

// Le souffle entre deux répliques quand la précédente déborde : 4 images.
export const RESPIRATION = 4;

/**
 * Les répliques jouées, en images : chacune part à SON repère (le moment où
 * son texte apparaît), dans les seuls plans de ce montage. Une voix ne se
 * coupe jamais elle-même : si la précédente n'a pas fini, la suivante
 * l'attend (un souffle), puis le film reprend son rythme. Une réplique pas
 * encore générée n'est pas jouée.
 */
export function voixPlacees(lignes: LigneDeVoix[], reperes: Repere[], places: Place[], tempo: number, fps: number): VoixPlacee[] {
  const prevues: VoixPlacee[] = [];
  for (const ligne of lignes) {
    const repere = reperes.find((r) => r.cle === ligne.repere);
    const place = repere && places.find((p) => p.id === repere.plan);
    if (!repere || !place || !ligne.fichier || !ligne.duree) continue;
    const debut = place.debut + imageDuTemps(repere.temps, tempo);
    prevues.push({ debut, fin: debut + Math.round(ligne.duree * fps), fichier: ligne.fichier, repere: ligne.repere });
  }
  prevues.sort((a, b) => a.debut - b.debut);
  const resultat: VoixPlacee[] = [];
  for (const voix of prevues) {
    const precedente = resultat.at(-1);
    const attente = precedente ? Math.max(0, precedente.fin + RESPIRATION - voix.debut) : 0;
    resultat.push({ ...voix, debut: voix.debut + attente, fin: voix.fin + attente });
  }
  return resultat;
}

/** La voix off : une piste par réplique, posée à son repère. */
export function VoixOff({ voix }: { voix: VoixPlacee[] }) {
  return (
    <>
      {voix.map((ligne) => (
        <Sequence key={ligne.repere} from={ligne.debut} durationInFrames={ligne.fin - ligne.debut + 1} name={`voix-${ligne.repere}`}>
          <Audio src={staticFile(ligne.fichier)} />
        </Sequence>
      ))}
    </>
  );
}
