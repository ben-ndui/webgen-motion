import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type { FicheDeFilm } from "@/lib/film-loader";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect }));

const getAllTours = vi.fn(() => []);
vi.mock("@/lib/tour-loader", () => ({ getAllTours }));

describe("/dashboard sur la vitrine publique", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("renvoie vers /download sans toucher au disque (le hub n'existe que dans l'app locale)", async () => {
    vi.stubEnv("VERCEL", "1");
    const { default: DashboardPage } = await import("./page");
    expect(() => DashboardPage()).toThrow("NEXT_REDIRECT:/download");
    expect(redirect).toHaveBeenCalledWith("/download");
    expect(getAllTours).not.toHaveBeenCalled();
  });
});

describe("/dashboard — profil d'interface « série » (réglage /setup/interface)", () => {
  const AVEC_SERIE: FicheDeFilm = { id: "avec-serie", etat: "valide", spec: { cinema: { personnages: [], episodes: [] } } as never };
  const SANS_SERIE: FicheDeFilm = { id: "sans-serie", etat: "valide", spec: {} as never };

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("ne garde que les films ayant une série, masque tours et formats, et le dit à HubApp", async () => {
    vi.resetModules(); // "./page" peut déjà être en cache depuis le test précédent (vitrine publique)
    vi.doMock("@/lib/config", () => ({ getConfig: () => ({ interface: { profil: "serie" } }) }));
    vi.doMock("@/lib/film-loader", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/film-loader")>()),
      listerFilms: () => [AVEC_SERIE, SANS_SERIE],
    }));
    vi.doMock("@/lib/film-etat", () => ({ resumerFilm: (fiche: FicheDeFilm) => ({ id: fiche.id, nom: fiche.id, statut: "brouillon", langues: [], declinaisons: [], rendus: 0, erreurs: [] }) }));
    const { default: DashboardPage } = await import("./page");
    const element = DashboardPage() as ReactElement<{ tours: unknown[]; films: { id: string }[]; profilSerie: boolean; formats: { projets: unknown } }>;
    expect(element.props.profilSerie).toBe(true);
    expect(element.props.tours).toEqual([]);
    expect(element.props.films?.map((f) => f.id)).toEqual(["avec-serie"]);
    expect(element.props.formats?.projets).toBeNull();
  });

  it("profil complet (par défaut) : rien n'est filtré", async () => {
    vi.doMock("@/lib/config", () => ({ getConfig: () => ({}) }));
    vi.doMock("@/lib/film-loader", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/film-loader")>()),
      listerFilms: () => [AVEC_SERIE, SANS_SERIE],
    }));
    vi.doMock("@/lib/film-etat", () => ({ resumerFilm: (fiche: FicheDeFilm) => ({ id: fiche.id, nom: fiche.id, statut: "brouillon", langues: [], declinaisons: [], rendus: 0, erreurs: [] }) }));
    const { default: DashboardPage } = await import("./page");
    const element = DashboardPage() as ReactElement<{ films: { id: string }[]; profilSerie: boolean }>;
    expect(element.props.profilSerie).toBe(false);
    expect(element.props.films?.map((f) => f.id)).toEqual(["avec-serie", "sans-serie"]);
  });
});
