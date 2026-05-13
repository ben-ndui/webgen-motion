/**
 * Anthropic Claude provider — recommandé pour la qualité narrative
 * française. Va chercher `claude-opus-4-7` par défaut (le plus
 * capable + multimodal pour les screenshots).
 *
 * Direct fetch sur https://api.anthropic.com/v1/messages, pas de
 * SDK npm pour garder le bundle léger et éviter une dep transitive
 * dans les runners packaged. Au passage on fixe le `output-tokens`
 * généreusement (8 k) parce que les TourEntry full peuvent être
 * verbeux (10-15 steps avec voiceover, 50-150 chars chacun).
 */

import type {
  AgentProvider,
  GenerateTourParams,
  GenerateTourResult,
  GeneratedTour,
} from "./base";
import { isGeneratedTour } from "./base";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

/** Pricing per million tokens (USD), as published by Anthropic in
 *  May 2026. Sonnet est 5× moins cher qu'Opus, on l'utilise par
 *  défaut. Opus only if multimodal/highest quality voulu. */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7": { input: 15, output: 75 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
};

const MULTIMODAL_MODELS = new Set([
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
]);

export interface AnthropicProviderOptions {
  apiKey: string;
  /** Default : `claude-sonnet-4-6` — best quality/cost ratio for
   *  the agent's structured-JSON generation. */
  model?: string;
}

export function createAnthropicProvider(
  opts: AnthropicProviderOptions,
): AgentProvider {
  const model = opts.model ?? "claude-sonnet-4-6";
  const supportsMultimodal = MULTIMODAL_MODELS.has(model);

  return {
    kind: "anthropic",
    model,
    supportsMultimodal,

    async generateTour(
      params: GenerateTourParams,
    ): Promise<GenerateTourResult> {
      const systemPrompt = buildSystemPrompt(params);
      const userPrompt = buildUserPrompt(params);

      // Build the message content : text + optional screenshot.
      const content: Array<Record<string, unknown>> = [
        { type: "text", text: userPrompt },
      ];
      if (params.snapshot.screenshot && supportsMultimodal) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: params.snapshot.screenshot,
          },
        });
      }

      const body = {
        model,
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content }],
        // Lower temperature → more deterministic JSON shape. We're
        // generating a strict schema, not creative writing.
        temperature: 0.4,
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": opts.apiKey,
          "anthropic-version": API_VERSION,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Anthropic API ${res.status} : ${errorText.slice(0, 500)}`,
        );
      }
      const json = (await res.json()) as {
        content: Array<{ type: string; text?: string }>;
        usage?: { input_tokens: number; output_tokens: number };
      };

      const text = (json.content ?? [])
        .filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("\n");

      // The model is asked to wrap the output in ```json ... ```
      // fences. Strip them and parse.
      const raw = extractJsonBlock(text);
      let parsed: GeneratedTour;
      try {
        parsed = JSON.parse(raw) as GeneratedTour;
      } catch (e) {
        throw new Error(
          `Claude returned unparseable JSON. First 200 chars : ${raw.slice(0, 200)}\nParse error : ${(e as Error).message}`,
        );
      }
      if (!isGeneratedTour(parsed)) {
        throw new Error(
          `Claude output failed schema validation. First 200 chars : ${raw.slice(0, 200)}`,
        );
      }

      // Cost computation. Anthropic returns token counts in usage —
      // we multiply by the published per-token prices.
      const usage = json.usage;
      const pricing = PRICING[model];
      let estimatedCostUsd: number | undefined;
      if (usage && pricing) {
        estimatedCostUsd =
          (usage.input_tokens * pricing.input) / 1_000_000 +
          (usage.output_tokens * pricing.output) / 1_000_000;
      }

      return {
        tour: parsed,
        raw,
        usage: usage
          ? {
              inputTokens: usage.input_tokens,
              outputTokens: usage.output_tokens,
              estimatedCostUsd,
            }
          : undefined,
      };
    },
  };
}

/** Extracts the first ```json ... ``` block in the response. If the
 *  model didn't wrap (sometimes happens with Sonnet at low temp),
 *  return the raw text — JSON.parse will catch malformed cases. */
function extractJsonBlock(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const anyFence = text.match(/```\s*([\s\S]*?)```/);
  if (anyFence) return anyFence[1].trim();
  return text.trim();
}
