"use client";

import { type CouleursDeBase, paletteDuFilm, problemesDeLaPalette } from "@/lib/film-palette";
import type { MarqueDuFilm } from "../../../../../../remotion/film/spec";
import { POLICES } from "../../../../_components/polices-du-film";

const COULEURS: { cle: keyof CouleursDeBase; libelle: string; aide: string }[] = [
  { cle: "encre", libelle: "Fond sombre", aide: "La couleur foncée" },
  { cle: "clair", libelle: "Fond clair", aide: "Souvent blanc ou crème" },
  { cle: "accent", libelle: "Couleur d'accent", aide: "Celle qu'on retient" },
];

type Props = {
  marque: MarqueDuFilm;
  // « marque » pour une entreprise, « artiste » pour un clip : seuls les mots changent.
  pour: "marque" | "artiste";
  modifier: (changement: (marque: MarqueDuFilm) => void) => void;
};

/** Le nom, trois couleurs, une police, la dernière ligne : ce qui signe la vidéo. */
export default function BlocMarque({ marque, pour, modifier }: Props) {
  const base: CouleursDeBase = { encre: marque.couleurs.encre, clair: marque.couleurs.clair, accent: marque.couleurs.accent };
  const nom = marque.logo.type === "motSymbole" ? marque.logo.texte : (marque.nom ?? "");
  return (
    <>
      <section className="bloc" aria-labelledby="bloc-nom">
        <h3 id="bloc-nom" className="bloc-titre">{pour === "artiste" ? "Ton nom d'artiste" : "Le nom de ta marque"}</h3>
        <label className="champ">
          <span className="champ-question">Tel qu&apos;il s&apos;écrit à la fin de la vidéo</span>
          <input
            className="champ-saisie"
            value={nom}
            maxLength={30}
            onChange={(e) =>
              modifier((m) => {
                m.nom = e.target.value;
                m.logo = { type: "motSymbole", texte: e.target.value, graisse: 600, approche: -0.03 };
              })
            }
          />
        </label>
      </section>

      <section className="bloc" aria-labelledby="bloc-couleurs">
        <h3 id="bloc-couleurs" className="bloc-titre">{pour === "artiste" ? "Tes couleurs" : "Les couleurs de ta marque"}</h3>
        <p className="champ-aide">Trois couleurs suffisent : les nuances pour le texte se calculent pour rester lisibles.</p>
        <div className="couleurs">
          {COULEURS.map(({ cle, libelle, aide }) => (
            <label key={cle} className="couleur">
              <input type="color" value={base[cle]} aria-label={libelle}
                onChange={(e) => modifier((m) => { m.couleurs = paletteDuFilm({ ...base, [cle]: e.target.value.toUpperCase() }); })} />
              <span className="couleur-texte">
                <b>{libelle}</b>
                <span>{aide}</span>
                <code>{base[cle]}</code>
              </span>
            </label>
          ))}
        </div>
        {problemesDeLaPalette(base).map((probleme) => (
          <p key={probleme} className="depot-erreur" role="alert">{probleme}</p>
        ))}
      </section>

      <section className="bloc" aria-labelledby="bloc-police">
        <h3 id="bloc-police" className="bloc-titre">La police</h3>
        <label className="champ">
          <span className="champ-question">Celle de ta charte, ou la plus proche</span>
          <select className="champ-saisie" value={marque.police} onChange={(e) => modifier((m) => { m.police = e.target.value; })}>
            {!POLICES.some((p) => p.nom === marque.police) && <option value={marque.police}>{marque.police}</option>}
            {POLICES.map((police) => (
              <option key={police.nom} value={police.nom}>{police.nom} · {police.allure}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="bloc" aria-labelledby="bloc-contact">
        <h3 id="bloc-contact" className="bloc-titre">La dernière ligne</h3>
        <label className="champ">
          <span className="champ-question">Ton site, ton e-mail ou ton compte, affiché à la fin (facultatif)</span>
          <input className="champ-saisie" value={marque.contact} maxLength={60} onChange={(e) => modifier((m) => { m.contact = e.target.value; })} />
        </label>
      </section>
    </>
  );
}
