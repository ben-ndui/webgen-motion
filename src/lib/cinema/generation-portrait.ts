import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { Personnage } from "../../../remotion/film/cinema/types";
import { type Bible, ficheVisuelleDe, imageValideePourVeo } from "./bible/etat";
import type { Refus } from "./lieux";
import type { ImageDeReference } from "./veo";

/**
 * Les images de référence d'un plan, lues sur le DISQUE depuis la bible
 * visuelle validée (bible.json) : les personnages à l'image, dans l'ordre du
 * plan, puis la photo du produit. SERVEUR SEULEMENT.
 */
export type PortraitsDuPlan = { ok: true; references: ImageDeReference[] } | Refus;

export function portraitsPourVeo(presents: Personnage[], dossierPublic: string, bible: Bible, photoDuProduit?: string): PortraitsDuPlan {
  const references: ImageDeReference[] = [];
  for (const personnage of presents) {
    const fiche = ficheVisuelleDe(bible, { ...personnage, type: "personnage" });
    const image = imageValideePourVeo(fiche, "personnage");
    // Sans image validée, Veo inventerait un visage : on refuse plutôt que payer un plan faux.
    if (!image) {
      return { ok: false, statut: 409, raison: `${personnage.nom} n'a pas encore d'image validée dans la bible : valide-la d'abord, sinon son visage changerait d'un plan à l'autre.` };
    }
    const chemin = join(dossierPublic, image.fichier);
    if (!existsSync(chemin)) return { ok: false, statut: 409, raison: `L'image de ${personnage.nom} est citée mais absente du disque : régénère-la dans la bible.` };
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
