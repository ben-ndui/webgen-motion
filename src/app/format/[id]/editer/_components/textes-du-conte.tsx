"use client";

import type { TextesDuConte as Textes } from "../../../../../../remotion/film/conte/spec";
import ChampTexte from "../../../../film/[id]/creer/_components/champ-texte";

type ChampSimple = Exclude<keyof Textes, "avantages">;

// Les textes de l'histoire, dans l'ordre où ils passent à l'écran.
const CHAMPS: { champ: ChampSimple; question: string; max: number; aide?: string }[] = [
  { champ: "epoque", question: "Le petit libellé du début", max: 30, aide: "« Avant ton produit », « Il y a un an »" },
  { champ: "avant", question: "La vie tranquille, en une phrase", max: 60 },
  { champ: "avantDetail", question: "Sa précision", max: 70 },
  { champ: "chute", question: "Pendant que tout tombe", max: 60 },
  { champ: "constat", question: "Le constat", max: 50, aide: "« Cause officielle de l'épuisement : »" },
  { champ: "constatChiffre", question: "Le chiffre qui l'explique", max: 40 },
  { champ: "tampon", question: "Le mot du tampon sur le héros figé", max: 14 },
  { champ: "sauf", question: "La bascule, très courte", max: 20, aide: "« Sauf un. »" },
  { champ: "nom", question: "Le nom de ton produit", max: 30 },
  { champ: "promesse", question: "Sa promesse", max: 60 },
  { champ: "adresse", question: "L'adresse, dans la pastille de fin", max: 40 },
];

type Props = {
  textes: Textes;
  exemple: Textes;
  // Le constat ne cite pas le total du compteur : on le signale, sans bloquer.
  totalAbsent: boolean;
  total: number;
  ecrire: (champ: ChampSimple, valeur: string) => void;
};

/** L'histoire du conte, champ par champ, dans l'ordre où elle passe. */
export default function TextesDuConte({ textes, exemple, totalAbsent, total, ecrire }: Props) {
  return (
    <section className="bloc" aria-labelledby="bloc-histoire">
      <h3 id="bloc-histoire" className="bloc-titre">L&apos;histoire</h3>
      {CHAMPS.map(({ champ, question, max, aide }) => (
        <div key={champ}>
          <ChampTexte question={question} max={max} aide={aide} valeur={textes[champ]} exemple={exemple[champ]} onChange={(v) => ecrire(champ, v)} />
          {champ === "constatChiffre" && totalAbsent && textes.constatChiffre.trim() !== exemple.constatChiffre.trim() && (
            <p className="champ-aide" role="note">Ce texte ne cite pas le total du compteur ({total}) : vérifie qu&apos;ils disent la même chose.</p>
          )}
        </div>
      ))}
    </section>
  );
}
