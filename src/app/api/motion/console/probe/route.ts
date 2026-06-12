import { NextResponse } from "next/server";
import { resolveConsoleAgent } from "@/lib/console-agent";

/**
 * Director's Console — probe de configuration BYOK.
 *
 * GET → { configured, provider?, model? } (jamais la clé). Pilote
 * l'empty state « pas de clé » du dock (ConsoleNoKey → /setup/agent).
 */
export async function GET() {
  const agent = resolveConsoleAgent();
  return NextResponse.json(
    {
      configured: agent.configured,
      ...(agent.provider ? { provider: agent.provider } : {}),
      ...(agent.model ? { model: agent.model } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}