import { FILM } from "../../remotion/film/film";
import {
  DIRECTIONS,
  type DeclinaisonDuFilm,
  type DirectionDuFilm,
  type FilmSpec,
  type Langue,
  LANGUES,
  type VersionDuFilm,
} from "../../remotion/film/spec";

/**
 * La fiche d'un NOUVEAU film, à partir des quelques choix de la fenêtre
 * « Nouveau film » : le reste vient du modèle du gabarit, dont chaque texte
 * dit ce qu'il doit devenir. Elle naît `exemple: true` : le rendu la refuse
 * tant que ses textes n'ont pas été écrits (voir `textesEncoreExemple`).
 * Module pur.
 */
export type ChoixDeDepart = {
  nom: string;
  langues: Langue[];
  formats: VersionDuFilm[];
  direction: DirectionDuFilm;
};

export const LONGUEUR_MAX_DU_NOM = 40;
const VERSIONS: readonly VersionDuFilm[] = ["long", "court"];

export function problemesDuChoix(choix: Partial<ChoixDeDepart>): string[] {
  const problemes: string[] = [];
  const nom = typeof choix.nom === "string" ? choix.nom.trim() : "";
  if (!nom) problemes.push("Donne un nom à ton film");
  if (nom.length > LONGUEUR_MAX_DU_NOM) problemes.push(`Le nom tient en ${LONGUEUR_MAX_DU_NOM} caractères`);
  if (nom && !idDepuisNom(nom)) problemes.push("Le nom doit contenir au moins une lettre ou un chiffre");
  const langues = Array.isArray(choix.langues) ? choix.langues : [];
  if (langues.length === 0 || !langues.every((l) => LANGUES.includes(l))) problemes.push("Choisis au moins une langue");
  const formats = Array.isArray(choix.formats) ? choix.formats : [];
  if (formats.length === 0 || !formats.every((f) => VERSIONS.includes(f))) problemes.push("Choisis au moins un format");
  if (!DIRECTIONS.includes(choix.direction as DirectionDuFilm)) problemes.push("Choisis un style");
  return problemes;
}

/** « Maison Saya » → « maison-saya » : l'id sert de nom de fichier. */
export function idDepuisNom(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LONGUEUR_MAX_DU_NOM);
}

const NOM_DU_FORMAT: Record<VersionDuFilm, string> = { long: "Film", court: "Court" };

function declinaisons(langues: Langue[], formats: VersionDuFilm[]): DeclinaisonDuFilm[] {
  return formats.flatMap((version) =>
    langues.map((langue) => ({ nom: `${NOM_DU_FORMAT[version]}-${langue.toUpperCase()}`, langue, version, avecContact: true })),
  );
}

export function ficheDeDepart(choix: ChoixDeDepart): FilmSpec {
  const fiche = structuredClone(FILM);
  const nom = choix.nom.trim();
  fiche.exemple = true;
  fiche.direction = choix.direction;
  fiche.marque.logo = { type: "motSymbole", texte: nom, graisse: 600, approche: -0.03 };
  fiche.marque.contact = "";
  for (const langue of LANGUES) fiche.textes[langue].dossierDesEcrans = `ecrans-${langue}`;
  fiche.declinaisons = declinaisons(choix.langues, choix.formats);
  return fiche;
}

/** Les langues réellement rendues : celles des déclinaisons. */
export function languesDuFilm(fiche: FilmSpec): Langue[] {
  return LANGUES.filter((langue) => fiche.declinaisons.some((d) => d.langue === langue));
}

type TexteAEcrire = { langue: Langue; champ: string };

/**
 * Les textes encore identiques au modèle, dans les langues rendues : tant
 * qu'il en reste, le film dirait « Le vrai chiffre. » à la place du sien.
 */
export function textesEncoreExemple(fiche: FilmSpec): TexteAEcrire[] {
  const restants: TexteAEcrire[] = [];
  for (const langue of languesDuFilm(fiche)) {
    const modele = FILM.textes[langue];
    const texte = fiche.textes[langue];
    const paires: [string, string, string][] = [
      ["bascule.constat", texte.bascule.constat, modele.bascule.constat],
      ["bascule.chiffre", texte.bascule.chiffre, modele.bascule.chiffre],
      ["bascule.signature", texte.bascule.signature, modele.bascule.signature],
      ["evenement.chute", texte.evenement.chute, modele.evenement.chute],
      ["fin.disponible", texte.fin.disponible, modele.fin.disponible],
      ...texte.parcours.map((v, i): [string, string, string] => [`parcours.${i}`, v, modele.parcours[i] ?? ""]),
      ...texte.probleme.messages.map((m, i): [string, string, string] => [
        `probleme.messages.${i}`,
        m.texte,
        modele.probleme.messages[i]?.texte ?? (langue === "fr" ? "Un message" : "A message"),
      ]),
      ...texte.marque.mots.map((v, i): [string, string, string] => [`marque.mots.${i}`, v, modele.marque.mots[i] ?? ""]),
    ];
    if (texte.bibliotheque && modele.bibliotheque) {
      paires.push(
        ["bibliotheque.mot", texte.bibliotheque.mot, modele.bibliotheque.mot],
        ["bibliotheque.anneau", texte.bibliotheque.anneau, modele.bibliotheque.anneau],
        ["bibliotheque.signature", texte.bibliotheque.signature, modele.bibliotheque.signature],
        ...texte.bibliotheque.legendesEventail.map((v, i): [string, string, string] => [
          `bibliotheque.legendesEventail.${i}`,
          v,
          modele.bibliotheque?.legendesEventail[i] ?? "",
        ]),
      );
    }
    if (fiche.bibliotheque && FILM.bibliotheque) {
      paires.push(["bibliotheque.adresse", fiche.bibliotheque.adresse, FILM.bibliotheque.adresse]);
    }
    for (const [champ, valeur, exemple] of paires) {
      if (valeur.trim() === exemple.trim()) restants.push({ langue, champ });
    }
  }
  return restants;
}
