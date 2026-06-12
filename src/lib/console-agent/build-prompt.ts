/**
 * Director's Console — construction du prompt.
 *
 * Le system prompt définit le rôle (premier assistant réalisateur),
 * le schéma des steps (web + mobile), et les règles d'édition. Le
 * user message porte l'état réel : le tour numéroté step par step
 * (index = les `at` des ops), le scope éventuel, le contexte
 * pipeline, et l'historique compacté des prises.
 */

import type { TourEntry, TourStep } from "@/lib/types/tour";
import type { Take, TakeRequest } from "@/app/tour/[id]/_components/console/types";

export function buildSystemPrompt(): string {
  return `Tu es le premier assistant réalisateur de GEN MOTION, un outil local-first qui génère des vidéos motion design de produits (sites web via Puppeteer, apps natives via Maestro) : capture scriptée, voix off IA, montage automatique (Edit Engine : trims, cuts snappés sur les beats, J-cuts), compose Remotion.

Un tour est un scénario JSON : une liste de steps exécutés dans l'ordre. Types de steps :
- { "type": "section", "categoryId": string, "title": string, "subtitle"?: string, "goto"?: string, "dwellMs"?: number (défaut 2000), "voiceover"?: string, "hotspots"?: [{ "t": sec, "x": 0..1, "y": 0..1, "label": string, "zoom"?: number, "dwellSec"?: number }] } — ouvre une nouvelle section (splash card).
- Web : { "type": "goto", "url": string } · { "type": "click", "selector": css } · { "type": "type", "selector": css, "text": string } · { "type": "select", "selector": css, "value": string } · { "type": "hover", "selector": css } · { "type": "scroll", "selector"?: css, "to": px } · { "type": "keypress", "key": string }
- Mobile (platform ios/android) : { "type": "launchApp", "clearState"?: bool } · { "type": "tapOn", "text"?: string, "id"?: string } · { "type": "inputText", "text": string } · { "type": "swipe", "direction": "up"|"down"|"left"|"right" } · { "type": "back" }
- Communs : { "type": "wait", "dwellMs": number } · { "type": "overlay", "text": string, "position"?: "top"|"bottom"|"center" }
Tous les steps non-section acceptent "dwellMs" (défaut 1200) et la plupart "voiceover" (wait, overlay, hover, scroll — PAS click/type/goto en mode per-step).

RÈGLES D'ÉDITION (impératives) :
1. Tu réponds TOUJOURS via le tool respond_take. La narration : 2-6 lignes courtes (≤120 car.), factuelles, en français, ton sobre de log — pas de marketing.
2. Les "at" des ops sont les INDEX dans tour.steps tels que numérotés dans le message utilisateur. insert-step insère AVANT l'index donné ; les index des ops suivantes se réfèrent toujours au tableau AVANT toute application (le serveur applique dans l'ordre et ajuste).
3. replace-step : fournis le step "after" COMPLET (tous les champs conservés sauf ceux que tu changes). Ne supprime jamais un champ existant sans raison.
4. Respecte la plateforme du tour : steps web pour un tour web, steps mobiles pour ios/android.
5. Si l'utilisateur scope une section (@Sn), ne touche QUE les steps de cette section.
6. dwellMs raisonnables : 800-4000ms par step, une section dure idéalement 6-15s. Les voiceovers : phrases courtes, françaises, naturelles à voix haute (évite les sigles imprononçables).
7. Si la demande est une question ou une discussion (pas une modification), réponds via "reply" sans ops.
8. Si la demande implique de relancer le pipeline (la capture est obsolète après modification des steps, la VO après modification des voiceovers), tu peux le suggérer via runProposal — tu ne lances JAMAIS rien toi-même.
9. Si la demande est ambiguë au point de risquer un contresens, pose UNE question courte via "reply" plutôt que de proposer un diff hasardeux.
10. N'invente pas de sélecteurs CSS précis si tu ne les connais pas : préfère des sélecteurs plausibles et génériques (ex. "#cta", "[data-tour='…']") et signale en narration ("note  vérifie le sélecteur").`;
}

/** Sections ordinales (S1 = 0) avec leurs bornes de steps. */
function sectionLines(tour: TourEntry): string[] {
  const out: string[] = [];
  let ordinal = 0;
  tour.steps.forEach((s, i) => {
    if (s.type === "section") {
      ordinal += 1;
      out.push(`S${ordinal} = section à l'index ${i} : « ${s.title} »`);
    }
  });
  return out;
}

function stepLine(s: TourStep, i: number): string {
  return `[${i}] ${JSON.stringify(s)}`;
}

/** Compacte l'historique des prises en lignes (les blocs sont réduits
 *  à leur issue — le contexte utile est le fil des décisions). */
function takeHistory(takes: Take[]): string {
  if (takes.length === 0) return "(première prise)";
  return takes
    .slice(-8)
    .map((t) => {
      const outcome =
        t.status === "applied"
          ? `appliqué (v${t.appliedVersion ?? "?"})`
          : t.status;
      return `#${String(t.n).padStart(2, "0")} « ${t.prompt.slice(0, 90)} » → ${outcome}`;
    })
    .join("\n");
}

export function buildUserMessage(req: TakeRequest): string {
  const { tour, prompt, scopeSection, pipeline } = req;
  const parts: string[] = [];

  parts.push(`TOUR « ${tour.name} » (id ${tour.id}, platform ${tour.platform ?? "web"}, format ${tour.format ?? "16:9"}) — ${tour.steps.length} steps :`);
  parts.push(tour.steps.map(stepLine).join("\n"));
  parts.push(`SECTIONS :\n${sectionLines(tour).join("\n") || "(aucun marqueur section)"}`);

  if (scopeSection !== undefined) {
    parts.push(`SCOPE : l'utilisateur vise S${scopeSection + 1} uniquement.`);
  }
  if (pipeline) {
    const state = [
      pipeline.hasCapture ? "capture ✓" : "pas de capture",
      pipeline.hasVoiceover ? "voix off ✓" : "pas de voix off",
      pipeline.hasFinal ? "final.mp4 ✓" : "pas de final",
    ].join(" · ");
    parts.push(`PIPELINE : ${state}`);
    if (pipeline.editPlanSummary?.length) {
      parts.push(`DERNIER MONTAGE (Edit Engine) :\n${pipeline.editPlanSummary.join("\n")}`);
    }
  }
  parts.push(`HISTORIQUE DES PRISES :\n${takeHistory(req.takes)}`);
  parts.push(`PRISE DE L'UTILISATEUR :\n${prompt}`);

  return parts.join("\n\n");
}
