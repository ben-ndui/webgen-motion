import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ResumeDuFilm } from "@/lib/film-etat";
import FilmLoading from "../loading";
import FilmVue from "./film-vue";

const DECLINAISON = { nom: "Court-FR", langue: "fr", version: "court", avecContact: true, bibliotheque: null } as const;

function resume(surcharge: Partial<ResumeDuFilm> = {}): ResumeDuFilm {
  return {
    id: "kotizo",
    nom: "kotizo",
    statut: "pret",
    erreurs: [],
    exemple: false,
    langues: ["fr"],
    declinaisons: [{ ...DECLINAISON, episodes: [], problemes: [], rendu: null }],
    rendus: 0,
    medias: {
      dossierPublic: "/home/ben/.webgen-motion/films/kotizo/public",
      medias: [
        { role: "musique", usages: ["film"], langues: ["fr"], relatif: "musique/m.mp3", absolu: "/x/musique/m.mp3", present: true, horsDuDossier: false },
        { role: "capture", usages: ["film"], langues: ["fr"], relatif: "ecrans/a.png", absolu: "/x/ecrans/a.png", present: false, horsDuDossier: false },
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
    direction: "nocturne",
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
    expect(screen.getByText("Nocturne")).toBeInTheDocument();
    expect(screen.getByText("/home/ben/.webgen-motion/films/kotizo/public")).toBeInTheDocument();
    expect(screen.getByText("Médias · 1/2 présents")).toBeInTheDocument();
    expect(screen.getByText("Manquant")).toBeInTheDocument();
    // Le manquant reste visible ; les présents se replient sous un résumé.
    expect(screen.getByText("Manquant").closest("details")).toBeNull();
    expect(screen.getByText("1 fichier présent")).toBeInTheDocument();
    // La barre du haut de l'app : fil d'Ariane vers les films du hub.
    expect(screen.getByRole("link", { name: "Films" })).toHaveAttribute("href", "/dashboard#films");
    expect(screen.getByRole("button", { name: "Rendre" })).toBeEnabled();
  });

  it("une déclinaison bloquée dit pourquoi et ne propose pas un rendu impossible", () => {
    const declinaisons = [{ ...DECLINAISON, episodes: [], problemes: ["capture absente : /x/ecrans/a.png"], rendu: null }];
    render(<FilmVue id="kotizo" resume={resume({ statut: "medias-manquants", declinaisons })} studio />);
    expect(screen.getByText("capture absente : /x/ecrans/a.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rendre" })).toBeDisabled();
  });
});

describe("la série sur la page du film", () => {
  it("chaque épisode a sa carte : vertical, sa vidéo s'il est rendu, ce qui bloque sinon", () => {
    const episodes = [
      { id: "ep1", titre: "L'héritage", problemes: [], rendu: { url: "/api/motion/film/video?id=kotizo&declinaison=Court-FR&rendu=episode&episode=ep1", octets: 48_500_000, modifieLe: 1 } },
      { id: "ep2", titre: "La visite", problemes: ["scène 1, plan 2 : pas encore généré"], rendu: null },
    ];
    const declinaisons = [{ ...DECLINAISON, episodes, problemes: [], rendu: null }];
    const { container } = render(<FilmVue id="kotizo" resume={resume({ declinaisons })} studio />);
    expect(screen.getByRole("heading", { name: "La série" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "L'héritage" })).toBeInTheDocument();
    expect(screen.getAllByText("FR · 9:16 · 1080 × 1920").length).toBeGreaterThanOrEqual(2);
    const sources = [...container.querySelectorAll("video")].map((video) => video.getAttribute("src") ?? "");
    expect(sources.some((src) => src.includes("rendu=episode&episode=ep1"))).toBe(true);
    expect(screen.getByText("scène 1, plan 2 : pas encore généré")).toBeInTheDocument();
  });

  it("sans série, pas de section « La série »", () => {
    render(<FilmVue id="kotizo" resume={resume()} studio />);
    expect(screen.queryByRole("heading", { name: "La série" })).not.toBeInTheDocument();
  });
});

describe("édition Community", () => {
  it("le rendu est verrouillé, l'activation Studio est proposée, les rendus faits restent lisibles", () => {
    const declinaisons = [{ ...DECLINAISON, episodes: [], problemes: [], rendu: { url: "/api/motion/film/video?id=kotizo&declinaison=Court-FR", octets: 5_000_000, modifieLe: 1 } }];
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

  it("suit les étapes du flux, puis dit combien de temps le rendu a pris", async () => {
    let horloge = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => horloge);
    let envoyer: (evenement: object) => void = () => {};
    let fermer: () => void = () => {};
    const flux = new ReadableStream<Uint8Array>({
      start(controleur) {
        envoyer = (evenement) => controleur.enqueue(new TextEncoder().encode(`${JSON.stringify(evenement)}\n`));
        fermer = () => controleur.close();
      },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(flux, { status: 200 }));
    render(<FilmVue id="kotizo" resume={resume()} studio />);
    await userEvent.click(screen.getByRole("button", { name: "Rendre" }));
    // Dès le clic : la frise est là, sur « Préparation ».
    expect(await screen.findByText("Préparation")).toHaveAttribute("aria-current", "step");

    envoyer({ type: "phase", etape: "preparation", label: "Préparation de la composition · 40 %" });
    envoyer({ type: "progress", etape: "images", frames: 454, total: 810, label: "Image 454 sur 810", restant: 80 });
    expect(await screen.findByText("Image 454 sur 810")).toBeInTheDocument();
    expect(screen.getByText("Images").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("encore ~1 min 20")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Rendu : Images");

    envoyer({ type: "progress", etape: "encodage", frames: 10, total: 810, label: "Encodage de la vidéo · 10 sur 810", restant: null });
    expect(await screen.findByText("Encodage de la vidéo · 10 sur 810")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");

    horloge += 151_000;
    envoyer({ type: "done", ok: true, url: "/api/motion/film/video?id=kotizo&declinaison=Court-FR&t=2", sizeBytes: 5 * 1024 * 1024 });
    fermer();
    expect(await screen.findByText(/Rendu en 2 min 31/)).toBeInTheDocument();
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

describe("bibliothèque de plans", () => {
  it("n'apparaît pas pour une fiche sans bibliothèque", () => {
    render(<FilmVue id="kotizo" resume={resume()} studio />);
    expect(screen.queryByRole("heading", { name: "Bibliothèque de plans" })).toBeNull();
  });

  it("se rend à part, avec son propre état, et la requête le dit", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      fluxNdjson([{ type: "done", ok: true, url: "/api/motion/film/video?id=kotizo&declinaison=Court-FR&rendu=bibliotheque", sizeBytes: 2_000_000 }]),
    );
    const declinaisons = [{ ...DECLINAISON, episodes: [], problemes: [], rendu: null, bibliotheque: { problemes: [], rendu: null } }];
    const { container } = render(<FilmVue id="kotizo" resume={resume({ declinaisons })} studio />);
    expect(screen.getByRole("heading", { name: "Bibliothèque de plans" })).toBeInTheDocument();

    const boutons = screen.getAllByRole("button", { name: "Rendre" });
    expect(boutons).toHaveLength(2);
    await userEvent.click(boutons[1]!);
    await waitFor(() => expect(container.querySelector("video")).not.toBeNull());

    const corps = JSON.parse(String(fetch.mock.calls[0]![1]!.body));
    expect(corps).toEqual({ filmId: "kotizo", declinaison: "Court-FR", rendu: "bibliotheque" });
    expect(container.querySelector("video")).toHaveAttribute("src", expect.stringContaining("rendu=bibliotheque"));
    // Le film n'a pas bougé : toujours à rendre.
    expect(screen.getByRole("button", { name: "Rendre" })).toBeEnabled();
  });

  it("une bibliothèque bloquée dit pourquoi, sans bloquer le film", () => {
    const manque = "capture absente : /x/ecrans/site.png";
    const declinaisons = [{ ...DECLINAISON, episodes: [], problemes: [], rendu: null, bibliotheque: { problemes: [manque], rendu: null } }];
    render(<FilmVue id="kotizo" resume={resume({ declinaisons })} studio />);
    expect(screen.getByText(manque)).toBeInTheDocument();
    const [film, bibliotheque] = screen.getAllByRole("button", { name: "Rendre" });
    expect(film).toBeEnabled();
    expect(bibliotheque).toBeDisabled();
  });
});
