/**
 * Types pour webgen-motion.config.ts (Sprint 6 — extraction
 * standalone). Vit dans src/lib/ pour pouvoir être importé depuis
 * le config root ET depuis le code runtime.
 */

export type WebgenMotionEdition = "community" | "studio" | "enterprise";

export interface WebgenMotionConfig {
  /** Edition active. Default "community". */
  edition: WebgenMotionEdition;

  /** Default base URL utilisée pour les nouveaux tours. */
  defaultBaseUrl?: string;

  /** Default format pour les nouveaux tours. */
  defaultFormat?: "16:9" | "9:16";

  /** Default compose style. */
  defaultComposeStyle?: "sober" | "energetic" | "cinematic" | "glitch";

  /** Storage root override. Si undefined, fall back sur
   *  homedir()/.webgen-motion. */
  storageRoot?: string;

  /** Watermark config. Community Edition affiche un discret
   *  "made with webgen-motion". Studio Edition retire via le
   *  feature flag `watermark-removal`. */
  watermark?: {
    enabled: boolean;
    text?: string;
  };
}
