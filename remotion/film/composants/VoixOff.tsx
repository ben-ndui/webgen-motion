import { Audio, Sequence, staticFile } from "remotion";

import type { VoixPlacee } from "../lib/voix-placees";

export { RESPIRATION, type VoixPlacee, voixPlacees } from "../lib/voix-placees";

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
