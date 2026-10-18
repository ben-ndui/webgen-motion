"use client";

import { PICTOS, type Picto } from "../../../../../../remotion/film/pictos";

export const NOMS_DES_PICTOS: Record<Picto, string> = {
  robot: "Robot", document: "Document", formulaire: "Formulaire", cadenas: "Cadenas", loupe: "Loupe",
  personne: "Personne", serveur: "Serveur", ecran: "Écran", horloge: "Horloge", coche: "Coche",
};

/** Un pictogramme maison, choisi dans la liste (aucun logo de marque tierce). */
export default function ChoixDuPicto({ libelle, valeur, onChange }: { libelle: string; valeur: Picto; onChange: (p: Picto) => void }) {
  return (
    <label className="champ">
      <span className="champ-question">{libelle}</span>
      <select className="champ-saisie" value={valeur} onChange={(e) => onChange(e.target.value as Picto)}>
        {PICTOS.map((p) => <option key={p} value={p}>{NOMS_DES_PICTOS[p]}</option>)}
      </select>
    </label>
  );
}
