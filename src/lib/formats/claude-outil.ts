import type { ResolvedAgent } from "../config-resolve";
import { API_URL, API_VERSION } from "../llm-providers/anthropic";

/**
 * Appeler Claude avec UN outil imposé : la réponse est l'entrée de l'outil,
 * conforme à son schéma JSON (listes fermées comprises). Plus sûr qu'un JSON
 * libre : le 17/10/2026, deux essais sur deux d'un explainer en JSON libre
 * mélangeaient les types de visuel et inventaient des pictogrammes.
 * SERVEUR SEULEMENT, clé de l'utilisateur, aucun proxy.
 */

export type Outil = { name: string; description: string; input_schema: Record<string, unknown> };

export type AppelerAvecOutil = (
  agent: ResolvedAgent,
  systeme: string,
  message: string,
  outil: Outil,
) => Promise<{ ok: true; entree: unknown } | { ok: false; raison: string }>;

export const appelerClaudeAvecOutil: AppelerAvecOutil = async (agent, systeme, message, outil) => {
  let reponse: Response;
  try {
    reponse = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": agent.apiKey, "anthropic-version": API_VERSION },
      body: JSON.stringify({
        model: agent.model,
        max_tokens: 6000,
        system: systeme,
        messages: [{ role: "user", content: message }],
        tools: [outil],
        tool_choice: { type: "tool", name: outil.name },
      }),
    });
  } catch {
    return { ok: false, raison: "Claude injoignable : vérifie ta connexion." };
  }
  if (!reponse.ok) return { ok: false, raison: `Claude a répondu ${reponse.status} : ${(await reponse.text()).slice(0, 200)}` };
  const corps = (await reponse.json()) as { stop_reason?: string; content?: { type: string; name?: string; input?: unknown }[] };
  // Coupée, l'entrée de l'outil est incomplète : refusée, jamais prise pour une vidéo courte.
  if (corps.stop_reason === "max_tokens") return { ok: false, raison: "La réponse de Claude a été coupée : raccourcis les notes." };
  const appel = (corps.content ?? []).find((bloc) => bloc.type === "tool_use" && bloc.name === outil.name);
  if (!appel) return { ok: false, raison: "Claude n'a pas rendu de proposition : relance." };
  return { ok: true, entree: appel.input };
};
