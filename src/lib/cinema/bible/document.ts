import { extraireLeTexteDuDocx, type LectureDuDocx } from "./docx";
import { extraireLeTexteDuPdf, type LectureDuPdf } from "./pdf";

/**
 * Reconnaît le format par signature (jamais par extension ou type MIME
 * déclarés par le client) et route vers l'extracteur correspondant.
 */
export type LectureDuDocument = LectureDuPdf | LectureDuDocx;

const SIGNATURE_PDF = Buffer.from("%PDF-", "ascii");
const SIGNATURE_ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

function signatureEgale(octets: Uint8Array, signature: Buffer): boolean {
  return Buffer.from(octets.subarray(0, signature.length)).equals(signature);
}

export async function extraireLeTexteDuDocument(octets: Uint8Array): Promise<LectureDuDocument> {
  if (signatureEgale(octets, SIGNATURE_PDF)) return extraireLeTexteDuPdf(octets);
  if (signatureEgale(octets, SIGNATURE_ZIP)) return extraireLeTexteDuDocx(octets);
  return { ok: false, raison: "Format non reconnu : dépose un PDF ou un document Word (.docx)." };
}
