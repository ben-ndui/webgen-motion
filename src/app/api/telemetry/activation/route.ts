import { NextRequest, NextResponse } from "next/server";
import { captureServer } from "@/lib/server/analytics-server";

export const runtime = "nodejs";

/**
 * Relais d'activation — reçoit l'event anonyme émis par l'app desktop
 * (cf. src/lib/telemetry.ts) et le forwarde à PostHog côté serveur.
 *
 * Anonyme par construction : `distinctId` = installId aléatoire (pas
 * d'email, pas de PII). Tout champ est borné/validé. Idempotence côté
 * PostHog : l'app n'envoie qu'une fois (`activationSent`), et même un
 * doublon ne fait qu'un event 'activated' de plus pour le même install.
 */
export async function POST(req: NextRequest) {
  let body: { installId?: unknown; edition?: unknown; os?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const installId =
    typeof body.installId === "string" ? body.installId.slice(0, 64) : null;
  if (!installId) {
    return NextResponse.json({ error: "installId required" }, { status: 400 });
  }
  const edition =
    typeof body.edition === "string" ? body.edition.slice(0, 32) : "unknown";
  const os = typeof body.os === "string" ? body.os.slice(0, 32) : "unknown";

  await captureServer(installId, "activated", { edition, os });
  return NextResponse.json({ ok: true });
}
