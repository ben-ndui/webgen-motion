#!/usr/bin/env node
/**
 * Recette des pages PUBLIQUES, sur l'URL réellement servie.
 *
 * ─── Pourquoi ce script existe ────────────────────────────────────────────
 * Le site Makii est parti en production avec six emplacements photo vides et
 * un témoignage de commerçant INVENTÉ sur la page qui sert à recruter les
 * commerçants. Typecheck, lint, 383 tests, build, déploiement : tout était
 * vert. Aucun de ces outils n'ouvre une page.
 *
 * Un build vert dit que le code compile. Il ne dit pas que la page tient
 * debout.
 *
 * ─── Portable tel quel ────────────────────────────────────────────────────
 * Les routes ne sont PAS écrites à la main : elles sont découvertes dans
 * l'arborescence de l'App Router. Une liste maintenue à la main devient
 * périmée — c'est exactement le défaut qu'on corrige ici.
 *
 * Pour l'installer sur un autre site : copier ce fichier dans `scripts/`,
 * ajouter `"pages": "node scripts/pages.mjs"` aux scripts npm, et régler
 * `SITE_URL` (ou le passer en argument).
 *
 * Usage :
 *   npm run pages                          contre SITE_URL / NEXT_PUBLIC_SITE_URL
 *   npm run pages -- https://exemple.fr    contre une URL précise
 *   npm run pages -- http://localhost:3000 contre le serveur local
 */

import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (
  process.argv[2] ??
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  ''
).replace(/\/$/, '');

if (!BASE) {
  console.error(
    'URL manquante. Passez-la en argument (npm run pages -- https://exemple.fr)\n' +
      'ou réglez SITE_URL / NEXT_PUBLIC_SITE_URL.',
  );
  process.exit(2);
}

/**
 * Espaces qui exigent une session : ils ne sont pas la vitrine, et les
 * ouvrir sans être connecté ne prouve rien.
 */
const PRIVE = [
  'admin',
  'api',
  'auth',
  'account',
  'compte',
  'dashboard',
  'gerant',
  'studio',
  'setup',
  'espace',
];

const RACINE = ['src/app', 'app'].find((chemin) => existsSync(chemin));
if (!RACINE) {
  console.error("Aucun dossier App Router trouvé (ni 'src/app' ni 'app').");
  process.exit(2);
}

/**
 * Traduit un dossier de l'App Router en route publique.
 *
 * - `(groupe)` disparaît : c'est de l'organisation, pas de l'URL ;
 * - `[locale]` disparaît : la locale par défaut est servie à la racine ;
 * - tout autre `[param]` fait ABANDONNER la route — on ne devine pas un
 *   identifiant, et une page inventée testerait un 404.
 */
function routeDe(segments) {
  const gardes = [];
  for (const segment of segments) {
    if (segment.startsWith('(') && segment.endsWith(')')) continue;
    if (segment === '[locale]' || segment === '[lang]') continue;
    if (segment.startsWith('[')) return null;
    gardes.push(segment);
  }
  return `/${gardes.join('/')}`.replace(/\/+$/, '') || '/';
}

/**
 * Certains sites servent la langue par défaut à la racine (`/epiceries`),
 * d'autres la préfixent toujours (`/fr/produits`). Sans cette détection, les
 * seconds renvoient 404 partout et le script accuse un site en parfait état —
 * ce qu'il a fait au premier essai sur handicapevaillant.com.
 *
 * On lit où la racine atterrit après redirection : c'est la source de vérité,
 * bien plus fiable que relire la config next-intl du dépôt.
 */
async function prefixeDeLocale() {
  try {
    const reponse = await fetch(`${BASE}/`, { redirect: 'follow' });
    const chemin = new URL(reponse.url).pathname.replace(/\/$/, '');
    return /^\/[a-z]{2}$/.test(chemin) ? chemin : '';
  } catch {
    return '';
  }
}

function decouvrir(dossier, segments = []) {
  const routes = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    if (entree.isDirectory()) {
      if (entree.name.startsWith('_') || entree.name.startsWith('.')) continue;
      routes.push(...decouvrir(join(dossier, entree.name), [...segments, entree.name]));
    } else if (/^page\.(tsx|jsx|ts|js)$/.test(entree.name)) {
      const route = routeDe(segments);
      if (route) routes.push(route);
    }
  }
  return routes;
}

const ROUTES = [...new Set(decouvrir(RACINE))]
  .filter((route) => !PRIVE.some((zone) => route === `/${zone}` || route.startsWith(`/${zone}/`)))
  .sort((a, b) => a.localeCompare(b));

/**
 * Ce qu'on sait repérer dans le HTML servi, sans navigateur.
 *
 * Deux niveaux, et la distinction compte : une `og:image` manquante sur un
 * écran d'application derrière une session n'est pas un défaut, c'est une
 * remarque. Tout faire échouer indistinctement produit une alarme qu'on
 * apprend à ignorer — le contraire du but.
 */
function ausculter(html) {
  const griefs = []; // ce qui ne doit pas être en ligne
  const remarques = []; // ce qu'on gagnerait à soigner

  for (const label of new Set([...html.matchAll(/aria-label="(Photo[^"]*)"/g)].map((m) => m[1]))) {
    griefs.push(`emplacement d'image vide — « ${label} »`);
  }

  if (/lorem ipsum/i.test(html)) griefs.push('faux texte (lorem ipsum) servi au visiteur');
  if (/>[^<]*\b(TODO|FIXME|à remplacer)\b/i.test(html)) griefs.push('note de chantier visible');
  if (!/<title[^>]*>[^<]{3,}/.test(html)) griefs.push('titre de page absent');

  if (!/name="description"\s+content="[^"]{20,}"/.test(html)) remarques.push('description absente');
  if (!/property="og:image"/.test(html)) {
    remarques.push('image de partage (og:image) absente — lien nu quand on la partage');
  }

  return { griefs, remarques };
}

const PREFIXE = await prefixeDeLocale();

console.log(
  `${ROUTES.length} route(s) publique(s) découverte(s) dans ${RACINE}/` +
    (PREFIXE ? ` — langue préfixée (${PREFIXE})` : '') +
    '\n',
);

let enDefaut = 0;
let aRemarquer = 0;

for (const route of ROUTES) {
  const url = `${BASE}${PREFIXE}${route === '/' ? '' : route}` || `${BASE}/`;
  let reponse;
  try {
    reponse = await fetch(url, { redirect: 'follow' });
  } catch (erreur) {
    console.log(`✗ ${url}\n    injoignable — ${erreur.message}`);
    enDefaut += 1;
    continue;
  }

  if (!reponse.ok) {
    console.log(`✗ ${url}\n    HTTP ${reponse.status}`);
    enDefaut += 1;
    continue;
  }

  const { griefs, remarques } = ausculter(await reponse.text());

  if (griefs.length > 0) enDefaut += 1;
  aRemarquer += remarques.length;

  console.log(`${griefs.length > 0 ? '✗' : remarques.length > 0 ? '·' : '✓'} ${url}`);
  for (const grief of griefs) console.log(`    ${grief}`);
  for (const remarque of remarques) console.log(`      (${remarque})`);
}

console.log(
  `\n${ROUTES.length - enDefaut}/${ROUTES.length} page(s) sans défaut.` +
    (aRemarquer > 0 ? ` ${aRemarquer} remarque(s) entre parenthèses.` : '') +
    '\n\n' +
    'Ce script ne lit que le HTML. Il ne voit ni une phrase fausse, ni une mise\n' +
    'en page cassée, ni un bouton qui ne mène nulle part — ouvrez les liens\n' +
    'ci-dessus avant d’annoncer que le site est prêt.',
);

process.exit(enDefaut > 0 ? 1 : 0);
