import { LIEUX_PAR_DEFAUT, type Lieux, type Refus, ficheAvecCinema } from "../lieux";
import { type FicheVisuelle, type TypeDeReference, type VueDeReference, ficheVisuelleDe, trouverLaReference } from "./etat";
import { choisirLaPrincipale, deverrouillerLaReference, revenirAUneVersion, validerLaReference } from "./gestes";
import { modifierLaBible } from "./stockage";

/**
 * Les gestes de la bible qui ne parlent pas à Google : choisir une version,
 * la vue principale, valider, déverrouiller. Résolvent la référence dans la
 * fiche du film, puis appliquent le geste sous le verrou de bible.json.
 * SERVEUR SEULEMENT.
 */
export type ReponseDeBible = { ok: true } | Refus;

function agirSurLaReference(id: string, referenceId: string, partiel: Partial<Lieux>, geste: (fiche: FicheVisuelle, type: TypeDeReference) => string | null): ReponseDeBible {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = ficheAvecCinema(id, lieux);
  if (!lecture.ok) return lecture;
  const reference = trouverLaReference(lecture.cinema, referenceId);
  if (!reference) return { ok: false, statut: 404, raison: `La référence « ${referenceId} » n'existe pas dans ce film.` };
  const erreur = modifierLaBible(lieux.dossier(id), (bible) => {
    const fiche = (bible.references[referenceId] ??= ficheVisuelleDe(bible, reference));
    return geste(fiche, reference.type);
  });
  return erreur ? { ok: false, statut: 409, raison: erreur } : { ok: true };
}

export function retenirUneVersionDeLaBible(id: string, referenceId: string, vue: VueDeReference, n: number, partiel: Partial<Lieux> = {}): ReponseDeBible {
  return agirSurLaReference(id, referenceId, partiel, (fiche) => revenirAUneVersion(fiche, vue, n));
}

export function choisirLaVuePrincipaleDeLaBible(id: string, referenceId: string, vue: VueDeReference, partiel: Partial<Lieux> = {}): ReponseDeBible {
  return agirSurLaReference(id, referenceId, partiel, (fiche, type) => choisirLaPrincipale(fiche, type, vue));
}

export function validerUneReferenceDeLaBible(id: string, referenceId: string, partiel: Partial<Lieux> = {}): ReponseDeBible {
  return agirSurLaReference(id, referenceId, partiel, (fiche, type) => validerLaReference(fiche, type, new Date().toISOString()));
}

export function deverrouillerUneReferenceDeLaBible(id: string, referenceId: string, motif: string, partiel: Partial<Lieux> = {}): ReponseDeBible {
  return agirSurLaReference(id, referenceId, partiel, (fiche) => deverrouillerLaReference(fiche, motif, new Date().toISOString()));
}
