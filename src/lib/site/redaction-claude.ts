import type { Langue } from "../../../remotion/film/spec";
import type { ResolvedAgent } from "../config";
import { API_URL, API_VERSION, extractJsonBlock } from "../llm-providers/anthropic";
import type { LectureDuSite } from "./lecture-du-site";
import { type LectureDeLaReponse, demandeDeRedaction, lireLaReponse } from "./redaction-proposee";

/**
 * Demander à Claude les textes de « Ton histoire », avec la clé de
 * l'utilisateur (aucun proxy, aucun coût pour Smooth & Design). SERVEUR SEULEMENT.
 */
export type ResultatDeRedaction = ({ ok: true } & LectureDeLaReponse) | { ok: false; raison: string };

export async function redigerAvecClaude(lecture: LectureDuSite, langues: Langue[], agent: ResolvedAgent, ecrans: string[] = []): Promise<ResultatDeRedaction> {
  if (agent.provider !== "anthropic") {
    return { ok: false, raison: "La rédaction automatique fonctionne avec une clé Claude (Anthropic)." };
  }
  const { systeme, message } = demandeDeRedaction(lecture, langues, ecrans);
  const reponse = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": agent.apiKey, "anthropic-version": API_VERSION },
    body: JSON.stringify({ model: agent.model, max_tokens: 4000, system: systeme, messages: [{ role: "user", content: message }], temperature: 0.4 }),
  });
  if (!reponse.ok) return { ok: false, raison: `Claude a répondu ${reponse.status} : ${(await reponse.text()).slice(0, 300)}` };
  const corps = (await reponse.json()) as { stop_reason?: string; content?: { type: string; text?: string }[] };
  // Une réponse coupée rend un JSON incomplet : on la refuse plutôt que de
  // prendre ses champs manquants pour « rien à dire ».
  if (corps.stop_reason === "max_tokens") return { ok: false, raison: "La réponse de Claude a été coupée (trop longue)." };
  const texte = (corps.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
  try {
    return { ok: true, ...lireLaReponse(JSON.parse(extractJsonBlock(texte)), langues, lecture) };
  } catch {
    return { ok: false, raison: "La réponse de Claude n'était pas lisible." };
  }
}
