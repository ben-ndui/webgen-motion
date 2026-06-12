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

import { getConfig } from "@/lib/config";
import type {
  TakeBlock,
  TakeEvent,
  TakeRequest,
} from "@/app/tour/[id]/_components/console/types";
import { buildSystemPrompt, buildUserMessage } from "./build-prompt";
import { RESPOND_TAKE_TOOL, type ModelTakeResponse } from "./take-schema";
import { validateModelOps } from "./validate";

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
        system: buildSystemPrompt(),
        messages: [{ role: "user", content: buildUserMessage(req) }],
        tools: [RESPOND_TAKE_TOOL],
        tool_choice: { type: "tool", name: "respond_take" },
        temperature: 0.3,
      }),
    });
  } catch (e) {
    if (signal.aborted) return;
    emit({
      type: "block",
      block: errorBlock("network", `réseau injoignable : ${(e as Error).message}`),
    });
    emit({ type: "done", status: "error" });
    return;
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
    return;
  }

  const json = (await res.json()) as {
    content: Array<{ type: string; name?: string; input?: unknown }>;
    stop_reason?: string;
  };
  const toolUse = json.content.find(
    (c) => c.type === "tool_use" && c.name === RESPOND_TAKE_TOOL.name,
  );
  if (!toolUse?.input) {
    emit({
      type: "block",
      block: errorBlock("provider", "le modèle n'a pas répondu via le tool respond_take."),
    });
    emit({ type: "done", status: "error" });
    return;
  }
  const out = toolUse.input as ModelTakeResponse;

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
