# Plan de portage — Design handoff → app (Tailwind v4, pixel-perfect)

> Source de vérité design : `design_handoff_genmotion/assets/tokens.css` + la page
> `GEN MOTION Design System.html`. Cible : `src/app/globals.css` (Tailwind v4
> `@theme inline`) + composants TSX. Objectif : intégration **pixel-perfect**,
> dark mode inclus, en gardant les `data-wm-id`.

## État des lieux (mesuré)

| Sujet | Actuel | Handoff | Action |
|---|---|---|---|
| Espace couleur | hex slate/zinc + blue-600 | **OKLCH**, neutres hue 262, accent hue 257 | remplacer |
| Noms tokens | `--background/--foreground/--surface/--text-*/--border*/--accent*` | `--bg/--ink/--muted/--faint/--surface(-2)/--line(-soft/-strong)/--accent*` | renommer + alias transitoire |
| Dark mode | ❌ absent | ✅ `[data-theme="dark"]` re-theme | ajouter |
| Fonts | ✅ GeistSans/Mono via `geist/font` (`--font-geist-sans/-mono`) | Geist + Geist Mono | **déjà OK** — juste mapper |
| Échelle typo | défauts Tailwind | `--t-mono…--t-display` (fluide clamp) | override |
| Spacing | défauts Tailwind (4px) | `--s-1…--s-11` (4→160) | **rien** — équivalents natifs |
| Radius | 8/12/16/20px | 7/11/16/22/30px | override |
| Shadows | défauts | `--shadow-xs/sm/md/pop` (hairline-first) | override + `shadow-pop` |
| Classes brutes dans le code | **985 occurrences** slate/zinc/blue sur **55 fichiers TSX** | — | migration surface par surface |
| `data-wm-id` | déjà conventionné | à conserver | garder |

**Décision de nommage** : on adopte les noms du handoff comme **canoniques** (le contrat
Design System parle en `--bg/--ink/--line`). Les ~10 usages actuels (`bg-background`,
`text-foreground`, `border-border`, `bg-surface-muted`) sont couverts par un **bloc
d'alias transitoire** retiré en fin de migration. Pas de flag-day.

**Spacing** : ne PAS redéfinir. Équivalences natives Tailwind :
`--s-5`=24=`6` · `--s-6`=32=`8` · `--s-7`=48=`12` · `--s-8`=64=`16` · `--s-9`=96=`24` ·
`--s-10`=128=`32` · `--s-11`=160=`40`. Les protos en CSS pur utilisent `--s-*` ; en TSX on
écrit l'échelle numérique (`p-6`, `gap-8`, …).

---

## Phase 1 — Tokens (`globals.css`) · ~30 min, faible risque

Remplacer le bloc `:root` + `@theme inline` actuel par ceci (copie de `tokens.css` +
mapping Tailwind + variant dark + alias). **Garder** le `@import "tailwindcss"`, le
`body`, les scrollbars et `.snap-x-soft` existants.

```css
@import "tailwindcss";

/* dark = piloté par [data-theme="dark"] sur <html> (toggle manuel + localStorage),
   pas par prefers-color-scheme. Les tokens re-thèment via le sélecteur ci-dessous ;
   du coup bg-bg / text-ink s'adaptent SANS dr:dark. `dark:` reste dispo pour les
   rares cas de structure différente. */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

:root {
  /* ---- Type families (Geist via next/font) ---- */
  --font-sans: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), "SF Mono", ui-monospace, "Cascadia Code", monospace;

  /* ---- Type scale (fluide) ---- */
  --t-mono: 0.75rem; --t-xs: 0.8125rem; --t-sm: 0.9375rem; --t-base: 1.0625rem;
  --t-lg: 1.25rem; --t-xl: 1.625rem; --t-2xl: 2.25rem;
  --t-3xl: clamp(2.75rem, 4.4vw, 3.75rem);
  --t-display: clamp(3.25rem, 7vw, 6.5rem);
  --lh-tight: 1.02; --lh-snug: 1.12; --lh-body: 1.55;
  --tracking-tight: -0.03em; --tracking-display: -0.045em; --tracking-mono: 0.08em;

  /* ---- Radius ---- */
  --r-sm: 7px; --r-md: 11px; --r-lg: 16px; --r-xl: 22px; --r-2xl: 30px; --r-full: 999px;

  /* ---- Layout ---- */
  --maxw: 1240px; --nav-h: 68px;

  /* ============ LIGHT ============ */
  --bg: oklch(99% 0.002 255); --bg-sunken: oklch(97.2% 0.003 255);
  --surface: oklch(100% 0 0); --surface-2: oklch(98% 0.002 255);
  --ink: oklch(20% 0.012 262); --ink-soft: oklch(34% 0.012 262);
  --muted: oklch(48% 0.01 262); --faint: oklch(63% 0.008 262);
  --line: oklch(91.5% 0.004 262); --line-soft: oklch(94.5% 0.003 262); --line-strong: oklch(86% 0.006 262);

  --accent-h: 257;
  --accent: oklch(55% 0.205 var(--accent-h)); --accent-hover: oklch(48% 0.205 var(--accent-h));
  --accent-press: oklch(43% 0.2 var(--accent-h)); --accent-ink: oklch(98% 0.01 var(--accent-h));
  --accent-soft: oklch(96.5% 0.028 var(--accent-h)); --accent-line: oklch(89% 0.06 var(--accent-h));

  --shadow-xs: 0 1px 2px oklch(20% 0.02 262 / 0.05);
  --shadow-sm: 0 1px 2px oklch(20% 0.02 262 / 0.05), 0 2px 6px oklch(20% 0.02 262 / 0.05);
  --shadow-md: 0 4px 14px oklch(20% 0.03 262 / 0.08), 0 1px 3px oklch(20% 0.02 262 / 0.06);
  --shadow-pop: 0 18px 48px oklch(20% 0.04 262 / 0.14), 0 4px 12px oklch(20% 0.03 262 / 0.08);
  --ring: 0 0 0 3px oklch(55% 0.205 var(--accent-h) / 0.18);

  --motion: 0.6;
}

[data-theme="dark"] {
  --bg: oklch(15% 0.006 262); --bg-sunken: oklch(12.5% 0.006 262);
  --surface: oklch(18.5% 0.007 262); --surface-2: oklch(21% 0.008 262);
  --ink: oklch(96.5% 0.004 262); --ink-soft: oklch(86% 0.006 262);
  --muted: oklch(70% 0.008 262); --faint: oklch(56% 0.009 262);
  --line: oklch(27% 0.008 262); --line-soft: oklch(23% 0.008 262); --line-strong: oklch(34% 0.01 262);
  --accent: oklch(66% 0.18 var(--accent-h)); --accent-hover: oklch(72% 0.17 var(--accent-h));
  --accent-press: oklch(60% 0.18 var(--accent-h)); --accent-ink: oklch(16% 0.02 var(--accent-h));
  --accent-soft: oklch(28% 0.05 var(--accent-h)); --accent-line: oklch(38% 0.08 var(--accent-h));
  --shadow-xs: 0 1px 2px oklch(0% 0 0 / 0.4);
  --shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.4), 0 2px 6px oklch(0% 0 0 / 0.35);
  --shadow-md: 0 6px 18px oklch(0% 0 0 / 0.5), 0 1px 3px oklch(0% 0 0 / 0.4);
  --shadow-pop: 0 24px 60px oklch(0% 0 0 / 0.6), 0 6px 16px oklch(0% 0 0 / 0.45);
  --ring: 0 0 0 3px oklch(66% 0.18 var(--accent-h) / 0.32);
}

/* ---- Alias transitoires (anciens noms encore référencés). À SUPPRIMER en fin de migration. ---- */
:root {
  --background: var(--bg); --foreground: var(--ink);
  --surface-muted: var(--bg-sunken); --surface-subtle: var(--surface-2);
  --text: var(--ink); --text-muted: var(--muted); --text-subtle: var(--muted); --text-faint: var(--faint);
  --border: var(--line); --border-strong: var(--line-strong);
}

@theme inline {
  /* couleurs → utilitaires bg-*/text-*/border-* */
  --color-bg: var(--bg);
  --color-bg-sunken: var(--bg-sunken);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-ink: var(--ink);
  --color-ink-soft: var(--ink-soft);
  --color-muted: var(--muted);
  --color-faint: var(--faint);
  --color-line: var(--line);
  --color-line-soft: var(--line-soft);
  --color-line-strong: var(--line-strong);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-press: var(--accent-press);
  --color-accent-ink: var(--accent-ink);
  --color-accent-soft: var(--accent-soft);
  --color-accent-line: var(--accent-line);

  /* alias couleurs (transitoires) */
  --color-background: var(--bg);
  --color-foreground: var(--ink);
  --color-surface-muted: var(--bg-sunken);
  --color-surface-subtle: var(--surface-2);
  --color-text: var(--ink);
  --color-text-muted: var(--muted);
  --color-text-subtle: var(--muted);
  --color-text-faint: var(--faint);
  --color-border: var(--line);
  --color-border-strong: var(--line-strong);

  /* fonts */
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);

  /* échelle typo (override des défauts + ajout mono/display) */
  --text-mono: var(--t-mono);          --text-mono--line-height: 1.2;
  --text-xs: var(--t-xs);              --text-xs--line-height: 1.4;
  --text-sm: var(--t-sm);             --text-sm--line-height: var(--lh-body);
  --text-base: var(--t-base);         --text-base--line-height: var(--lh-body);
  --text-lg: var(--t-lg);             --text-lg--line-height: var(--lh-snug);
  --text-xl: var(--t-xl);             --text-xl--line-height: var(--lh-snug);
  --text-2xl: var(--t-2xl);           --text-2xl--line-height: var(--lh-snug);
  --text-3xl: var(--t-3xl);           --text-3xl--line-height: var(--lh-tight);
  --text-display: var(--t-display);   --text-display--line-height: var(--lh-tight);

  /* radius */
  --radius-sm: var(--r-sm);
  --radius-md: var(--r-md);
  --radius-lg: var(--r-lg);
  --radius-xl: var(--r-xl);
  --radius-2xl: var(--r-2xl);
  --radius-full: var(--r-full);

  /* shadows */
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow-md: var(--shadow-md);
  --shadow-pop: var(--shadow-pop);
}
```

Utilitaires générés : `bg-bg`, `bg-surface`, `bg-surface-2`, `text-ink`, `text-muted`,
`text-faint`, `border-line`, `bg-accent`, `text-accent`, `bg-accent-soft`, `shadow-pop`,
`rounded-xl`, `font-mono`, `text-display`, etc. Le focus ring se fait via une utility
`focus-visible:[box-shadow:var(--ring)]` ou une classe `.ring-token` (à ajouter).

---

## Phase 2 — Dark mode runtime · ~20 min

1. **Anti-FOUC** : script bloquant inline dans `layout.tsx` `<head>` qui lit
   `localStorage['gm-theme']` (fallback `matchMedia('(prefers-color-scheme: dark)')`)
   et pose `data-theme` sur `<html>` avant le premier paint.
2. **Toggle** : composant client `<ThemeToggle/>` (port de `assets/theme.js`) qui flippe
   `data-theme` + persiste `gm-theme`. Réutilisé dans la nav landing + topbars app.
3. **`prefers-reduced-motion`** : déjà géré dans `globals.css` (scroll) ; étendre aux
   animations décoratives via `--motion`.

---

## Phase 3 — Primitives TSX (depuis la page Design System) · ~0.5 j

Construire `src/components/ui/` (ou `_components/ui/`) d'après `GEN MOTION Design System.html` :
`Button` (primary/secondary/ghost/danger + size), `Card`, `Badge`/`StatusDot`,
`SegmentedControl`, `Field`/`Input`, `Slider` (native `accent-color`), `Tabs`
(underline coulissant `left/width`). Chaque primitive porte son `data-wm-id`.

---

## Phase 4 — Migration surface par surface (pixel-perfect) · le gros morceau

Remplacer les **985 classes brutes** (slate/zinc/blue) par les tokens sémantiques,
une surface à la fois, en diffant contre le proto correspondant. Ordre proposé
(priorité produit) :

1. **Landing** (`src/app/page.tsx` + `SlidesCarousel`) ← `GEN MOTION Landing.html`
2. **Hub** (`src/app/dashboard` + `tour-card`) ← `Hub.html`
3. **Éditeur** (`src/app/tour/[id]` + 5 tabs + `phase-loader`) ← `Editor.html`
4. **Download / Setup / About / Legal** ← pages correspondantes
5. Retirer `brand.ts` (UZME inline, ~10 fichiers) + le **bloc d'alias** de Phase 1.

Table de correspondance brut → token (à appliquer) :

| Brut (actuel) | Token |
|---|---|
| `text-slate-900` / `text-zinc-950` | `text-ink` |
| `text-slate-700` / `text-zinc-700` | `text-ink-soft` |
| `text-slate-600` / `text-slate-500` / `text-zinc-500` | `text-muted` |
| `text-slate-400` / `text-zinc-400` | `text-faint` |
| `bg-white` | `bg-surface` |
| `bg-slate-50` | `bg-bg-sunken` |
| `bg-slate-100` | `bg-surface-2` |
| `border-slate-200` | `border-line` |
| `border-slate-300` | `border-line-strong` |
| `bg-blue-600` / `text-blue-600` | `bg-accent` / `text-accent` |
| `bg-blue-100` | `bg-accent-soft` |
| `bg-zinc-900` / `ring-zinc-900` (boutons dark) | `bg-ink` / ring token |

> Note : slate ET zinc sont mélangés aujourd'hui (deux gris). Le nouveau système
> unifie sur **un seul neutre** (hue 262) — c'est voulu, ça homogénéise.

---

## Phase 5 — Vérification pixel-perfect

Pour chaque surface migrée : servir le proto (`python3 -m http.server` dans
`design_handoff_genmotion/`) + lancer l'app (`npm run dev`), screenshot des deux en
1440px, diff visuel (light + dark). Critère : typo/espacement/couleurs/radii alignés.
Garder les `data-wm-id` vérifiables.

---

## Garde-fous

- ❌ Ne pas shipper le **Tweaks panel** (outil de proto).
- ❌ Pas d'icône décorative — chaque icône load-bearing (règle S&D).
- ✅ `data-wm-id="<surface>.<role>"` sur chaque composant.
- ✅ Tester loading / error / empty (le handoff les définit, ex. phase-loader, empty hub).
- ⚠️ Typo proto à corriger au portage : landing v1 disait « GEN MOTION **film** » → « filme ».

## Ordre d'exécution recommandé

Phase 1 (tokens) → Phase 2 (dark) → valider sur 1 surface pilote (Landing) en
pixel-perfect → dérouler Phases 3-4-5 surface par surface.
