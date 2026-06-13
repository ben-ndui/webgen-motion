import { NextResponse } from "next/server";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { resetEditionCache } from "@/lib/edition";
import { verifyLicenseSignature } from "@/lib/license/verify";

export const runtime = "nodejs";

/**
 * Auto-refresh de licence d'abonnement, côté app (B.6).
 *
 * Lit le `.license` local ; s'il est dans la fenêtre de renouvellement
 * (ou expiré), interroge le relais distant `genmotion.app/api/license/refresh`
 * (Stripe = source de vérité) et, si l'abo est actif, remplace le fichier
 * par la licence fraîche puis invalide le cache d'édition.
 *
 * Garde-fous offline-first :
 *  - Lifetime (expiresAt null) → jamais de refresh.
 *  - Hors fenêtre → aucune sollicitation réseau.
 *  - Offline / erreur transitoire → on garde la licence courante (la grâce
 *    est déjà incluse dans son expiresAt = period_end + 3j). L'app reste
 *    licensed jusqu'à expiresAt.
 *  - 403 (abo inactif/annulé) → on laisse expirer naturellement.
 */
const REMOTE = "https://genmotion.app/api/license/refresh";
/** On tente le refresh quand il reste moins de 5 jours (ou déjà expiré). */
const REFRESH_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

function licensePath(): string {
  return join(homedir(), ".webgen-motion", ".license");
}

export async function POST() {
  const path = licensePath();
  if (!existsSync(path)) return NextResponse.json({ status: "none" });

  const content = readFileSync(path, "utf-8");
  const v = verifyLicenseSignature(content);
  if (!v.valid) {
    return NextResponse.json({ status: "invalid", reason: v.error });
  }
  const { expiresAt } = v.payload;

  if (expiresAt === null) return NextResponse.json({ status: "lifetime" });
  if (expiresAt - Date.now() > REFRESH_WINDOW_MS) {
    return NextResponse.json({ status: "fresh", expiresAt });
  }

  let data: { status?: string; license?: string; expiresAt?: number };
  try {
    const res = await fetch(REMOTE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ license: content }),
    });
    if (!res.ok) {
      return NextResponse.json({
        status: res.status === 403 ? "inactive" : "offline",
        code: res.status,
      });
    }
    data = (await res.json()) as typeof data;
  } catch {
    return NextResponse.json({ status: "offline" });
  }

  if (data.status === "renewed" && typeof data.license === "string") {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, data.license, { mode: 0o600 });
    resetEditionCache();
    return NextResponse.json({ status: "renewed", expiresAt: data.expiresAt });
  }

  return NextResponse.json({ status: data.status ?? "unknown" });
}
