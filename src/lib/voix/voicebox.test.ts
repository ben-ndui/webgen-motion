import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PUT } from "@/app/api/motion/config/route";
import { getConfig } from "@/lib/config";
import { resolveVoiceBackend } from "@/lib/config-resolve";
import { alignerLaVoix, motsVersAlignement, raisonNonAlignable, voixAlignable } from "./alignement-de-la-voix";
import { CONSIGNE_DE_TON_CONSEILLEE, consigneSuivie } from "./consigne";
import { delaiDAttenteVoicebox } from "./delai-voicebox";
import { fetchVoiceboxTts } from "./moteurs";

const ORIG_HOME = process.env.HOME;
let maison = "";

// HOME jetable : ni le vrai config.json de Ben, ni son modèle d'alignement.
beforeEach(() => {
  maison = mkdtempSync(join(tmpdir(), "voicebox-"));
  process.env.HOME = maison;
});
afterEach(() => {
  process.env.HOME = ORIG_HOME;
  vi.restoreAllMocks();
});

function config(voicebox: Record<string, unknown>) {
  mkdirSync(join(maison, ".webgen-motion"), { recursive: true });
  writeFileSync(join(maison, ".webgen-motion", "config.json"), JSON.stringify({ voicebox: { profileId: "p1", ...voicebox } }));
}

function put(corps: unknown) {
  return PUT(new Request("http://x/api/motion/config", { method: "PUT", body: JSON.stringify(corps) }) as never);
}

describe("la consigne de ton Voicebox", () => {
  it("absente : la consigne conseillée (celle qui a gagné le banc d'écoute)", () => {
    config({});
    const b = resolveVoiceBackend({ voiceBackend: "voicebox" });
    expect(b?.kind === "voicebox" && b.instruct).toBe(CONSIGNE_DE_TON_CONSEILLEE);
  });

  it("vide : un CHOIX (voix neutre), pas un retour à la consigne par défaut", async () => {
    config({ instruct: "Calme." });
    await put({ voicebox: { instruct: "   " } });
    expect(getConfig().voicebox?.instruct).toBe("");
    expect(getConfig().voicebox?.profileId).toBe("p1"); // les autres réglages restent
    const b = resolveVoiceBackend({ voiceBackend: "voicebox" });
    expect(b?.kind === "voicebox" && b.instruct).toBe("");
  });

  it("vide AVANT d'avoir configuré Voicebox : gardée quand même (le bloc n'est pas supprimé)", async () => {
    mkdirSync(join(maison, ".webgen-motion"), { recursive: true });
    writeFileSync(join(maison, ".webgen-motion", "config.json"), "{}");
    await put({ voicebox: { instruct: "" } });
    expect(getConfig().voicebox?.instruct).toBe("");
  });

  it("ne compte (cache) et ne part (Voicebox) que pour un moteur qui la suit : Qwen", () => {
    expect(consigneSuivie({ engine: "qwen", instruct: "Enjouée." })).toBe("Enjouée.");
    expect(consigneSuivie({ engine: "qwen_custom_voice", instruct: "Enjouée." })).toBe("Enjouée.");
    expect(consigneSuivie({ engine: "kokoro", instruct: "Enjouée." })).toBe("");
  });

  it("au-delà de 500 caractères : coupée (Voicebox refuserait la génération)", async () => {
    config({});
    await put({ voicebox: { instruct: "x".repeat(600) } });
    expect(getConfig().voicebox?.instruct).toHaveLength(500);
  });

  it("part dans la demande à Voicebox, et n'y figure pas quand elle est vide", async () => {
    const corps: Record<string, unknown>[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (String(url).endsWith("/generate")) {
        corps.push(JSON.parse(String(init?.body)));
        throw new Error("arrêt après l'envoi");
      }
      throw new Error("inattendu");
    });
    const base = { kind: "voicebox" as const, url: "http://vb", profileId: "p", engine: "qwen", modelSize: "1.7B", language: "fr" };
    await expect(fetchVoiceboxTts("Bonjour", { ...base, instruct: "Enjouée." })).rejects.toThrow();
    await expect(fetchVoiceboxTts("Bonjour", { ...base, instruct: "" })).rejects.toThrow();
    expect(corps[0]?.instruct).toBe("Enjouée.");
    expect(corps[1]).not.toHaveProperty("instruct");
  });
});

describe("les temps mot à mot d'une voix Voicebox", () => {
  it("les mots posés deviennent des temps par caractère du texte exact", () => {
    const a = motsVersAlignement("Bonjour Ben", [
      { texte: "Bonjour", debut: 0.1, fin: 0.6 },
      { texte: "Ben", debut: 0.8, fin: 1.1 },
    ]);
    expect(a.characters.join("")).toBe("Bonjour Ben");
    expect(a.character_start_times_seconds[0]).toBeCloseTo(0.1);
    expect(a.character_start_times_seconds[8]).toBeCloseTo(0.8); // le « B » de Ben
    expect(a.character_end_times_seconds.at(-1)).toBeCloseTo(1.1);
  });

  it("sans modèle de calage installé : pas alignable, et une erreur qui dit la VRAIE raison", async () => {
    expect(voixAlignable("fr")).toBe(false);
    await expect(alignerLaVoix("/nulle/part.mp3", "Bonjour", "fr", () => {})).rejects.toThrow(/Réglages › Écoute locale|Mac Intel/);
    expect(voixAlignable("en")).toBe(false);
    if (!(process.platform === "darwin" && process.arch === "x64")) {
      expect(raisonNonAlignable("en")).toMatch(/n'existe qu'en français/);
    }
  });

  it("le délai d'attente suit la longueur du texte (une narration d'une minute n'est plus coupée à 120 s)", () => {
    expect(delaiDAttenteVoicebox("Bonjour.")).toBe(120_000);
    const uneMinuteDeVoix = "x".repeat(15 * 60);
    expect(delaiDAttenteVoicebox(uneMinuteDeVoix)).toBeGreaterThanOrEqual(30 * 60_000);
    expect(delaiDAttenteVoicebox("x".repeat(100_000))).toBe(45 * 60_000);
  });
});
