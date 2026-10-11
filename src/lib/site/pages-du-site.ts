import type { LienLu } from "./lecture-du-site";

/**
 * Quelles pages capturer pour le film, à partir des liens lus. Module pur.
 * Le parcours suit le menu (l'ordre où un visiteur découvre le site) ; les
 * pages légales et de compte n'apprennent rien sur le produit.
 */
const SANS_INTERET = /(mentions|cgv|cgu|conditions|confidentialit|privacy|cookies|legal|rgpd|login|connexion|inscription|signup|compte|account|mot-de-passe|password|plan-du-site|sitemap)/i;
const PREUVE = /(panier|cart|checkout|commande|order|reserv|booking|rendez-vous|devis|contact)/i;

export type PagesChoisies = { parcours: string[]; preuve: string | null };

export function choisirLesPages(liens: LienLu[], nombre = 3): PagesChoisies {
  const utiles = liens.filter((lien) => !SANS_INTERET.test(lien.url) && !SANS_INTERET.test(lien.texte));
  const ordonnes = [...utiles.filter((l) => l.dansLeMenu), ...utiles.filter((l) => !l.dansLeMenu)];
  const preuve = ordonnes.find((l) => PREUVE.test(l.url) || PREUVE.test(l.texte))?.url ?? null;
  const parcours = ordonnes.filter((l) => l.url !== preuve).slice(0, nombre).map((l) => l.url);
  return { parcours, preuve };
}

/** Une adresse que l'on accepte d'ouvrir : http(s), complétée si on a tapé « monsite.fr ». */
export function normaliserLAdresse(saisie: string): string | null {
  const brute = saisie.trim();
  if (!brute) return null;
  const avecSchema = /^[a-z][a-z0-9+.-]*:\/\//i.test(brute) ? brute : `https://${brute}`;
  try {
    const url = new URL(avecSchema);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.href;
  } catch {
    return null;
  }
}

/** « https://www.maison.com/ » → « maison.com », telle qu'on la tape dans la barre. */
export function adresseLisible(url: string): string {
  const { hostname } = new URL(url);
  return hostname.replace(/^www\./, "");
}
