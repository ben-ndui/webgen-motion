"use client";

import { LONGUEUR_DE_L_ANNEAU, LONGUEUR_MAX_DU_MOT } from "../../../../../../remotion/film/bibliotheque/validerBibliotheque";
import { FILM } from "../../../../../../remotion/film/film";
import type { FilmSpec, Langue, TextesDeLaBibliotheque } from "../../../../../../remotion/film/spec";
import ChampTexte from "./champ-texte";

type Props = {
  fiche: FilmSpec;
  langue: Langue;
  modifier: (changement: (copie: FilmSpec) => void) => void;
  propose: (champ: string, valeur: string) => boolean;
  propositions: Record<string, string>;
};

/**
 * Les textes des plans courts, ceux qui font les Reels : le mot signature,
 * la phrase en anneau, l'adresse du site, les légendes de l'éventail.
 */
export default function HistoireDesReels({ fiche, langue, modifier, propose, propositions }: Props) {
  const t = fiche.textes[langue].bibliotheque;
  const modele = FILM.textes[langue].bibliotheque;
  if (!t || !modele || !fiche.bibliotheque || !FILM.bibliotheque) return null;
  const ecrire = (changement: (textes: TextesDeLaBibliotheque) => void) =>
    modifier((copie) => {
      const textes = copie.textes[langue].bibliotheque;
      if (textes) changement(textes);
    });

  return (
    <section className="bloc" aria-labelledby="h-reels">
      <h3 id="h-reels" className="bloc-titre">7 · Tes Reels</h3>
      <p className="champ-aide">Des plans courts, à publier seuls sur les réseaux.</p>
      <ChampTexte
        question="Ton mot signature"
        aide="Un seul mot. S'il finit par un point, le point tombe dessus en couleur."
        exemple={modele.mot}
        valeur={t.mot}
        propose={propose("bibliotheque.mot", t.mot)}
        max={LONGUEUR_MAX_DU_MOT}
        onChange={(v) => ecrire((x) => { x.mot = v; })}
      />
      <ChampTexte
        question="La phrase qui tourne autour"
        aide="Trois mots séparés par « · », par exemple : Naturel · Fait main · Livré."
        exemple={modele.anneau}
        valeur={t.anneau}
        propose={propose("bibliotheque.anneau", t.anneau)}
        max={LONGUEUR_DE_L_ANNEAU.max}
        onChange={(v) => ecrire((x) => { x.anneau = v; })}
      />
      <ChampTexte
        question="L'adresse de ton site, telle qu'on la tape"
        aide="Sans « https:// » : maisonsayasignature.com"
        exemple={FILM.bibliotheque.adresse}
        valeur={fiche.bibliotheque.adresse}
        propose={propositions["bibliotheque.adresse"] === fiche.bibliotheque.adresse}
        max={40}
        onChange={(v) => modifier((copie) => { if (copie.bibliotheque) copie.bibliotheque.adresse = v.replace(/^https?:\/\//, ""); })}
      />
      {t.legendesEventail.map((legende, i) => (
        <ChampTexte
          key={i}
          question={`Légende de l'écran ${i + 1} (éventail)`}
          exemple={modele.legendesEventail[i] ?? ""}
          valeur={legende}
          propose={propose(`bibliotheque.legendesEventail.${i}`, legende)}
          max={24}
          onChange={(v) => ecrire((x) => { x.legendesEventail[i] = v; })}
        />
      ))}
      <ChampTexte
        question="La ligne sous ton logo"
        exemple={modele.signature}
        valeur={t.signature}
        propose={propose("bibliotheque.signature", t.signature)}
        max={50}
        onChange={(v) => ecrire((x) => { x.signature = v; })}
      />
    </section>
  );
}
