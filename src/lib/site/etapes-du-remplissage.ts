/**
 * Les grandes étapes de « Remplir depuis ton site », telles que la personne
 * les suit à l'écran. Le script annonce son étape à chaque message ; le
 * détail (« Capture de la page 3 du parcours… ») précise où il en est.
 * Module pur : partagé par le script et par l'écran.
 */
export const ETAPES_DU_REMPLISSAGE = [
  { cle: "ouverture", titre: "Ouverture du site" },
  { cle: "marque", titre: "Ta marque" },
  { cle: "captures", titre: "Captures des pages" },
  { cle: "videos", titre: "Écrans filmés" },
  { cle: "textes", titre: "Tes textes et ta série" },
] as const;

export type EtapeDuRemplissage = (typeof ETAPES_DU_REMPLISSAGE)[number]["cle"];

export function estEtapeDuRemplissage(valeur: unknown): valeur is EtapeDuRemplissage {
  return ETAPES_DU_REMPLISSAGE.some((etape) => etape.cle === valeur);
}

/** Où en est le remplissage : l'étape en cours, son détail, les aperçus déjà pris (numéros). */
export type Avancement = { etape: EtapeDuRemplissage; detail: string; apercus: number[] };

export const AVANCEMENT_DE_DEPART: Avancement = { etape: "ouverture", detail: "Démarrage…", apercus: [] };

type Evenement = { type: string; etape?: unknown; label?: unknown; numero?: unknown };

/**
 * L'avancement après un message du script. Une étape ne recule jamais : un
 * message tardif d'une étape passée ne fait que mettre le détail à jour.
 */
export function avancer(avancement: Avancement, evenement: Evenement): Avancement {
  if (evenement.type === "apercu" && typeof evenement.numero === "number") {
    if (avancement.apercus.includes(evenement.numero)) return avancement;
    return { ...avancement, apercus: [...avancement.apercus, evenement.numero] };
  }
  if (evenement.type !== "phase" || typeof evenement.label !== "string") return avancement;
  const rang = (cle: EtapeDuRemplissage) => ETAPES_DU_REMPLISSAGE.findIndex((e) => e.cle === cle);
  const annoncee = estEtapeDuRemplissage(evenement.etape) ? evenement.etape : avancement.etape;
  const etape = rang(annoncee) > rang(avancement.etape) ? annoncee : avancement.etape;
  return { ...avancement, etape, detail: evenement.label };
}

export type EtatDUneEtape = "faite" | "en-cours" | "a-venir" | "echouee";

/** L'état de chaque étape, pour la frise : `fini` les coche toutes, `echec` marque celle en cours. */
export function etatsDesEtapes(etapeCourante: EtapeDuRemplissage, issue: "en-cours" | "fini" | "echec"): EtatDUneEtape[] {
  const courant = ETAPES_DU_REMPLISSAGE.findIndex((e) => e.cle === etapeCourante);
  return ETAPES_DU_REMPLISSAGE.map((_, i) => {
    if (issue === "fini" || i < courant) return "faite";
    if (i > courant) return "a-venir";
    return issue === "echec" ? "echouee" : "en-cours";
  });
}
