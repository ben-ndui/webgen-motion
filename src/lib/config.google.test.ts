import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { resolveVoiceBackend } from "./config-resolve";

const ORIG = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const ORIG_HOME = process.env.HOME;

// HOME jetable : le config.json réel de la machine (qui peut porter un
// compte de service Google) ne doit pas décider du résultat du test.
beforeEach(() => {
  process.env.HOME = mkdtempSync(join(tmpdir(), "config-google-"));
});

afterEach(() => {
  process.env.HOME = ORIG_HOME;
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
