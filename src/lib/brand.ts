/**
 * Brand tokens for the dashboard chrome.
 *
 * Kept under the `UZME` export name temporarily because the migrated
 * tour preview / compose pages reference `UZME.primary` etc. directly
 * via inline `style={{}}` rather than Tailwind classes. Sprint 2 will
 * rip these out in favour of theme variables.
 *
 * Values mirror the slate-based admin palette from globals.css.
 */
export const UZME = {
  primary: "#0f172a", // slate-900 — primary text + slate-900 buttons
  secondary: "#1e293b", // slate-800
  tertiary: "#2563eb", // blue-600 — accent CTAs (was UZME turquoise)
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
