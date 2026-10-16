"use client";

import { PICTOS, type Picto } from "../../../../../../remotion/film/pictos";
import { TYPES_DE_VISUEL, type ExplainerSpec, type MotsDuVisuel, type TypeDeVisuel } from "../../../../../../remotion/film/explainer/spec";
import { EXPLAINER } from "../../../../../../remotion/film/explainer/ficheExplainer";
import type { Langue } from "../../../../../../remotion/film/spec";
import { changerLeVisuel, deplacerUneScene, retirerUneScene } from "@/lib/formats/edition-explainer";
import ChampTexte from "../../../../film/[id]/creer/_components/champ-texte";
import MotsDeLaScene from "./mots-de-la-scene";

export const VISUELS: Record<TypeDeVisuel, string> = {
  chiffre: "Un chiffre qui frappe",
  opposition: "Deux cartes : ce qu'on croit, ce qui est",
  tampon: "Un tampon sur un objet",
  liste: "Une liste de 2 à 4 lignes",
  phrase: "La phrase à retenir",
};

const NOMS_DES_PICTOS: Record<Picto, string> = {
  robot: "Robot", document: "Document", formulaire: "Formulaire", cadenas: "Cadenas", loupe: "Loupe",
  personne: "Personne", serveur: "Serveur", ecran: "Écran", horloge: "Horloge", coche: "Coche",
};

type Props = { spec: ExplainerSpec; index: number; langue: Langue; modifier: (changement: (spec: ExplainerSpec) => ExplainerSpec | void) => void };

function ChoixDuPicto({ libelle, valeur, onChange }: { libelle: string; valeur: Picto; onChange: (p: Picto) => void }) {
  return (
    <label className="champ">
      <span className="champ-question">{libelle}</span>
      <select className="champ-saisie" value={valeur} onChange={(e) => onChange(e.target.value as Picto)}>
        {PICTOS.map((p) => <option key={p} value={p}>{NOMS_DES_PICTOS[p]}</option>)}
      </select>
    </label>
  );
}

/** Une scène : son visuel, sa durée, et ses textes dans la langue qu'on écrit. */
export default function CarteDeScene({ spec, index, langue, modifier }: Props) {
  const scene = spec.scenes[index]!;
  const textes = spec.textes[langue].scenes[scene.id];
  const exemple = EXPLAINER.textes[langue].scenes[scene.id];
  if (!textes) return null;
  const secondes = Math.round(((scene.mesures * 4 * 60) / spec.musique.tempo) * 10) / 10;
  const ecrire = (changement: (t: NonNullable<typeof textes>) => void) => modifier((s) => { changement(s.textes[langue].scenes[scene.id]!); });

  return (
    <section className="bloc" aria-label={`Scène ${index + 1}`} data-wm-id="format.explainer.scene">
      <div className="champ-tete">
        <h3 className="bloc-titre">Scène {index + 1} · {VISUELS[scene.visuel.type]}</h3>
        <span>
          <button type="button" className="lien" disabled={index === 0} onClick={() => modifier((s) => deplacerUneScene(s, scene.id, -1))} aria-label="Monter la scène">↑</button>{" "}
          <button type="button" className="lien" disabled={index === spec.scenes.length - 1} onClick={() => modifier((s) => deplacerUneScene(s, scene.id, 1))} aria-label="Descendre la scène">↓</button>{" "}
          <button type="button" className="lien" disabled={spec.scenes.length <= 2} onClick={() => modifier((s) => retirerUneScene(s, scene.id))}>Retirer</button>
        </span>
      </div>
      <label className="champ">
        <span className="champ-question">Ce que montre la scène</span>
        <select className="champ-saisie" value={scene.visuel.type} onChange={(e) => modifier((s) => changerLeVisuel(s, scene.id, e.target.value as TypeDeVisuel))}>
          {TYPES_DE_VISUEL.map((t) => <option key={t} value={t}>{VISUELS[t]}</option>)}
        </select>
      </label>
      {scene.visuel.type === "opposition" ? (
        <>
          <ChoixDuPicto libelle="Pictogramme de la carte barrée" valeur={scene.visuel.gauche}
            onChange={(p) => modifier((s) => { const v = s.scenes[index]!.visuel; if (v.type === "opposition") v.gauche = p; })} />
          <ChoixDuPicto libelle="Pictogramme de la carte mise en avant" valeur={scene.visuel.droite}
            onChange={(p) => modifier((s) => { const v = s.scenes[index]!.visuel; if (v.type === "opposition") v.droite = p; })} />
        </>
      ) : scene.visuel.type !== "liste" ? (
        <ChoixDuPicto libelle="Pictogramme" valeur={scene.visuel.picto}
          onChange={(p) => modifier((s) => { const v = s.scenes[index]!.visuel; if ("picto" in v) v.picto = p; })} />
      ) : null}
      <label className="champ">
        <span className="champ-question">Durée</span>
        <select className="champ-saisie" value={scene.mesures} onChange={(e) => modifier((s) => { s.scenes[index]!.mesures = Number(e.target.value); })}>
          {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} mesure{n > 1 ? "s" : ""}</option>)}
        </select>
        <span className="champ-aide">Environ {secondes} s sur ta musique.</span>
      </label>
      <ChampTexte question="Le chapitre (la pastille du haut)" max={30} valeur={textes.chapitre} exemple={exemple?.chapitre ?? ""}
        onChange={(chapitre) => ecrire((t) => { t.chapitre = chapitre; })} />
      {scene.visuel.type !== "phrase" && (
        <>
          <ChampTexte question="Le sous-titre (l'encadré du bas)" max={90} valeur={textes.sousTitre ?? ""} exemple={exemple?.sousTitre ?? ""}
            onChange={(sousTitre) => ecrire((t) => { t.sousTitre = sousTitre; })} />
          {textes.precision !== undefined ? (
            <>
              <ChampTexte question="La précision, sous le sous-titre" max={80} valeur={textes.precision} exemple={exemple?.precision ?? ""}
                onChange={(precision) => ecrire((t) => { t.precision = precision; })} />
              <button type="button" className="lien" onClick={() => ecrire((t) => { delete t.precision; })}>Retirer la précision</button>
            </>
          ) : (
            <button type="button" className="lien" onClick={() => ecrire((t) => { t.precision = ""; })}>Ajouter une précision sous le sous-titre</button>
          )}
        </>
      )}
      <MotsDeLaScene mots={textes.mots} exemple={exemple?.mots ?? null} modifier={(mots: MotsDuVisuel) => ecrire((t) => { t.mots = mots; })} />
    </section>
  );
}
