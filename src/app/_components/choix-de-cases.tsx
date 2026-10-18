"use client";

/* eslint-disable @next/next/no-img-element -- vignettes locales, déjà à la bonne taille */
type Option = { valeur: string; libelle: string; aide?: string; image?: string };

type Props = {
  titre: string;
  options: Option[];
  valeurs: string[];
  onChange: (valeurs: string[]) => void;
  // Plusieurs cases cochables (langues, formats) ; sinon une seule (style).
  multiple?: boolean;
};

/**
 * Des cases à choisir, grandes et lisibles : c'est la forme qu'on comprend
 * sans mode d'emploi. En choix multiple, la dernière case cochée ne se
 * décoche pas (il faut au moins une langue, au moins un format).
 */
export default function ChoixDeCases({ titre, options, valeurs, onChange, multiple = false }: Props) {
  function basculer(valeur: string) {
    if (!multiple) return onChange([valeur]);
    if (valeurs.includes(valeur)) {
      if (valeurs.length > 1) onChange(valeurs.filter((v) => v !== valeur));
      return;
    }
    onChange([...valeurs, valeur]);
  }

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-medium text-muted mb-1.5">{titre}</legend>
      {/* Colonnes posées en style : les styles de boutons du hub écrasaient la
          grille utilitaire. auto-fit + minmax : les cases s'enroulent au lieu
          de s'écraser (visible avec des vignettes, cf. l'écran « Style »). */}
      <div className="gap-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        {options.map((option) => {
          const choisie = valeurs.includes(option.valeur);
          return (
            <button
              key={option.valeur}
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={choisie}
              onClick={() => basculer(option.valeur)}
              className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-colors ${
                choisie ? "border-accent bg-accent-soft shadow-[var(--ring)]" : "border-line bg-surface-2 hover:border-line-strong"
              }`}
            >
              {option.image && <img src={option.image} alt="" className="w-full aspect-video rounded-md object-cover" />}
              <span className="text-sm font-medium text-ink">{option.libelle}</span>
              {option.aide && <span className="text-[11px] leading-snug text-muted">{option.aide}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
