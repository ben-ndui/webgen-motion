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
        const disponibles = Object.keys(police.getInfo().fonts.normal ?? {});
        const graisses = GRAISSES.filter((graisse) => disponibles.includes(graisse));
        return police.loadFont("normal", { weights: graisses, subsets: ["latin", "latin-ext"] }).waitUntilDone();
      })
      .then(() => continueRender(attente))
      .catch((erreur: unknown) => cancelRender(erreur));
  }, [famille, attente]);

  return famille;
}
