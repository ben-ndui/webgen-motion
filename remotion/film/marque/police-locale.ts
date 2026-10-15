// La police du film gardée SUR L'ORDINATEUR : quels fichiers, où, et ce que
// le film doit déclarer. Module pur (aucun import de React ni de Remotion) :
// le script de rendu télécharge, le film lit. Une coupure de connexion en
// plein rendu faisait échouer tout le film (15/10/2026, Jost hors ligne).

// 300 pour un logotype léger (glyphe), 400 et 500 pour les phrases du film,
// 600 pour un mot-symbole ; 200 et 800 pour les directions artistiques
// (nocturne fin, éditorial gras). Une police qui n'a pas une graisse s'en passe.
export const GRAISSES = ["200", "300", "400", "500", "600", "800"];

// Ce qu'on voudrait charger : le latin, et le latin étendu (œ, ł, ő…).
const JEUX_VOULUS = ["latin", "latin-ext"];

export type FichiersDeLaPolice = Record<string, Record<string, string> | undefined>;

/**
 * Les jeux de caractères à demander : ceux que la police a pour TOUTES les
 * graisses chargées. Italiana n'a pas de latin étendu : le demander faisait
 * échouer tout le rendu (« subset: latin-ext is not available », 11/10/2026).
 * Une police sans latin du tout (cyrillique seul…) garde ses propres jeux.
 */
export function jeuxDeCaracteres(fichiers: FichiersDeLaPolice, graisses: string[], jeuxDeLaPolice: string[]): string[] {
  const presents = JEUX_VOULUS.filter((jeu) => graisses.every((graisse) => Boolean(fichiers[graisse]?.[jeu])));
  return presents.length > 0 ? presents : jeuxDeLaPolice.slice(0, 1);
}

/** « Instrument Sans » → « instrument-sans » : le dossier de la police. */
export function dossierDeLaPolice(famille: string): string {
  return `polices/${famille.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function manifesteDeLaPolice(famille: string): string {
  return `${dossierDeLaPolice(famille)}/police.json`;
}

// Une déclaration @font-face : une graisse, un jeu de caractères, son fichier
// (dans public/) et la plage de caractères qu'il couvre.
export type FaceDeLaPolice = { graisse: string; jeu: string; fichier: string; plage: string };
export type ManifesteDePolice = { famille: string; faces: FaceDeLaPolice[] };

/** Ce qu'il faut garder pour une police, d'après la fiche Google Fonts. */
export function facesAGarder(
  famille: string,
  fichiers: FichiersDeLaPolice,
  plages: Record<string, string>,
  jeuxDeLaPolice: string[],
): { faces: FaceDeLaPolice[]; adresses: Record<string, string> } {
  const graisses = GRAISSES.filter((graisse) => graisse in fichiers);
  const jeux = jeuxDeCaracteres(fichiers, graisses, jeuxDeLaPolice);
  const faces: FaceDeLaPolice[] = [];
  // Le nom du fichier → son adresse chez Google : un fichier variable sert
  // plusieurs graisses, il n'est téléchargé qu'une fois.
  const adresses: Record<string, string> = {};
  for (const graisse of graisses) {
    for (const jeu of jeux) {
      const adresse = fichiers[graisse]?.[jeu];
      if (!adresse) continue;
      const nom = adresse.split("/").pop() ?? `${graisse}-${jeu}.woff2`;
      const fichier = `${dossierDeLaPolice(famille)}/${nom}`;
      adresses[fichier] = adresse;
      faces.push({ graisse, jeu, fichier, plage: plages[jeu] ?? "" });
    }
  }
  return { faces, adresses };
}
