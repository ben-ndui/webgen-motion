import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { EtatDeLEditeur } from "@/lib/film-editeur";
import { ficheDeDepart } from "@/lib/film-fiche-depart";
import { useFicheDuFilm } from "./use-fiche-du-film";

const FICHE = ficheDeDepart({ nom: "Saya", langues: ["fr"], formats: ["court"], direction: "nocturne" });
const ETAT: EtatDeLEditeur = { id: "saya", fiche: FICHE, valide: true, erreurs: [], medias: [], textesAEcrire: [], doublons: [] };

// Un faux serveur en mémoire : il garde la fiche qu'on lui envoie, et le dépôt
// de musique y écrit un tempo mesuré, comme le vrai.
function serveur() {
  let fiche = structuredClone(FICHE);
  const appels: string[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
    const methode = options?.method ?? "GET";
    appels.push(`${methode} ${String(url)}`);
    if (methode === "PUT") fiche = JSON.parse(String(options!.body)).fiche;
    if (methode === "POST") fiche = { ...fiche, musique: { ...fiche.musique, titre: "Déposée", tempo: 118.3 } };
    return Response.json(methode === "GET" ? { ...ETAT, fiche } : { ok: true, erreurs: [] });
  });
  return { appels, fiche: () => fiche };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("useFicheDuFilm", () => {
  it("enregistre tout seul après une pause de saisie", async () => {
    vi.useFakeTimers();
    const faux = serveur();
    const { result } = renderHook(() => useFicheDuFilm(ETAT));
    act(() => result.current.modifier((f) => { f.marque.contact = "saya.com"; }));
    expect(result.current.enregistrement).toBe("en-attente");
    await act(async () => { await vi.advanceTimersByTimeAsync(1300); });
    expect(faux.fiche().marque.contact).toBe("saya.com");
    expect(result.current.enregistrement).toBe("a-jour");
  });

  it("un dépôt de musique rapporte le tempo mesuré sans effacer ce qu'on a tapé", async () => {
    const faux = serveur();
    const { result } = renderHook(() => useFicheDuFilm(ETAT));
    let depot: Promise<string | null> = Promise.resolve(null);
    act(() => { depot = result.current.deposer("musique", new File(["x"], "m.mp3")); });
    act(() => result.current.modifier((f) => { f.marque.contact = "tapé pendant l'envoi"; }));
    await act(async () => { await depot; });
    expect(result.current.fiche.musique.tempo).toBe(118.3);
    expect(result.current.fiche.marque.contact).toBe("tapé pendant l'envoi");
    expect(faux.appels.some((a) => a.startsWith("POST"))).toBe(true);
  });

  it("dit quand l'enregistrement échoue", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    const { result } = renderHook(() => useFicheDuFilm(ETAT));
    await act(async () => { await result.current.enregistrer(); });
    expect(result.current.enregistrement).toBe("erreur");
  });
});
