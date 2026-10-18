/**
 * Runner des FORMATS du catalogue (explainer, conte, karaoké) : rend une
 * déclinaison d'un projet `<id>.json` = { format, spec } avec la composition
 * du même nom (remotion/film/CompositionsDesFormats.tsx).
 *
 *   npx tsx scripts/render-format.ts --id mon-explainer [--declinaison Explainer-FR]
 *
 * Sans `--declinaison`, rend toutes celles du projet. Tout se vérifie avant
 * le premier rendu (src/lib/formats/format-rendu.ts, partagé avec la route) :
 * projet valide, plus le contenu d'exemple, médias présents, et pour un
 * karaoké des paroles qui ne viennent pas du brouillon de whisper.
 */
import { isFeatureEnabled } from "../src/lib/edition";
import { estNomSur } from "../src/lib/film-store";
import { CATALOGUE } from "../src/lib/formats/catalogue";
import { chargerProjet } from "../src/lib/formats/format-loader";
import { type RenduDeFormatPrepare, preparerRenduDeFormat } from "../src/lib/formats/format-rendu";
import { garderLaPolice } from "../src/lib/polices-locales";
import { argument, arreter, navigateur, rendre } from "./lib/rendu-remotion";

async function principal(): Promise<void> {
  const id = argument("--id");
  if (!estNomSur(id)) arreter("Usage : render-format.ts --id <id> [--declinaison <nom>]");
  // Même licence que le film de marque : les formats sont des rendus Studio.
  if (!isFeatureEnabled("film-de-marque")) {
    arreter("Le rendu des formats est une feature Studio Edition. Active ta license (.license) ou, en dev : WEBGEN_MOTION_EDITION=studio");
  }
  const projet = chargerProjet(id);
  if (!projet) arreter(`Rendu refusé : projet introuvable (${id}).`);
  if (projet.etat === "invalide") arreter(`Rendu refusé, projet invalide (${id}) :\n  - ${projet.erreurs.join("\n  - ")}`);

  const demandee = argument("--declinaison");
  const noms = demandee !== undefined ? [demandee] : projet.fiche.spec.declinaisons.map((declinaison) => declinaison.nom);
  const rendus: RenduDeFormatPrepare[] = [];
  for (const nom of noms) {
    const preparation = preparerRenduDeFormat(id, nom);
    if (!preparation.ok) arreter(`Rendu refusé (${id} · ${nom}) :\n  - ${preparation.erreurs.join("\n  - ")}`);
    rendus.push(preparation);
  }

  const famille = projet.fiche.spec.marque.police;
  const police = await garderLaPolice(famille, rendus[0]!.dossierPublic);
  if (!police.ok && police.horsLigne) arreter(police.raison);
  console.log(police.ok ? `  Police : ${famille}, sur l'ordinateur` : `  Police : ${police.raison}`);

  const cheminNavigateur = await navigateur();
  for (const rendu of rendus) {
    const { declinaison } = rendu;
    await rendre(
      {
        composition: rendu.composition,
        props: { spec: rendu.spec, declinaison },
        dossierPublic: rendu.dossierPublic,
        dossierDeSortie: rendu.dossierDeSortie,
        sortie: rendu.sortie,
        partiel: rendu.partiel,
        verrou: rendu.verrou,
        nom: declinaison.nom,
        entete: `▶ ${CATALOGUE[rendu.format].libelle} ${declinaison.nom} (${declinaison.langue}, ${declinaison.version})`,
      },
      cheminNavigateur,
    );
  }
}

principal().catch((erreur: unknown) => arreter(`Rendu en échec : ${(erreur as Error).message}`));
