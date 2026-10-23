import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { serieSaya } from "../../../../../../../remotion/film/cinema/serie-exemple.test-utils";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import ImporterLaBible from "./importer-la-bible";

/** Comme use-fiche-du-film : la modification est appliquée tout de suite sur une copie. */
function Banc({ depart, onSerie }: { depart: CinemaDuFilm; onSerie: (c: CinemaDuFilm) => void }) {
  const derniere = useRef(depart);
  const [cinema, setCinema] = useState(depart);
  const modifierLaSerie = (changement: (c: CinemaDuFilm) => void) => {
    const copie = structuredClone(derniere.current);
    changement(copie);
    derniere.current = copie;
    setCinema(copie);
    onSerie(copie);
  };
  return <ImporterLaBible filmId="saya" cinema={cinema} modifierLaSerie={modifierLaSerie} />;
}

function repondre(statut: number, corps: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(corps), { status: statut }));
}

const PROPOSITION = {
  type: "importer-bible",
  personnages: [{ id: "henrik", nom: "Henrik", description: "A tall man." }],
  elements: [{ id: "sahor", type: "creature", nom: "Sahor", description: "A black wolf." }],
  episodes: [{ titre: "Le retour", note: "Henrik revient à Monaco." }],
};

describe("ImporterLaBible", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("le bouton reste désactivé tant que le texte collé est trop court", () => {
    render(<Banc depart={serieSaya()} onSerie={vi.fn()} />);
    const bouton = screen.getByRole("button", { name: "Importer avec Claude" });
    expect(bouton).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Colle ici le texte de sa bible…"), { target: { value: "trop court" } });
    expect(bouton).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Colle ici le texte de sa bible…"), { target: { value: "Henrik est le frère perdu d'Awa, protégé par Sahor." } });
    expect(bouton).toBeEnabled();
  });

  it("montre la proposition sans rien changer, puis l'applique quand on la garde", async () => {
    const appel = repondre(200, { proposition: PROPOSITION });
    vi.stubGlobal("fetch", appel);
    const onSerie = vi.fn();
    render(<Banc depart={serieSaya()} onSerie={onSerie} />);
    fireEvent.change(screen.getByPlaceholderText("Colle ici le texte de sa bible…"), { target: { value: "Henrik est le frère perdu d'Awa, protégé par Sahor." } });
    fireEvent.click(screen.getByRole("button", { name: "Importer avec Claude" }));

    const proposition = await screen.findByRole("region", { name: "Proposition de Claude" });
    expect(proposition).toHaveTextContent("1 personnage, 1 élément, 1 épisode trouvés.");
    expect(proposition).toHaveTextContent("Henrik");
    expect(proposition).toHaveTextContent("Le retour");
    expect(onSerie).not.toHaveBeenCalled();
    // Le texte collé part bien dans la demande envoyée au serveur.
    expect(JSON.parse((appel.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).demande.texte).toContain("Henrik est le frère perdu");

    fireEvent.click(screen.getByRole("button", { name: "Garder" }));
    const cinema = onSerie.mock.calls[0][0] as CinemaDuFilm;
    expect(cinema.personnages.map((p) => p.id)).toContain("henrik");
    expect(cinema.elements?.map((e) => e.id)).toContain("sahor");
    expect(cinema.episodesAVenir).toEqual([{ titre: "Le retour", note: "Henrik revient à Monaco." }]);
    expect(screen.queryByRole("region", { name: "Proposition de Claude" })).toBeNull();
    // Le texte ne se vide qu'une fois gardé, pas avant.
    expect(screen.getByPlaceholderText("Colle ici le texte de sa bible…")).toHaveValue("");
  });

  it("« Non merci » ne touche à rien, et laisse le texte collé (rien à retrouver pour relancer)", async () => {
    vi.stubGlobal("fetch", repondre(200, { proposition: PROPOSITION }));
    const onSerie = vi.fn();
    render(<Banc depart={serieSaya()} onSerie={onSerie} />);
    const champ = screen.getByPlaceholderText("Colle ici le texte de sa bible…");
    fireEvent.change(champ, { target: { value: "Henrik est le frère perdu d'Awa, protégé par Sahor." } });
    fireEvent.click(screen.getByRole("button", { name: "Importer avec Claude" }));
    await screen.findByRole("region", { name: "Proposition de Claude" });
    fireEvent.click(screen.getByRole("button", { name: "Non merci" }));
    expect(onSerie).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Proposition de Claude" })).toBeNull();
    expect(champ).toHaveValue("Henrik est le frère perdu d'Awa, protégé par Sahor.");
  });

  it("pas de bouton « Autre proposition » : redemander inventerait ou perdrait des épisodes", async () => {
    vi.stubGlobal("fetch", repondre(200, { proposition: PROPOSITION }));
    render(<Banc depart={serieSaya()} onSerie={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Colle ici le texte de sa bible…"), { target: { value: "Henrik est le frère perdu d'Awa, protégé par Sahor." } });
    fireEvent.click(screen.getByRole("button", { name: "Importer avec Claude" }));
    await screen.findByRole("region", { name: "Proposition de Claude" });
    expect(screen.queryByRole("button", { name: "Autre proposition" })).toBeNull();
  });

  it("sur une erreur, le texte collé reste là : rien à retrouver et recoller", async () => {
    vi.stubGlobal("fetch", repondre(412, { erreur: "Aucune clé Claude." }));
    render(<Banc depart={serieSaya()} onSerie={vi.fn()} />);
    const champ = screen.getByPlaceholderText("Colle ici le texte de sa bible…");
    fireEvent.change(champ, { target: { value: "Henrik est le frère perdu d'Awa, protégé par Sahor." } });
    fireEvent.click(screen.getByRole("button", { name: "Importer avec Claude" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Aucune clé Claude");
    expect(champ).toHaveValue("Henrik est le frère perdu d'Awa, protégé par Sahor.");
  });

  it("affiche le nombre de caractères collés", () => {
    render(<Banc depart={serieSaya()} onSerie={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Colle ici le texte de sa bible…"), { target: { value: "Henrik." } });
    expect(screen.getByText("7 / 50000")).toBeInTheDocument();
  });

  it("déposer un PDF remplit le champ de texte avec ce que le serveur en a extrait", async () => {
    const appel = vi.fn(async (url: string) => {
      expect(url).toBe("/api/motion/cinema/bible/document");
      return new Response(JSON.stringify({ texte: "Henrik est le frère perdu d'Awa." }), { status: 200 });
    });
    vi.stubGlobal("fetch", appel);
    render(<Banc depart={serieSaya()} onSerie={vi.fn()} />);
    const champ = screen.getByPlaceholderText("Colle ici le texte de sa bible…");
    const pdf = new File(["%PDF-1.4 ..."], "bible.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Déposer un document"), { target: { files: [pdf] } });
    await waitFor(() => expect(champ).toHaveValue("Henrik est le frère perdu d'Awa."));
    expect(appel).toHaveBeenCalledTimes(1);
  });

  it("déposer un .docx remplit le champ de texte avec ce que le serveur en a extrait", async () => {
    const appel = vi.fn(async (url: string) => {
      expect(url).toBe("/api/motion/cinema/bible/document");
      return new Response(JSON.stringify({ texte: "Henrik, bible au format Word." }), { status: 200 });
    });
    vi.stubGlobal("fetch", appel);
    render(<Banc depart={serieSaya()} onSerie={vi.fn()} />);
    const champ = screen.getByPlaceholderText("Colle ici le texte de sa bible…");
    const docx = new File(["PK..."], "bible.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    fireEvent.change(screen.getByLabelText("Déposer un document"), { target: { files: [docx] } });
    await waitFor(() => expect(champ).toHaveValue("Henrik, bible au format Word."));
    expect(appel).toHaveBeenCalledTimes(1);
  });

  it("déposer un .txt se lit directement dans le navigateur, sans appel réseau", async () => {
    const appel = vi.fn();
    vi.stubGlobal("fetch", appel);
    render(<Banc depart={serieSaya()} onSerie={vi.fn()} />);
    const champ = screen.getByPlaceholderText("Colle ici le texte de sa bible…");
    const txt = new File(["Henrik est le frère perdu d'Awa, lu depuis un fichier texte."], "bible.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Déposer un document"), { target: { files: [txt] } });
    await waitFor(() => expect(champ).toHaveValue("Henrik est le frère perdu d'Awa, lu depuis un fichier texte."));
    expect(appel).not.toHaveBeenCalled();
  });

  it("un document illisible affiche l'erreur du serveur sans toucher au champ de texte", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ erreur: "Ce PDF ne contient pas de texte exploitable." }), { status: 422 })));
    render(<Banc depart={serieSaya()} onSerie={vi.fn()} />);
    const champ = screen.getByPlaceholderText("Colle ici le texte de sa bible…");
    const pdf = new File(["%PDF-1.4 ..."], "bible.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Déposer un document"), { target: { files: [pdf] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Ce PDF ne contient pas de texte exploitable.");
    expect(champ).toHaveValue("");
  });

  it("un document trop gros est refusé avant tout envoi réseau", () => {
    const appel = vi.fn();
    vi.stubGlobal("fetch", appel);
    render(<Banc depart={serieSaya()} onSerie={vi.fn()} />);
    const gros = new File([new Uint8Array(21 * 1024 * 1024)], "bible.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Déposer un document"), { target: { files: [gros] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Fichier trop gros");
    expect(appel).not.toHaveBeenCalled();
  });

  it("déposer un document alors que du texte est déjà là demande confirmation avant de l'écraser", async () => {
    const appel = vi.fn(async () => new Response(JSON.stringify({ texte: "Depuis le PDF." }), { status: 200 }));
    vi.stubGlobal("fetch", appel);
    const confirmation = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Banc depart={serieSaya()} onSerie={vi.fn()} />);
    const champ = screen.getByPlaceholderText("Colle ici le texte de sa bible…");
    fireEvent.change(champ, { target: { value: "Texte déjà tapé à la main." } });
    const pdf = new File(["%PDF-1.4 ..."], "bible.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Déposer un document"), { target: { files: [pdf] } });
    expect(confirmation).toHaveBeenCalled();
    expect(appel).not.toHaveBeenCalled();
    expect(champ).toHaveValue("Texte déjà tapé à la main.");
    confirmation.mockRestore();
  });

  it("le dépôt de document est bloqué tant qu'une proposition de Claude attend une réponse", async () => {
    vi.stubGlobal("fetch", repondre(200, { proposition: PROPOSITION }));
    render(<Banc depart={serieSaya()} onSerie={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Colle ici le texte de sa bible…"), { target: { value: "Henrik est le frère perdu d'Awa, protégé par Sahor." } });
    fireEvent.click(screen.getByRole("button", { name: "Importer avec Claude" }));
    await screen.findByRole("region", { name: "Proposition de Claude" });
    expect(screen.getByLabelText("Déposer un document")).toBeDisabled();
    expect(screen.getByText("Réponds à la proposition de Claude ci-dessous avant de déposer un autre document.")).toBeInTheDocument();
  });
});
