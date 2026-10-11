import type { Page } from "puppeteer";

import type { CouleurLue } from "./marque-du-site";

/**
 * Ce qu'on lit d'une page ouverte dans le navigateur : de quoi deviner la
 * marque, choisir les pages à capturer et nourrir la rédaction. Les textes
 * sont bornés : on envoie à Claude un résumé, pas le site entier.
 */
export type LogoLu = { url: string; largeur: number; hauteur: number; source: "entete" | "icone" | "og" };
export type LienLu = { url: string; texte: string; dansLeMenu: boolean };

export type LectureDuSite = {
  url: string;
  titre: string;
  description: string;
  langue: string;
  nomDuSite: string;
  logos: LogoLu[];
  couleurs: CouleurLue[];
  polices: string[];
  liens: LienLu[];
  textes: { titres: string[]; paragraphes: string[]; boutons: string[]; chiffres: string[] };
};

export const LIMITES = { titres: 14, paragraphes: 18, boutons: 12, chiffres: 15, liens: 40 } as const;

export async function lireLaPage(page: Page): Promise<LectureDuSite> {
  return page.evaluate((limites) => {
    const nettoyer = (t: string | null | undefined) => (t ?? "").replace(/\s+/g, " ").trim();
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const uniques = (liste: string[], max: number) => [...new Set(liste.filter(Boolean))].slice(0, max);
    const meta = (selecteur: string) => nettoyer(document.querySelector(selecteur)?.getAttribute("content"));
    const absolu = (url: string | null | undefined) => {
      try {
        return url ? new URL(url, location.href).href : "";
      } catch {
        return "";
      }
    };

    const couleurs: { valeur: string; role: string; surface: number }[] = [];
    const aire = (el: Element) => {
      const r = el.getBoundingClientRect();
      return Math.round(r.width * r.height);
    };
    couleurs.push({ valeur: getComputedStyle(document.body).backgroundColor, role: "fond-page", surface: innerWidth * document.documentElement.scrollHeight });
    couleurs.push({ valeur: getComputedStyle(document.documentElement).backgroundColor, role: "fond-page", surface: innerWidth * document.documentElement.scrollHeight - 1 });
    for (const el of document.querySelectorAll("header, nav, [class*=header], [class*=navbar]")) {
      if (visible(el)) couleurs.push({ valeur: getComputedStyle(el).backgroundColor, role: "fond-entete", surface: aire(el) });
    }
    for (const el of [...document.querySelectorAll("section, footer, main > div")].slice(0, 40)) {
      if (visible(el)) couleurs.push({ valeur: getComputedStyle(el).backgroundColor, role: "fond-section", surface: aire(el) });
    }
    for (const el of [...document.querySelectorAll("button, a[class*=btn], a[class*=button], [role=button], input[type=submit]")].slice(0, 30)) {
      if (visible(el)) couleurs.push({ valeur: getComputedStyle(el).backgroundColor, role: "bouton", surface: aire(el) });
    }
    for (const el of [...document.querySelectorAll("main a, a")].slice(0, 30)) {
      if (visible(el)) couleurs.push({ valeur: getComputedStyle(el).color, role: "lien", surface: aire(el) });
    }
    for (const el of [...document.querySelectorAll("h1, h2")].slice(0, 10)) {
      if (visible(el)) couleurs.push({ valeur: getComputedStyle(el).color, role: "titre", surface: aire(el) });
    }
    couleurs.push({ valeur: getComputedStyle(document.body).color, role: "texte", surface: 1 });

    const titreH1 = document.querySelector("h1");
    const polices = uniques([titreH1 ? getComputedStyle(titreH1).fontFamily : "", getComputedStyle(document.body).fontFamily], 2);

    const logos: { url: string; largeur: number; hauteur: number; source: string }[] = [];
    for (const img of document.querySelectorAll<HTMLImageElement>("header img, nav img, [class*=logo] img, img[class*=logo], img[alt*=logo i]")) {
      if (img.naturalWidth > 0) logos.push({ url: absolu(img.currentSrc || img.src), largeur: img.naturalWidth, hauteur: img.naturalHeight, source: "entete" });
    }
    for (const lien of document.querySelectorAll("link[rel~=apple-touch-icon], link[rel~=icon]")) {
      logos.push({ url: absolu(lien.getAttribute("href")), largeur: 0, hauteur: 0, source: "icone" });
    }
    const og = meta('meta[property="og:image"]');
    if (og) logos.push({ url: absolu(og), largeur: 0, hauteur: 0, source: "og" });

    const ici = new URL(location.href);
    const liens: { url: string; texte: string; dansLeMenu: boolean }[] = [];
    const vus = new Set<string>();
    for (const a of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      let cible: URL;
      try {
        cible = new URL(a.href);
      } catch {
        continue;
      }
      const cle = cible.origin + cible.pathname.replace(/\/$/, "");
      if (cible.origin !== ici.origin || vus.has(cle) || cle === ici.origin + ici.pathname.replace(/\/$/, "")) continue;
      if (/\.(pdf|jpe?g|png|webp|zip|mp4)$/i.test(cible.pathname)) continue;
      vus.add(cle);
      liens.push({ url: cible.origin + cible.pathname, texte: nettoyer(a.textContent).slice(0, 60), dansLeMenu: !!a.closest("header, nav") });
      if (liens.length >= limites.liens) break;
    }

    const textesDe = (selecteur: string, min: number, max: number, nombre: number) =>
      uniques([...document.querySelectorAll(selecteur)].filter(visible).map((el) => nettoyer(el.textContent)).filter((t) => t.length >= min && t.length <= max), nombre);
    const tout = nettoyer(document.body.innerText);
    const chiffres = uniques(tout.match(/(?:\+?\d[\d\s.,]*\s?(?:€|%|k€|M€|ans|clients?|avis|commandes?|produits?|★|\/5|h|min|jours?))/gi) ?? [], limites.chiffres);

    return {
      url: location.href,
      titre: nettoyer(document.title),
      description: meta('meta[name="description"]') || meta('meta[property="og:description"]'),
      langue: (document.documentElement.lang || "").slice(0, 2).toLowerCase(),
      nomDuSite: meta('meta[property="og:site_name"]'),
      logos: logos.filter((l) => l.url),
      couleurs,
      polices,
      liens,
      textes: {
        titres: textesDe("h1, h2, h3", 3, 120, limites.titres),
        paragraphes: textesDe("p, li", 40, 300, limites.paragraphes),
        boutons: textesDe("button, a[class*=btn], a[class*=button]", 2, 40, limites.boutons),
        chiffres,
      },
    };
  }, LIMITES) as Promise<LectureDuSite>;
}
