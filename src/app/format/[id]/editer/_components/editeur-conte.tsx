"use client";

import { AVANTAGES, OBJETS, ajouterUnAvantage, ajouterUnObjet, constatSansLeTotal, retirerUnAvantage, retirerUnObjet } from "@/lib/formats/edition-conte";
import { CONTE } from "../../../../../../remotion/film/conte/ficheConte";
import type { ConteSpec } from "../../../../../../remotion/film/conte/spec";
import type { Langue } from "../../../../../../remotion/film/spec";
import ChampTexte from "../../../../film/[id]/creer/_components/champ-texte";
import ChoixDuPicto from "./choix-du-picto";
import TextesDuConte from "./textes-du-conte";

type Props = { spec: ConteSpec; langue: Langue; modifier: (changement: (spec: ConteSpec) => ConteSpec | void) => void };

/**
 * L'éditeur du conte : la scène (le héros, ce qui lui tombe dessus, le
 * compteur), puis l'histoire et ce que le produit change, dans la langue choisie.
 */
export default function EditeurConte({ spec, langue, modifier }: Props) {
  const textes = spec.textes[langue];
  return (
    <div className="blocs" data-wm-id="format.conte">
      <section className="bloc" aria-labelledby="bloc-heros">
        <h3 id="bloc-heros" className="bloc-titre">Le héros</h3>
        <p className="champ-aide">Celui à qui tout tombe dessus : toi, ton client, ton utilisateur.</p>
        {spec.heros.type === "picto" ? (
          <ChoixDuPicto libelle="Son pictogramme" valeur={spec.heros.picto} onChange={(picto) => modifier((s) => { s.heros = { type: "picto", picto }; })} />
        ) : (
          <p className="champ-aide">Image du produit : <code>{spec.heros.fichier}</code></p>
        )}
      </section>

      <section className="bloc" aria-labelledby="bloc-objets">
        <h3 id="bloc-objets" className="bloc-titre">Ce qui lui tombe dessus · {spec.objets.length}</h3>
        <p className="champ-aide">Un objet par temps de musique, de {OBJETS.min} à {OBJETS.max}. Chacun fait grimper le compteur.</p>
        {spec.objets.map((objet, index) =>
          objet.type === "picto" ? (
            <div key={index} className="champ-tete">
              <ChoixDuPicto libelle={`Objet ${index + 1}`} valeur={objet.picto}
                onChange={(picto) => modifier((s) => { s.objets[index] = { type: "picto", picto }; })} />
              <button type="button" className="lien" disabled={spec.objets.length <= OBJETS.min} onClick={() => modifier((s) => retirerUnObjet(s, index))}>Retirer</button>
            </div>
          ) : (
            <p key={index} className="champ-aide">Objet {index + 1} : image <code>{objet.fichier}</code></p>
          ),
        )}
        {spec.objets.length < OBJETS.max && (
          <button type="button" className="lien" onClick={() => modifier((s) => ajouterUnObjet(s))}>Ajouter un objet</button>
        )}
      </section>

      <section className="bloc" aria-labelledby="bloc-compteur">
        <h3 id="bloc-compteur" className="bloc-titre">Le compteur</h3>
        <p className="champ-aide">Un VRAI chiffre, que tu peux prouver : il grimpe jusqu&apos;au total, puis tombe à ce que ton produit en laisse.</p>
        <label className="champ">
          <span className="champ-question">Le total, quand tout est tombé</span>
          <input className="champ-saisie" type="number" min={0} step="any" value={spec.compteur.total}
            onChange={(e) => modifier((s) => { s.compteur.total = Number(e.target.value); })} />
        </label>
        <label className="champ">
          <span className="champ-question">Ce qu&apos;il en reste avec ton produit</span>
          <input className="champ-saisie" type="number" min={0} step="any" value={spec.compteur.apres}
            onChange={(e) => modifier((s) => { s.compteur.apres = Number(e.target.value); })} />
        </label>
        <label className="champ">
          <span className="champ-question">Chiffres après la virgule</span>
          <select className="champ-saisie" value={spec.compteur.decimales}
            onChange={(e) => modifier((s) => { s.compteur.decimales = Number(e.target.value) as 0 | 1 | 2; })}>
            <option value={0}>Aucun (113 offres)</option>
            <option value={1}>Un (4,5 h)</option>
            <option value={2}>Deux (4,49 €)</option>
          </select>
        </label>
        <ChampTexte question="Son libellé" max={20} valeur={textes.libelleCompteur} exemple={CONTE.textes[langue].libelleCompteur}
          onChange={(v) => modifier((s) => { s.textes[langue].libelleCompteur = v; })} />
        <ChampTexte question="Son unité" max={14} valeur={textes.unite} exemple={CONTE.textes[langue].unite}
          onChange={(v) => modifier((s) => { s.textes[langue].unite = v; })} />
      </section>

      <TextesDuConte textes={textes} exemple={CONTE.textes[langue]} totalAbsent={constatSansLeTotal(spec, langue)} total={spec.compteur.total}
        ecrire={(champ, valeur) => modifier((s) => { s.textes[langue][champ] = valeur; })} />

      <section className="bloc" aria-labelledby="bloc-avantages">
        <h3 id="bloc-avantages" className="bloc-titre">Ce que ton produit change · {textes.avantages.length}</h3>
        <p className="champ-aide">Une ligne par plan, de {AVANTAGES.min} à {AVANTAGES.max}. Ajoutée ou retirée dans les deux langues.</p>
        {textes.avantages.map((avantage, index) => (
          <div key={index}>
            <ChampTexte question={`Avantage ${index + 1}`} max={50} valeur={avantage} exemple={CONTE.textes[langue].avantages[index] ?? ""}
              onChange={(v) => modifier((s) => { s.textes[langue].avantages[index] = v; })} />
            {textes.avantages.length > AVANTAGES.min && (
              <button type="button" className="lien" onClick={() => modifier((s) => retirerUnAvantage(s, index))}>Retirer cet avantage</button>
            )}
          </div>
        ))}
        {textes.avantages.length < AVANTAGES.max && (
          <button type="button" className="lien" onClick={() => modifier((s) => ajouterUnAvantage(s))}>Ajouter un avantage</button>
        )}
      </section>
    </div>
  );
}
