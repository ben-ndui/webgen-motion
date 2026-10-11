"use client";

import { useEffect, useState } from "react";

type Morceau = { id: string; originalName: string; durationSec: number };
type Etat = { type: "chargement" } | { type: "erreur" } | { type: "pret"; morceaux: Morceau[] };

function duree(secondes: number): string {
  if (secondes <= 0) return "";
  const minutes = Math.floor(secondes / 60);
  return `${minutes}:${String(Math.round(secondes % 60)).padStart(2, "0")}`;
}

type Props = { titreActuel: string; onChoisir: (idDuMorceau: string) => Promise<string | null> };

/**
 * Les morceaux déjà dans GEN MOTION (la bibliothèque des tours) : un clic,
 * et le morceau est copié dans le film et mesuré.
 */
export default function BibliothequeMusique({ titreActuel, onChoisir }: Props) {
  const [etat, setEtat] = useState<Etat>({ type: "chargement" });
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    fetch("/api/motion/audio", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((corps: { tracks?: Morceau[] }) => actif && setEtat({ type: "pret", morceaux: corps.tracks ?? [] }))
      .catch(() => actif && setEtat({ type: "erreur" }));
    return () => {
      actif = false;
    };
  }, []);

  async function choisir(morceau: Morceau) {
    setEnCours(morceau.id);
    setErreur(null);
    setErreur(await onChoisir(morceau.id));
    setEnCours(null);
  }

  if (etat.type === "chargement") return <p className="champ-aide">Lecture de la bibliothèque…</p>;
  if (etat.type === "erreur") return <p className="depot-erreur" role="alert">La bibliothèque de musiques n&apos;a pas pu être lue.</p>;
  if (etat.morceaux.length === 0) {
    return <p className="champ-aide">Ta bibliothèque est vide : les morceaux ajoutés dans l&apos;onglet Audio d&apos;un tour apparaîtront ici.</p>;
  }
  return (
    <div className="bibliotheque">
      <ul className="bibliotheque-liste">
        {etat.morceaux.map((morceau) => {
          const nom = morceau.originalName.replace(/\.[^.]*$/, "");
          const actuel = nom === titreActuel;
          return (
            <li key={morceau.id}>
              <span className="bibliotheque-nom">{nom}</span>
              <span className="bibliotheque-duree">{duree(morceau.durationSec)}</span>
              {actuel ? (
                <span className="depot-ok">Dans le film</span>
              ) : (
                <button type="button" className="lien" disabled={enCours !== null} onClick={() => void choisir(morceau)}>
                  {enCours === morceau.id ? "Mesure…" : "Utiliser"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {erreur && <p className="depot-erreur" role="alert">{erreur}</p>}
    </div>
  );
}
