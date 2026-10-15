import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { getAvailableFonts } from "@remotion/google-fonts";

import { type FichiersDeLaPolice, GRAISSES, type ManifesteDePolice, jeuxDeCaracteres, manifesteDeLaPolice } from "./police-locale";

export { jeuxDeCaracteres } from "./police-locale";

/**
 * La police gardée sur l'ordinateur (posée dans public/ par le script de
 * rendu) : déclarée face par face, sans toucher au réseau. Rend faux si elle
 * n'a jamais été téléchargée.
 */
async function chargerLaPoliceLocale(famille: string): Promise<boolean> {
  const reponse = await fetch(staticFile(manifesteDeLaPolice(famille))).catch(() => null);
  if (!reponse?.ok) return false;
  const manifeste = (await reponse.json()) as ManifesteDePolice;
  if (manifeste.famille !== famille || manifeste.faces.length === 0) return false;
  await Promise.all(
    manifeste.faces.map(async (face) => {
      const police = new FontFace(famille, `url(${staticFile(face.fichier)}) format("woff2")`, { weight: face.graisse, unicodeRange: face.plage || undefined });
      document.fonts.add(await police.load());
    }),
  );
  return true;
}

/** Le secours : Google Fonts, qui demande une connexion pendant le rendu. */
async function chargerDepuisGoogle(famille: string): Promise<void> {
  const trouvee = getAvailableFonts().find((police) => police.fontFamily === famille);
  if (!trouvee) throw new Error(`Police « ${famille} » absente de Google Fonts : corriger marque.police.`);
  const police = await trouvee.load();
  const info = police.getInfo();
  const fichiers = (info.fonts.normal ?? {}) as FichiersDeLaPolice;
  const graisses = GRAISSES.filter((graisse) => graisse in fichiers);
  const subsets = jeuxDeCaracteres(fichiers, graisses, info.subsets);
  await police.loadFont("normal", { weights: graisses, subsets }).waitUntilDone();
}

/**
 * Charge la police du film PAR SON NOM (celui de la fiche), et retient le
 * rendu tant qu'elle n'est pas prête : sans `delayRender`, les premières
 * images partiraient dans la police de secours du navigateur.
 *
 * D'abord la copie gardée sur l'ordinateur : une coupure de connexion en
 * plein rendu faisait échouer tout le film (15/10/2026). Google Fonts ne
 * sert que si la police n'a jamais été téléchargée (aperçu, Remotion Studio).
 * Le chargement est dynamique parce que la police est une DONNÉE : un import
 * statique (`@remotion/google-fonts/Jost`) figerait la marque dans le code.
 */
export function usePolice(famille: string): string {
  const [attente] = useState(() => delayRender(`Police « ${famille} »`));

  useEffect(() => {
    // Une copie locale abîmée ne doit pas bloquer le film : on retombe sur Google.
    chargerLaPoliceLocale(famille)
      .catch(() => false)
      .then((locale) => (locale ? undefined : chargerDepuisGoogle(famille)))
      .then(() => continueRender(attente))
      .catch((erreur: unknown) => cancelRender(erreur));
  }, [famille, attente]);

  return famille;
}
