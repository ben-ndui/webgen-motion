import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import type { ResolvedAgent } from "../config-resolve";
import { creerProjet, projetDeDepart } from "./format-loader";
import { enregistrerLesParoles } from "./karaoke-paroles";
import { proposerDesDecors } from "./proposer-un-decor";

const agent = { provider: "anthropic", apiKey: "cle", model: "claude-haiku-4-5" } as ResolvedAgent;
const PAROLES = "[ Refrain ]\nOn s'est donné rendez-vous y a dix ans,\nA l'époque on avait pas de plan,\nOn avait une mission,\nFaire bouger les gens,\nOn s'est donné rendez-vous y a dix ans,\n";

function lieux(avecParoles = true) {
  const racine = mkdtempSync(join(tmpdir(), "proposer-"));
  const l = { fiches: join(racine, "fiches"), public: () => join(racine, "public") };
  creerProjet("clip", projetDeDepart("karaoke", "clip"), l.fiches);
  if (avecParoles) enregistrerLesParoles(l.public(), PAROLES);
  return l;
}
const claude = (decors: unknown) => vi.fn(async () => ({ ok: true as const, entree: { decors } }));

describe("Claude propose des décors d'après les paroles", () => {
  it("envoie les paroles chantées (sans repères ni doublons) et rend trois propositions", async () => {
    const appeler = claude([
      { titre: "Rendez-vous sous la pluie", description: "Une rue la nuit, néons orange, pluie fine." },
      { titre: "Dix ans de route", description: "Une autoroute au crépuscule, phares en traînées." },
      { titre: "Foule en fête", description: "Une foule floue qui danse, lumières chaudes." },
    ]);
    const reponse = await proposerDesDecors("clip", agent, appeler, lieux());
    expect(reponse).toMatchObject({ ok: true });
    if (reponse.ok) expect(reponse.propositions).toHaveLength(3);
    const message = (appeler.mock.calls[0] as unknown as unknown[])[2] as string;
    expect(message).not.toContain("[ Refrain ]");
    expect(message.match(/On s'est donné rendez-vous/g)).toHaveLength(1);
  });

  it("sans paroles écrites, demande de les écrire avant d'appeler Claude", async () => {
    const appeler = claude([]);
    expect(await proposerDesDecors("clip", agent, appeler, lieux(false))).toMatchObject({ ok: false, statut: 400 });
    expect(appeler).not.toHaveBeenCalled();
  });

  it("sans clé Claude, le dit ; une réponse vide n'est pas un succès", async () => {
    expect(await proposerDesDecors("clip", null, claude([]), lieux())).toMatchObject({ ok: false, statut: 412 });
    expect(await proposerDesDecors("clip", agent, claude([{ titre: "", description: "" }]), lieux())).toMatchObject({ ok: false, statut: 502 });
  });
});
