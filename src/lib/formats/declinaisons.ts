import type { DeclinaisonDuFilm, Langue, VersionDuFilm } from "../../../remotion/film/spec";
import { CATALOGUE, type NomDeFormat } from "./catalogue";

const LANGUES: Langue[] = ["fr", "en"];
const VERSIONS: VersionDuFilm[] = ["long", "court"];

/** Le nom d'une déclinaison : « Explainer-FR », « Explainer-Court-FR ». */
export function nomDeDeclinaison(format: NomDeFormat, langue: Langue, version: VersionDuFilm): string {
  const base = CATALOGUE[format].composition;
  return version === "court" ? `${base}-Court-${langue.toUpperCase()}` : `${base}-${langue.toUpperCase()}`;
}

export function languesDesDeclinaisons(declinaisons: DeclinaisonDuFilm[]): Langue[] {
  return LANGUES.filter((langue) => declinaisons.some((d) => d.langue === langue));
}

export function versionsDesDeclinaisons(declinaisons: DeclinaisonDuFilm[]): VersionDuFilm[] {
  return VERSIONS.filter((version) => declinaisons.some((d) => d.version === version));
}

/**
 * Les déclinaisons pour ces langues et ces formats, dans un ordre stable. Une
 * déclinaison qui reste garde ses réglages ; tout retirer est refusé (rien).
 */
export function changerLesDeclinaisons(
  format: NomDeFormat,
  actuelles: DeclinaisonDuFilm[],
  langues: Langue[],
  versions: VersionDuFilm[],
): DeclinaisonDuFilm[] {
  if (langues.length === 0 || versions.length === 0) return actuelles;
  const anciennes = new Map(actuelles.map((d) => [d.nom, d]));
  return VERSIONS.filter((v) => versions.includes(v)).flatMap((version) =>
    LANGUES.filter((l) => langues.includes(l)).map((langue) => {
      const nom = nomDeDeclinaison(format, langue, version);
      return anciennes.get(nom) ?? { nom, langue, version, avecContact: true };
    }),
  );
}
