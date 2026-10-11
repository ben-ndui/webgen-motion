import { FILM } from "../../../remotion/film/film";
import type { FilmSpec, Langue } from "../../../remotion/film/spec";
import { paletteDuFilm } from "../film-palette";
import type { MarqueDevinee } from "./marque-du-site";
import type { HistoireProposee } from "./redaction-proposee";

/**
 * Poser dans la fiche ce que GEN MOTION a lu et ce que Claude propose. Module
 * pur. Règle : on ne remplace QUE ce qui est encore l'exemple du modèle ;
 * ce que la personne a déjà écrit n'est jamais écrasé. Chaque valeur posée
 * est notée dans `propositions` (clé « fr:bascule.constat », « marque.police »…)
 * pour que l'assistant l'affiche « Proposé, à vérifier ».
 */
export type Propositions = Record<string, string>;

type Ecriture = { cle: string; actuel: string; exemple: string; propose: string | undefined; poser: (v: string) => void };

function poserSiExemple(ecritures: Ecriture[], propositions: Propositions): void {
  for (const { cle, actuel, exemple, propose, poser } of ecritures) {
    if (propose === undefined || actuel.trim() !== exemple.trim()) continue;
    poser(propose);
    propositions[cle] = propose;
  }
}

function histoire(fiche: FilmSpec, langue: Langue, h: HistoireProposee, propositions: Propositions): void {
  const t = fiche.textes[langue];
  const m = FILM.textes[langue];
  const cle = (champ: string) => `${langue}:${champ}`;
  const e: Ecriture[] = [
    { cle: cle("bascule.constat"), actuel: t.bascule.constat, exemple: m.bascule.constat, propose: h.constat, poser: (v) => { t.bascule.constat = v; } },
    { cle: cle("bascule.chiffre"), actuel: t.bascule.chiffre, exemple: m.bascule.chiffre, propose: h.chiffre, poser: (v) => { t.bascule.chiffre = v; } },
    { cle: cle("bascule.signature"), actuel: t.bascule.signature, exemple: m.bascule.signature, propose: h.promesse, poser: (v) => { t.bascule.signature = v; } },
    { cle: cle("evenement.chute"), actuel: t.evenement.chute, exemple: m.evenement.chute, propose: h.momentCle, poser: (v) => { t.evenement.chute = v; } },
    { cle: cle("fin.disponible"), actuel: t.fin.disponible, exemple: m.fin.disponible, propose: h.ouTrouver, poser: (v) => { t.fin.disponible = v; } },
    ...t.parcours.map((v, i): Ecriture => ({ cle: cle(`parcours.${i}`), actuel: v, exemple: m.parcours[i] ?? "", propose: h.parcours?.[i], poser: (x) => { t.parcours[i] = x; } })),
    ...t.marque.mots.map((v, i): Ecriture => ({ cle: cle(`marque.mots.${i}`), actuel: v, exemple: m.marque.mots[i] ?? "", propose: h.troisMots?.[i], poser: (x) => { t.marque.mots[i] = x; } })),
  ];
  if (t.bibliotheque && m.bibliotheque) {
    const b = t.bibliotheque;
    const mb = m.bibliotheque;
    e.push(
      { cle: cle("bibliotheque.mot"), actuel: b.mot, exemple: mb.mot, propose: h.motSignature, poser: (v) => { b.mot = v; } },
      { cle: cle("bibliotheque.anneau"), actuel: b.anneau, exemple: mb.anneau, propose: h.anneau, poser: (v) => { b.anneau = v; } },
      { cle: cle("bibliotheque.signature"), actuel: b.signature, exemple: mb.signature, propose: h.signature, poser: (v) => { b.signature = v; } },
      ...b.legendesEventail.map((v, i): Ecriture => ({ cle: cle(`bibliotheque.legendesEventail.${i}`), actuel: v, exemple: mb.legendesEventail[i] ?? "", propose: h.legendes?.[i], poser: (x) => { b.legendesEventail[i] = x; } })),
    );
  }
  poserSiExemple(e, propositions);

  // La conversation : remplacée en bloc, et seulement si elle n'a pas été touchée.
  const intacte = t.probleme.messages.length === m.probleme.messages.length && t.probleme.messages.every((msg, i) => msg.texte === m.probleme.messages[i]?.texte);
  if (h.conversation && intacte) {
    const [premier, ...suite] = h.conversation;
    if (premier) {
      t.probleme.messages = [premier, ...suite];
      h.conversation.forEach((msg, i) => { propositions[cle(`probleme.messages.${i}`)] = msg.texte; });
    }
  }
}

export type CeQuiAEteLu = {
  marque: MarqueDevinee;
  adresse: string;
  histoires: Partial<Record<Langue, HistoireProposee>>;
};

export function remplirLaFiche(entree: FilmSpec, lu: CeQuiAEteLu, deja: Propositions = {}): { fiche: FilmSpec; propositions: Propositions } {
  const fiche = structuredClone(entree);
  const propositions: Propositions = { ...deja };
  const modele = FILM.marque;

  const couleursIntactes = (["encre", "clair", "accent"] as const).every((c) => fiche.marque.couleurs[c] === modele.couleurs[c]);
  if (couleursIntactes) {
    fiche.marque.couleurs = paletteDuFilm({ encre: lu.marque.encre, clair: lu.marque.clair, accent: lu.marque.accent });
    propositions["marque.couleurs"] = [lu.marque.encre, lu.marque.clair, lu.marque.accent].join(" ");
  }
  if (lu.marque.police && fiche.marque.police === modele.police) {
    fiche.marque.police = lu.marque.police;
    propositions["marque.police"] = lu.marque.police;
  }
  if (!fiche.marque.contact.trim()) {
    fiche.marque.contact = lu.adresse;
    propositions["marque.contact"] = lu.adresse;
  }
  if (fiche.bibliotheque && FILM.bibliotheque && fiche.bibliotheque.adresse === FILM.bibliotheque.adresse) {
    fiche.bibliotheque.adresse = lu.adresse;
    propositions["bibliotheque.adresse"] = lu.adresse;
  }
  for (const [langue, h] of Object.entries(lu.histoires) as [Langue, HistoireProposee][]) {
    if (h) histoire(fiche, langue, h, propositions);
  }
  return { fiche, propositions };
}
