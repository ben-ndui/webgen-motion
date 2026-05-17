import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { resetEditionCache, resolveEdition } from "@/lib/edition";
import { verifyLicense } from "@/lib/license/verify";

export const runtime = "nodejs";

/**
 * Route consolidée /api/motion/license — Sprint 9.
 *  - GET     : retourne resolveEdition() (edition + source + license info)
 *  - POST    : { content: string } → vérifie + écrit ~/.webgen-motion/.license
 *  - DELETE  : supprime le .license + reset cache
 *
 * Toutes les opérations sont locales (filesystem) — aucun appel
 * réseau. Aligned avec la philosophie offline-first de webgen-motion.
 */

function licensePath(): string {
  return join(homedir(), ".webgen-motion", ".license");
}

export async function GET() {
  return NextResponse.json(resolveEdition());
}

export async function POST(req: NextRequest) {
  let body: { content?: unknown };
  try {
    body = (await req.json()) as { content?: unknown };
  } catch {
    return NextResponse.json(
      { error: "body doit être JSON {content: string}" },
      { status: 400 },
    );
  }
  if (typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json(
      { error: "field 'content' (string non vide) requis" },
      { status: 400 },
    );
  }

  const result = verifyLicense(body.content);
  if (!result.valid) {
    return NextResponse.json(
      { error: `license invalide : ${result.error}` },
      { status: 400 },
    );
  }

  const path = licensePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body.content, { mode: 0o600 });
  resetEditionCache();

  return NextResponse.json({
    installed: true,
    edition: result.payload.edition,
    email: result.payload.email,
    expiresAt: result.payload.expiresAt,
  });
}

export async function DELETE() {
  const path = licensePath();
  if (existsSync(path)) {
    unlinkSync(path);
  }
  resetEditionCache();
  return NextResponse.json({ removed: true });
}
