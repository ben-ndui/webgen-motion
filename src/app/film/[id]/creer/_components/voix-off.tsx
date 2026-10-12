"use client";

import { useState } from "react";

import { MUSIQUE_SOUS_LA_VOIX } from "@/lib/film-voix-niveaux";
import { lignesDeDepart, phraseDeDepart, reperesMontes, tempsDeParole } from "@/lib/film-voix-plans";
import type { FilmSpec, GenreDeVoix, Langue, LigneDeVoix } from "../../../../../../remotion/film/spec";
import ChoixDeCases from "../../../../_components/choix-de-cases";
import GenerationDesVoix from "./generation-des-voix";
import LigneDeVoixOff from "./ligne-de-voix";

const GENRES: { valeur: GenreDeVoix; libelle: string; aide: string }[] = [
  { valeur: "feminin", libelle: "Voix féminine", aide: "Douce, posée" },
  { valeur: "masculin", libelle: "Voix masculine", aide: "Grave, assurée" },
];

const PLANS: Record<string, string> = {
  ouverture: "L'ouverture",
  probleme: "Le problème",
  bascule: "La bascule",
  parcours: "Le parcours",
  evenement: "Le moment clé",
  marque: "Tes trois mots",
  fin: "La fin",
};

/** « parcours.2 » → « Étape 3 » : ce que la personne voit à l'écran à ce moment. */
function libelleDuRepere(cle: string): string {
  const [plan, sous, rang] = cle.split(".");
  if (plan === "parcours") return `Étape ${Number(sous) + 1}`;
  if (plan === "marque") return `Mot ${Number(rang) + 1}`;
  if (plan === "probleme") return `Message ${Number(rang) + 1}`;
  return { nom: "Ton nom", constat: "Le constat", chiffre: "Le chiffre", signature: "La promesse", chute: "La phrase de chute", disponible: "Où te trouver" }[sous ?? ""] ?? cle;
}

type Props = {
  id: string;
  fiche: FilmSpec;
  langues: Langue[];
  modifier: (changement: (copie: FilmSpec) => void) => void;
  enregistrer: () => Promise<boolean>;
  recharger: () => Promise<void>;
};

/**
 * La voix off, réplique par réplique : chacune est dite AU MOMENT où son
 * texte apparaît à l'image, et se tait jusqu'à la suivante. Changer un
 * texte oblige à régénérer sa voix (l'ancienne ne dirait plus la même chose).
 */
export default function VoixOff({ id, fiche, langues, modifier, enregistrer, recharger }: Props) {
  const [langue, setLangue] = useState<Langue>(langues[0] ?? "fr");
  const temps = tempsDeParole(fiche, langue);
  const reperes = reperesMontes(fiche, langue);
  const lignes = fiche.voix?.lignes[langue] ?? [];
  const montes = (l: Langue) => new Set(reperesMontes(fiche, l).map((r) => r.cle));
  const aGenerer = langues.reduce((n, l) => n + (fiche.voix?.lignes[l] ?? []).filter((ligne) => !ligne.fichier && montes(l).has(ligne.repere)).length, 0);

  const ecrire = (changement: (liste: LigneDeVoix[]) => void) =>
    modifier((c) => {
      if (!c.voix) return;
      changement(c.voix.lignes[langue] ?? (c.voix.lignes[langue] = []));
    });

  if (!fiche.voix) {
    return (
      <section className="bloc" aria-labelledby="bloc-voix">
        <h3 id="bloc-voix" className="bloc-titre">Ta voix off</h3>
        <p className="champ-aide">Une voix dit chaque texte au moment où il apparaît à l&apos;image, et se tait jusqu&apos;au suivant. La musique baisse toute seule pendant qu&apos;elle parle.</p>
        <button type="button" className="film-btn" onClick={() => modifier((c) => {
          c.voix = { musiqueSousLaVoix: MUSIQUE_SOUS_LA_VOIX, lignes: { fr: [], en: [] } };
          for (const l of langues) c.voix.lignes[l] = lignesDeDepart(c, l);
        })}>Ajouter une voix off</button>
      </section>
    );
  }

  return (
    <section className="bloc" aria-labelledby="bloc-voix">
      <h3 id="bloc-voix" className="bloc-titre">Ta voix off</h3>
      <ChoixDeCases
        titre="La voix"
        options={GENRES}
        valeurs={[fiche.voix.genre ?? "masculin"]}
        onChange={(valeurs) => modifier((c) => {
          if (!c.voix || c.voix.genre === valeurs[0]) return;
          c.voix.genre = valeurs[0] as GenreDeVoix;
          // Une autre voix : toutes les répliques sont à refaire.
          for (const liste of Object.values(c.voix.lignes)) for (const l of liste) { delete l.fichier; delete l.duree; }
        })}
      />
      <p className="champ-aide">Avec une voix ElevenLabs ou Voicebox réglée dans GEN MOTION, c&apos;est cette voix-là qui parle.</p>
      {langues.length > 1 && (
        <div className="langues" role="tablist" aria-label="Langue de la voix">
          {langues.map((l) => (
            <button key={l} type="button" role="tab" aria-selected={l === langue} className={l === langue ? "actif" : ""} onClick={() => setLangue(l)}>
              Voix en {l === "fr" ? "français" : "anglais"}
            </button>
          ))}
        </div>
      )}
      {Object.entries(PLANS).filter(([plan]) => reperes.some((r) => r.plan === plan)).map(([plan, titre]) => (
        <div key={plan} className="voix-plan">
          <span className="kicker">{titre}</span>
          {reperes.filter((r) => r.plan === plan).map((repere) => {
            const ligne = lignes.find((l) => l.repere === repere.cle);
            if (!ligne) {
              return (
                <button key={repere.cle} type="button" className="lien" onClick={() => ecrire((liste) => liste.push({ repere: repere.cle, texte: phraseDeDepart(fiche, langue, repere.cle) || "…" }))}>
                  + Dire « {libelleDuRepere(repere.cle)} »
                </button>
              );
            }
            return (
              <LigneDeVoixOff
                key={repere.cle}
                titre={libelleDuRepere(repere.cle)}
                ligne={ligne}
                disponible={temps[repere.cle]}
                onTexte={(texte) => ecrire((liste) => {
                  const l = liste.find((x) => x.repere === repere.cle);
                  if (l) { l.texte = texte; delete l.fichier; delete l.duree; }
                })}
                onRetirer={() => ecrire((liste) => { liste.splice(liste.findIndex((x) => x.repere === repere.cle), 1); })}
              />
            );
          })}
        </div>
      ))}
      <GenerationDesVoix id={id} fiche={fiche} aGenerer={aGenerer} modifier={modifier} enregistrer={enregistrer} recharger={recharger} />
    </section>
  );
}
