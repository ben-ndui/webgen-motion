import { NextResponse } from "next/server";
import { detectDevices } from "@/lib/server/mobile-tools";

export const runtime = "nodejs";

/**
 * Devices/simulateurs actuellement connectés et bootés. Pollé par
 * l'indicateur du dashboard (l'utilisateur voit son téléphone apparaître
 * dès qu'il le branche / boote un simulateur).
 */
export async function GET() {
  return NextResponse.json(
    { devices: detectDevices() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
