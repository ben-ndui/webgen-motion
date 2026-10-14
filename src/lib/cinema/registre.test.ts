import { spawn } from "node:child_process";
import { existsSync, utimesSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { dossierJetable } from "../film-fixtures.test-utils";
import { RESERVATION_ABANDONNEE_MS, annulerSansFrais, lireLeRegistre, noterLeLancement, reserver, terminer } from "./registre";

describe("registre du cinéma", () => {
  it("un film neuf n'a rien dépensé", () => {
    expect(lireLeRegistre(dossierJetable("registre"))).toEqual({ utilises: 0, operations: {} });
  });

  it("réserve, note le lancement, puis termine : le plan reste compté", () => {
    const dossier = dossierJetable("registre");
    expect(reserver(dossier, "jardin", 6)).toEqual({ ok: true });
    expect(lireLeRegistre(dossier).operations.jardin.nom).toBeNull();
    noterLeLancement(dossier, "jardin", "operations/abc");
    expect(lireLeRegistre(dossier).operations.jardin.nom).toBe("operations/abc");
    terminer(dossier, "jardin");
    expect(lireLeRegistre(dossier)).toEqual({ utilises: 1, operations: {} });
  });

  it("refuse de relancer un plan déjà en cours (le double clic ne paie pas deux fois)", () => {
    const dossier = dossierJetable("registre");
    reserver(dossier, "jardin", 6);
    expect(reserver(dossier, "jardin", 6)).toEqual({ ok: false, raison: "en-cours" });
    expect(lireLeRegistre(dossier).utilises).toBe(1);
  });

  it("un refus de Google rend le plan au budget, et une annulation répétée ne descend pas sous zéro", () => {
    const dossier = dossierJetable("registre");
    reserver(dossier, "jardin", 6);
    annulerSansFrais(dossier, "jardin");
    annulerSansFrais(dossier, "jardin");
    expect(lireLeRegistre(dossier)).toEqual({ utilises: 0, operations: {} });
  });

  it("s'arrête au plafond et dit combien sont déjà utilisés", () => {
    const dossier = dossierJetable("registre");
    expect(reserver(dossier, "a", 2)).toEqual({ ok: true });
    expect(reserver(dossier, "b", 2)).toEqual({ ok: true });
    expect(reserver(dossier, "c", 2)).toEqual({ ok: false, raison: "budget", utilises: 2 });
  });

  it("une réservation abandonnée (serveur tombé pendant l'appel) se relance mais RESTE comptée", () => {
    const dossier = dossierJetable("registre");
    const avant = Date.parse("2026-10-14T10:00:00Z");
    reserver(dossier, "jardin", 6, avant);
    expect(reserver(dossier, "jardin", 6, avant + 60_000)).toEqual({ ok: false, raison: "en-cours" });
    expect(reserver(dossier, "jardin", 6, avant + RESERVATION_ABANDONNEE_MS + 1)).toEqual({ ok: true });
    expect(lireLeRegistre(dossier).utilises).toBe(2);
  });

  it("une opération qui a un nom ne s'abandonne jamais : on la reprend chez Google", () => {
    const dossier = dossierJetable("registre");
    const avant = Date.parse("2026-10-14T10:00:00Z");
    reserver(dossier, "jardin", 6, avant);
    noterLeLancement(dossier, "jardin", "operations/abc");
    expect(reserver(dossier, "jardin", 6, avant + 24 * 3_600_000)).toEqual({ ok: false, raison: "en-cours" });
  });

  it("un registre illisible bloque la dépense avec une phrase qui dit quoi faire", () => {
    const dossier = dossierJetable("registre");
    writeFileSync(join(dossier, "cinema.json"), "{ pas du json");
    expect(() => reserver(dossier, "jardin", 6)).toThrow("Le registre du cinéma est illisible");
    expect(existsSync(join(dossier, "cinema.json.verrou"))).toBe(false);
  });

  it("passe un verrou laissé par un processus mort", () => {
    const dossier = dossierJetable("registre");
    const verrou = join(dossier, "cinema.json.verrou");
    writeFileSync(verrou, "");
    const vieux = new Date(Date.now() - 60_000);
    utimesSync(verrou, vieux, vieux);
    expect(reserver(dossier, "jardin", 6)).toEqual({ ok: true });
    expect(existsSync(verrou)).toBe(false);
  });

  it("huit processus qui réservent en même temps sur un plafond de 6 : exactement 6 passent", async () => {
    const dossier = dossierJetable("registre");
    const cheminDuRegistre = resolve(__dirname, "registre.ts");
    const tsx = resolve(__dirname, "../../../node_modules/.bin/tsx");
    const unProcessus = (index: number) =>
      new Promise<string>((fin, echec) => {
        const code = `import { reserver } from ${JSON.stringify(cheminDuRegistre)}; console.log(JSON.stringify(reserver(${JSON.stringify(dossier)}, "plan${index}", 6)));`;
        const enfant = spawn(tsx, ["-e", code]);
        let sortie = "";
        enfant.stdout.on("data", (morceau) => (sortie += morceau));
        enfant.on("close", (statut) => (statut === 0 ? fin(sortie.trim()) : echec(new Error(`processus ${index} : ${statut}`))));
      });
    const reponses = (await Promise.all(Array.from({ length: 8 }, (_, i) => unProcessus(i)))).map((ligne) => JSON.parse(ligne));
    expect(reponses.filter((r) => r.ok)).toHaveLength(6);
    expect(reponses.filter((r) => !r.ok && r.raison === "budget")).toHaveLength(2);
    expect(lireLeRegistre(dossier).utilises).toBe(6);
    expect(Object.keys(lireLeRegistre(dossier).operations)).toHaveLength(6);
  }, 30_000);
});
