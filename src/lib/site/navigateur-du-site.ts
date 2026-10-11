import { createHash } from "node:crypto";
import puppeteer, { type Browser, type Page } from "puppeteer";

import { ensureChromium, resolveChromiumExecutable } from "../chromium";

/**
 * Ouvrir le site d'un client dans un navigateur invisible, au format d'un
 * téléphone ou d'un ordinateur, et en prendre des captures propres.
 * SERVEUR SEULEMENT (Puppeteer).
 */

export const FORMATS = {
  // Un iPhone récent : des captures nettes, au rapport des cadres du film.
  telephone: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  // La capture « site » du Reel boutique : du 16:9.
  ordinateur: { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
} as const;

export type Format = keyof typeof FORMATS;

const AGENT_TELEPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

/**
 * Comme le rendu des films : hors app packagée, le navigateur de Puppeteer
 * et pas le Google Chrome de l'utilisateur (lent au démarrage, bloqué en
 * pleine mise à jour). Une surcharge explicite reste possible.
 */
export async function lancerLeNavigateur(): Promise<Browser> {
  let executablePath: string | undefined;
  if (process.env.WEBGEN_CHROMIUM_BIN?.trim()) executablePath = (await resolveChromiumExecutable())?.path;
  else if (process.env.WEBGEN_RUNNERS_DIR) executablePath = (await resolveChromiumExecutable())?.path ?? (await ensureChromium()).path;
  return puppeteer.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
  });
}

// Bandeaux de consentement et fenêtres de discussion : MASQUÉS, jamais
// acceptés (on ne consent à rien au nom du client), et absents des captures.
const MASQUER = `
  [id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i],
  [id*="didomi" i], [class*="didomi" i], [id*="onetrust" i], [class*="onetrust" i],
  [id*="axeptio" i], [class*="axeptio" i], [id*="tarteaucitron" i], [id*="gdpr" i], [class*="gdpr" i],
  [id*="crisp" i], [class*="crisp-client" i], [id*="intercom" i], iframe[title*="chat" i]
  { display: none !important; visibility: hidden !important; }
  html, body { overflow: visible !important; }
`;

export async function ouvrir(navigateur: Browser, url: string, format: Format): Promise<Page> {
  const page = await navigateur.newPage();
  await page.setViewport(FORMATS[format]);
  if (format === "telephone") await page.setUserAgent(AGENT_TELEPHONE);
  page.setDefaultNavigationTimeout(45_000);
  // tsx enveloppe les fonctions nommées dans un `__name` qui n'existe pas
  // dans la page : même parade que capture-tour.ts.
  await page.evaluateOnNewDocument(() => {
    // @ts-expect-error -- injecté dans la fenêtre du navigateur
    window.__name = (fn: unknown) => fn;
  });
  await page.goto(url, { waitUntil: "networkidle2" });
  await page.addStyleTag({ content: MASQUER });
  // Les images chargées au défilement : on descend puis on remonte.
  await page.evaluate(async () => {
    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const hauteur = Math.min(document.documentElement.scrollHeight, 12_000);
    for (let y = 0; y < hauteur; y += innerHeight / 2) {
      scrollTo(0, y);
      await pause(100);
    }
    scrollTo(0, 0);
    await pause(400);
  });
  return page;
}

/** Une capture de l'écran visible, après un défilement de `ecrans` hauteurs d'écran. */
export async function capturer(page: Page, ecrans = 0): Promise<Uint8Array> {
  await page.evaluate((n) => scrollTo(0, n * innerHeight), ecrans);
  await new Promise((r) => setTimeout(r, 350));
  return page.screenshot({ type: "png" });
}

/** Le défilement maximal, en hauteurs d'écran (0 pour une page plus courte que l'écran). */
export async function ecransDisponibles(page: Page): Promise<number> {
  return page.evaluate(() => Math.max(0, Math.floor(document.documentElement.scrollHeight / innerHeight) - 1));
}

export function empreinte(octets: Uint8Array): string {
  return createHash("sha256").update(octets).digest("hex");
}
