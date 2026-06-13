import { ensureMobileTools } from "@/lib/server/mobile-tools-install";

export const runtime = "nodejs";

/**
 * Installe les outils mobiles lourds (Maestro + JRE) à la demande, dans le
 * cache app (`~/.webgen-motion/mobile-tools/`). Stream NDJSON de progression
 * — le téléchargement de Maestro (~350 Mo) prend plusieurs minutes.
 */
export async function POST() {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const emit = (o: unknown) =>
        controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        const res = await ensureMobileTools((message) =>
          emit({ type: "log", message }),
        );
        emit({ type: "done", maestro: res.maestro, javaHome: res.javaHome });
      } catch (e) {
        emit({ type: "error", message: (e as Error).message });
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson", "Cache-Control": "no-store" },
  });
}
