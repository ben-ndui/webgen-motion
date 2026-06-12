/**
 * Director's Console — orchestration serveur d'une prise.
 *
 * `runTake` reçoit la TakeRequest, émet des TakeEvent (1 event = 1
 * ligne NDJSON côté route) :
 *   1. logs immédiats (contexte réel) pendant que Claude réfléchit,
 *   2. slash commands : bypass LLM → bloc run-log "proposed",
 *   3. appel Anthropic en tool-use FORCÉ (JSON garanti par schéma),
 *   4. validation/enrichissement des ops (validate.ts — le rollback
 *      ne dépend jamais du LLM),
 *   5. séquençage des events avec un léger pacing pour préserver
 *      l'effet « prise » côté UI.
 *
 * v1 volontairement non-streamée côté Anthropic (le JSON partiel d'un
 * tool-use est fragile à parser) — les logs immédiats + le pacing
 * couvrent la latence. Si le besoin de tokens live se confirme,
 * passer en SSE + input_json_delta derrière la même interface.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { getConfig } from "@/lib/config";
import { getAllTours, getTour } from "@/lib/tour-loader";
import { getMotionTourDir } from "@/lib/motion-tour-store";
import type {
  TakeBlock,
  TakeEvent,
  TakeRequest,
} from "@/app/tour/[id]/_components/console/types";
import {
  buildHubSystemPrompt,
  buildHubUserMessage,
  buildSystemPrompt,
  buildUserMessage,
} from "./build-prompt";
import {
  RESPOND_TAKE_TOOL,
  RESPOND_TAKE_TOOL_HUB,
  type ModelTakeResponse,
} from "./take-schema";
import { validateCreatedTour, validateModelOps } from "./validate";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-6";

export interface ConsoleAgentConfig {
  configured: boolean;
  provider?: string;
  model?: string;
  apiKey?: string;
}

/** Config BYOK — réutilise le bloc `agent` du wizard (Sprint 5). */
export function resolveConsoleAgent(): ConsoleAgentConfig {
  const cfg = getConfig();
  const agent = cfg.agent;
  const provider = agent?.provider ?? "anthropic";
  if (!agent?.apiKey || provider !== "anthropic") {
    return { configured: false, provider };
  }
  return {
    configured: true,
    provider,
    model: agent.model ?? DEFAULT_MODEL,
    apiKey: agent.apiKey,
  };
}

type Emit = (evt: TakeEvent) => void;

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      resolve();
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });

function errorBlock(
  code: "network" | "rate-limit" | "provider" | "no-key",
  message: string,
  retryInSec?: number,
): TakeBlock {
  return { kind: "error", code, message, ...(retryInSec ? { retryInSec } : {}) };
}

/** Slash commands : la console ne lance jamais un job depuis le
 *  serveur — elle renvoie un bloc run-log "proposed" que l'UI
 *  branche sur l'orchestrateur TourClient. */
function slashTake(prompt: string, emit: Emit): boolean {
  const m = prompt.trim().match(/^\/(capture|vo|compose|undo)\b/);
  if (!m) return false;
  if (m[1] === "undo") {
    emit({ type: "log", prefix: "note", text: "utilise « défaire » sur la prise concernée (ou ⌘Z, focus console)" });
    emit({ type: "done", status: "done" });
    return true;
  }
  const job = m[1] as "capture" | "vo" | "compose";
  emit({
    type: "block",
    block: {
      kind: "run-log",
      job,
      lines: [{ prefix: "run", text: `${job} — prêt à lancer` }],
      state: "proposed",
    },
  });
  emit({ type: "done", status: "proposed" });
  return true;
}

/** Appel Anthropic en tool-use forcé — les erreurs sont émises en
 *  blocs (mêmes familles que la maquette) ; null = prise terminée. */
async function callRespondTake(
  agent: ConsoleAgentConfig,
  system: string,
  userMessage: string,
  tool: typeof RESPOND_TAKE_TOOL | typeof RESPOND_TAKE_TOOL_HUB,
  emit: Emit,
  signal: AbortSignal,
): Promise<ModelTakeResponse | null> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": agent.apiKey!,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({
        model: agent.model,
        max_tokens: 6000,
        system,
        messages: [{ role: "user", content: userMessage }],
        tools: [tool],
        tool_choice: { type: "tool", name: "respond_take" },
        temperature: 0.3,
      }),
    });
  } catch (e) {
    if (signal.aborted) return null;
    emit({
      type: "block",
      block: errorBlock("network", `réseau injoignable : ${(e as Error).message}`),
    });
    emit({ type: "done", status: "error" });
    return null;
  }

  if (!res.ok) {
    const text = (await res.text().catch(() => "")).slice(0, 300);
    if (res.status === 429) {
      const retry = parseInt(res.headers.get("retry-after") ?? "30", 10);
      emit({
        type: "block",
        block: errorBlock(
          "rate-limit",
          `Anthropic 429 — limite atteinte. Nouvel essai possible dans ${retry}s`,
          Number.isFinite(retry) ? retry : 30,
        ),
      });
    } else if (res.status === 401 || res.status === 403) {
      emit({
        type: "block",
        block: errorBlock("provider", "clé Anthropic refusée — vérifie Réglages → Agent IA."),
      });
    } else {
      emit({
        type: "block",
        block: errorBlock("provider", `Anthropic ${res.status} : ${text}`),
      });
    }
    emit({ type: "done", status: "error" });
    return null;
  }

  const json = (await res.json()) as {
    content: Array<{ type: string; name?: string; input?: unknown }>;
    stop_reason?: string;
  };
  const toolUse = json.content.find(
    (c) => c.type === "tool_use" && c.name === "respond_take",
  );
  if (!toolUse?.input) {
    emit({
      type: "block",
      block: errorBlock("provider", "le modèle n'a pas répondu via le tool respond_take."),
    });
    emit({ type: "done", status: "error" });
    return null;
  }
  return toolUse.input as ModelTakeResponse;
}

export async function runTake(
  req: TakeRequest,
  emit: Emit,
  signal: AbortSignal,
): Promise<void> {
  const agent = resolveConsoleAgent();
  if (!agent.configured) {
    emit({
      type: "block",
      block: errorBlock("no-key", "Aucune clé Anthropic configurée — Réglages → Agent IA."),
    });
    emit({ type: "done", status: "error" });
    return;
  }

  // Mode hub — pas de tour ouvert : l'agent du studio.
  if ((req.mode ?? "editor") === "hub" || !req.tour) {
    await runHubTake(req, emit, signal, agent);
    return;
  }

  if (slashTake(req.prompt, emit)) return;

  // Feedback immédiat pendant la latence du modèle.
  emit({
    type: "log",
    prefix: "plan",
    text: `lecture du scénario… ok (${req.tour.steps.length} steps)`,
  });
  if (req.scopeSection !== undefined) {
    emit({ type: "log", prefix: "plan", text: `scope S${req.scopeSection + 1}` });
  }

  const out = await callRespondTake(
    agent,
    buildSystemPrompt(),
    buildUserMessage(req),
    RESPOND_TAKE_TOOL,
    emit,
    signal,
  );
  if (!out) return;

  // Narration — pacing léger ligne par ligne (l'effet « prise »).
  for (const line of out.narration ?? []) {
    if (signal.aborted) return;
    emit({ type: "log", prefix: line.prefix, text: line.text });
    await sleep(90, signal);
  }

  let finalStatus: "done" | "proposed" = "done";

  if (out.ops && out.ops.length > 0) {
    const v = validateModelOps(req.tour, out.ops, req.scopeSection);
    if (!v.ok) {
      emit({
        type: "log",
        prefix: "note",
        text: `proposition invalide — ${v.error}. Reformule ou précise la demande.`,
      });
    } else if (v.diff) {
      if (out.voHighlight) {
        const real = req.tour.steps[out.voHighlight.stepIndex] as
          | { voiceover?: string }
          | undefined;
        emit({
          type: "block",
          block: {
            kind: "vo-diff",
            stepIndex: out.voHighlight.stepIndex,
            before: real?.voiceover ?? out.voHighlight.before,
            after: out.voHighlight.after,
            state: "proposed",
          },
        });
        await sleep(80, signal);
      }
      emit({
        type: "block",
        block: { kind: "step-diff", diff: v.diff, cards: v.cards ?? [], state: "proposed" },
      });
      finalStatus = "proposed";
    }
  }

  if (out.runProposal) {
    await sleep(80, signal);
    emit({
      type: "block",
      block: {
        kind: "run-log",
        job: out.runProposal.job,
        lines: [{ prefix: "run", text: out.runProposal.reason }],
        state: "proposed",
      },
    });
    finalStatus = "proposed";
  }

  if (out.reply && finalStatus === "done") {
    emit({ type: "block", block: { kind: "text", text: out.reply } });
  }

  if (!signal.aborted) emit({ type: "done", status: finalStatus });
}

/** Ligne de catalogue d'un tour — id, name, platform, sections,
 *  durée estimée, état pipeline (manifest / final sur disque). */
function catalogLine(t: {
  id: string;
  name: string;
  platform?: string;
  estimatedSec: number;
  steps: Array<{ type: string }>;
}): string {
  const sections = t.steps.filter((s) => s.type === "section").length;
  const dir = getMotionTourDir(t.id);
  const hasCapture = existsSync(join(dir, "manifest.json"));
  const hasFinal = existsSync(join(dir, "final.mp4"));
  const pipeline = [
    hasCapture ? "capture ✓" : "pas de capture",
    hasFinal ? "final.mp4 ✓" : "pas de final",
  ].join(" · ");
  return `- id "${t.id}" · « ${t.name} » · ${t.platform ?? "web"} · ${sections} sections · ~${Math.round(t.estimatedSec)}s · ${pipeline}`;
}

/** Slug unique — suffixe -2, -3… si l'id existe déjà au catalogue. */
function uniqueTourId(id: string): string {
  if (!getTour(id)) return id;
  for (let n = 2; n < 100; n++) {
    const candidate = `${id}-${n}`;
    if (!getTour(candidate)) return candidate;
  }
  return `${id}-${Date.now()}`;
}

/**
 * Mode hub — l'assistant du studio. Le user message porte le
 * CATALOGUE complet (getAllTours + état pipeline disque) ; la réponse
 * peut proposer createTour (validé + slug dé-dupliqué ici) ou
 * openTour (vérifié au catalogue). Tout reste une PROPOSITION : le
 * bloc hub-action n'agit qu'au clic de confirmation côté UI.
 */
async function runHubTake(
  req: TakeRequest,
  emit: Emit,
  signal: AbortSignal,
  agent: ConsoleAgentConfig,
): Promise<void> {
  const tours = getAllTours();

  // Feedback immédiat pendant la latence du modèle.
  emit({
    type: "log",
    prefix: "plan",
    text: `lecture du studio… ok (${tours.length} tour${tours.length > 1 ? "s" : ""} au catalogue)`,
  });

  const out = await callRespondTake(
    agent,
    buildHubSystemPrompt(),
    buildHubUserMessage(req, tours.map(catalogLine)),
    RESPOND_TAKE_TOOL_HUB,
    emit,
    signal,
  );
  if (!out) return;

  for (const line of out.narration ?? []) {
    if (signal.aborted) return;
    emit({ type: "log", prefix: line.prefix, text: line.text });
    await sleep(90, signal);
  }

  let finalStatus: "done" | "proposed" = "done";

  if (out.createTour) {
    const v = validateCreatedTour(out.createTour);
    if (!v.ok || !v.tour) {
      emit({
        type: "log",
        prefix: "note",
        text: `proposition invalide — ${v.error}. Reformule ou précise la demande.`,
      });
    } else {
      const tour = { ...v.tour, id: uniqueTourId(v.tour.id) };
      if (tour.id !== v.tour.id) {
        emit({ type: "log", prefix: "note", text: `id "${v.tour.id}" déjà pris — "${tour.id}"` });
        await sleep(60, signal);
      }
      emit({
        type: "block",
        block: { kind: "hub-action", action: { type: "create-tour", tour }, state: "proposed" },
      });
      finalStatus = "proposed";
    }
  } else if (out.openTour) {
    const target = getTour(out.openTour.trim());
    if (!target) {
      emit({
        type: "log",
        prefix: "note",
        text: `tour "${out.openTour}" introuvable au catalogue`,
      });
    } else {
      emit({
        type: "block",
        block: {
          kind: "hub-action",
          action: { type: "open-tour", tourId: target.id, title: target.name },
          state: "proposed",
        },
      });
      finalStatus = "proposed";
    }
  }

  if (out.reply && finalStatus === "done") {
    emit({ type: "block", block: { kind: "text", text: out.reply } });
  }

  if (!signal.aborted) emit({ type: "done", status: finalStatus });
}
