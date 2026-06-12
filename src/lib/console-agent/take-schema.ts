/**
 * Director's Console — schéma de la réponse du modèle.
 *
 * Le modèle répond EXCLUSIVEMENT via le tool `respond_take`
 * (tool_choice forcé) : l'API Anthropic valide l'input contre ce
 * JSON Schema, donc pas de fences à parser ni de JSON malformé.
 *
 * La réponse du modèle est VOLONTAIREMENT plus pauvre que le contrat
 * UI (`TakeBlock`) : pas de `before`/`removed` (réécrits depuis le
 * tour réel par validate.ts — l'undo ne dépend jamais du LLM), pas de
 * deltaSec/touchedSections/cards (recalculés serveur, déterministes).
 */

import type { TourStep } from "@/lib/types/tour";

/** Op telle que le MODÈLE la produit (sans les champs de rollback). */
export type ModelDiffOp =
  | { op: "insert-step"; at: number; step: TourStep }
  | { op: "remove-step"; at: number }
  | { op: "replace-step"; at: number; after: TourStep };

export interface ModelTakeResponse {
  /** Lignes de narration mono (gutter 5ch) — 2 à 6 lignes. */
  narration: Array<{ prefix: "plan" | "note" | "vo~"; text: string }>;
  /** Modifications proposées sur tour.steps. Absent si simple réponse. */
  ops?: ModelDiffOp[];
  /** Mise en avant d'un changement de voix off (affichage avant/après). */
  voHighlight?: { stepIndex: number; before: string; after: string };
  /** Proposition de lancer une étape du pipeline (jamais exécutée seule). */
  runProposal?: { job: "capture" | "vo" | "compose"; reason: string };
  /** Réponse libre (question de l'utilisateur, pas de modification). */
  reply?: string;
}

/** JSON Schema du tool — le step est laissé en objet libre (validé
 *  structurellement côté serveur par validate.ts, qui connaît le
 *  discriminant `type`). */
export const RESPOND_TAKE_TOOL = {
  name: "respond_take",
  description:
    "Réponds à la prise de l'utilisateur : narration courte + modifications éventuelles du scénario (ops sur tour.steps) + éventuelle proposition de run pipeline. Toujours répondre via ce tool.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      narration: {
        type: "array",
        minItems: 1,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            prefix: { type: "string", enum: ["plan", "note", "vo~"] },
            text: { type: "string", maxLength: 120 },
          },
          required: ["prefix", "text"],
        },
      },
      ops: {
        type: "array",
        maxItems: 12,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            op: {
              type: "string",
              enum: ["insert-step", "remove-step", "replace-step"],
            },
            at: { type: "integer", minimum: 0 },
            step: { type: "object" },
            after: { type: "object" },
          },
          required: ["op", "at"],
        },
      },
      voHighlight: {
        type: "object",
        additionalProperties: false,
        properties: {
          stepIndex: { type: "integer", minimum: 0 },
          before: { type: "string" },
          after: { type: "string" },
        },
        required: ["stepIndex", "before", "after"],
      },
      runProposal: {
        type: "object",
        additionalProperties: false,
        properties: {
          job: { type: "string", enum: ["capture", "vo", "compose"] },
          reason: { type: "string", maxLength: 160 },
        },
        required: ["job", "reason"],
      },
      reply: { type: "string", maxLength: 600 },
    },
    required: ["narration"],
  },
} as const;
