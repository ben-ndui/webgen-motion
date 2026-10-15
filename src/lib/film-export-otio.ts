import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { IMAGES_PAR_SECONDE, placerLesPlans } from "../../remotion/film/lib/tempo";
import { voixPlacees } from "../../remotion/film/lib/voix-placees";
import { FONDU_FINAL, type IdDePlan, MONTAGES, dureeDuFilm } from "../../remotion/film/montages";
import { reperesDuFilm } from "../../remotion/film/reperes";
import { LIEUX_PAR_DEFAUT, type Lieux, type Refus } from "./cinema/lieux";
import { chargerFilm } from "./film-loader";
import { fichiersDuRendu } from "./film-store";
import { probeDurationSec } from "./otio/export-otio";
import { timelineDuFilm } from "./otio/otio-film";

export type ExportDuFilm = { ok: true; chemin: string; nomDuFichier: string };

type LieuxDuFilm = Pick<Lieux, "fiches" | "dossier" | "public">;
type Sonde = (chemin: string) => number | null;

// Le nom d'un plan tel que le monteur le lira sur sa timeline.
const NOMS_DES_PLANS: Record<IdDePlan, string> = {
  ouverture: "L'ouverture",
  probleme: "Le problème",
  bascule: "La bascule",
  parcours: "Le parcours",
  evenement: "L'événement",
  marque: "La marque",
  fin: "La fin",
};

/**
 * Écrit `out/<déclinaison>.otio` : le film de marque découpé par plans, sa
 * voix off et sa musique, à ouvrir dans DaVinci Resolve ou Premiere. Le film
 * doit avoir été rendu : sa piste image découpe ce rendu.
 */
export function exporterLeFilmEnOtio(
  id: string,
  nomDeDeclinaison: string,
  partiel: Partial<LieuxDuFilm> = {},
  sonder: Sonde = probeDurationSec,
): ExportDuFilm | Refus {
  const lieux: LieuxDuFilm = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const fiche = chargerFilm(id, lieux.fiches);
  if (!fiche) return { ok: false, statut: 404, raison: "Film introuvable" };
  if (fiche.etat === "invalide") return { ok: false, statut: 409, raison: "La fiche du film a des erreurs : corrige-les d'abord." };
  const spec = fiche.spec;
  const declinaison = spec.declinaisons.find((d) => d.nom === nomDeDeclinaison);
  if (!declinaison) return { ok: false, statut: 404, raison: `Déclinaison « ${nomDeDeclinaison} » introuvable.` };

  const dossierDeSortie = join(lieux.dossier(id), "out");
  const rendu = fichiersDuRendu(dossierDeSortie, declinaison.nom, "film").livrable;
  if (!existsSync(rendu)) return { ok: false, statut: 409, raison: `Rends d'abord « ${declinaison.nom} » : la timeline découpe le rendu du film.` };

  const tempo = spec.musique.tempo;
  const montage = MONTAGES[declinaison.version];
  const places = placerLesPlans(montage.plans, tempo);
  const dossierPublic = lieux.public(id);
  const lignes = spec.voix?.lignes[declinaison.langue] ?? [];
  const voix = voixPlacees(lignes, reperesDuFilm(spec, declinaison.langue), places, tempo, IMAGES_PAR_SECONDE);
  const voixAbsente = voix.find((v) => !existsSync(join(dossierPublic, v.fichier)));
  if (voixAbsente) return { ok: false, statut: 409, raison: `La voix « ${voixAbsente.repere} » manque sur le disque : régénère la voix off.` };

  const cheminDeLaMusique = join(dossierPublic, spec.musique.fichier);
  const timeline = timelineDuFilm({
    nom: declinaison.nom,
    fps: IMAGES_PAR_SECONDE,
    duree: dureeDuFilm(declinaison.version, tempo),
    plans: places.map((plan) => ({ nom: NOMS_DES_PLANS[plan.id], debut: plan.debut, duree: plan.duree, glissement: montage.glissements.has(plan.id) })),
    rendu: { chemin: rendu, dureeSec: sonder(rendu) },
    repliques: voix.map((v) => {
      const chemin = join(dossierPublic, v.fichier);
      const texte = lignes.find((ligne) => ligne.repere === v.repere)?.texte ?? v.repere;
      return { chemin, dureeSec: sonder(chemin), texte, debut: v.debut, fin: v.fin };
    }),
    musique: existsSync(cheminDeLaMusique)
      ? {
          chemin: cheminDeLaMusique,
          dureeSec: sonder(cheminDeLaMusique),
          premierTempsSec: spec.musique.premierTemps,
          volume: spec.musique.volume ?? 1,
          sousLaVoix: spec.voix?.musiqueSousLaVoix ?? 1,
          fondu: FONDU_FINAL,
        }
      : null,
  });

  const nomDuFichier = `${declinaison.nom}.otio`;
  const chemin = join(dossierDeSortie, nomDuFichier);
  mkdirSync(dossierDeSortie, { recursive: true });
  writeFileSync(chemin, JSON.stringify(timeline, null, 2));
  return { ok: true, chemin, nomDuFichier };
}
