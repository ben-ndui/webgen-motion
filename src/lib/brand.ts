/**
 * Brand tokens neutres pour le chrome admin de webgen-motion.
 *
 * Sprint 6 — extraction Motion Studio standalone : l'ex-export
 * `UZME` (transitionnel depuis la migration) a été renommé en
 * `BRAND` pour ne pas exporter de nom propriétaire. Aucun consumer
 * n'importait cet export — on garde quand même la constante pour
 * un éventuel futur usage par les step preview components.
 *
 * Pour une vraie customisation par projet, passer plutôt par
 * `webgen-motion.config.ts` qui expose une API plus structurée.
 *
 * Valeurs : palette slate-based mirror de globals.css.
 */
export const BRAND = {
  primary: "#0f172a", // slate-900 — primary text + boutons
  secondary: "#1e293b", // slate-800
  tertiary: "#2563eb", // blue-600 — accent CTAs
  accent: "#3b82f6", // blue-500
  success: "#16a34a", // green-600
  warning: "#f59e0b", // amber-500
  error: "#ef4444", // red-500
  info: "#0ea5e9", // sky-500

  surfaceDark: "#0f172a",
  surfaceDeeper: "#0f172a",
  surfaceCard: "#ffffff",
  borderSubtle: "#e2e8f0", // slate-200
  borderMedium: "#cbd5e1", // slate-300
} as const;
