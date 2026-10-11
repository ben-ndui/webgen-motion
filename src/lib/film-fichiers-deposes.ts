import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Reconnaître ce qu'une personne a déposé, d'après son CONTENU et pas son
 * nom (un .png peut être un JPEG), et l'écrire sans jamais laisser un fichier
 * à moitié copié sous le nom attendu par le rendu. Module serveur.
 */

export type GenreDImage = "png" | "jpeg" | "webp" | "svg";

function commencePar(octets: Uint8Array, signature: number[], decalage = 0): boolean {
  return signature.every((octet, i) => octets[decalage + i] === octet);
}

export function genreDImage(octets: Uint8Array): GenreDImage | null {
  if (commencePar(octets, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (commencePar(octets, [0xff, 0xd8, 0xff])) return "jpeg";
  if (commencePar(octets, [0x52, 0x49, 0x46, 0x46]) && commencePar(octets, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  const debut = new TextDecoder().decode(octets.slice(0, 1024)).trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(debut)) return "svg";
  return null;
}

export type GenreDeVideo = "mp4" | "webm";

/** MP4 et MOV (boîte « ftyp »), ou WebM (en-tête EBML) ; `null` sinon. */
export function genreDeVideo(octets: Uint8Array): GenreDeVideo | null {
  if (commencePar(octets, [0x66, 0x74, 0x79, 0x70], 4)) return "mp4";
  if (commencePar(octets, [0x1a, 0x45, 0xdf, 0xa3])) return "webm";
  return null;
}

/** Largeur / hauteur d'un PNG (en-tête IHDR) ou d'un SVG (viewBox, sinon width/height). */
export function rapportDeLImage(octets: Uint8Array, genre: GenreDImage): number | null {
  if (genre === "png" && octets.length >= 24) {
    const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
    const largeur = vue.getUint32(16);
    const hauteur = vue.getUint32(20);
    return largeur > 0 && hauteur > 0 ? largeur / hauteur : null;
  }
  if (genre === "svg") {
    const texte = new TextDecoder().decode(octets);
    const boite = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(texte);
    const largeur = Number(boite?.[1] ?? /\swidth\s*=\s*["']([\d.]+)/i.exec(texte)?.[1]);
    const hauteur = Number(boite?.[2] ?? /\sheight\s*=\s*["']([\d.]+)/i.exec(texte)?.[1]);
    return largeur > 0 && hauteur > 0 ? largeur / hauteur : null;
  }
  return null;
}

const EXTENSIONS_AUDIO = ["mp3", "m4a", "wav", "aac", "ogg"] as const;

/** L'extension audio d'un nom de fichier, si elle fait partie des formats lus. */
export function extensionAudio(nom: string): (typeof EXTENSIONS_AUDIO)[number] | null {
  const extension = nom.split(".").pop()?.toLowerCase() ?? "";
  return (EXTENSIONS_AUDIO as readonly string[]).includes(extension) ? (extension as (typeof EXTENSIONS_AUDIO)[number]) : null;
}

/** « Summer House (Remix).mp3 » → « summer-house-remix » ; jamais vide. */
export function nomDeFichierSur(nom: string): string {
  const base = nom.replace(/\.[^.]*$/, "");
  const sur = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return sur || "fichier";
}

/** Écrit dans un temporaire voisin puis renomme : tout ou rien. */
export function ecrireAtomiquement(chemin: string, octets: Uint8Array): void {
  mkdirSync(dirname(chemin), { recursive: true });
  const temporaire = `${chemin}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporaire, octets);
  renameSync(temporaire, chemin);
}
