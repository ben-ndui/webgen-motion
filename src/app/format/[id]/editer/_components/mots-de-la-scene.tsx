"use client";

import type { MotsDuVisuel } from "../../../../../../remotion/film/explainer/spec";
import ChampTexte from "../../../../film/[id]/creer/_components/champ-texte";

type Props = {
  mots: MotsDuVisuel;
  // Les mots de l'exemple pour cette scène, s'il en a une du même type : montrés en exemple.
  exemple: MotsDuVisuel | null;
  modifier: (mots: MotsDuVisuel) => void;
};

/** Les mots que le visuel affiche, selon son type : un chiffre, deux cartes, un tampon, des lignes, une phrase. */
export default function MotsDeLaScene({ mots, exemple, modifier }: Props) {
  const ex = exemple?.type === mots.type ? exemple : null;
  switch (mots.type) {
    case "chiffre":
      return <ChampTexte question="Le chiffre, en grand" max={12} valeur={mots.valeur} exemple={ex?.type === "chiffre" ? ex.valeur : ""}
        aide="Un vrai chiffre, que tu peux prouver." onChange={(valeur) => modifier({ ...mots, valeur })} />;
    case "tampon":
      return <ChampTexte question="Le mot du tampon" max={14} valeur={mots.tampon} exemple={ex?.type === "tampon" ? ex.tampon : ""}
        onChange={(tampon) => modifier({ ...mots, tampon })} />;
    case "phrase":
      return (
        <>
          <ChampTexte question="La phrase à retenir" max={70} valeur={mots.phrase} exemple={ex?.type === "phrase" ? ex.phrase : ""}
            onChange={(phrase) => modifier({ ...mots, phrase })} />
          <ChampTexte question="Les mots à mettre en couleur" max={30} valeur={mots.motFort} exemple={ex?.type === "phrase" ? ex.motFort : ""}
            aide="Recopiés tels quels depuis la phrase." onChange={(motFort) => modifier({ ...mots, motFort })} />
          {mots.motFort.trim() && !mots.phrase.includes(mots.motFort) && (
            <p className="depot-erreur" role="alert">Ces mots ne figurent pas tels quels dans la phrase.</p>
          )}
        </>
      );
    case "opposition":
      return (
        <>
          {(["gauche", "droite"] as const).map((cote) => (
            <div key={cote}>
              <ChampTexte question={cote === "gauche" ? "Ce qu'on croit (carte barrée)" : "Ce qui est (carte mise en avant)"} max={22}
                valeur={mots[cote].titre} exemple={ex?.type === "opposition" ? ex[cote].titre : ""}
                onChange={(titre) => modifier({ ...mots, [cote]: { ...mots[cote], titre } })} />
              <ChampTexte question="Sa précision" max={28} valeur={mots[cote].detail} exemple={ex?.type === "opposition" ? ex[cote].detail : ""}
                onChange={(detail) => modifier({ ...mots, [cote]: { ...mots[cote], detail } })} />
            </div>
          ))}
        </>
      );
    case "liste":
      return (
        <>
          {mots.elements.map((element, index) => (
            <ChampTexte key={index} question={`Ligne ${index + 1}`} max={60} valeur={element}
              exemple={ex?.type === "liste" ? (ex.elements[index] ?? "") : ""}
              onChange={(texte) => modifier({ ...mots, elements: mots.elements.map((e, i) => (i === index ? texte : e)) })} />
          ))}
          <div className="champ-aide">
            {mots.elements.length < 4 && (
              <button type="button" className="lien" onClick={() => modifier({ ...mots, elements: [...mots.elements, ""] })}>Ajouter une ligne</button>
            )}
            {mots.elements.length > 2 && (
              <button type="button" className="lien" onClick={() => modifier({ ...mots, elements: mots.elements.slice(0, -1) })}> · Retirer la dernière</button>
            )}
          </div>
        </>
      );
  }
}
