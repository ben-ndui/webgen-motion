import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { type Bible, type ReferenceDeLaSerie, ficheVisuelleDe, imageValideePourVeo } from "./bible/etat";
import type { Refus } from "./lieux";
import type { ImageDeReference } from "./veo";

/**
 * Les images de référence d'un plan, lues sur le DISQUE depuis la bible
 * visuelle validée (bible.json) : les références à l'image (personnages ou
 * éléments), dans l'ordre du plan, puis la photo du produit. SERVEUR SEULEMENT.
 */
export type PortraitsDuPlan = { ok: true; references: ImageDeReference[] } | Refus;

export function portraitsPourVeo(presentes: ReferenceDeLaSerie[], dossierPublic: string, bible: Bible, photoDuProduit?: string): PortraitsDuPlan {
  const references: ImageDeReference[] = [];
  for (const reference of presentes) {
    const fiche = ficheVisuelleDe(bible, reference);
    const image = imageValideePourVeo(fiche, reference.type);
    // Sans image validée, Veo inventerait un visage : on refuse plutôt que payer un plan faux.
    if (!image) {
      return { ok: false, statut: 409, raison: `${reference.nom} n'a pas encore d'image validée dans la bible : valide-la d'abord, sinon son visage changerait d'un plan à l'autre.` };
    }
    const chemin = join(dossierPublic, image.fichier);
    if (!existsSync(chemin)) return { ok: false, statut: 409, raison: `L'image de ${reference.nom} est citée mais absente du disque : régénère-la dans la bible.` };
    references.push({ octets: new Uint8Array(readFileSync(chemin)), mimeType: chemin.endsWith(".png") ? "image/png" : "image/jpeg" });
  }
  if (photoDuProduit) {
    const chemin = join(dossierPublic, photoDuProduit);
    // Citée mais absente : le produit serait réinventé, on refuse plutôt que payer un plan faux.
    if (!existsSync(chemin)) return { ok: false, statut: 409, raison: "La photo du produit est citée mais absente : dépose-la de nouveau." };
    references.push({ octets: new Uint8Array(readFileSync(chemin)), mimeType: chemin.endsWith(".png") ? "image/png" : "image/jpeg" });
  }
  return { ok: true, references };
}
