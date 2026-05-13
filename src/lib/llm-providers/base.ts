/**
 * Provider abstraction for the AI agent that auto-generates tours
 * from a site URL. Setup wizard → user picks a provider + colle sa
 * clé API → the agent runner uses this interface to produce a
 * TourEntry JSON without caring which model is behind.
 *
 * Bring-your-own-key model : Smooth & Design doesn't proxy or pay
 * for inference. The user's tokens are billed by their chosen
 * provider directly.
 *
 * Anthropic Claude is the default reco for narrative FR quality.
 * OpenAI / Mistral are alternatives for users with existing
 * subscriptions there.
 */

export type ProviderKind = "anthropic" | "openai" | "mistral";

/** Site structure extracted by the scraper, fed to the LLM as
 *  context. Lighter than the raw DOM — only what matters for tour
 *  generation. */
export interface SiteSnapshot {
  /** Base URL the user provided. */
  url: string;
  /** `<title>` of the landing page. */
  title: string;
  /** First `<meta name="description">` (or og:description). */
  description: string;
  /** Sections detected via `data-tour-section` / `data-section`
   *  / `<section>` heuristics. In document order. */
  sections: SiteSection[];
  /** Interactive elements detected via `data-tour-step` /
   *  `data-element` / common patterns (CTA buttons, links, forms). */
  interactiveElements: SiteInteractiveElement[];
  /** Optional base64 JPEG screenshot for multimodal models that can
   *  read images (Claude Opus, GPT-4o vision). 1920×1080 max,
   *  quality ~70 % to keep payload reasonable. */
  screenshot?: string;
}

export interface SiteSection {
  /** Stable identifier — `data-tour-section` value if explicit, else
   *  derived from the section's `id` attribute or its index. */
  id: string;
  /** Visible heading text (first `<h1>`/`<h2>` inside the section). */
  heading: string;
  /** First meaningful paragraph or `<p>` content (trimmed to 500 chars). */
  excerpt: string;
  /** CSS selector that uniquely targets this section — used by the
   *  capture runner later. */
  selector: string;
  /** Pixel offset from page top (rect.top + window.scrollY at
   *  scraping time). Used by the LLM to emit accurate `scroll`
   *  steps with the right `to` values — without this it just
   *  guesses 600 / 800 and never lands on the actual section. */
  scrollY: number;
}

export interface SiteInteractiveElement {
  /** Stable id : `data-tour-step`, `data-element`, or derived. */
  id: string;
  /** "button" | "link" | "input" | "select" | "form" | "card" | etc. */
  kind: string;
  /** Visible label / placeholder / aria-label. */
  label: string;
  /** Selector for the capture runner. */
  selector: string;
  /** ID of the section this element belongs to, if detectable. */
  sectionId?: string;
}

/** Output : the agent returns a TourEntry-compatible JSON. We re-
 *  validate it on receipt so a malformed LLM output doesn't crash
 *  the rest of the pipeline. Mirrors src/lib/types/tour.ts exactly. */
export interface GeneratedTour {
  id: string;
  name: string;
  description: string;
  estimatedSec: number;
  startPath: string;
  baseUrl: string;
  format: "16:9" | "9:16";
  voiceMode?: "per-step" | "narrative";
  narrativeScript?: string;
  brand?: {
    displayName?: string;
    domain?: string;
    tagline?: string;
  };
  composeStyle?: string;
  steps: GeneratedTourStep[];
}

/** Mirror of TourStep union from src/lib/types/tour.ts. We only
 *  list the step types the agent is allowed to emit (no `goto`,
 *  `type`, `select`, `keypress` for now — those need precise inputs
 *  the LLM can't reliably infer). */
export type GeneratedTourStep =
  | {
      type: "section";
      categoryId: string;
      title: string;
      subtitle?: string;
      dwellMs?: number;
    }
  | { type: "scroll"; to: number; selector?: string; dwellMs?: number }
  | { type: "click"; selector: string; dwellMs?: number }
  | { type: "hover"; selector: string; dwellMs?: number }
  | {
      type: "overlay";
      text: string;
      position?: "top" | "bottom" | "center";
      categoryId?: string;
      dwellMs?: number;
    }
  | { type: "wait"; dwellMs: number };

export interface GenerateTourParams {
  snapshot: SiteSnapshot;
  /** Style guide for the narrative. Defaults to "pitch" — 80-120 s
   *  marketing pitch. */
  preset?: "pitch" | "demo" | "walkthrough" | "showcase";
  /** Format target. Defaults to "16:9". */
  format?: "16:9" | "9:16";
  /** Optional brand voice / tone hint ("playful", "premium", "tech",
   *  "educational"). */
  tone?: string;
}

export interface GenerateTourResult {
  tour: GeneratedTour;
  /** Raw JSON the model emitted, useful for debugging prompt issues. */
  raw: string;
  /** Token usage reported by the provider, for cost tracking. */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    /** Estimated cost in USD, computed from the provider's published
     *  pricing at the time of the call. */
    estimatedCostUsd?: number;
  };
}

/** All providers implement this. The agent runner picks one at runtime
 *  based on the resolved config / wizard selection. */
export interface AgentProvider {
  /** Stable identifier — useful for log lines + cache keys. */
  kind: ProviderKind;
  /** Human-readable model id (e.g. "claude-opus-4-7"). */
  model: string;
  /** True if the provider can consume the optional screenshot. */
  supportsMultimodal: boolean;

  generateTour(params: GenerateTourParams): Promise<GenerateTourResult>;
}

/** Validation : ensures the LLM output really matches our expected
 *  shape before we hand it back. Cheaper to throw here than to let a
 *  malformed JSON crash compose-tour later. Per-type field check
 *  catches the easy mistakes (section without categoryId/title,
 *  overlay without text, scroll without `to`, etc.). */
export function isGeneratedTour(value: unknown): value is GeneratedTour {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || v.id.length === 0) return false;
  if (typeof v.name !== "string" || v.name.length === 0) return false;
  if (typeof v.baseUrl !== "string" || !v.baseUrl.startsWith("http"))
    return false;
  if (!Array.isArray(v.steps)) return false;
  for (const step of v.steps) {
    if (!isGeneratedTourStep(step)) return false;
  }
  // narrativeScript should reference at least the first step (the
  // runner depends on a [step:0] anchor to start the timeline).
  if (
    v.voiceMode === "narrative" &&
    typeof v.narrativeScript === "string" &&
    !v.narrativeScript.includes("[step:0]")
  ) {
    return false;
  }
  return true;
}

function isGeneratedTourStep(value: unknown): value is GeneratedTourStep {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  switch (s.type) {
    case "section":
      return (
        typeof s.categoryId === "string" &&
        s.categoryId.length > 0 &&
        typeof s.title === "string" &&
        s.title.length > 0
      );
    case "scroll":
      return typeof s.to === "number" && Number.isFinite(s.to);
    case "click":
    case "hover":
      return typeof s.selector === "string" && s.selector.length > 0;
    case "overlay":
      return typeof s.text === "string" && s.text.length > 0;
    case "wait":
      return typeof s.dwellMs === "number" && s.dwellMs >= 0;
    default:
      return false;
  }
}

/**
 * Filet de sécurité : si le LLM met un \`scroll\` juste avant un
 * \`section\`, on déplace le scroll APRÈS le section. Le scroll
 * appartient au MP4 de la section qu'il introduit (visuellement le
 * splash doit s'afficher AVANT le glissement), donc il doit suivre
 * le step \`section\`.
 *
 * On gère aussi le cas chained où plusieurs steps non-section sont
 * coincés entre un \`scroll\` et un \`section\` : on déplace tout
 * le bloc \`[wait/hover/overlay…, scroll]\` après la section
 * suivante. C'est rare mais préférable à du data-loss.
 *
 * Retourne un nouveau tableau, ne mute pas l'entrée.
 */
export function normalizeStepOrder(
  steps: GeneratedTourStep[],
): GeneratedTourStep[] {
  const result: GeneratedTourStep[] = [];
  let i = 0;
  while (i < steps.length) {
    const cur = steps[i];
    // Detect "scroll immediately before a section step" pattern,
    // optionally with one filler step between (wait/hover/overlay).
    if (cur.type === "scroll") {
      // Find the next section step
      let j = i + 1;
      let sawNonSection = false;
      while (j < steps.length && steps[j].type !== "section") {
        sawNonSection = true;
        j++;
      }
      if (j < steps.length && steps[j].type === "section") {
        // Move the section step BEFORE the scroll, scroll stays
        // right after it. The fillers between go after the scroll.
        result.push(steps[j]); // section first
        result.push(cur); // then the (formerly mis-ordered) scroll
        // Re-emit the fillers that were between the scroll and the
        // section, preserving their order.
        for (let k = i + 1; k < j; k++) {
          if (sawNonSection) result.push(steps[k]);
        }
        i = j + 1;
        continue;
      }
    }
    result.push(cur);
    i++;
  }
  return result;
}

/**
 * Filet de sécurité critique : le LLM est mauvais avec les
 * correspondances numériques. Il génère souvent des sections avec
 * les bons titres mais des scrolls qui pointent vers la mauvaise
 * position (off-by-one fréquent). Cette fonction réaligne chaque
 * \`scroll.to\` qui suit un \`section\` step sur le \`scrollY\`
 * réel du snapshot, en matchant par titre.
 *
 * Matching : lowercase + remove diacritics + count common tokens.
 * On retient le snapshot section avec le meilleur score, à condition
 * qu'au moins 1 token significatif soit partagé. Si rien ne match
 * (le LLM a paraphrasé trop loin), on garde la valeur originale du
 * LLM — pas pire que ce qu'on avait.
 *
 * Retourne un nouveau tableau ; n'altère pas l'entrée.
 */
export function realignScrollsToSnapshot(
  steps: GeneratedTourStep[],
  snapshotSections: SiteSection[],
): {
  steps: GeneratedTourStep[];
  fixed: number;
  skipped: number;
} {
  if (snapshotSections.length === 0) {
    return { steps, fixed: 0, skipped: 0 };
  }
  const result: GeneratedTourStep[] = [...steps];
  let fixed = 0;
  let skipped = 0;
  // Scan : pour chaque section suivi d'un scroll, override le
  // scroll.to avec la scrollY de la section trouvée dans le snapshot.
  for (let i = 0; i < result.length - 1; i++) {
    const cur = result[i];
    const next = result[i + 1];
    if (cur.type !== "section" || next.type !== "scroll") continue;
    const match = findBestSectionMatch(cur.title, cur.subtitle, snapshotSections);
    if (!match) {
      skipped++;
      continue;
    }
    if (next.to === match.scrollY) {
      // Already aligned, no fix needed.
      continue;
    }
    result[i + 1] = { ...next, to: match.scrollY };
    fixed++;
  }
  return { steps: result, fixed, skipped };
}

function findBestSectionMatch(
  title: string,
  subtitle: string | undefined,
  sections: SiteSection[],
): SiteSection | null {
  const titleTokens = tokenize(`${title} ${subtitle ?? ""}`);
  if (titleTokens.length === 0) return null;
  let best: SiteSection | null = null;
  let bestScore = 0;
  for (const s of sections) {
    const headTokens = tokenize(`${s.heading} ${s.excerpt.slice(0, 200)}`);
    const score = countSharedTokens(titleTokens, headTokens);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  // Need at least one shared significant token to trust the match.
  return bestScore >= 1 ? best : null;
}

/** Lowercase + strip accents + split on non-word + drop stopwords
 *  + drop tokens shorter than 3 chars. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "votre",
  "vous",
  "nos",
  "les",
  "des",
  "que",
  "qui",
  "est",
  "une",
  "tout",
  "tous",
  "son",
  "ses",
  "par",
  "par",
  "pour",
  "sur",
  "dans",
  "plus",
  "trop",
]);

function countSharedTokens(a: string[], b: string[]): number {
  const setB = new Set(b);
  let count = 0;
  for (const t of a) {
    if (setB.has(t)) count++;
  }
  return count;
}
