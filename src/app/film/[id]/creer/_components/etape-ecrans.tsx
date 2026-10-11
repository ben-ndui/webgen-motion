"use client";

import { useState } from "react";

import type { MediaDeLEditeur } from "@/lib/film-editeur";
import type { FilmSpec, Langue } from "../../../../../../remotion/film/spec";
import CaseDeDepot from "./case-de-depot";
import type { RoleDeDepot } from "./use-fiche-du-film";

type Case = { nom: string; titre: string; format: "portrait" | "paysage" };
type Groupe = { titre: string; aide: string; cases: Case[]; moments?: boolean };

// Le même écran à plusieurs moments : au moins deux, sinon rien ne bascule.
const MOMENTS = { min: 2, max: 5 } as const;

export function groupesDEcrans(fiche: FilmSpec): Groupe[] {
  const liste: Groupe[] = [
    {
      titre: "Ton parcours",
      aide: "Les 4 écrans clés de ton app ou de ton site mobile, dans l'ordre où on les utilise. Une capture d'écran de téléphone par case.",
      cases: fiche.ecrans.parcours.map((nom, i) => ({ nom, titre: `Étape ${i + 1}`, format: "portrait" })),
    },
    {
      titre: "Le moment clé",
      aide: "Le MÊME écran à plusieurs moments : avant, pendant, après. Chaque capture doit être différente de la précédente.",
      cases: fiche.ecrans.evenement.map((nom, i) => ({ nom, titre: `Moment ${i + 1}`, format: "portrait" })),
      moments: true,
    },
    {
      titre: "La preuve",
      aide: "L'écran qui prouve ta promesse : une commande confirmée, un paiement reçu, un résultat.",
      cases: [{ nom: fiche.ecrans.marque, titre: "Preuve", format: "portrait" }],
    },
  ];
  if (fiche.bibliotheque) {
    liste.push({
      titre: "Ton site, sur ordinateur",
      aide: "Une capture de ton site en format ordinateur : elle s'ouvre sous la barre d'adresse dans le Reel « boutique ».",
      cases: [{ nom: fiche.bibliotheque.ecranDeLAdresse, titre: "Page d'accueil", format: "paysage" }],
    });
  }
  return liste;
}

type Props = {
  id: string;
  fiche: FilmSpec;
  langues: Langue[];
  medias: MediaDeLEditeur[];
  doublons: string[];
  deposer: (role: RoleDeDepot, fichier: File, relatif?: string) => Promise<string | null>;
  modifier: (changement: (copie: FilmSpec) => void) => void;
};

/** Étape 3 : les captures, rangées dans des cases qui disent ce qu'elles attendent. */
export default function EtapeEcrans({ id, fiche, langues, medias, doublons, deposer, modifier }: Props) {
  const [langue, setLangue] = useState<Langue>(langues[0] ?? "fr");
  const dossier = fiche.textes[langue].dossierDesEcrans;
  const present = (relatif: string) => medias.some((m) => m.relatif === relatif && m.present);

  return (
    <div className="ecrans">
      {langues.length > 1 && (
        <div className="langues" role="tablist" aria-label="Langue des captures">
          {langues.map((l) => (
            <button key={l} type="button" role="tab" aria-selected={l === langue} className={l === langue ? "actif" : ""} onClick={() => setLangue(l)}>
              Captures en {l === "fr" ? "français" : "anglais"}
            </button>
          ))}
        </div>
      )}
      {groupesDEcrans(fiche).map((groupe) => (
        <section key={groupe.titre} className="bloc" aria-label={groupe.titre}>
          <h3 className="bloc-titre">{groupe.titre}</h3>
          <p className="champ-aide">{groupe.aide}</p>
          {groupe.moments &&
            doublons.map((doublon) => (
              <p key={doublon} className="depot-erreur" role="alert">
                Deux captures sont la même image ({doublon.replace(/^[^:]*: /, "")}) : le plan resterait figé. Remplace l&apos;une des deux.
              </p>
            ))}
          <div className={`cases${groupe.cases.some((c) => c.format === "paysage") ? " larges" : ""}`}>
            {groupe.cases.map((c) => {
              const relatif = `${dossier}/${c.nom}`;
              return (
                <CaseDeDepot
                  key={relatif}
                  titre={c.titre}
                  format={c.format}
                  accepte="image/png,image/jpeg,image/webp"
                  present={present(relatif)}
                  apercu={`/api/motion/film/${id}/media?relatif=${encodeURIComponent(relatif)}`}
                  onDeposer={(fichier) => deposer("capture", fichier, relatif)}
                />
              );
            })}
          </div>
          {groupe.moments && (
            <div className="ecrans-actions">
              {fiche.ecrans.evenement.length < MOMENTS.max && (
                <button type="button" className="lien" onClick={() => modifier((c) => { c.ecrans.evenement.push(`evenement-${c.ecrans.evenement.length + 1}.png`); })}>
                  + Ajouter un moment
                </button>
              )}
              {fiche.ecrans.evenement.length > MOMENTS.min && (
                <button type="button" className="lien" onClick={() => modifier((c) => { c.ecrans.evenement.pop(); })}>
                  Retirer le dernier moment
                </button>
              )}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
