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
  if (
    body.defaultBackend === "elevenlabs" ||
    body.defaultBackend === "voicebox" ||
    body.defaultBackend === "google"
  ) {
    sanitized.defaultBackend = body.defaultBackend;
  }
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
  if (body.voicebox) {
    sanitized.voicebox = {};
    for (const k of ["url", "profileId", "engine", "modelSize", "language"] as const) {
      const v = body.voicebox[k];
      if (typeof v === "string") {
        sanitized.voicebox[k] = v.trim() || undefined;
      }
    }
  }
  if (body.google) {
    sanitized.google = {};
    if (typeof body.google.voice === "string") {
      sanitized.google.voice = body.google.voice.trim() || undefined;
    }
    if (typeof body.google.languageCode === "string") {
      sanitized.google.languageCode = body.google.languageCode.trim() || undefined;
    }
    if (typeof body.google.speakingRate === "number") {
      sanitized.google.speakingRate = body.google.speakingRate;
    }
    if (typeof body.google.credentialsPath === "string") {
      sanitized.google.credentialsPath =
        body.google.credentialsPath.trim() || undefined;
    }
  }
  if (body.agent) {
    sanitized.agent = {};
    if (
      body.agent.provider === "anthropic" ||
      body.agent.provider === "openai" ||
      body.agent.provider === "mistral"
    ) {
      sanitized.agent.provider = body.agent.provider;
    }
    if (typeof body.agent.apiKey === "string") {
      sanitized.agent.apiKey = body.agent.apiKey.trim() || undefined;
    }
    if (typeof body.agent.model === "string") {
      sanitized.agent.model = body.agent.model.trim() || undefined;
    }
  }
  if (body.telemetry && typeof body.telemetry.enabled === "boolean") {
    sanitized.telemetry = { enabled: body.telemetry.enabled };
  }
  saveConfig(sanitized);
  return NextResponse.json(getPublicConfig());
}
