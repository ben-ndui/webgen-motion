import { Check, X } from "lucide-react";

import { ETAPES_DU_REMPLISSAGE, type EtatDUneEtape } from "@/lib/site/etapes-du-remplissage";

const LIBELLES_D_ETAT: Record<EtatDUneEtape, string> = {
  faite: "terminée",
  "en-cours": "en cours",
  "a-venir": "à venir",
  echouee: "arrêtée ici",
};

type Props = { etats: EtatDUneEtape[]; detail: string | null };

/** Les cinq étapes du remplissage, cochées une à une ; le détail vit sous l'étape en cours. */
export default function FriseDesEtapes({ etats, detail }: Props) {
  return (
    <ol className="remplissage-frise">
      {ETAPES_DU_REMPLISSAGE.map((etape, i) => {
        const etat = etats[i]!;
        return (
          <li key={etape.cle} className="remplissage-etape" data-etat={etat}>
            <span className="remplissage-pastille" aria-hidden>
              {etat === "faite" && <Check />}
              {etat === "echouee" && <X />}
            </span>
            <span className="remplissage-etape-texte">
              <span className="remplissage-etape-titre">
                {etape.titre}
                <span className="sr-only"> : {LIBELLES_D_ETAT[etat]}</span>
              </span>
              {etat === "en-cours" && detail && (
                <span className="remplissage-etape-detail" aria-live="polite">
                  {detail}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
