import { ArrowRight } from "lucide-react";

import type { ResumeDuRemplissage } from "../use-remplissage";
import { type Destination, aFaireApres, aSavoir } from "./a-faire-apres";

type Props = { resume: ResumeDuRemplissage; onAller: (destination: Destination) => void };

function Chiffre({ valeur, libelle }: { valeur: string; libelle: string }) {
  return (
    <div className="remplissage-chiffre">
      <span className="remplissage-chiffre-valeur">{valeur}</span>
      <span className="remplissage-chiffre-libelle">{libelle}</span>
    </div>
  );
}

/** Ce que GEN MOTION a rempli, puis ce qu'il reste à faire, chaque ligne menant au bon onglet. */
export default function RecapDuRemplissage({ resume, onAller }: Props) {
  const aFaire = aFaireApres(resume);
  const notes = aSavoir(resume);
  return (
    <div className="remplissage-recap">
      <div className="remplissage-chiffres">
        {/* Tout était déjà là : « 0 capture » se lirait comme un échec. */}
        {resume.captures === 0 && resume.capturesGardees > 0 ? (
          <Chiffre valeur={String(resume.capturesGardees)} libelle={resume.capturesGardees > 1 ? "captures déjà là" : "capture déjà là"} />
        ) : (
          <Chiffre valeur={String(resume.captures)} libelle={resume.captures > 1 ? "captures" : "capture"} />
        )}
        {resume.videos > 0 && <Chiffre valeur={String(resume.videos)} libelle={resume.videos > 1 ? "écrans filmés" : "écran filmé"} />}
        <Chiffre valeur={String(resume.textesProposes)} libelle={resume.textesProposes > 1 ? "textes proposés" : "texte proposé"} />
        <Chiffre valeur={resume.logo ? "Trouvé" : "À déposer"} libelle="logo" />
      </div>

      {aFaire.length > 0 && (
        <section aria-labelledby="remplissage-a-faire">
          <h3 id="remplissage-a-faire" className="remplissage-sous-titre">À faire maintenant</h3>
          <ul className="remplissage-a-faire">
            {aFaire.map((ligne) => (
              <li key={ligne.texte}>
                <span>{ligne.texte}</span>
                <button type="button" className="film-btn film-btn-ghost" onClick={() => onAller(ligne.destination)}>
                  {ligne.bouton}
                  <ArrowRight aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.length > 0 && (
        <section aria-labelledby="remplissage-a-savoir">
          <h3 id="remplissage-a-savoir" className="remplissage-sous-titre">Bon à savoir</h3>
          <ul className="remplissage-notes">
            {notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
