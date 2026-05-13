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
 *  the rest of the pipeline. */
export interface GeneratedTour {
  id: string;
  name: string;
  description: string;
  estimatedSec: number;
  startPath: string;
  baseUrl: string;
  format: "16:9" | "9:16";
  steps: GeneratedTourStep[];
}

export interface GeneratedTourStep {
  type: "section" | "overlay" | "scroll" | "wait" | "click" | "hover";
  /** Section title (when type=section) or step description. */
  label?: string;
  /** Selector to act on (when type=click/hover/scroll). */
  selector?: string;
  /** Wait duration in ms (when type=wait), or section duration target. */
  ms?: number;
  /** Voice-over text (FR, conversational, 5-10 s when spoken). */
  voiceover?: string;
  /** Category for backdrop / motion preset (cf. categories.json) :
   *  hero / features / pricing / testimonials / etc. */
  category?: string;
}

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
 *  malformed JSON crash compose-tour later. */
export function isGeneratedTour(value: unknown): value is GeneratedTour {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || v.id.length === 0) return false;
  if (typeof v.name !== "string" || v.name.length === 0) return false;
  if (typeof v.baseUrl !== "string" || !v.baseUrl.startsWith("http"))
    return false;
  if (!Array.isArray(v.steps)) return false;
  for (const step of v.steps) {
    if (!step || typeof step !== "object") return false;
    const s = step as Record<string, unknown>;
    if (typeof s.type !== "string") return false;
  }
  return true;
}
