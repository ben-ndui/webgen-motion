/**
 * Director's Console — MockTransport (phase 3).
 *
 * Rejoue des scénarios scriptés avec les MÊMES événements que le
 * transport réel (1 event = 1 ligne, pattern consumeNdjson) — mock et
 * réel indistinguables côté UI. Trois scénarios par mots-clés :
 *   (a) diff sur une section (plan + step-diff + vo-diff)
 *   (b) run /capture · /vo · /compose — PUREMENT SIMULÉ, ne lance
 *       jamais le vrai pipeline
 *   (c) erreur rate-limit avec retryInSec (le retry du même prompt
 *       réussit)
 *   (d) mode hub : create-tour scripté depuis une URL, open-tour,
 *       liste — blocs hub-action proposés, jamais exécutés seuls
 * + fallback texte.
 */
import type { TourEntry, TourStep } from "@/lib/types/tour";
import type {
  ChatTransport,
  RunJob,
  RunParams,
  StepDiffCard,
  TakeBlock,
  TakeEvent,
  TakeRequest,
  TourDiff,
} from "./types";
import { sectionsOf, type SectionInfo } from "./sections";

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

type Emit = (evt: TakeEvent) => void;

/** Simulation d'un run pipeline — narration Edit Engine comprise.
 *  Émet log / progress / done ; le bloc run-log est créé par l'appelant.
 *  NE LANCE JAMAIS un vrai capture/vo/compose. */
export async function simulateRun(
  job: "capture" | "vo" | "compose",
  tour: TourEntry,
  onEvent: Emit,
  signal: AbortSignal,
): Promise<void> {
  const emit = async (evt: TakeEvent, ms = 300) => {
    await sleep(ms, signal);
    if (!signal.aborted) onEvent(evt);
  };
  const sections = sectionsOf(tour);

  if (job === "compose") {
    await emit({ type: "log", prefix: "run", text: "analyse audio… ok (42 onsets)" }, 420);
    await emit({ type: "log", prefix: "trim", text: "16.3s de temps morts coupés (vidéo + voix sync)" });
    await emit({ type: "log", prefix: "cut", text: "beats : 4/4 cuts snappés sur la musique" });
    await emit({ type: "log", prefix: "cut", text: "J-cuts : 2 entrées voix anticipées (250ms)" });
    await emit({ type: "log", prefix: "run", text: "rendu remotion" });
    const t0 = Date.now();
    for (let pct = 8; pct <= 100; pct += 14) {
      const el = Math.round((Date.now() - t0) / 1000);
      const mm = String(Math.floor(el / 60)).padStart(2, "0");
      const ss = String(el % 60).padStart(2, "0");
      await emit(
        { type: "progress", pct: Math.min(pct, 100), label: `${Math.min(pct, 100)}% · ${mm}:${ss}` },
        260,
      );
    }
    await emit({ type: "log", prefix: "run", text: "final.mp4 · 24.1s · 38.2 Mo" }, 320);
  } else if (job === "capture") {
    await emit(
      { type: "log", prefix: "run", text: `chromium ${tour.format === "9:16" ? "1080×1920" : "1920×1080"} · ${sections.length} sections` },
      380,
    );
    for (const s of sections) {
      await emit(
        { type: "log", prefix: "run", text: `S${s.ordinal + 1} — ${s.title}… ok (${s.estimatedSec.toFixed(1)}s)` },
        420,
      );
      await emit(
        { type: "progress", pct: Math.round(((s.ordinal + 1) / sections.length) * 100), label: `section ${s.ordinal + 1}/${sections.length}` },
        80,
      );
    }
    await emit({ type: "log", prefix: "run", text: "manifest.json écrit · captures à jour" }, 300);
  } else {
    const voCount = tour.steps.filter((s) => "voiceover" in s && s.voiceover).length;
    await emit({ type: "log", prefix: "run", text: `voix off · ${voCount} lignes · cache sha1` }, 380);
    for (let i = 0; i < voCount; i++) {
      await emit({ type: "log", prefix: "vo~", text: `ligne ${i + 1}/${voCount}… ok` }, 340);
      await emit({ type: "progress", pct: Math.round(((i + 1) / voCount) * 100), label: `ligne ${i + 1}/${voCount}` }, 60);
    }
    await emit({ type: "log", prefix: "run", text: "voiceover.mp3 assemblé · timeline alignée" }, 300);
  }
  if (!signal.aborted) onEvent({ type: "done", status: "done" });
}

/** Construit un diff réel contre le tour passé — applicable tel quel. */
function buildSectionDiff(
  tour: TourEntry,
  section: SectionInfo,
  opts: { hotspot: boolean; voRewrite: boolean; extendMs?: number },
): { diff: TourDiff; cards: StepDiffCard[]; voBefore?: string; voAfter?: string } {
  const ops: TourDiff["ops"] = [];
  const cards: StepDiffCard[] = [];
  let deltaSec = 0;

  // 1. trim (ou extension) du premier wait de la section
  let waitIdx = -1;
  for (let i = section.stepIndex + 1; i < section.endIndex; i++) {
    const s = tour.steps[i];
    if (s.type === "wait" && s.dwellMs >= 600) { waitIdx = i; break; }
  }
  if (waitIdx >= 0) {
    const before = tour.steps[waitIdx] as Extract<TourStep, { type: "wait" }>;
    const nextDwell = opts.extendMs
      ? before.dwellMs + opts.extendMs
      : Math.max(400, Math.round(before.dwellMs / 3 / 100) * 100);
    const d = (nextDwell - before.dwellMs) / 1000;
    deltaSec += d;
    ops.push({ op: "replace-step", at: waitIdx, before, after: { ...before, dwellMs: nextDwell } });
    cards.push({
      opIndex: ops.length - 1,
      lines: [
        { sign: "-", text: `"dwellMs": ${before.dwellMs}` },
        { sign: "+", text: `"dwellMs": ${nextDwell}   Δ ${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}s` },
      ],
    });
  }

  // 2. hotspot + réécriture VO sur le step section lui-même
  const secStep = tour.steps[section.stepIndex] as Extract<TourStep, { type: "section" }>;
  const voBefore = secStep.voiceover ?? "";
  const voAfter = opts.voRewrite
    ? `${section.title}. L'essentiel, en un geste — sans détour.`
    : voBefore;
  if (opts.hotspot || (opts.voRewrite && voAfter !== voBefore)) {
    const hot = { t: 2.4, x: 0.62, y: 0.41, label: "Clique ici", zoom: 1.6 };
    const after: TourStep = {
      ...secStep,
      ...(opts.hotspot ? { hotspots: [...(secStep.hotspots ?? []), hot] } : {}),
      ...(opts.voRewrite ? { voiceover: voAfter } : {}),
    };
    ops.push({ op: "replace-step", at: section.stepIndex, before: secStep, after });
    cards.push({
      opIndex: ops.length - 1,
      lines: opts.hotspot
        ? [
            { sign: "+", text: `hotspot t ${hot.t}s · x ${hot.x} y ${hot.y} · zoom ${hot.zoom}` },
            { sign: "+", text: `label "${hot.label}"` },
          ]
        : [{ sign: "+", text: "voix off réécrite" }],
    });
  }

  return {
    diff: { ops, deltaSec, touchedSections: [section.ordinal] },
    cards,
    voBefore: opts.voRewrite ? voBefore : undefined,
    voAfter: opts.voRewrite ? voAfter : undefined,
  };
}

export class MockTransport implements ChatTransport {
  private failed = new Set<string>();

  constructor(
    private opts: { configured?: boolean; provider?: string; model?: string } = {},
  ) {}

  async probe() {
    return {
      configured: this.opts.configured ?? true,
      provider: this.opts.provider ?? "anthropic",
      model: this.opts.model ?? "claude-sonnet-4-5",
    };
  }

  /** Run « Lancer » en mode mock — toujours la simulation pure. */
  async run(
    job: RunJob,
    req: { tour: TourEntry; params?: RunParams },
    { onEvent, signal }: { onEvent: Emit; signal: AbortSignal },
  ): Promise<void> {
    await simulateRun(job, req.tour, onEvent, signal);
  }

  async send(
    req: TakeRequest,
    { onEvent, signal }: { onEvent: Emit; signal: AbortSignal },
  ): Promise<void> {
    const emit = async (evt: TakeEvent, ms = 320) => {
      await sleep(ms, signal);
      if (!signal.aborted) onEvent(evt);
    };
    const block = (b: TakeBlock) => ({ type: "block" as const, block: b });
    const { tour, prompt } = req;
    const p = prompt.trim().toLowerCase();

    // ── (d) mode hub — pas de tour ouvert ───────────────────────────
    if (req.mode === "hub" || !tour) {
      await this.sendHub(p, prompt, emit, block);
      return;
    }
    const sections = sectionsOf(tour);

    // ── (b) run explicite via slash — simulation pure ───────────────
    const slash = p.match(/^\/(capture|vo|compose)\b/);
    if (slash) {
      const job = slash[1] as "capture" | "vo" | "compose";
      const styleArg = p.match(/\b(sober|energetic|cinematic|glitch)\b/)?.[1];
      const head =
        job === "compose"
          ? `compose · ${styleArg ?? tour.composeStyle ?? "energetic"} · ${tour.format ?? "16:9"}`
          : job === "capture"
            ? `capture · ${sections.length} sections · ${tour.format ?? "16:9"}`
            : "voix off · elevenlabs";
      await emit(
        block({ kind: "run-log", job, lines: [{ prefix: "run", text: head }], state: "running" }),
        260,
      );
      await simulateRun(job, tour, onEvent, signal);
      return;
    }

    if (p.startsWith("/undo")) {
      await emit(
        block({
          kind: "text",
          text: "Pour défaire : le lien « défaire » d'une prise appliquée, ou ⌘Z dans la console.",
        }),
        300,
      );
      await emit({ type: "done", status: "done" }, 120);
      return;
    }

    // ── (c) erreur rate-limit — le retry du même prompt réussit ─────
    const errKeyed = /\ballonge\b|\boutro\b|\berreur\b|\b429\b/.test(p);
    if (errKeyed && !this.failed.has(prompt)) {
      this.failed.add(prompt);
      await emit({ type: "log", prefix: "plan", text: "lecture du scénario… ok" }, 380);
      await emit(
        block({
          kind: "error",
          code: "rate-limit",
          message: "Anthropic 429 — limite atteinte.",
          retryInSec: 18,
        }),
        420,
      );
      await emit({ type: "done", status: "error" }, 100);
      return;
    }

    // ── run proposé sans slash — jamais d'exécution non confirmée ───
    const proposedJob = p.match(/\b(?:lance|relance|refais)\b[^/]*\b(capture|compose|vo|voix)\b/);
    if (proposedJob) {
      const job = (proposedJob[1] === "voix" ? "vo" : proposedJob[1]) as
        | "capture"
        | "vo"
        | "compose";
      await emit({ type: "log", prefix: "plan", text: `le scénario est prêt pour un ${job}` }, 360);
      await emit(
        block({
          kind: "run-log",
          job,
          lines: [
            { prefix: "run", text: `${job} · prêt à lancer` },
            { prefix: "note", text: "rien ne part sans ta confirmation" },
          ],
          state: "proposed",
        }),
        360,
      );
      await emit({ type: "done", status: "proposed" }, 100);
      return;
    }

    // ── (a) diff sur une section ────────────────────────────────────
    const diffKeyed =
      req.scopeSection !== undefined ||
      errKeyed || // retry du scénario erreur → diff d'extension
      /raccourci|hotspot|réécri|reecri|coupe|trim|ajoute|sobre|plus court/.test(p);
    if (diffKeyed && sections.length > 0) {
      const parsed = p.match(/section\s+(\d+)/)?.[1];
      const ordinal = Math.min(
        sections.length - 1,
        Math.max(0, req.scopeSection ?? (parsed ? parseInt(parsed, 10) - 1 : Math.min(1, sections.length - 1))),
      );
      const section = sections[ordinal];
      const wantsHotspot = /hotspot|clique|bouton/.test(p);
      const wantsVo = /voix|vo\b|réécri|reecri|sobre/.test(p) || wantsHotspot;
      const extend = errKeyed ? 2000 : undefined;
      const { diff, cards, voBefore, voAfter } = buildSectionDiff(tour, section, {
        hotspot: wantsHotspot,
        voRewrite: wantsVo,
        extendMs: extend,
      });

      if (diff.ops.length === 0) {
        await emit(
          block({ kind: "text", text: `Rien à modifier sur S${ordinal + 1} — précise l'intention.` }),
          340,
        );
        await emit({ type: "done", status: "done" }, 100);
        return;
      }

      await emit(
        { type: "log", prefix: "plan", text: `lecture du scénario… ok (${tour.steps.length} steps)` },
        420,
      );
      const trimOp = diff.ops.find((o) => o.op === "replace-step" && o.before.type === "wait");
      if (trimOp && trimOp.op === "replace-step" && trimOp.before.type === "wait") {
        await emit({
          type: "log",
          prefix: "plan",
          text: `S${ordinal + 1} porte ${(trimOp.before.dwellMs / 1000).toFixed(1)}s de temps morts`,
        });
      }
      if (wantsHotspot) {
        await emit({ type: "log", prefix: "plan", text: "cible repérée au DOM de la section" });
      }
      await emit({
        type: "log",
        prefix: "plan",
        text: `${diff.ops.length} modification${diff.ops.length > 1 ? "s" : ""} sur S${ordinal + 1} — ${section.title}`,
      });
      await emit(block({ kind: "step-diff", diff, cards, state: "proposed" }), 380);
      if (voAfter !== undefined && voAfter !== voBefore) {
        await emit(
          block({
            kind: "vo-diff",
            stepIndex: section.stepIndex,
            before: voBefore ?? "",
            after: voAfter,
            state: "proposed",
          }),
          340,
        );
      }
      await emit({ type: "done", status: "proposed" }, 120);
      return;
    }

    // ── fallback texte ──────────────────────────────────────────────
    await emit(
      block({
        kind: "text",
        text: "Je peux modifier le scénario (« raccourcis la section 2 », « @S3 ajoute un hotspot »), réécrire la voix off, ou piloter /capture · /vo · /compose.",
      }),
      420,
    );
    await emit({ type: "done", status: "done" }, 120);
  }

  /** Scénarios hub — create-tour scripté, open-tour, liste, fallback.
   *  Même langage d'événements que le serveur : l'UI ne fait pas la
   *  différence, et rien ne s'exécute sans confirmation. */
  private async sendHub(
    p: string,
    prompt: string,
    emit: (evt: TakeEvent, ms?: number) => Promise<void>,
    block: (b: TakeBlock) => Extract<TakeEvent, { type: "block" }>,
  ): Promise<void> {
    // « ouvre le tour <id> »
    const open = p.match(/\bouvre\b(?:\s+le\s+tour)?\s+([\w-]+)/);
    if (open) {
      await emit({ type: "log", prefix: "plan", text: `tour « ${open[1]} » repéré au catalogue` }, 360);
      await emit(
        block({
          kind: "hub-action",
          action: { type: "open-tour", tourId: open[1], title: open[1] },
          state: "proposed",
        }),
        340,
      );
      await emit({ type: "done", status: "proposed" }, 100);
      return;
    }

    // « liste mes tours » / questions catalogue
    if (/\bliste\b|\bfinal\.mp4\b|\bquels? tours?\b/.test(p)) {
      await emit({ type: "log", prefix: "plan", text: "lecture du catalogue tours/…" }, 360);
      await emit(
        block({
          kind: "text",
          text: "(mock) En réel, je lis tours/ via l'agent : id, sections, durée, état du pipeline. Demande « crée une démo 60s de https://… » pour voir la création scriptée.",
        }),
        380,
      );
      await emit({ type: "done", status: "done" }, 100);
      return;
    }

    // « crée une démo 60s de https://… » — create-tour scripté
    if (/cr[ée]e|d[ée]mo|nouveau tour/.test(p)) {
      const url = prompt.match(/https?:\/\/[^\s»"']+/)?.[0] ?? "https://exemple.app";
      let host = "exemple.app";
      try {
        host = new URL(url).hostname;
      } catch {}
      const id = host.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() + "-demo";
      const name = `${host} · Démo`;
      const mkSection = (
        title: string,
        subtitle: string,
        voiceover: string,
        scrollTo?: number,
      ): TourStep[] => [
        { type: "section", categoryId: "branding", title, subtitle, dwellMs: 2400, voiceover },
        ...(scrollTo !== undefined
          ? [{ type: "scroll" as const, to: scrollTo, dwellMs: 2200 }]
          : []),
        { type: "wait", dwellMs: 2600 },
      ];
      const demoTour: TourEntry = {
        id,
        name,
        description: `Démo 60s générée depuis ${url} (scénario mock).`,
        estimatedSec: 60,
        startPath: "/",
        baseUrl: url,
        format: "16:9",
        brand: { displayName: host, domain: host },
        steps: [
          ...mkSection(host, "L'essentiel en 60 secondes", `Voici ${host} — la visite commence.`),
          ...mkSection("Fonctionnalités", "Ce que le produit sait faire", "Les fonctionnalités clés, sans détour.", 900),
          ...mkSection("En pratique", "Le parcours utilisateur", "Un parcours simple, de bout en bout.", 1800),
          ...mkSection("Conclusion", "Essayez-le", "À vous de jouer.", 0),
        ],
      };

      await emit({ type: "log", prefix: "plan", text: `cible ${url}` }, 380);
      await emit({ type: "log", prefix: "plan", text: "scénario 60s — 4 sections, voix off incluse" });
      await emit({ type: "log", prefix: "note", text: "rien ne s'écrit sans ta confirmation" });
      await emit(
        block({ kind: "hub-action", action: { type: "create-tour", tour: demoTour }, state: "proposed" }),
        420,
      );
      await emit({ type: "done", status: "proposed" }, 120);
      return;
    }

    await emit(
      block({
        kind: "text",
        text: "Console du studio : « crée une démo 60s de https://… », « liste mes tours », « ouvre le tour uzme-landing ».",
      }),
      400,
    );
    await emit({ type: "done", status: "done" }, 100);
  }
}
