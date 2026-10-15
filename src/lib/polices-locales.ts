import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { getAvailableFonts } from "@remotion/google-fonts";

import { type FichiersDeLaPolice, type ManifesteDePolice, facesAGarder, manifesteDeLaPolice } from "../../remotion/film/marque/police-locale";

/**
 * Garde la police du film sur l'ordinateur avant un rendu : téléchargée UNE
 * fois dans ~/.webgen-motion/polices (partagée entre les films), puis copiée
 * dans le public/ du film avec son manifeste. Le film la lit de là
 * (police.ts) : un rendu ne dépend plus de la connexion. SERVEUR SEULEMENT.
 */
export type InfoDePolice = { fichiers: FichiersDeLaPolice; plages: Record<string, string>; jeux: string[] };
export type PoliceGardee = { ok: true; telecharges: number } | { ok: false; horsLigne: boolean; raison: string };

type Options = {
  cache?: string;
  info?: (famille: string) => Promise<InfoDePolice | null>;
  telecharger?: (adresse: string) => Promise<Uint8Array>;
};

async function infoGoogle(famille: string): Promise<InfoDePolice | null> {
  const trouvee = getAvailableFonts().find((police) => police.fontFamily === famille);
  if (!trouvee) return null;
  const info = (await trouvee.load()).getInfo();
  return { fichiers: (info.fonts.normal ?? {}) as FichiersDeLaPolice, plages: info.unicodeRanges, jeux: info.subsets };
}

async function telechargerUnFichier(adresse: string): Promise<Uint8Array> {
  const reponse = await fetch(adresse, { signal: AbortSignal.timeout(20_000) });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  return new Uint8Array(await reponse.arrayBuffer());
}

export async function garderLaPolice(famille: string, dossierPublic: string, options: Options = {}): Promise<PoliceGardee> {
  const cache = options.cache ?? join(homedir(), ".webgen-motion");
  const info = await (options.info ?? infoGoogle)(famille);
  if (!info) return { ok: false, horsLigne: false, raison: `Police « ${famille} » absente de Google Fonts.` };
  const { faces, adresses } = facesAGarder(famille, info.fichiers, info.plages, info.jeux);
  if (faces.length === 0) return { ok: false, horsLigne: false, raison: `Police « ${famille} » : aucun fichier à garder.` };

  let telecharges = 0;
  for (const [fichier, adresse] of Object.entries(adresses)) {
    const enCache = join(cache, fichier);
    if (!existsSync(enCache) || statSync(enCache).size === 0) {
      try {
        const contenu = await (options.telecharger ?? telechargerUnFichier)(adresse);
        mkdirSync(dirname(enCache), { recursive: true });
        writeFileSync(enCache, contenu);
        telecharges += 1;
      } catch {
        return { ok: false, horsLigne: true, raison: `La police « ${famille} » n'a jamais été téléchargée et la connexion manque : connecte-toi une fois, elle restera ensuite sur ton ordinateur.` };
      }
    }
    const dansLeFilm = join(dossierPublic, fichier);
    mkdirSync(dirname(dansLeFilm), { recursive: true });
    copyFileSync(enCache, dansLeFilm);
  }
  const manifeste: ManifesteDePolice = { famille, faces };
  writeFileSync(join(dossierPublic, manifesteDeLaPolice(famille)), JSON.stringify(manifeste, null, 2));
  return { ok: true, telecharges };
}
