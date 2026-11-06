/* eslint-disable @next/next/no-img-element -- image locale de la bible, servie par l'API du film */
import { imagePrincipale, NOM_DU_TYPE, type FicheVisuelle, type TypeDeReference } from "@/lib/cinema/bible/etat";

type Props = {
  filmId: string;
  type: TypeDeReference;
  nom: string;
  fiche: FicheVisuelle;
  onOuvrir: () => void;
};

function statutDeLaTuile(fiche: FicheVisuelle, type: TypeDeReference): { libelle: string; classe: string } {
  if (fiche.statut === "valide") return { libelle: "Validée", classe: "validee" };
  if (imagePrincipale(fiche, type)) return { libelle: "Image à valider", classe: "a-valider" };
  return { libelle: "Pas encore d'image", classe: "vide" };
}

/**
 * Une référence de la bible, en tuile compacte (grille façon tableau de
 * bord) : la ligne complète (textes + vues + verrou) s'ouvre dans une
 * fenêtre, voir FenetreDeReference. Évite la page interminable d'une bible
 * à 8-10 personnages déployés les uns sous les autres.
 */
export default function ReferenceTuile({ filmId, type, nom, fiche, onOuvrir }: Props) {
  const image = imagePrincipale(fiche, type);
  const statut = statutDeLaTuile(fiche, type);
  return (
    <button type="button" className="reference-tuile" aria-label={`${NOM_DU_TYPE[type]} ${nom}`} onClick={onOuvrir} data-wm-id="serie.reference.tuile">
      <span className="reference-tuile-image">
        {image ? (
          <img src={`/api/motion/film/${filmId}/media?relatif=${encodeURIComponent(image.fichier)}`} alt="" />
        ) : (
          <span className="reference-tuile-vide" aria-hidden>
            {nom.charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <span className="reference-tuile-corps">
        <span className="reference-tuile-type">{NOM_DU_TYPE[type]}</span>
        <span className="reference-tuile-nom">{nom}</span>
        <span className={`status ${statut.classe}`}>
          <span className="sdot" />
          {statut.libelle}
        </span>
      </span>
    </button>
  );
}
