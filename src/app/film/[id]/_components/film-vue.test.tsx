import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ResumeDuFilm } from "@/lib/film-etat";
import FilmLoading from "../loading";
import FilmVue from "./film-vue";

const DECLINAISON = { nom: "Court-FR", langue: "fr", version: "court", avecContact: true } as const;

function resume(surcharge: Partial<ResumeDuFilm> = {}): ResumeDuFilm {
  return {
    id: "kotizo",
    nom: "kotizo",
    statut: "pret",
    erreurs: [],
    exemple: false,
    langues: ["fr"],
    declinaisons: [{ ...DECLINAISON, problemes: [], rendu: null }],
    rendus: 0,
    medias: {
      dossierPublic: "/home/ben/.webgen-motion/films/kotizo/public",
      medias: [
        { role: "musique", langues: ["fr"], relatif: "musique/m.mp3", absolu: "/x/musique/m.mp3", present: true, horsDuDossier: false },
        { role: "capture", langues: ["fr"], relatif: "ecrans/a.png", absolu: "/x/ecrans/a.png", present: false, horsDuDossier: false },
      ],
      doublons: [],
    },
    marque: {
      couleurs: { encre: "#010D23", clair: "#FFFFFF", accent: "#2F6BFF", accentSurClair: "#003DD6", accentSurSombre: "#8FAFFF", bulleRecue: "#E9E9EB" },
      police: "Jost",
      logo: { type: "motSymbole", texte: "kotizo", graisse: 600, approche: -0.03 },
      ombreTelephone: "none",
      contact: "Smooth & Design",
    },
    musique: { titre: "Summer House", tempo: 123.52 },
    ...surcharge,
  };
}

function fluxNdjson(lignes: object[]): Response {
  const texte = lignes.map((ligne) => JSON.stringify(ligne)).join("\n") + "\n";
  return new Response(texte, { status: 200, headers: { "Content-Type": "application/x-ndjson" } });
}

afterEach(() => vi.restoreAllMocks());

describe("page film : les trois états", () => {
  it("chargement : un état visible, pas un écran vide", () => {
    render(<FilmLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(/Lecture de la fiche/);
  });

  it("vide : fiche introuvable, et comment en créer une", () => {
    render(<FilmVue id="absent" resume={null} studio />);
    expect(screen.getByRole("heading", { name: "Film introuvable" })).toBeInTheDocument();
    expect(screen.getByText("films/absent.json")).toBeInTheDocument();
  });

  it("erreur : une fiche invalide affiche TOUTES ses erreurs, pas une page vide", () => {
    const erreurs = ["marque.couleurs.accent : couleur #RRGGBB attendue", "textes.en : manquant"];
    render(<FilmVue id="faux" resume={resume({ statut: "brouillon", erreurs, declinaisons: [], medias: null })} studio />);
    expect(screen.getByRole("alert")).toHaveTextContent("Fiche invalide · 2 erreurs");
    for (const erreur of erreurs) expect(screen.getByText(erreur)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rendre" })).not.toBeInTheDocument();
  });

  it("fiche valide : résumé, médias présents/manquants avec le dossier exact, bouton de rendu", () => {
    render(<FilmVue id="kotizo" resume={resume()} studio />);
    expect(screen.getByText("Prêt à rendre")).toBeInTheDocument();
    expect(screen.getByText("/home/ben/.webgen-motion/films/kotizo/public")).toBeInTheDocument();
    expect(screen.getByText("Médias · 1/2 présents")).toBeInTheDocument();
    expect(screen.getByText("Manquant")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rendre" })).toBeEnabled();
  });

  it("une déclinaison bloquée dit pourquoi et ne propose pas un rendu impossible", () => {
    const declinaisons = [{ ...DECLINAISON, problemes: ["capture absente : /x/ecrans/a.png"], rendu: null }];
    render(<FilmVue id="kotizo" resume={resume({ statut: "medias-manquants", declinaisons })} studio />);
    expect(screen.getByText("capture absente : /x/ecrans/a.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rendre" })).toBeDisabled();
  });
});

describe("édition Community", () => {
  it("le rendu est verrouillé, l'activation Studio est proposée, les rendus faits restent lisibles", () => {
    const declinaisons = [{ ...DECLINAISON, problemes: [], rendu: { url: "/api/motion/film/video?id=kotizo&declinaison=Court-FR", octets: 5_000_000, modifieLe: 1 } }];
    const { container } = render(<FilmVue id="kotizo" resume={resume({ statut: "rendu", declinaisons })} studio={false} />);
    expect(screen.getByText("Le rendu des films de marque fait partie de Studio Edition.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Activer une licence Studio" })).toHaveAttribute("href", "/setup");
    expect(screen.getByRole("button", { name: "Rendre à nouveau" })).toBeDisabled();
    expect(container.querySelector("video")).not.toBeNull();
  });

  it("le refus Studio de la route s'affiche en clair, pas en code", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "studio-required", message: "Le rendu des films de marque est une feature Studio Edition." }, { status: 403 }),
    );
    render(<FilmVue id="kotizo" resume={resume()} studio />);
    await userEvent.click(screen.getByRole("button", { name: "Rendre" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Le rendu des films de marque est une feature Studio Edition.");
  });
});

describe("rendu d'une déclinaison", () => {
  it("suit le flux jusqu'au lecteur", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      fluxNdjson([
        { type: "phase", label: "Lancement du rendu…" },
        { type: "progress", frames: 10, total: 100, label: "Rendu image par image · 10/100" },
        { type: "done", ok: true, url: "/api/motion/film/video?id=kotizo&declinaison=Court-FR&t=1", sizeBytes: 5_000_000 },
      ]),
    );
    const { container } = render(<FilmVue id="kotizo" resume={resume()} studio />);
    await userEvent.click(screen.getByRole("button", { name: "Rendre" }));
    await waitFor(() => expect(container.querySelector("video")).not.toBeNull());
    expect(container.querySelector("video")).toHaveAttribute("src", expect.stringContaining("declinaison=Court-FR"));
    expect(screen.getByRole("button", { name: "Rendre à nouveau" })).toBeEnabled();
  });

  it("un refus de la route affiche ses erreurs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "Rendu refusé", erreurs: ["capture absente : /x/a.png"] }, { status: 400 }),
    );
    render(<FilmVue id="kotizo" resume={resume()} studio />);
    await userEvent.click(screen.getByRole("button", { name: "Rendre" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Rendu refusé");
    expect(screen.getByText("capture absente : /x/a.png")).toBeInTheDocument();
  });

  it("un flux coupé sans « done » n'est pas présenté comme un succès", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(fluxNdjson([{ type: "phase", label: "Lancement du rendu…" }]));
    const { container } = render(<FilmVue id="kotizo" resume={resume()} studio />);
    await userEvent.click(screen.getByRole("button", { name: "Rendre" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Le rendu s'est arrêté sans résultat.");
    expect(container.querySelector("video")).toBeNull();
  });
});
