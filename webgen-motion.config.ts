/**
 * webgen-motion — root configuration.
 *
 * Sprint 6 (extraction Motion Studio standalone) — ce fichier
 * vit à la racine du repo et est lu au boot par les routes API +
 * runners. Permet à un consumer (toi ou un user externe) de
 * customiser le toolkit sans toucher au code.
 *
 * NB : ce fichier reste committé pour les défauts. Les
 * overrides utilisateur passent par `~/.webgen-motion/config.json`
 * (cf. src/lib/config.ts).
 *
 * # Edition / Open-core
 *
 * Le champ `edition` contrôle quelles features sont activées
 * (Community gratuit / Studio payant / Enterprise sur mesure).
 * Default = "community" — tout reste gratuit aujourd'hui. Sprint
 * 7+ ajoutera des features gated par `isFeatureEnabled()`.
 *
 * Stratégie : Davinci-style perpetual licensing. Le license key
 * est validé localement (offline-first), pas d'appel serveur.
 */

import type {
  WebgenMotionConfig,
} from "./src/lib/webgen-motion-config-types";

export const config: WebgenMotionConfig = {
  /** Edition active. Override possible via env WEBGEN_MOTION_EDITION
   *  ou via le license key persisté dans ~/.webgen-motion/.license. */
  edition: "community",

  /** Default base URL utilisée par les nouveaux tours créés depuis
   *  l'UI (peut être override par tour via TourEntry.baseUrl). */
  defaultBaseUrl: "http://localhost:3000",

  /** Default format pour les nouveaux tours. */
  defaultFormat: "16:9",

  /** Default compose style pour les nouveaux tours. Studio Edition
   *  débloquera "cinematic" et "glitch" via flag. */
  defaultComposeStyle: "energetic",

  /** Storage root pour les artefacts (captures, voix off, finaux).
   *  Default `~/.webgen-motion/`. */
  storageRoot: undefined, // fall back to homedir()/.webgen-motion

  /** Watermark — Community Edition affiche un discret "made with
   *  webgen-motion" dans le coin du final.mp4. Studio retire via
   *  feature flag `watermark-removal`. */
  watermark: {
    enabled: false, // Désactivé par défaut tant qu'on est OSS pur
    text: "made with webgen-motion",
  },
};

export default config;
