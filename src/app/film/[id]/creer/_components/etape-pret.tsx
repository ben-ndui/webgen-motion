"use client";

import Link from "next/link";

import type { EtatDeLEditeur } from "@/lib/film-editeur";
import type { FilmSpec } from "../../../../../../remotion/film/spec";
import type { Etape } from "./assistant-du-film";
import { groupesDEcrans } from "./etape-ecrans";

const LIBELLES: Record<string, string> = {
  "bascule.constat": "La bascule : ce qui se passe aujourd'hui",
  "bascule.chiffre": "La bascule : le chiffre",
  "bascule.signature": "La bascule : ta promesse",
  "evenement.chute": "Le moment clé",
  "fin.disponible": "La fin : où trouver ton produit",
  "bibliotheque.mot": "Reels : ton mot signature",
  "bibliotheque.anneau": "Reels : la phrase qui tourne",
  "bibliotheque.signature": "Reels : la ligne sous ton logo",
  "bibliotheque.adresse": "Reels : l'adresse de ton site",
};

function libelle(champ: string): string {
  if (LIBELLES[champ]) return LIBELLES[champ];
  const [plan, , rang] = champ.split(".");
  if (champ.startsWith("parcours.")) return `Le parcours : légende ${Number(champ.split(".")[1]) + 1}`;
  if (plan === "marque") return `Tes trois mots : mot ${Number(rang) + 1}`;
  if (plan === "probleme") return `La conversation : message ${Number(rang) + 1}`;
  if (champ.startsWith("bibliotheque.legendesEventail.")) return `Reels : légende de l'écran ${Number(champ.split(".")[2]) + 1}`;
  return champ;
}

const ROLES = { musique: "La musique", logo: "Le logo", capture: "Une capture" } as const;

/** « ecrans-fr/evenement-2.png » → « Le moment clé : Moment 2 ». */
function nomDeLaCapture(fiche: FilmSpec, relatif: string): string {
  const [dossier, nom] = relatif.split("/");
  const langue = dossier?.endsWith("-en") ? " (EN)" : "";
  for (const groupe of groupesDEcrans(fiche)) {
    const c = groupe.cases.find((x) => x.nom === nom);
    if (c) return `${groupe.titre} : ${c.titre}${langue}`;
  }
  return `Une capture : ${nom}`;
}

type Props = {
  id: string;
  etat: EtatDeLEditeur;
  fiche: FilmSpec;
  modifier: (changement: (copie: FilmSpec) => void) => void;
  enregistrer: () => Promise<boolean>;
  onAller: (etape: Etape) => void;
};

/**
 * Étape 5 : ce qui reste, en clair, puis « Mon film est prêt ». Un succès ne
 * s'affiche que s'il ne reste RIEN : pas de texte d'exemple, pas de fichier
 * manquant, pas d'erreur dans la fiche.
 */
export default function EtapePret({ id, etat, fiche, modifier, enregistrer, onAller }: Props) {
  const manquants = etat.medias.filter((media) => !media.present);
  const reste = etat.textesAEcrire.length + manquants.length + etat.erreurs.length;

  async function declarerPret() {
    modifier((copie) => { copie.exemple = false; });
    await enregistrer();
  }

  if (reste === 0 && !fiche.exemple) {
    return (
      <div className="bloc pret">
        <h3 className="bloc-titre">Ton film est prêt</h3>
        <p className="champ-aide">Tout est rempli. Tu peux lancer le rendu de chaque format.</p>
        <Link className="film-btn" href={`/film/${id}`}>Aller au rendu</Link>
      </div>
    );
  }

  return (
    <div>
      <section className="bloc" aria-labelledby="h-reste">
        <h3 id="h-reste" className="bloc-titre">{reste === 0 ? "Tout est rempli" : `Il reste ${reste} chose${reste > 1 ? "s" : ""} à faire`}</h3>
        {etat.erreurs.length > 0 && (
          <ul className="reste" aria-label="Erreurs de la fiche">
            {etat.erreurs.map((erreur) => <li key={erreur}><code>{erreur}</code></li>)}
          </ul>
        )}
        {etat.textesAEcrire.length > 0 && (
          <>
            <p className="champ-aide">Textes encore à écrire (étape « Ton histoire ») :</p>
            <ul className="reste">
              {etat.textesAEcrire.map(({ langue, champ }) => (
                <li key={`${langue}-${champ}`}>
                  <button type="button" onClick={() => onAller("histoire")}>
                    {libelle(champ)}{etat.textesAEcrire.some((t) => t.langue !== langue) ? ` (${langue.toUpperCase()})` : ""}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {manquants.length > 0 && (
          <>
            <p className="champ-aide">Fichiers encore à déposer :</p>
            <ul className="reste">
              {manquants.map((media) => (
                <li key={media.relatif}>
                  <button type="button" onClick={() => onAller(media.role === "capture" ? "ecrans" : media.role === "musique" ? "musique" : "marque")}>
                    {media.role === "capture" ? nomDeLaCapture(fiche, media.relatif) : ROLES[media.role]}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {reste === 0 && (
          <button type="button" className="film-btn" onClick={() => void declarerPret()}>
            Mon film est prêt
          </button>
        )}
      </section>
    </div>
  );
}
