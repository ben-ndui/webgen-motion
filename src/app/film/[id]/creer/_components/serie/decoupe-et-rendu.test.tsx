import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { serieSaya } from "../../../../../../../remotion/film/cinema/serie-exemple.test-utils";
import type { PlanDeCinema } from "../../../../../../../remotion/film/cinema/types";
import type { DeclinaisonDuFilm } from "../../../../../../../remotion/film/spec";
import DecoupeDuPlan from "./decoupe-du-plan";
import RenduDeLEpisode from "./rendu-de-l-episode";

afterEach(() => vi.restoreAllMocks());

describe("DecoupeDuPlan", () => {
  let planCourant: PlanDeCinema;
  function Banc() {
    const [plan, setPlan] = useState<PlanDeCinema>(() => serieSaya().episodes[0].scenes[0].plans[0]);
    planCourant = plan;
    const modifierLePlan = (changement: (p: PlanDeCinema) => void) =>
      setPlan((avant) => {
        const copie = structuredClone(avant);
        changement(copie);
        planCourant = copie;
        return copie;
      });
    return <DecoupeDuPlan filmId="saya" plan={plan} fichier="cinema/rangement.mp4" version={0} modifierLePlan={modifierLePlan} />;
  }
  // Le lecteur est mis à l'instant voulu, comme quand on avance la vidéo.
  const lecteurA = (secondes: number) => Object.defineProperty(document.querySelector("video")!, "currentTime", { value: secondes, configurable: true });

  it("« Commencer ici » et « Finir ici » posent la découpe à l'instant du lecteur", () => {
    render(<Banc />);
    lecteurA(0.53);
    fireEvent.click(screen.getByRole("button", { name: "Commencer ici" }));
    lecteurA(7.8);
    fireEvent.click(screen.getByRole("button", { name: "Finir ici" }));
    expect(planCourant.decoupe).toEqual({ debut: 0.5, fin: 7.8 });
    expect(screen.getByText(/De 0,5 s à 7,8 s/)).toBeInTheDocument();
  });

  it("« Retirer un passage » en deux clics, puis « Tout garder » retire la découpe", () => {
    render(<Banc />);
    lecteurA(4);
    fireEvent.click(screen.getByRole("button", { name: "Retirer un passage" }));
    lecteurA(5);
    fireEvent.click(screen.getByRole("button", { name: /Le passage retiré finit ici/ }));
    expect(planCourant.decoupe).toEqual({ debut: 0, fin: 8, coupe: [4, 5] });
    fireEvent.click(screen.getByRole("button", { name: "Tout garder" }));
    expect(planCourant.decoupe).toBeUndefined();
  });
});

describe("RenduDeLEpisode", () => {
  const COURT_FR: DeclinaisonDuFilm = { nom: "Court-FR", langue: "fr", version: "court", avecContact: false };

  it("un épisode déjà rendu se retrouve à l'ouverture (HEAD), sans télécharger la vidéo", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const { container } = render(<RenduDeLEpisode filmId="saya" episodeId="ep1" titre="L'héritage" declinaisons={[COURT_FR]} avantDeRendre={async () => true} />);
    expect(await screen.findByRole("button", { name: /Rendre à nouveau/ })).toBeInTheDocument();
    expect(fetch.mock.calls[0]![1]).toMatchObject({ method: "HEAD" });
    expect(container.querySelector("video")?.getAttribute("src")).toContain("rendu=episode&episode=ep1");
  });

  it("un plan manquant : le refus du serveur s'affiche avec sa liste", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) =>
      options?.method === "HEAD"
        ? new Response(null, { status: 404 })
        : new Response(JSON.stringify({ error: "Rendu refusé", erreurs: ["scène 2, plan 1 : pas encore généré"] }), { status: 400 }),
    );
    render(<RenduDeLEpisode filmId="saya" episodeId="ep1" titre="L'héritage" declinaisons={[COURT_FR]} avantDeRendre={async () => true} />);
    fireEvent.click(screen.getByRole("button", { name: /Rendre l'épisode/ }));
    expect(await screen.findByText("scène 2, plan 1 : pas encore généré")).toBeInTheDocument();
  });

  it("un enregistrement raté ne lance aucun rendu", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
    render(<RenduDeLEpisode filmId="saya" episodeId="ep1" titre="L'héritage" declinaisons={[COURT_FR]} avantDeRendre={async () => false} />);
    fireEvent.click(screen.getByRole("button", { name: /Rendre l'épisode/ }));
    await new Promise((r) => setTimeout(r, 20));
    expect(fetch.mock.calls.every(([, options]) => options?.method === "HEAD")).toBe(true);
  });
});
