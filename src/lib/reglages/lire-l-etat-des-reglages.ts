import { existsSync } from "node:fs";

import { resolveAgent, resolveVeoKey, resolveVoiceBackend } from "../config-resolve";
import { type Reglage, etatDesReglages } from "./etat-des-reglages";

/**
 * L'état des réglages de CETTE machine (config.json, puis variables
 * d'environnement en dev). SERVEUR SEULEMENT.
 *
 * Un réglage n'est « prêt » que s'il sert vraiment : la série et
 * l'assistant parlent à Claude seulement (une clé OpenAI n'y fait rien), et
 * un chemin vers un compte de service Google absent du disque ne dit rien.
 */
function laVoixEstPrete(): boolean {
  const voix = resolveVoiceBackend();
  if (voix === null) return false;
  if (voix.kind !== "google") return true;
  return voix.credentialsPath !== undefined && existsSync(voix.credentialsPath);
}

export function lireLEtatDesReglages(): Reglage[] {
  return etatDesReglages({
    claude: resolveAgent()?.provider === "anthropic",
    video: resolveVeoKey() !== null,
    voix: laVoixEstPrete(),
  });
}
