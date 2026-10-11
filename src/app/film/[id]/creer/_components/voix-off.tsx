"use client";

import { useState } from "react";

import { lignesDeDepart, phraseDeDepart, reperesMontes, tempsDeParole } from "@/lib/film-voix-plans";
import type { FilmSpec, Langue, LigneDeVoix } from "../../../../../../remotion/film/spec";
import GenerationDesVoix from "./generation-des-voix";
import LigneDeVoixOff from "./ligne-de-voix";

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
          c.voix = { musiqueSousLaVoix: 0.3, lignes: { fr: [], en: [] } };
          for (const l of langues) c.voix.lignes[l] = lignesDeDepart(c, l);
        })}>Ajouter une voix off</button>
      </section>
    );
  }

  return (
    <section className="bloc" aria-labelledby="bloc-voix">
      <h3 id="bloc-voix" className="bloc-titre">Ta voix off</h3>
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
