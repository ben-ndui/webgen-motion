"use client";

/* eslint-disable @next/next/no-img-element -- images locales de la bible, servies par l'API du film */

import { useRef } from "react";

import { type VueDeLaBible, type VueDeReference, NOM_DE_LA_VUE } from "@/lib/cinema/bible/etat";
import { COUT_D_UNE_IMAGE_DE_BIBLE_USD, enDollars } from "@/lib/cinema/couts";
import type { EtatDeLaVue } from "./use-bible";

type Props = {
  filmId: string;
  vue: VueDeReference;
  etatDeLaVue: VueDeLaBible | undefined;
  principale: boolean;
  plusieursVues: boolean;
  etat: EtatDeLaVue;
  verrouillee: boolean;
  onGenerer: () => void;
  onImporter: (fichier: File, droitsDeclares: boolean) => void;
  onRetenir: (n: number) => void;
  onChoisirPrincipale: () => void;
};

/** Une vue de la bible (face, trois-quarts…) : son image retenue, ses autres versions, générer/importer. */
export default function VueDeLaBible({ filmId, vue, etatDeLaVue, principale, plusieursVues, etat, verrouillee, onGenerer, onImporter, onRetenir, onChoisirPrincipale }: Props) {
  const fichierRef = useRef<HTMLInputElement>(null);
  const enCours = etat.etat === "en-cours";
  const retenue = etatDeLaVue?.versions.find((v) => v.n === etatDeLaVue.retenue);
  const apercu = (fichier: string) => `/api/motion/film/${filmId}/media?relatif=${encodeURIComponent(fichier)}`;

  return (
    <div className="vue-bible">
      <div className={`vue-bible-image${enCours ? " en-cours" : ""}`}>
        {retenue ? <img src={apercu(retenue.fichier)} alt={`${NOM_DE_LA_VUE[vue]}, version ${retenue.n}`} /> : <span className="vue-bible-vide">{enCours ? "En cours…" : "Pas encore d'image"}</span>}
      </div>
      <div className="vue-bible-legende">
        <b>{NOM_DE_LA_VUE[vue]}</b>
        {plusieursVues && (
          <button type="button" className="lien" disabled={verrouillee || !retenue || principale} onClick={onChoisirPrincipale}>
            {principale ? "Vue principale" : "Choisir comme principale"}
          </button>
        )}
      </div>
      {etatDeLaVue && etatDeLaVue.versions.length > 1 && (
        <ul className="vue-bible-versions">
          {etatDeLaVue.versions.map((version) => (
            <li key={version.n}>
              <button
                type="button"
                className={`vue-bible-version${version.n === etatDeLaVue.retenue ? " choisie" : ""}`}
                aria-pressed={version.n === etatDeLaVue.retenue}
                disabled={verrouillee}
                onClick={() => onRetenir(version.n)}
              >
                <img src={apercu(version.fichier)} alt={`Version ${version.n}`} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="vue-bible-actions">
        <button type="button" className="film-btn film-btn-ghost" disabled={enCours || verrouillee} onClick={onGenerer}>
          {retenue ? "Refaire" : "Générer"} ({enDollars(COUT_D_UNE_IMAGE_DE_BIBLE_USD)})
        </button>
        <button type="button" className="film-btn film-btn-ghost" disabled={enCours || verrouillee} onClick={() => fichierRef.current?.click()}>
          Importer
        </button>
        <input
          ref={fichierRef}
          type="file"
          accept="image/jpeg,image/png"
          hidden
          onChange={(e) => {
            const fichier = e.target.files?.[0];
            e.target.value = "";
            if (fichier) onImporter(fichier, window.confirm("As-tu les droits sur cette image (photo prise par toi, ou licence qui autorise cet usage) ?"));
          }}
        />
      </div>
      {etat.etat === "erreur" && (
        <p className="depot-erreur" role="alert">
          {etat.raison}
        </p>
      )}
    </div>
  );
}
