/**
 * La consigne de ton par défaut de Voicebox, partagée par la config (serveur) et le
 * réglage (navigateur) : un module sans dépendance serveur. Celle qui a gagné le banc
 * d'écoute à l'aveugle du 18/10/2026 (voix clonée de Ben : 3,75 → 4,13 / 5).
 */
export const CONSIGNE_DE_TON_CONSEILLEE =
  "Voix enjouée, souriante et énergique, comme dans une publicité, avec un débit vif.";

/** Voicebox refuse une consigne plus longue (schéma `instruct`, maxLength 500). */
export const LONGUEUR_MAX_CONSIGNE = 500;

/** La consigne ne compte que pour un moteur qui la SUIT (Qwen) : la changer avec kokoro ou
 *  chatterbox régénérerait tout pour une voix identique, et Voicebox pourrait la refuser. */
export function consigneSuivie(voix: { engine: string; instruct: string }): string {
  return voix.engine.startsWith("qwen") ? voix.instruct : "";
}
