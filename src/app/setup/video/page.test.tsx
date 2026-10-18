import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ReglageVideo from "./page";

type LectureDeLaCle = { hasApiKey: boolean; apiKeyMasked: string | null; hasEnvKey: boolean };
type Config = { veo: LectureDeLaCle; fal: LectureDeLaCle };
const SANS_CLE: LectureDeLaCle = { hasApiKey: false, apiKeyMasked: null, hasEnvKey: false };

/**
 * Une fausse /api/motion/config : les DEUX sections (Google, fal.ai) lisent
 * le même GET au montage, donc un simple mock ORDONNÉ de `fetch` ne suffit
 * plus (leurs deux `useEffect` consomment la file dans le même rendu). Ce
 * faux serveur répond selon la méthode, comme la vraie route, et applique le
 * résultat donné pour chaque champ enregistré.
 */
function fausseConfig(depart: Config, resultatEnregistrement: Partial<Config>) {
  let etat = depart;
  const appels: { methode: string; corps?: unknown }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
    const methode = options?.method ?? "GET";
    if (methode === "PUT") {
      const corps = JSON.parse(String(options?.body)) as Partial<Record<keyof Config, { apiKey: string }>>;
      appels.push({ methode, corps });
      for (const champ of Object.keys(corps) as (keyof Config)[]) {
        etat = { ...etat, [champ]: corps[champ]?.apiKey ? resultatEnregistrement[champ]! : SANS_CLE };
      }
      return Response.json({});
    }
    appels.push({ methode });
    return Response.json(etat);
  });
  return appels;
}

const sectionGoogle = () => within(screen.getByRole("region", { name: "Ta clé Google" }));
const sectionFal = () => within(screen.getByRole("region", { name: "Ta clé fal.ai" }));

afterEach(() => vi.restoreAllMocks());

describe("Réglages · Vidéo IA — Google (Veo)", () => {
  it("sans clé : le dit, et enregistre celle qu'on colle", async () => {
    const appels = fausseConfig({ veo: SANS_CLE, fal: SANS_CLE }, { veo: { hasApiKey: true, apiKeyMasked: "AIza••••wxyz", hasEnvKey: false } });
    render(<ReglageVideo />);
    expect(await sectionGoogle().findByText("Aucune clé : la série vidéo est bloquée.")).toBeInTheDocument();

    fireEvent.change(sectionGoogle().getByLabelText("Colle ta clé"), { target: { value: "  AIza-cle-de-test  " } });
    fireEvent.click(sectionGoogle().getByRole("button", { name: "Enregistrer" }));

    expect(await sectionGoogle().findByText("Enregistrée : AIza••••wxyz")).toBeInTheDocument();
    const enregistrement = appels.find((a) => a.methode === "PUT")!;
    expect(enregistrement.corps).toEqual({ veo: { apiKey: "AIza-cle-de-test" } });
    // une clé enregistrée n'est pas une clé acceptée par Google : l'écran ne le prétend pas
    expect(sectionGoogle().getByText(/Ton premier plan généré dira si Google l.accepte/)).toBeInTheDocument();
  });

  it("une clé présente se retire", async () => {
    const appels = fausseConfig({ veo: { hasApiKey: true, apiKeyMasked: "AIza••••wxyz", hasEnvKey: false }, fal: SANS_CLE }, {});
    render(<ReglageVideo />);
    fireEvent.click(await sectionGoogle().findByRole("button", { name: "Retirer la clé" }));
    expect(await sectionGoogle().findByText("Clé retirée.")).toBeInTheDocument();
    expect(appels.find((a) => a.methode === "PUT")?.corps).toEqual({ veo: { apiKey: "" } });
  });

  it("des réglages illisibles le disent au lieu d'afficher « aucune clé »", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    render(<ReglageVideo />);
    expect(await sectionGoogle().findByText(/Tes réglages ne se lisent pas/)).toBeInTheDocument();
  });

  it("un enregistrement refusé le dit, et garde la clé saisie", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ veo: SANS_CLE, fal: SANS_CLE }))
      .mockResolvedValueOnce(Response.json({ veo: SANS_CLE, fal: SANS_CLE }))
      .mockResolvedValueOnce(new Response("", { status: 500 }));
    render(<ReglageVideo />);
    const champ = await sectionGoogle().findByLabelText("Colle ta clé");
    fireEvent.change(champ, { target: { value: "AIza-x" } });
    fireEvent.click(sectionGoogle().getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(sectionGoogle().getByRole("alert")).toHaveTextContent("La clé n'a pas été enregistrée"));
    expect(champ).toHaveValue("AIza-x");
  });
});

describe("Réglages · Vidéo IA — fal.ai (Seedance)", () => {
  it("sans clé : Seedance est dit indisponible, Veo reste utilisable (pas bloquant)", async () => {
    fausseConfig({ veo: SANS_CLE, fal: SANS_CLE }, {});
    render(<ReglageVideo />);
    expect(await sectionFal().findByText("Aucune clé : Seedance est indisponible, Veo reste utilisable seul.")).toBeInTheDocument();
  });

  it("enregistre la clé fal.ai séparément de celle de Google", async () => {
    const appels = fausseConfig({ veo: SANS_CLE, fal: SANS_CLE }, { fal: { hasApiKey: true, apiKeyMasked: "fal_••••6789", hasEnvKey: false } });
    render(<ReglageVideo />);
    fireEvent.change(await sectionFal().findByLabelText("Colle ta clé"), { target: { value: "fal_cle_de_test_123456789" } });
    fireEvent.click(sectionFal().getByRole("button", { name: "Enregistrer" }));

    expect(await sectionFal().findByText("Enregistrée : fal_••••6789")).toBeInTheDocument();
    expect(appels.find((a) => a.methode === "PUT")?.corps).toEqual({ fal: { apiKey: "fal_cle_de_test_123456789" } });
    // La clé Google n'a pas bougé : les deux sections sont indépendantes.
    expect(sectionGoogle().getByText("Aucune clé : la série vidéo est bloquée.")).toBeInTheDocument();
  });
});
