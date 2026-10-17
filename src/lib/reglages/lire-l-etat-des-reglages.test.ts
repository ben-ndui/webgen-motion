import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { lireLEtatDesReglages } from "./lire-l-etat-des-reglages";

// os.homedir() lit HOME : chaque test a son propre ~/.webgen-motion jetable,
// et les variables du .env de dev sont retirées (l'app installée ne les a pas).
const VARIABLES = ["ANTHROPIC_API_KEY", "GEMINI_API_KEY", "ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID", "GOOGLE_APPLICATION_CREDENTIALS"];
let avant: Record<string, string | undefined> = {};
let maison = "";

function ecrireLaConfig(config: object): void {
  mkdirSync(join(maison, ".webgen-motion"), { recursive: true });
  writeFileSync(join(maison, ".webgen-motion", "config.json"), JSON.stringify(config));
}

const etat = () => Object.fromEntries(lireLEtatDesReglages().map((r) => [r.cle, r.pret]));

beforeEach(() => {
  avant = Object.fromEntries(["HOME", ...VARIABLES].map((n) => [n, process.env[n]]));
  for (const nom of VARIABLES) delete process.env[nom];
  maison = mkdtempSync(join(tmpdir(), "reglages-"));
  process.env.HOME = maison;
});
afterEach(() => {
  for (const [nom, valeur] of Object.entries(avant)) {
    if (valeur === undefined) delete process.env[nom];
    else process.env[nom] = valeur;
  }
});

describe("lireLEtatDesReglages", () => {
  it("une app tout juste installée : rien n'est prêt", () => {
    expect(etat()).toEqual({ claude: false, video: false, voix: false, paroles: false });
  });

  it("chaque clé posée dans les Réglages compte", () => {
    ecrireLaConfig({ agent: { provider: "anthropic", apiKey: "sk-ant-x" }, veo: { apiKey: "AIza-x" }, elevenlabs: { apiKey: "el", voiceId: "v" }, defaultBackend: "elevenlabs" });
    expect(etat()).toEqual({ claude: true, video: true, voix: true, paroles: false });
  });

  it("une clé OpenAI ne rend pas Claude prêt : la série et l'assistant ne parlent qu'à Claude", () => {
    ecrireLaConfig({ agent: { provider: "openai", apiKey: "sk-x" } });
    expect(etat().claude).toBe(false);
  });

  it("voix Google : prête seulement si le fichier du compte de service existe", () => {
    ecrireLaConfig({ defaultBackend: "google", google: { credentialsPath: join(maison, "absent.json") } });
    expect(etat().voix).toBe(false);
    const fichier = join(maison, "compte.json");
    writeFileSync(fichier, "{}");
    ecrireLaConfig({ defaultBackend: "google", google: { credentialsPath: fichier } });
    expect(etat().voix).toBe(true);
  });
});
