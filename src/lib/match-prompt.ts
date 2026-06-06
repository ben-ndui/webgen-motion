import type { TourEntry, TourStep } from "@/lib/types/tour";

/**
 * Builds a self-sufficient prompt the user can paste into Claude (or any
 * LLM) to rewrite a tour's **narrative voice-over** so it matches what
 * the captured video actually shows — step by step, with timings and the
 * punch-in (zoom) labels. Output target is the `narrativeScript` string
 * with `[step:N]` markers aligned to the timeline below.
 *
 * This is the "script ↔ vidéo" matching helper surfaced in the Voix off
 * tab. It embeds everything an external model needs (no repo access).
 */
export function buildMatchPrompt(tour: TourEntry): string {
  const timeline = tour.steps.map((s, i) => describeStep(s, i)).join("\n");
  const target = tour.estimatedSec ? `~${tour.estimatedSec}s` : "60–120s";

  return `# Rôle
Tu réécris le NARRATIF voix-off d'une vidéo motion design (GEN MOTION) pour qu'il colle exactement à ce qui s'affiche à l'écran, moment par moment.

# Tour : ${tour.name}
${tour.description ?? ""}

# Format de sortie ATTENDU
Rends UNIQUEMENT la valeur de \`narrativeScript\` : un seul texte FR continu, avec des markers \`[step:N]\` qui placent chaque phrase au bon instant. \`N\` = l'index du step dans la timeline ci-dessous (0-based). Durée cible ${target}, ton premium et énergique. Pas de JSON, pas de commentaire — juste la chaîne.

# Timeline — ce que voit le spectateur, step par step
${timeline}

# Narratif actuel (à resynchroniser / améliorer)
${tour.narrativeScript ?? "(aucun pour l'instant)"}

# Consignes
- Aligne les markers \`[step:N]\` sur les moments clés ci-dessus (titres de section, overlays, zooms).
- Quand un step a un ZOOM, la phrase à cet instant doit "payer" ce zoom (parler de l'élément pointé).
- Court, rythmé, qui tient dans la durée de chaque step — pas de remplissage.
- Une seule langue (français), une seule chaîne en sortie.`;
}

function describeStep(s: TourStep, i: number): string {
  const bits: string[] = [];
  if ("title" in s && s.title) bits.push(`section « ${s.title} »`);
  if ("subtitle" in s && s.subtitle) bits.push(`sous-titre « ${s.subtitle} »`);
  if ("text" in s && s.text) bits.push(`overlay « ${s.text} »`);
  if ("goto" in s && s.goto) bits.push(`navigue vers ${s.goto}`);
  const hotspots = ("hotspots" in s && Array.isArray(s.hotspots) ? s.hotspots : [])
    .map((h) => h?.label)
    .filter(Boolean);
  if (hotspots.length) bits.push(`zoom sur ${hotspots.join(", ")}`);
  const dur = "dwellMs" in s && s.dwellMs ? `${(s.dwellMs / 1000).toFixed(1)}s` : "";
  const meta = [s.type, dur].filter(Boolean).join(", ");
  return `- [step:${i}] (${meta}) ${bits.length ? bits.join(" · ") : "—"}`;
}
