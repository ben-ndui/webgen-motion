"use client";

/* eslint-disable @next/next/no-img-element -- photo locale servie par l'API du film */

import { useState } from "react";

type Props = {
  filmId: string;
  photo: string | undefined;
  // Le produit doit être décrit (et enregistré) avant : la photo l'accompagne.
  objetDecrit: boolean;
  avantDeDeposer: () => Promise<boolean>;
  quandChange: (photo: string | null) => void;
};

/**
 * La photo du vrai produit : envoyée à Veo dans chaque plan où l'objet
 * apparaît. Les plans générés ensuite montrent le vrai produit ; ceux d'avant
 * restent un objet imaginé (« APERÇU ») tant qu'on ne les refait pas.
 */
export default function PhotoDuProduit({ filmId, photo, objetDecrit, avantDeDeposer, quandChange }: Props) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [version, setVersion] = useState(0);
  const url = `/api/motion/film/${filmId}/cinema/objet`;

  const envoyer = async (fichier: File | null) => {
    setErreur(null);
    setEnCours(true);
    try {
      if (!(await avantDeDeposer())) {
        setErreur("Enregistrement impossible : rien n'a été envoyé.");
        return;
      }
      const formulaire = new FormData();
      if (fichier) formulaire.set("fichier", fichier);
      const reponse = await fetch(url, fichier ? { method: "POST", body: formulaire } : { method: "DELETE" });
      const corps = (await reponse.json().catch(() => ({}))) as { photo?: string | null; erreur?: string };
      if (!reponse.ok) {
        setErreur(corps.erreur ?? "La photo n'a pas pu être enregistrée.");
        return;
      }
      quandChange(corps.photo ?? null);
      setVersion((v) => v + 1);
    } catch {
      setErreur("GEN MOTION ne répond pas.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="champ photo-du-produit">
      <span className="champ-question">La photo du vrai produit (facultatif)</span>
      <span className="champ-aide">
        Un JPEG ou un PNG, le produit bien visible. Veo le reproduit dans les plans générés ensuite ; plus d&apos;« APERÇU » sur ces plans-là.
      </span>
      {photo && <img className="photo-du-produit-apercu" src={`/api/motion/film/${filmId}/media?relatif=${encodeURIComponent(photo)}&v=${version}`} alt="Photo du produit" />}
      <div className="decoupe-actions">
        <label className={`film-btn film-btn-ghost${!objetDecrit || enCours ? " desactive" : ""}`}>
          {photo ? "Changer la photo" : "Déposer la photo"}
          <input
            type="file"
            accept="image/jpeg,image/png"
            hidden
            disabled={!objetDecrit || enCours}
            onChange={(e) => {
              const fichier = e.target.files?.[0] ?? null;
              e.target.value = "";
              if (fichier) void envoyer(fichier);
            }}
          />
        </label>
        {photo && (
          <button type="button" className="lien" disabled={enCours} onClick={() => void envoyer(null)}>
            Retirer la photo
          </button>
        )}
      </div>
      {!objetDecrit && <span className="champ-aide">Décris d&apos;abord le produit ci-dessus.</span>}
      {erreur && (
        <p className="depot-erreur" role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
}
