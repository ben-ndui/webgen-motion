"use client";

/* eslint-disable @next/next/no-img-element -- aperçu local d'un fichier déposé */
import { useRef, useState } from "react";

type Props = {
  titre: string;
  aide?: string;
  present: boolean;
  // URL d'aperçu si c'est une image ; sinon `resume` dit ce qui est déposé.
  apercu?: string;
  resume?: string;
  accepte: string;
  onDeposer: (fichier: File) => Promise<string | null>;
  format?: "portrait" | "paysage" | "carre";
};

/**
 * Une case où glisser (ou choisir) UN fichier. On n'a rien à nommer : la case
 * sait où le ranger. Elle montre ce qui est déjà déposé, et dit en clair
 * pourquoi un fichier est refusé.
 */
export default function CaseDeDepot({ titre, aide, present, apercu, resume, accepte, onDeposer, format = "portrait" }: Props) {
  const champ = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  async function envoyer(fichier: File | undefined) {
    if (!fichier || envoi) return;
    setEnvoi(true);
    setErreur(null);
    const probleme = await onDeposer(fichier);
    setEnvoi(false);
    setErreur(probleme);
    if (!probleme) setVersion((v) => v + 1);
  }

  return (
    <div className="depot">
      <button
        type="button"
        className={`depot-zone depot-${format}${survol ? " survol" : ""}${present ? " rempli" : ""}`}
        onClick={() => champ.current?.click()}
        onDragOver={(evenement) => {
          evenement.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(evenement) => {
          evenement.preventDefault();
          setSurvol(false);
          void envoyer(evenement.dataTransfer.files[0]);
        }}
        aria-label={`${titre} : ${present ? "remplacer le fichier" : "choisir un fichier"}`}
        aria-busy={envoi}
      >
        {present && apercu ? (
          <img src={`${apercu}&v=${version}`} alt="" className="depot-apercu" />
        ) : (
          <span className="depot-invite">{envoi ? "Envoi…" : present ? resume ?? "Déposé" : "Glisse ton fichier ici"}</span>
        )}
      </button>
      <div className="depot-legende">
        <span className="depot-titre">{titre}</span>
        {present ? <span className="depot-ok">Déposé</span> : <span className="depot-manque">À déposer</span>}
      </div>
      {aide && <p className="champ-aide">{aide}</p>}
      {erreur && (
        <p className="depot-erreur" role="alert">
          {erreur}
        </p>
      )}
      <input
        ref={champ}
        type="file"
        accept={accepte}
        hidden
        onChange={(evenement) => {
          void envoyer(evenement.target.files?.[0]);
          evenement.target.value = "";
        }}
      />
    </div>
  );
}
