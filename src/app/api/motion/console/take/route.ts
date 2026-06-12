import { NextRequest, NextResponse } from "next/server";
import { runTake } from "@/lib/console-agent";
import type { TakeRequest } from "@/app/tour/[id]/_components/console/types";

/**
 * Director's Console — une prise (transport réel).
 *
 * POST TakeRequest → stream NDJSON de TakeEvent (1 event par ligne,
 * même contrat que le MockTransport — l'UI ne fait pas la différence).
 * L'annulation côté client (Échap → AbortController du fetch) se
 * propage via `req.signal` jusqu'à l'appel Anthropic.
 *
 * La clé BYOK ne quitte jamais le serveur local : elle est lue dans
 * ~/.webgen-motion/config.json par resolveConsoleAgent().
 */
export async function POST(req: NextRequest) {
  let body: TakeRequest;
  try {
    body = (await req.json()) as TakeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  // Mode hub : pas de tour ouvert — seul le prompt est requis. Mode
  // editor (défaut) : tour.steps reste obligatoire.
  const isHub = body?.mode === "hub";
  if (typeof body?.prompt !== "string" || !body.prompt.trim() || (!isHub && !body?.tour?.steps)) {
    return NextResponse.json(
      {
        error: isHub
          ? "TakeRequest invalide (prompt requis)"
          : "TakeRequest invalide (tour.steps et prompt requis)",
      },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (evt: unknown): void => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(evt) + "\n"));
        } catch {
          /* controller closed (client a annulé) */
        }
      };
      try {
        await runTake(body, emit, req.signal);
      } catch (e) {
        emit({
          type: "block",
          block: {
            kind: "error",
            code: "provider",
            message: `erreur interne : ${(e as Error).message}`,
          },
        });
        emit({ type: "done", status: "error" });
      }
      try {
        controller.close();
      } catch {}
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
