import { describe, it, expect, afterEach } from "vitest";
import { resolveVoiceBackend } from "./config";

const ORIG = process.env.GOOGLE_APPLICATION_CREDENTIALS;

afterEach(() => {
  if (ORIG === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  else process.env.GOOGLE_APPLICATION_CREDENTIALS = ORIG;
});

describe("resolveVoiceBackend — backend google", () => {
  it("null quand aucun credentials Google", () => {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    expect(resolveVoiceBackend({ voiceBackend: "google" })).toBeNull();
  });

  it("résout google avec le dico du tour + creds via env", () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "/tmp/pa-sa.json";
    const b = resolveVoiceBackend({
      voiceBackend: "google",
      voiceGoogleVoice: "fr-FR-Neural2-D",
      voicePronunciation: { UZME: "juzmi" },
    });
    expect(b?.kind).toBe("google");
    if (b?.kind === "google") {
      expect(b.voice).toBe("fr-FR-Neural2-D");
      expect(b.pronunciation).toEqual({ UZME: "juzmi" });
      expect(b.credentialsPath).toBe("/tmp/pa-sa.json");
    }
  });

  it("dico vide par défaut si le tour n'en fournit pas", () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "/tmp/pa-sa.json";
    const b = resolveVoiceBackend({ voiceBackend: "google" });
    expect(b?.kind).toBe("google");
    if (b?.kind === "google") expect(b.pronunciation).toEqual({});
  });
});
