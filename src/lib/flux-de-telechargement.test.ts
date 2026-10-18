import { describe, expect, it, vi } from "vitest";

import { diffuserUnTelechargement } from "./flux-de-telechargement";

async function lignes(reponse: Response): Promise<{ type: string }[]> {
  return (await reponse.text()).trim().split("\n").map((l) => JSON.parse(l) as { type: string });
}

describe("diffuser un téléchargement", () => {
  it("une ligne par pour-cent, puis « done » ; la fin est toujours signalée", async () => {
    const termine = vi.fn();
    const reponse = diffuserUnTelechargement(async (surProgression) => {
      for (let recus = 0; recus <= 1000; recus += 1) surProgression(recus, 1000);
      return { ok: true, chemin: "/m" };
    }, termine);
    const evenements = await lignes(reponse);
    expect(evenements.filter((e) => e.type === "progress")).toHaveLength(101);
    expect(evenements.at(-1)).toEqual({ type: "done", ok: true });
    expect(termine).toHaveBeenCalledTimes(1);
  });

  it("un refus devient « error » avec sa raison", async () => {
    const evenements = await lignes(diffuserUnTelechargement(async () => ({ ok: false, raison: "Le dépôt des modèles a répondu 404." })));
    expect(evenements).toEqual([{ type: "error", message: "Le dépôt des modèles a répondu 404." }]);
  });

  it("une exception ne laisse ni le flux ouvert ni le verrou posé", async () => {
    const termine = vi.fn();
    const evenements = await lignes(diffuserUnTelechargement(async () => { throw new Error("disque plein"); }, termine));
    expect(evenements).toEqual([{ type: "error", message: "Le téléchargement a échoué : relance-le." }]);
    expect(termine).toHaveBeenCalledTimes(1);
  });
});
