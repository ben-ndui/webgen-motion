/**
 * Director's Console — transport réel.
 *
 * Même contrat que MockTransport, branché sur les routes locales :
 *   probe() → GET  /api/motion/console/probe   (config BYOK)
 *   send()  → POST /api/motion/console/take    (stream NDJSON TakeEvent)
 *   run()   → POST routes pipeline (capture / vo / compose) — leurs
 *             événements NDJSON sont traduits en TakeEvent pour le
 *             bloc run-log (la console est un second abonné du flux)
 *
 * Lecture du stream ligne par ligne (pattern consumeNdjson de
 * TourClient) ; l'AbortSignal de l'UI est passé au fetch — Échap
 * annule la requête, et les routes pipeline tuent leur runner quand
 * le stream est cancel.
 */
import type { TourEntry } from "@/lib/types/tour";
import type {
  ChatTransport,
  RunJob,
  RunParams,
  TakeEvent,
  TakeRequest,
} from "./types";

type Handlers = { onEvent: (evt: TakeEvent) => void; signal: AbortSignal };

/** Événement NDJSON brut d'une route pipeline. */
type PipelineEvent = Record<string, unknown>;

const RUN_ROUTES: Record<RunJob, string> = {
  capture: "/api/motion/tour/run",
  vo: "/api/motion/tour/audio/voice/run",
  compose: "/api/motion/tour/compose/run",
};

function runBody(job: RunJob, tour: TourEntry, params?: RunParams): Record<string, unknown> {
  switch (job) {
    case "capture":
      return { tourId: tour.id, formatOverride: params?.formatOverride };
    case "vo":
      return { tourId: tour.id };
    case "compose":
      return {
        tourId: tour.id,
        bgMusicId: params?.bgMusicId,
        bgMusicVolume: params?.bgMusicVolume,
        voiceoverVolume: params?.voiceoverVolume,
      };
  }
}

const fmtMo = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} Mo`;

export class RealTransport implements ChatTransport {
  async probe(): Promise<{ configured: boolean; provider?: string; model?: string }> {
    try {
      const res = await fetch("/api/motion/console/probe", { cache: "no-store" });
      if (!res.ok) return { configured: false };
      return (await res.json()) as { configured: boolean; provider?: string; model?: string };
    } catch {
      return { configured: false };
    }
  }

  async send(req: TakeRequest, handlers: Handlers): Promise<void> {
    const { onEvent, signal } = handlers;
    let res: Response;
    try {
      res = await fetch("/api/motion/console/take", {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
    } catch (e) {
      if (signal.aborted) return;
      onEvent({
        type: "block",
        block: {
          kind: "error",
          code: "network",
          message: `serveur injoignable : ${(e as Error).message}`,
        },
      });
      onEvent({ type: "done", status: "error" });
      return;
    }

    if (!res.ok || !res.body) {
      onEvent({
        type: "block",
        block: {
          kind: "error",
          code: "provider",
          message: `route console ${res.status}`,
        },
      });
      onEvent({ type: "done", status: "error" });
      return;
    }

    await this.consume(
      res.body,
      (raw) => onEvent(raw as unknown as TakeEvent),
      signal,
      (message) => {
        onEvent({
          type: "block",
          block: { kind: "error", code: "network", message: `stream interrompu : ${message}` },
        });
        onEvent({ type: "done", status: "error" });
      },
    );
  }

  /** Run pipeline réel — POST la route du job et traduit son NDJSON
   *  (phase / section / step / warn / progress / done / error) en
   *  TakeEvent du run-log. */
  async run(
    job: RunJob,
    req: { tour: TourEntry; params?: RunParams },
    handlers: Handlers,
  ): Promise<void> {
    const { onEvent, signal } = handlers;
    let res: Response;
    try {
      res = await fetch(RUN_ROUTES[job], {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(runBody(job, req.tour, req.params)),
      });
    } catch (e) {
      if (signal.aborted) return;
      onEvent({ type: "log", prefix: "err", text: `serveur injoignable : ${(e as Error).message}` });
      onEvent({ type: "done", status: "error" });
      return;
    }

    if (!res.ok || !res.body) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      onEvent({ type: "log", prefix: "err", text: err.error ?? `route ${RUN_ROUTES[job]} → ${res.status}` });
      onEvent({ type: "done", status: "error" });
      return;
    }

    // pct retenu entre deux événements — les steps raffinent le label
    // sans faire reculer la barre
    let lastPct = 0;
    let closed = false;

    const handle = (evt: PipelineEvent) => {
      const type = String(evt.type ?? "");
      if (type === "phase") {
        onEvent({ type: "log", prefix: "run", text: String(evt.label ?? "") });
        if (evt.sectionIdx !== undefined && evt.totalSections !== undefined) {
          const i = Number(evt.sectionIdx);
          const total = Math.max(1, Number(evt.totalSections));
          lastPct = Math.round((i / total) * 100);
          onEvent({ type: "progress", pct: lastPct, label: `section ${i}/${total}` });
        }
      } else if (type === "section") {
        const i = Number(evt.index);
        const total = Math.max(1, Number(evt.total));
        onEvent({ type: "log", prefix: "run", text: `S${i}/${total} — ${String(evt.title ?? "")}` });
        lastPct = Math.round(((i - 1) / total) * 100);
        onEvent({ type: "progress", pct: lastPct, label: `section ${i}/${total}` });
      } else if (type === "step") {
        onEvent({
          type: "progress",
          pct: lastPct,
          label: `step ${Number(evt.index)}/${Number(evt.total)} · ${String(evt.stepType ?? "")}`,
        });
      } else if (type === "progress") {
        // compose : "Rendu frame-by-frame · n/total" / "Encodage h264 · n/total"
        const label = String(evt.label ?? "");
        const m = label.match(/(\d+)\/(\d+)/);
        if (m) lastPct = Math.round((parseInt(m[1], 10) / Math.max(1, parseInt(m[2], 10))) * 100);
        onEvent({ type: "progress", pct: lastPct, label });
      } else if (type === "warn") {
        onEvent({ type: "log", prefix: "note", text: `⚠ ${String(evt.message ?? "")}` });
      } else if (type === "done" && evt.ok) {
        const wall = Number(evt.captureWallTimeSec ?? 0);
        if (job === "capture") {
          const n = Array.isArray(evt.sections) ? evt.sections.length : 0;
          onEvent({
            type: "log",
            prefix: "run",
            text: `manifest.json écrit · ${n} sections · ${Number(evt.totalDurationSec ?? 0).toFixed(1)}s · ${fmtMo(Number(evt.totalSizeBytes ?? 0))}`,
          });
        } else if (job === "vo") {
          onEvent({ type: "log", prefix: "run", text: `voiceover.mp3 assemblé · ${wall}s` });
        } else {
          onEvent({
            type: "log",
            prefix: "run",
            text: `final.mp4 · ${fmtMo(Number(evt.sizeBytes ?? 0))} · rendu en ${wall}s`,
          });
        }
        closed = true;
        onEvent({ type: "done", status: "done" });
      } else if (type === "error") {
        closed = true;
        onEvent({ type: "log", prefix: "err", text: String(evt.message ?? "erreur inconnue") });
        onEvent({ type: "done", status: "error" });
      }
    };

    await this.consume(res.body, handle, signal, (message) => {
      if (closed) return; // le bloc est déjà clos (done / error du job)
      closed = true;
      onEvent({ type: "log", prefix: "err", text: `stream interrompu : ${message}` });
      onEvent({ type: "done", status: "error" });
    });

    // stream terminé sans done ni error (serveur tombé mid-run)
    if (!closed && !signal.aborted) {
      onEvent({ type: "log", prefix: "err", text: "stream clos sans résultat" });
      onEvent({ type: "done", status: "error" });
    }
  }

  /** Lecture NDJSON ligne par ligne, ligne corrompue ignorée. */
  private async consume(
    body: ReadableStream<Uint8Array>,
    handle: (raw: Record<string, unknown>) => void,
    signal: AbortSignal,
    onStreamError: (message: string) => void,
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            handle(JSON.parse(line) as Record<string, unknown>);
          } catch {
            /* ligne corrompue — ignorée */
          }
        }
      }
      if (buf.trim()) {
        try {
          handle(JSON.parse(buf) as Record<string, unknown>);
        } catch {}
      }
    } catch (e) {
      if (!signal.aborted) onStreamError((e as Error).message);
    }
  }
}
