import { NextRequest, NextResponse } from "next/server";
import { getPublicConfig, saveConfig, type MotionConfig } from "@/lib/config";

/**
 * GET  → public view of the current config (masked secrets, env fallback flags).
 * PUT  → partial merge then re-fetch the public view.
 */

export async function GET() {
  return NextResponse.json(getPublicConfig(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(req: NextRequest) {
  let body: MotionConfig;
  try {
    body = (await req.json()) as MotionConfig;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  // Whitelist the fields we accept — extra keys are dropped silently.
  const sanitized: MotionConfig = {};
  if (body.elevenlabs) {
    sanitized.elevenlabs = {};
    if (typeof body.elevenlabs.apiKey === "string") {
      sanitized.elevenlabs.apiKey = body.elevenlabs.apiKey.trim() || undefined;
    }
    if (typeof body.elevenlabs.voiceId === "string") {
      sanitized.elevenlabs.voiceId =
        body.elevenlabs.voiceId.trim() || undefined;
    }
    if (typeof body.elevenlabs.model === "string") {
      sanitized.elevenlabs.model = body.elevenlabs.model.trim() || undefined;
    }
  }
  saveConfig(sanitized);
  return NextResponse.json(getPublicConfig());
}
