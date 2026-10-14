import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { repliqueDite } from "./comparer-replique";
import { LIEUX_PAR_DEFAUT, type Lieux, type Refus, ficheAvecCinema } from "./lieux";
import { trouverLePlan } from "./plans";
import { type Transcrire, transcrireAvecWhisper } from "./transcription";

/**
 * La réplique a-t-elle VRAIMENT été dite ? Un plan prêt n'est pas un plan
 * réussi : Veo peut rendre la scène sans faire parler le personnage. Le
 * résultat est gardé par plan (dans le dossier du film) tant que la vidéo
 * ne change pas : la transcription prend plusieurs secondes. SERVEUR SEULEMENT.
 */
export type ControleDeLaReplique =
  | { statut: "dite"; entendu: string }
  | { statut: "ecart"; entendu: string }
  | { statut: "indisponible"; raison: string };

type EnCache = { videoModifieeLe: number; texte: string; entendu: string };

export async function controlerLaReplique(
  id: string,
  planId: string,
  partiel: Partial<Lieux> = {},
  transcrire: Transcrire = transcrireAvecWhisper,
): Promise<{ ok: true; controle: ControleDeLaReplique } | Refus> {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = ficheAvecCinema(id, lieux);
  if (!lecture.ok) return lecture;
  const plan = trouverLePlan(lecture.cinema, planId)?.plan;
  if (!plan) return { ok: false, statut: 404, raison: `Le plan « ${planId} » n'existe pas dans ce film.` };
  if (!plan.replique) return { ok: false, statut: 400, raison: "Ce plan n'a pas de réplique à contrôler." };
  const video = plan.fichier ? join(lieux.public(id), plan.fichier) : null;
  if (!video || !existsSync(video)) return { ok: false, statut: 404, raison: "Ce plan n'est pas encore généré." };

  const texte = plan.replique.texte;
  const juger = (entendu: string): ControleDeLaReplique => ({ statut: repliqueDite(texte, entendu) ? "dite" : "ecart", entendu });
  const cache = join(lieux.dossier(id), "controles", `${planId}.json`);
  const videoModifieeLe = statSync(video).mtimeMs;
  if (existsSync(cache)) {
    const garde = JSON.parse(readFileSync(cache, "utf-8")) as EnCache;
    // Même vidéo ET même réplique demandée : le résultat tient toujours.
    if (garde.videoModifieeLe === videoModifieeLe && garde.texte === texte) return { ok: true, controle: juger(garde.entendu) };
  }

  const entendu = transcrire(video);
  if (entendu === null) {
    return { ok: true, controle: { statut: "indisponible", raison: "Contrôle impossible sur cet ordinateur : whisper (transcription locale) n'est pas installé." } };
  }
  mkdirSync(join(lieux.dossier(id), "controles"), { recursive: true });
  writeFileSync(cache, JSON.stringify({ videoModifieeLe, texte, entendu } satisfies EnCache));
  return { ok: true, controle: juger(entendu) };
}
