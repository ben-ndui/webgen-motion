"use client";

import { useState } from "react";

import type { MediaDeLEditeur } from "@/lib/film-editeur";
import type { GroupeDEcrans } from "@/lib/site/choix-des-pages";
import { normaliserLAdresse } from "@/lib/site/pages-du-site";
import type { FilmSpec, Langue } from "../../../../../../remotion/film/spec";
import CaseDeDepot from "./case-de-depot";
import { adresseConnue } from "./ecrans/adresse-du-site";
import AideDuGroupe from "./ecrans/aide-du-groupe";
import type { RoleDeDepot } from "./use-fiche-du-film";

type Case = { nom: string; titre: string; format: "portrait" | "paysage" };
// `claude` : le groupe où Claude peut choisir les pages (le site sur ordinateur, c'est l'accueil).
type Groupe = { titre: string; aide: string; cases: Case[]; moments?: boolean; claude?: GroupeDEcrans };

// Le même écran à plusieurs moments : au moins deux, sinon rien ne bascule.
// Le plan du moment clé dure quatre mesures, un état par mesure.
const MOMENTS = { min: 2, max: 4 } as const;

export function groupesDEcrans(fiche: FilmSpec): Groupe[] {
  const liste: Groupe[] = [
    {
      titre: "Ton parcours",
      aide: "Les 4 écrans clés de ton app ou de ton site mobile, dans l'ordre où on les utilise. Une capture d'écran de téléphone, ou mieux : une courte vidéo d'écran (elle défilera dans le film).",
      cases: fiche.ecrans.parcours.map((nom, i) => ({ nom, titre: `Étape ${i + 1}`, format: "portrait" })),
      claude: "parcours",
    },
    {
      titre: "Le moment clé",
      aide: "Le MÊME écran à plusieurs moments : avant, pendant, après. Chaque capture doit être différente de la précédente.",
      cases: fiche.ecrans.evenement.map((nom, i) => ({ nom, titre: `Moment ${i + 1}`, format: "portrait" })),
      moments: true,
      claude: "moments",
    },
    {
      titre: "La preuve",
      aide: "L'écran qui prouve ta promesse : une commande confirmée, un paiement reçu, un résultat.",
      cases: [{ nom: fiche.ecrans.marque, titre: "Preuve", format: "portrait" }],
      claude: "preuve",
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
  adresseAuDepart?: string;
  enregistrer: () => Promise<boolean>;
  recharger: () => Promise<void>;
};

/** Étape 3 : les captures, rangées dans des cases qui disent ce qu'elles attendent. */
export default function EtapeEcrans({ id, fiche, langues, medias, doublons, deposer, modifier, adresseAuDepart, enregistrer, recharger }: Props) {
  const [langue, setLangue] = useState<Langue>(langues[0] ?? "fr");
  const [adresse, setAdresse] = useState(() => adresseConnue(fiche, adresseAuDepart));
  const adresseValide = normaliserLAdresse(adresse);
  // Un filmage réécrit les fichiers SOUS LE MÊME NOM : sans ce compteur dans la
  // clé des cases, l'aperçu garderait l'ancienne image (recette du 15/10).
  const [revision, setRevision] = useState(0);
  const apresLeFilmage = async () => {
    await recharger();
    setRevision((r) => r + 1);
  };
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
      <label className="champ adresse-du-site">
        <span className="champ-question">L&apos;adresse de ton site</span>
        <span className="champ-aide">Claude la parcourt pour choisir quelle page filmer dans chaque case.</span>
        <input className="champ-saisie" value={adresse} placeholder="monsite.fr" onChange={(e) => setAdresse(e.target.value)} inputMode="url" />
      </label>
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
                  key={`${relatif}-${revision}`}
                  titre={c.titre}
                  format={c.format}
                  accepte="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm"
                  present={present(relatif)}
                  apercu={`/api/motion/film/${id}/media?relatif=${encodeURIComponent(relatif)}`}
                  onDeposer={(fichier) => deposer("capture", fichier, relatif)}
                />
              );
            })}
          </div>
          {groupe.claude && (
            <AideDuGroupe
              id={id}
              groupe={groupe.claude}
              cases={groupe.claude === "moments" ? ["La page du moment clé"] : groupe.cases.map((c) => c.titre)}
              adresse={adresseValide}
              avantDeFilmer={enregistrer}
              apresLeFilmage={apresLeFilmage}
            />
          )}
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
