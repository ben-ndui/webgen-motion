import { InvalidPDFException, PasswordException, PDFParse } from "pdf-parse";

import { LONGUEUR_MAX_DE_LA_BIBLE_COLLEE } from "../assistant/types";

/**
 * Extraction du texte d'un PDF déposé, pour nourrir l'import de bible sans
 * passer par le copier-coller manuel. `tronque` dit à l'écran que le texte a
 * été coupé (jamais en silence — la charte l'interdit) ; `longueurOriginale`
 * lui permet de l'afficher.
 */
export type LectureDuPdf =
  | { ok: true; texte: string; tronque: boolean; longueurOriginale: number }
  | { ok: false; raison: string };

const SIGNATURE_PDF = Buffer.from("%PDF-", "ascii");
const LONGUEUR_MIN_EXPLOITABLE = 20;
// Un PDF à la structure dégénérée (des milliers de pages) ferait tourner
// pdf.js longtemps sur le serveur local de la personne : mieux vaut refuser
// que ralentir le reste de GEN MOTION pendant la lecture. Une bible de
// production tient très large en dessous.
const PAGES_MAX = 500;

function raisonDeLException(erreur: unknown): string {
  if (erreur instanceof PasswordException) return "Ce PDF est protégé par un mot de passe : retire la protection avant de le déposer.";
  if (erreur instanceof InvalidPDFException) return "Ce fichier PDF est abîmé ou mal formé : il ne peut pas être lu.";
  return `Le PDF n'a pas pu être lu : ${(erreur as Error).message}`;
}

// Coupe sur la dernière fin de paragraphe avant la limite ; à défaut, sur la
// dernière fin de ligne ; seulement à défaut des deux, en plein texte. Les
// deux premiers cas ne s'appliquent que si le repère est assez proche de la
// limite (pas dans la première moitié du texte).
function couperProprement(texte: string, limite: number): string {
  if (texte.length <= limite) return texte;
  const coupe = texte.slice(0, limite);
  const dernierParagraphe = coupe.lastIndexOf("\n\n");
  if (dernierParagraphe > limite * 0.5) return coupe.slice(0, dernierParagraphe);
  const derniereLigne = coupe.lastIndexOf("\n");
  if (derniereLigne > limite * 0.5) return coupe.slice(0, derniereLigne);
  return coupe;
}

export async function extraireLeTexteDuPdf(octets: Uint8Array): Promise<LectureDuPdf> {
  if (!Buffer.from(octets.subarray(0, SIGNATURE_PDF.length)).equals(SIGNATURE_PDF)) {
    return { ok: false, raison: "Le fichier déposé n'est pas un PDF." };
  }

  const lecteur = new PDFParse({ data: octets });
  try {
    const info = await lecteur.getInfo();
    if (info.total > PAGES_MAX) {
      return { ok: false, raison: `Ce PDF a trop de pages (${info.total}) : limite ${PAGES_MAX}.` };
    }

    // `pageJoiner` remplace le repère « -- N of M -- » que pdf-parse insère
    // par défaut entre les pages : un simple retrait par regex risquerait
    // d'effacer un vrai « -- 3 of 12 -- » écrit dans le document lui-même.
    const resultat = await lecteur.getText({ pageJoiner: "\n\n" });
    const texte = resultat.text.trim();
    if (texte.length < LONGUEUR_MIN_EXPLOITABLE) {
      return { ok: false, raison: "Ce PDF ne contient pas de texte exploitable : vérifie qu'il n'est pas composé d'images scannées." };
    }

    const coupe = couperProprement(texte, LONGUEUR_MAX_DE_LA_BIBLE_COLLEE);
    return { ok: true, texte: coupe, tronque: coupe.length < texte.length, longueurOriginale: texte.length };
  } catch (erreur) {
    return { ok: false, raison: raisonDeLException(erreur) };
  } finally {
    try {
      await lecteur.destroy();
    } catch {
      // Le texte est déjà renvoyé (ou l'erreur déjà formée) : un nettoyage
      // qui échoue ne doit pas faire échouer la réponse à sa place.
    }
  }
}
