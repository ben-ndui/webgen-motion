import { join } from "node:path";

import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import type { CinemaDuFilm } from "../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../remotion/film/spec";
import { creerFilm, lireFicheBrute } from "../film-ecriture";
import { ecrireAtomiquement } from "../film-fichiers-deposes";
import { dossierJetable, ficheValide } from "../film-fixtures.test-utils";
import type { Bible } from "./bible/etat";
import { lireLaBible, modifierLaBible } from "./bible/stockage";
import type { Lieux } from "./lieux";
import type { RegistreDesPrises } from "./prises/etat";
import { lireLesPrises } from "./prises/stockage";
import { lireLeRegistre } from "./registre";
import { portraitJpeg } from "./veo-local.test-utils";

/**
 * Un film « saya » jetable pour les tests du cinéma : fiche valide aux
 * couleurs SAYA, dossiers temporaires, et le faux Google à l'adresse donnée.
 */
export type FilmDeTest = {
  lieux: Lieux;
  creer: (cinema?: CinemaDuFilm) => void;
  fiche: () => FilmSpec;
  registre: () => ReturnType<typeof lireLeRegistre>;
  prises: () => RegistreDesPrises;
  bible: () => Bible;
  // Fige une référence de la bible comme déjà validée, une image comprise.
  validerLaBiblePour: (referenceId: string) => void;
  // Pose le portrait d'Awa sur le disque ET dans la fiche, comme après sa génération.
  donnerUnPortraitAAwa: (cinema?: CinemaDuFilm) => CinemaDuFilm;
};

export function filmDeTest(baseGoogle: string): FilmDeTest {
  const racine = dossierJetable("cinema");
  const lieux: Lieux = {
    fiches: join(racine, "fiches"),
    dossier: (id) => join(racine, "films", id),
    public: (id) => join(racine, "films", id, "public"),
    veo: () => ({ base: baseGoogle, cle: "cle-de-test" }),
  };
  const creer = (cinema: CinemaDuFilm = serieSaya()) => {
    const fiche = ficheValide();
    fiche.direction = "nocturne";
    fiche.marque.couleurs = { ...fiche.marque.couleurs, encre: "#0A1A2C", clair: "#ECE4D2", accent: "#C19A42" };
    fiche.cinema = cinema;
    creerFilm("saya", fiche, lieux.fiches);
  };
  return {
    lieux,
    creer,
    fiche: () => lireFicheBrute("saya", lieux.fiches) as FilmSpec,
    registre: () => lireLeRegistre(lieux.dossier("saya")),
    prises: () => lireLesPrises(lieux.dossier("saya")),
    bible: () => lireLaBible(lieux.dossier("saya")),
    validerLaBiblePour: (referenceId) => {
      modifierLaBible(lieux.dossier("saya"), (bible) => {
        bible.references[referenceId] = {
          statut: "valide",
          vues: { face: { versions: [{ n: 1, fichier: `cinema/bible/${referenceId}/face-v1.jpg`, origine: "generee", creeeLe: "2026-10-17" }], retenue: 1 } },
          journal: [{ action: "validation", le: "2026-10-17" }],
        };
      });
    },
    donnerUnPortraitAAwa: (cinema = serieSaya()) => {
      ecrireAtomiquement(join(lieux.public("saya"), "cinema", "personnages", "awa.jpg"), portraitJpeg());
      cinema.personnages[0].portrait = "cinema/personnages/awa.jpg";
      return cinema;
    },
  };
}
