"use client";

import type { CeQueCiteLePlan } from "./use-prises";
import { usePrises } from "./use-prises";

type Props = {
  filmId: string;
  planId: string;
  // Change quand une nouvelle vidéo du plan arrive : les prises se rechargent.
  version: number;
  // Après un choix/suppression : fichier et découpe à recopier dans la copie locale du plan.
  onPlanChange: (plan: CeQueCiteLePlan) => void;
};

/**
 * Les prises d'un plan régénéré : une pellicule miniature, la retenue
 * marquée. Se cache s'il n'y en a qu'une (rien à choisir). SERVEUR SEULEMENT
 * côté prises.json, mais l'écran n'en sait rien : il parle à l'API.
 */
export default function PrisesDuPlan({ filmId, planId, version, onPlanChange }: Props) {
  const { prises, erreur, enCours, retenir, supprimer } = usePrises(filmId, planId, version, onPlanChange);
  if (!prises || prises.length < 2) return null;
  const base = `/api/motion/film/${filmId}`;

  return (
    <div className="champ prises">
      <span className="champ-question">Ses prises ({prises.length})</span>
      <p className="champ-aide">Chaque régénération en garde une de plus : choisis celle qui passe dans l&apos;épisode, ou supprime les ratées.</p>
      <ul className="prises-liste">
        {prises.map((prise) => (
          <li key={prise.n} className={prise.retenue ? "retenue" : ""}>
            {prise.presente ? (
              <video className="prises-video" src={`${base}/media?relatif=${encodeURIComponent(prise.fichier)}`} muted loop playsInline />
            ) : (
              <span className="prises-absente">Vidéo absente du disque</span>
            )}
            <div className="prises-actions">
              <span className="prises-numero">Prise {prise.n}</span>
              {prise.retenue ? (
                <span className="prises-retenue-etiquette">Dans l&apos;épisode</span>
              ) : (
                <>
                  <button type="button" className="lien" disabled={!prise.presente || enCours === prise.n} onClick={() => void retenir(prise.n)}>
                    Garder celle-ci
                  </button>
                  <button type="button" className="lien" disabled={enCours === prise.n} onClick={() => void supprimer(prise.n)}>
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {erreur && (
        <p className="depot-erreur" role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
}
