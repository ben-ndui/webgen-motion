import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

/**
 * Proxy to Voicebox's `GET /profiles` endpoint. The browser can't
 * hit `127.0.0.1:17493` directly when the user is on a different
 * host (or behind a service worker / strict CORS) so we relay from
 * the Next server. Read-only, so we never mutate Voicebox state.
 *
 * Response : VoiceProfileResponse[] from Voicebox, trimmed to the
 * fields the UI actually needs (id, name, language, voice_type,
 * default_engine, sample_count). The rest is dropped to keep the
 * payload tight.
 */

const DEFAULT_URL = "http://127.0.0.1:17493";

interface VoiceboxProfile {
  id: string;
  name: string;
  language?: string;
  voice_type?: string;
  default_engine?: string | null;
  sample_count?: number;
  description?: string | null;
}

export async function GET() {
  const cfg = getConfig();
  const base = (cfg.voicebox?.url ?? DEFAULT_URL).replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/profiles`, {
      // Bail out fast if Voicebox isn't running — 1s connect, 3s read.
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Voicebox /profiles failed (${res.status})`, url: base },
        { status: 502 },
      );
    }
    const all = (await res.json()) as VoiceboxProfile[];
    const trimmed = all.map((p) => ({
      id: p.id,
      name: p.name,
      language: p.language ?? null,
      voice_type: p.voice_type ?? null,
      default_engine: p.default_engine ?? null,
      sample_count: p.sample_count ?? 0,
      description: p.description ?? null,
    }));
    return NextResponse.json(
      { url: base, profiles: trimmed },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Voicebox unreachable";
    return NextResponse.json(
      {
        error: `Voicebox unreachable at ${base} — make sure the desktop app is running. (${message})`,
        url: base,
      },
      { status: 502 },
    );
  }
}
