"use client";

import { FILM } from "../../../../../../remotion/film/film";
import type { FilmSpec, Langue, TextesDuFilm } from "../../../../../../remotion/film/spec";
import ChampTexte from "./champ-texte";
import Conversation from "./conversation";
import HistoireDesReels from "./histoire-des-reels";

type Props = {
  fiche: FilmSpec;
  langue: Langue;
  propositions: Record<string, string>;
  modifier: (changement: (copie: FilmSpec) => void) => void;
};

/**
 * Étape 4 : ce que dit le film, plan par plan, sous forme de questions. Le
 * modèle sert d'exemple ; ce qui n'a pas été réécrit reste signalé.
 */
export default function EtapeHistoire({ fiche, langue, propositions, modifier }: Props) {
  const propose = (champ: string, valeur: string) => propositions[`${langue}:${champ}`] === valeur;
  const t = fiche.textes[langue];
  const modele = FILM.textes[langue];
  const ecrire = (changement: (textes: TextesDuFilm) => void) => modifier((copie) => changement(copie.textes[langue]));

  return (
    <div className="blocs">
      <section className="bloc" aria-labelledby="h-probleme">
        <h3 id="h-probleme" className="bloc-titre">1 · Le problème</h3>
        <p className="champ-aide">Le film s&apos;ouvre sur une conversation de téléphone qui MONTRE le problème que ton produit règle.</p>
        <Conversation langue={langue} messages={t.probleme.messages} modifier={ecrire} propose={propose} />
      </section>

      <section className="bloc" aria-labelledby="h-bascule">
        <h3 id="h-bascule" className="bloc-titre">2 · La bascule</h3>
        <ChampTexte question="Ce qui se passe aujourd'hui, en une phrase courte" exemple={modele.bascule.constat} valeur={t.bascule.constat} propose={propose("bascule.constat", t.bascule.constat)} max={40} onChange={(v) => ecrire((x) => { x.bascule.constat = v; })} />
        <ChampTexte question="Le chiffre ou le fait qui frappe" aide="Il doit être vrai : un chiffre que tu peux prouver." exemple={modele.bascule.chiffre} valeur={t.bascule.chiffre} propose={propose("bascule.chiffre", t.bascule.chiffre)} max={40} onChange={(v) => ecrire((x) => { x.bascule.chiffre = v; })} />
        <ChampTexte question="Ta promesse, en une phrase" exemple={modele.bascule.signature} valeur={t.bascule.signature} propose={propose("bascule.signature", t.bascule.signature)} max={60} onChange={(v) => ecrire((x) => { x.bascule.signature = v; })} />
      </section>

      <section className="bloc" aria-labelledby="h-parcours">
        <h3 id="h-parcours" className="bloc-titre">3 · Le parcours</h3>
        <p className="champ-aide">Une légende courte sous chaque écran de ton parcours (étape 3 des captures).</p>
        {t.parcours.map((legende, i) => (
          <ChampTexte key={i} question={`Ce qu'on fait à l'étape ${i + 1}`} exemple={modele.parcours[i] ?? ""} valeur={legende} propose={propose(`parcours.${i}`, legende)} max={24} onChange={(v) => ecrire((x) => { x.parcours[i] = v; })} />
        ))}
      </section>

      <section className="bloc" aria-labelledby="h-moment">
        <h3 id="h-moment" className="bloc-titre">4 · Le moment clé</h3>
        <ChampTexte question="Ce que ça change, en une phrase" aide="Elle s'affiche quand l'écran arrive à son dernier état." exemple={modele.evenement.chute} valeur={t.evenement.chute} propose={propose("evenement.chute", t.evenement.chute)} max={40} onChange={(v) => ecrire((x) => { x.evenement.chute = v; })} />
      </section>

      <section className="bloc" aria-labelledby="h-marque">
        <h3 id="h-marque" className="bloc-titre">5 · Ta marque en trois mots</h3>
        <p className="champ-aide">Trois mots ou trois très courtes phrases, une par temps de la musique. La troisième ressort en couleur.</p>
        {t.marque.mots.map((mot, i) => (
          <ChampTexte key={i} question={`Mot ${i + 1}`} exemple={modele.marque.mots[i] ?? ""} valeur={mot} propose={propose(`marque.mots.${i}`, mot)} max={18} onChange={(v) => ecrire((x) => { x.marque.mots[i] = v; })} />
        ))}
      </section>

      <section className="bloc" aria-labelledby="h-fin">
        <h3 id="h-fin" className="bloc-titre">6 · La fin</h3>
        <ChampTexte question="Où trouver ton produit" exemple={modele.fin.disponible} valeur={t.fin.disponible} propose={propose("fin.disponible", t.fin.disponible)} max={50} onChange={(v) => ecrire((x) => { x.fin.disponible = v; })} />
      </section>

      {fiche.bibliotheque && t.bibliotheque && modele.bibliotheque && (
        <HistoireDesReels fiche={fiche} langue={langue} modifier={modifier} propose={propose} propositions={propositions} />
      )}
    </div>
  );
}
