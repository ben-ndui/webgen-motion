/**
 * Director's Console — transport réel.
 *
 * Même contrat que MockTransport, branché sur les routes locales :
 *   probe() → GET  /api/motion/console/probe   (config BYOK)
 *   send()  → POST /api/motion/console/take    (stream NDJSON TakeEvent)
 *
 * Lecture du stream ligne par ligne (pattern consumeNdjson de
 * TourClient) ; l'AbortSignal de l'UI est passé au fetch — Échap
 * annule la requête jusqu'à l'appel Anthropic côté serveur.
 */
import type { ChatTransport, TakeEvent, TakeRequest } from "./types";

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

  async send(
    req: TakeRequest,
    handlers: { onEvent: (evt: TakeEvent) => void; signal: AbortSignal },
  ): Promise<void> {
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

    const reader = res.body.getReader();
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
            onEvent(JSON.parse(line) as TakeEvent);
          } catch {
            /* ligne corrompue — ignorée */
          }
        }
      }
      if (buf.trim()) {
        try {
          onEvent(JSON.parse(buf) as TakeEvent);
        } catch {}
      }
    } catch (e) {
      if (!signal.aborted) {
        onEvent({
          type: "block",
          block: {
            kind: "error",
            code: "network",
            message: `stream interrompu : ${(e as Error).message}`,
          },
        });
        onEvent({ type: "done", status: "error" });
      }
    }
  }
}