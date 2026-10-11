import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import { getAvailableFonts } from "@remotion/google-fonts";

// 300 pour un logotype léger (glyphe), 400 et 500 pour les phrases du film,
// 600 pour un mot-symbole ; 200 et 800 pour les directions artistiques
// (nocturne fin, éditorial gras). Une police qui n'a pas une graisse s'en passe.
const GRAISSES = ["200", "300", "400", "500", "600", "800"];

/**
 * Charge une police Google Fonts PAR SON NOM (celui de la fiche du film), et
 * retient le rendu tant qu'elle n'est pas prête : sans `delayRender`, les
 * premières images partiraient dans la police de secours du navigateur.
 *
 * Le chargement est dynamique parce que la police est une DONNÉE : un import
 * statique (`@remotion/google-fonts/Jost`) figerait la marque dans le code.
 */
// Ce qu'on voudrait charger : le latin, et le latin étendu (œ, ł, ő…).
const JEUX_VOULUS = ["latin", "latin-ext"];

type FichiersDeLaPolice = Record<string, Record<string, string> | undefined>;

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

export function usePolice(famille: string): string {
  const [attente] = useState(() => delayRender(`Police « ${famille} »`));

  useEffect(() => {
    const trouvee = getAvailableFonts().find((police) => police.fontFamily === famille);
    if (!trouvee) {
      cancelRender(new Error(`Police « ${famille} » absente de Google Fonts : corriger marque.police.`));
      return;
    }
    trouvee
      .load()
      .then((police) => {
        const info = police.getInfo();
        const fichiers = (info.fonts.normal ?? {}) as FichiersDeLaPolice;
        const graisses = GRAISSES.filter((graisse) => graisse in fichiers);
        const subsets = jeuxDeCaracteres(fichiers, graisses, info.subsets);
        return police.loadFont("normal", { weights: graisses, subsets }).waitUntilDone();
      })
      .then(() => continueRender(attente))
      .catch((erreur: unknown) => cancelRender(erreur));
  }, [famille, attente]);

  return famille;
}
