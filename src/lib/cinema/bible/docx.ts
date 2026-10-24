import mammoth from "mammoth";

import { LONGUEUR_MAX_DE_LA_BIBLE_COLLEE } from "../assistant/types";
import { couperProprement } from "./troncature";

/**
 * Extraction du texte d'un document Word (.docx) déposé, même usage que
 * l'extraction PDF : nourrir l'import de bible sans copier-coller manuel.
 */
export type LectureDuDocx =
  | { ok: true; texte: string; tronque: boolean; longueurOriginale: number }
  | { ok: false; raison: string };

// Un .docx est un zip (signature « PK\x03\x04 ») : ça ne garantit pas que
// c'est bien un document Word valide (n'importe quel zip matche), mammoth
// refuse le reste à l'ouverture.
const SIGNATURE_ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const LONGUEUR_MIN_EXPLOITABLE = 20;

export async function extraireLeTexteDuDocx(octets: Uint8Array): Promise<LectureDuDocx> {
  if (!Buffer.from(octets.subarray(0, SIGNATURE_ZIP.length)).equals(SIGNATURE_ZIP)) {
    return { ok: false, raison: "Le fichier déposé n'est pas un document Word (.docx)." };
  }

  let texte: string;
  try {
    const resultat = await mammoth.extractRawText({ buffer: Buffer.from(octets) });
    texte = resultat.value.trim();
  } catch {
    return { ok: false, raison: "Ce fichier n'est pas un document Word valide : il ne peut pas être lu." };
  }

  if (texte.length < LONGUEUR_MIN_EXPLOITABLE) {
    return { ok: false, raison: "Ce document ne contient pas de texte exploitable." };
  }
  return { ok: true, ...couperProprement(texte, LONGUEUR_MAX_DE_LA_BIBLE_COLLEE) };
}
