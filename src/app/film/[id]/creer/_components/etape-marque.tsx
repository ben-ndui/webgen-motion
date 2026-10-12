"use client";

import type { MediaDeLEditeur } from "@/lib/film-editeur";
import { type CouleursDeBase, paletteDuFilm, problemesDeLaPalette } from "@/lib/film-palette";
import type { FilmSpec } from "../../../../../../remotion/film/spec";
import ChoixDeCases from "../../../../_components/choix-de-cases";
import { STYLES } from "../../../../_components/choix-du-film";
import { DIRECTION_PAR_DEFAUT } from "../../../../../../remotion/film/marque/direction";
import type { DirectionDuFilm } from "../../../../../../remotion/film/spec";
import BlocLanguesFormats from "./bloc-langues-formats";
import CaseDeDepot from "./case-de-depot";
import type { RoleDeDepot } from "./use-fiche-du-film";

// Polices vérifiées dans le catalogue du rendu (@remotion/google-fonts).
const POLICES = [
  { nom: "Jost", allure: "géométrique, moderne" },
  { nom: "Inter", allure: "neutre, très lisible" },
  { nom: "Poppins", allure: "ronde, chaleureuse" },
  { nom: "Montserrat", allure: "affirmée" },
  { nom: "DM Sans", allure: "douce" },
  { nom: "Manrope", allure: "tech, sobre" },
  { nom: "Space Grotesk", allure: "tech, caractère" },
  { nom: "Syne", allure: "créative" },
  { nom: "Playfair Display", allure: "élégante, à empattements" },
  { nom: "Fraunces", allure: "éditoriale" },
  { nom: "Cormorant Garamond", allure: "luxe, classique" },
  { nom: "Italiana", allure: "luxe, très fine" },
];

const COULEURS: { cle: keyof CouleursDeBase; libelle: string; aide: string }[] = [
  { cle: "encre", libelle: "Fond sombre", aide: "La couleur foncée de ta marque" },
  { cle: "clair", libelle: "Fond clair", aide: "Souvent blanc ou crème" },
  { cle: "accent", libelle: "Couleur d'accent", aide: "Celle qu'on retient" },
];

type Props = {
  id: string;
  fiche: FilmSpec;
  modifier: (changement: (copie: FilmSpec) => void) => void;
  deposer: (role: RoleDeDepot, fichier: File) => Promise<string | null>;
  logoPresent: boolean;
  propositions: Record<string, string>;
  medias: MediaDeLEditeur[];
};

/** Étape 1 : le logo, trois couleurs, une police, le contact de fin. */
export default function EtapeMarque({ id, fiche, modifier, deposer, logoPresent, propositions, medias }: Props) {
  const { couleurs, logo } = fiche.marque;
  const base: CouleursDeBase = { encre: couleurs.encre, clair: couleurs.clair, accent: couleurs.accent };
  const problemes = problemesDeLaPalette(base);
  const couleursProposees = propositions["marque.couleurs"] === [base.encre, base.clair, base.accent].join(" ");

  function changerCouleur(cle: keyof CouleursDeBase, valeur: string) {
    modifier((copie) => {
      const nouvelle = { ...base, [cle]: valeur.toUpperCase() };
      copie.marque.couleurs = paletteDuFilm(nouvelle);
    });
  }

  return (
    <div className="blocs">
      <section className="bloc" aria-labelledby="bloc-logo">
        <h3 id="bloc-logo" className="bloc-titre">Ton logo</h3>
        <p className="champ-aide">Un PNG ou un SVG, si possible sur fond transparent. Pas de logo ? Ton nom s&apos;écrira en lettres.</p>
        <CaseDeDepot
          titre="Logo"
          format="carre"
          accepte=".png,.svg,image/png,image/svg+xml"
          present={logo.type === "image" && logoPresent}
          apercu={logo.type === "image" ? `/api/motion/film/${id}/media?relatif=${encodeURIComponent(logo.fichier)}` : undefined}
          onDeposer={(fichier) => deposer("logo", fichier)}
        />
        {logo.type === "image" ? (
          <>
            <label className="case-a-cocher">
              <input type="checkbox" checked={logo.inverser} onChange={(e) => modifier((c) => { if (c.marque.logo.type === "image") c.marque.logo.inverser = e.target.checked; })} />
              Mon logo est foncé : l&apos;éclaircir quand il se pose sur le fond sombre
            </label>
            <button type="button" className="lien" onClick={() => modifier((c) => { c.marque.logo = { type: "motSymbole", texte: fiche.marque.logo.type === "image" ? id : "", graisse: 600, approche: -0.03 }; })}>
              Écrire mon nom en lettres à la place
            </button>
          </>
        ) : (
          <label className="champ">
            <span className="champ-question">Ton nom, tel qu&apos;il s&apos;écrit</span>
            <input className="champ-saisie" value={logo.type === "motSymbole" ? logo.texte : ""} maxLength={24}
              onChange={(e) => modifier((c) => { if (c.marque.logo.type === "motSymbole") c.marque.logo.texte = e.target.value || id; })} />
          </label>
        )}
      </section>

      <section className="bloc" aria-labelledby="bloc-nom">
        <h3 id="bloc-nom" className="bloc-titre">Le nom de ta marque</h3>
        <label className="champ">
          <span className="champ-question">Tel que la voix off le dit à l&apos;ouverture</span>
          <input className="champ-saisie" value={fiche.marque.nom ?? ""} maxLength={40} placeholder="Maison Saya"
            onChange={(e) => modifier((c) => { c.marque.nom = e.target.value; })} />
        </label>
      </section>

      <section className="bloc" aria-labelledby="bloc-couleurs">
        <h3 id="bloc-couleurs" className="bloc-titre">Tes couleurs</h3>
        <p className="champ-aide">Trois couleurs suffisent : les nuances pour le texte se calculent pour rester lisibles.</p>
        {couleursProposees && <span className="champ-etat propose">Lues sur ton site, à vérifier</span>}
        <div className="couleurs">
          {COULEURS.map(({ cle, libelle, aide }) => (
            <label key={cle} className="couleur">
              <input type="color" value={base[cle]} onChange={(e) => changerCouleur(cle, e.target.value)} aria-label={libelle} />
              <span className="couleur-texte">
                <b>{libelle}</b>
                <span>{aide}</span>
                <code>{base[cle]}</code>
              </span>
            </label>
          ))}
        </div>
        <div className="apercu-palette" aria-hidden>
          <span style={{ background: couleurs.clair, color: couleurs.accentSurClair }}>Texte d&apos;accent</span>
          <span style={{ background: couleurs.encre, color: couleurs.accentSurSombre }}>Texte d&apos;accent</span>
          <span style={{ background: couleurs.encre, color: couleurs.clair }}>Ton message</span>
        </div>
        {problemes.map((probleme) => (
          <p key={probleme} className="depot-erreur" role="alert">{probleme}</p>
        ))}
      </section>

      <section className="bloc" aria-labelledby="bloc-style">
        <h3 id="bloc-style" className="bloc-titre">Ton style</h3>
        <p className="champ-aide">Il change l&apos;allure de tout le film, avec tes couleurs. Tu peux en changer quand tu veux.</p>
        <ChoixDeCases
          titre="Style du film"
          options={STYLES.map((style) => ({ ...style, image: `/film/styles/${style.valeur}.jpg` }))}
          valeurs={[fiche.direction ?? DIRECTION_PAR_DEFAUT]}
          onChange={(valeurs) => modifier((c) => { c.direction = valeurs[0] as DirectionDuFilm; })}
        />
      </section>

      <BlocLanguesFormats fiche={fiche} medias={medias} modifier={modifier} />

      <section className="bloc" aria-labelledby="bloc-police">
        <h3 id="bloc-police" className="bloc-titre">Ta police</h3>
        <label className="champ">
          <span className="champ-question">Celle de ta marque, ou la plus proche</span>
          <select className="champ-saisie" value={fiche.marque.police} onChange={(e) => modifier((c) => { c.marque.police = e.target.value; })}>
            {!POLICES.some((p) => p.nom === fiche.marque.police) && <option value={fiche.marque.police}>{fiche.marque.police}</option>}
            {POLICES.map((police) => (
              <option key={police.nom} value={police.nom}>{police.nom} · {police.allure}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="bloc" aria-labelledby="bloc-contact">
        <h3 id="bloc-contact" className="bloc-titre">La dernière ligne</h3>
        <label className="champ">
          <span className="champ-question">Ton site ou ton e-mail, affiché à la fin (facultatif)</span>
          <input className="champ-saisie" value={fiche.marque.contact} maxLength={60} placeholder="maisonsayasignature.com"
            onChange={(e) => modifier((c) => { c.marque.contact = e.target.value; })} />
        </label>
      </section>
    </div>
  );
}
