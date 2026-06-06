# Handoff: GEN MOTION — Marketing site + App (Hub & Editor)

## Overview
GEN MOTION ("Motion Studio · local-first") is a desktop app that captures any website, mixes a cloned voice-over, and composes a final motion-design `.mp4` — all on the user's machine. This bundle is the **full hi-fi design** for the product: the marketing site, the in-app Hub (tour library), the 5-tab Tour Editor, plus Download, Setup, About, Legal, and a Design-System reference.

Brand direction: **strict black & white + one refined blue accent**, generous whitespace, **Geist** for everything and **Geist Mono** for technical labels/data. Premium-minimal (Linear-esque). Controlled motion is part of the product — the UI itself should feel alive (tab transitions, streaming/loading states, a playable final-render preview). **No decorative/gratuitous icons** — every icon must carry information.

## About the Design Files
The files in this bundle are **design references authored in HTML/CSS/JS** — prototypes that show the intended look and behaviour. They are **not** production code to copy verbatim. The task is to **recreate these designs in the target codebase's environment** (the real app is React + TSX + Tailwind v4 per the brief) using its established patterns and component library. Where a prototype uses inline React-via-Babel or vanilla JS, that is only to make the prototype runnable in a browser — re-implement the equivalent with idiomatic components.

Convention already baked in: every meaningful element carries `data-wm-id="<surface>.<role>"` (e.g. `hub.card`, `editor.tab.compose`, `landing.hero.cta-download`). **Keep these attributes** in the real implementation — they're used for AI "tour-ability" of the product.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, shadows, and interactions are all defined in `assets/tokens.css` (the single source of truth) and the per-surface CSS. Recreate pixel-faithfully using the codebase's primitives. Map the CSS custom properties in `tokens.css` directly to Tailwind theme tokens.

---

## Design Tokens — source of truth: `assets/tokens.css`
All values are CSS custom properties on `:root`, re-themed under `[data-theme="dark"]`. Map these 1:1 into Tailwind's theme.

**Type families**
- `--font-sans`: "Geist", system-ui fallback
- `--font-mono`: "Geist Mono", ui-monospace fallback

**Type scale** (rem): `--t-mono` .75 · `--t-xs` .8125 · `--t-sm` .9375 · `--t-base` 1.0625 · `--t-lg` 1.25 · `--t-xl` 1.625 · `--t-2xl` 2.25 · `--t-3xl` clamp(2.75,4.4vw,3.75) · `--t-display` clamp(3.25,7vw,6.5).
Tracking: `--tracking-tight` -.03em, `--tracking-display` -.045em, `--tracking-mono` .08em. Line-heights: tight 1.02, snug 1.12, body 1.55.

**Spacing (4px base)**: `--s-1`=4 … `--s-11`=160 (4,8,12,16,24,32,48,64,96,128,160).

**Radius**: sm 7 · md 11 · lg 16 · xl 22 · 2xl 30 · full 999 (px).

**Color — LIGHT** (oklch): bg `99% .002 255` · bg-sunken `97.2%` · surface white · surface-2 `98%` · ink `20% .012 262` · ink-soft `34%` · muted `48%` · faint `63%` · line `91.5%` · line-strong `86%`. Accent family (hue var `--accent-h`=257): accent `oklch(55% .205 257)`, hover `48%`, soft `96.5% .028`, line `89% .06`, ink-on-accent `98%`. Accent is **hue-only configurable** — keep L/C constant; presets used in Tweaks: refined 257, azure 245, deep 270, signal 232.

**Color — DARK** (`[data-theme="dark"]`): bg `15% .006 262` · surface `18.5%` · ink `96.5%` · muted `70%` · line `27%` · accent `oklch(66% .18 257)`. See file for the full set.

**Shadows**: `--shadow-xs/sm/md/pop` (very subtle — the system favours hairline borders over drop shadows) and `--ring` (focus = 3px accent @ ~18% alpha).

**Motion**: `--motion` (0–1) scales decorative animation; respect `prefers-reduced-motion`.

---

## Surfaces

### 1. Landing — `GEN MOTION Landing.html` (`assets/landing.css`, `assets/landing.js`)
Full-viewport **scroll-snap** sections (proximity), document-level scroll. Fixed blur nav + right-side progress dots.
- **Hero** has **two directions** toggled by `[data-hero="a"|"b"]`: (A) *Statement* — huge Geist headline + mono spec strip; (B) *Product motion* — split with a live browser→compose demo frame (URL bar, page skeleton, capture scan, voice waveform, timecode).
- **Démo** (16:9 placeholder for the real `/demo.mp4`), **Pipeline** (3 steps: Capture · Voix off · Compose, each with a load-bearing mini-viz), **Éditions** (Community free / Studio $49 featured / Enterprise line), **CTA**, footer.
- Entrance reveals are **transform-only** (never gate opacity behind an animation, so print/export/reduced-motion always show content). Decorative loops gated on `prefers-reduced-motion`.
- Tweaks: hero direction, accent, dark, motion %, spec-strip.

### 2. Hub / Dashboard — `GEN MOTION Hub.html` (`assets/hub.css`, `assets/hub-app.jsx`)
App shell: **248px sidebar** (brand, create split-button, nav with counts, Studio license badge) + scrolling main with sticky topbar (title + count, search, theme).
- **Create split-button**: primary "Nouveau tour" + caret → dropdown menu with **Nouveau tour / Scaffold projet / Générer avec IA** (icon + description each). All three navigate to the Editor.
- **Filters** (live, client-side): format segmented (Tous/16:9/9:16), category chips, search by name/category, cycling sort (Récents/Nom/Durée/Étapes). Empty state when no match.
- **Tour cards** (`auto-fill minmax(290px,1fr)`, 230px in compact): device-frame thumbnail reflecting format (Mac chrome for 16:9, phone w/ notch for 9:16), format badge (top-left), duration pill (bottom-right over thumb), name, mono meta row (steps · durée · format · catégorie), status line (Brouillon=faint / Prêt=accent / Rendu=ink) + last-edited. Hover lifts the card + reveals play overlay + kebab. **Clicking a card opens the Editor.**
- Tweaks: accent, dark, density (Confort/Compact), thumbnail style (Device/Épuré), meta on/off.

### 3. Tour Editor — `GEN MOTION Editor.html` (`assets/editor.css`, `assets/editor-tabs.jsx`, `assets/editor-app.jsx`)
Rows: header / tab strip / scrolling content.
- **Header**: back-breadcrumb → Hub, inline-editable tour name, meta pill (16:9 · 1:40 · 7 étapes), autosave indicator, "Aperçu", "Composer" (jumps to Compose tab), theme toggle.
- **Tab strip**: 5 tabs (Script · Capture · Audio · Voix off · Compose) with a mono number + optional badge, and a **sliding accent underline** positioned from the active tab's `offsetLeft/Width`. Switching tabs remounts the panel (entrance).
- **Script**: type-coded editable steps (Section/Overlay/Click/Wait/Scroll), inline VO `<textarea>` per step, **drag-to-reorder** (HTML5 draggable on the row; drag is cancelled if the pointer starts in the textarea/delete), delete, and **"+ ajouter" with a type picker** that appends a new step. Live summary side-card (steps, est. duration, sections, word count, legend).
- **Capture**: section grid with status dots (ok/stale/empty/**capturing**) + an interactive **streaming phase panel** (5 phases; JS clock advances `prog` 0→100 per phase, increments a `frame x/300` counter, then marks the target section OK and shows "Capture terminée"). "Capturer les sections" + per-card "Recapturer" restart the stream for that section. Capturing cards get an accent ring + "● REC".
- **Audio**: music library (mini waveforms, selectable) + mixer (music/voice volume, auto-ducking) using native `accent-color` range inputs.
- **Voix off**: ElevenLabs/Voicebox segmented backend, voice list (clone + stock, with tag), waveform preview player, tuning sliders (stabilité/similarité/style), "Régénérer".
- **Compose**: visual presets (Sober/Energetic + Studio-locked Cinematic/Glitch with gradient previews), device frame (2D / iPhone 3D / MacBook 3D), readiness checklist (ok/warn), an **animated final.mp4 player** (JS clock: play/pause, moving playhead, clickable scrub-to-seek, timecode mm:ss / 01:40, and the device-frame content cycles through scene states), and export bar.
- Tweaks: accent, dark, density (Confort/Compact), live-animations on/off.

### 4. Download — `GEN MOTION Download.html` (`assets/pages.css`, `assets/theme.js`)
Hero with primary macOS Apple-Silicon button + size/.dmg note, alt links (Intel / notes / build from source), platform badges (macOS *Disponible*, Windows/Linux *Bientôt*), a product-shot placeholder frame, a 3-column specs panel (Configuration requise / Dans la boîte / Sécurité), and a Studio $49 band. Shared nav + footer.

### 5. Setup wizard — `GEN MOTION Setup.html` (`assets/pages.css`)
Centered 4-step wizard with a **stepper** (done/active states): Bienvenue (projects folder) → Backend voix (ElevenLabs/Voicebox radios; **conditional API-key field** when ElevenLabs) → Licence (Community/Studio radios; **conditional license-key field** when Studio; optional Claude key) → Terminé (success → "Ouvrir GEN MOTION" to Hub). Vanilla JS manages step index, radio selection, and conditional field visibility.

### 6. About — `GEN MOTION About.html`
Hero + lead, 3 principle cards (Local-first / Open-core MIT / Frame-accurate), Enterprise band (white-label, API headless, SSO, …) + contact.

### 7. Legal — `GEN MOTION Legal.html`
Sticky left TOC + 4 sections (Mentions légales / Confidentialité / CGU / CGV) with FR boilerplate; click-to-scroll + IntersectionObserver scrollspy highlights the active section.

### 8. Design System — `GEN MOTION Design System.html`
Live reference: color swatches (token name + role, values resolved at runtime), Geist type scale samples with resolved sizes, 4px spacing bars, radii, shadows, and component bricks (buttons, badges, status, segmented, field, card). Everything re-themes on toggle. Use this page as the visual contract for token → Tailwind mapping.

---

## Interactions & Behavior (summary)
- **Theme**: `[data-theme]` on `<html>`, persisted in `localStorage` key `gm-theme`. Marketing pages share `assets/theme.js`; app pages drive it via Tweaks state.
- **Navigation flow**: Landing → Download/About/Legal (nav + footer links). Hub card / create actions → Editor. Editor breadcrumb → Hub; "Composer" → Compose tab. Setup "Terminé" → Hub.
- **Animations**: tab underline slides (`left/width` transition .28s cubic-bezier(.5,0,.2,1)); Capture stream + Compose player are **JS-clock driven** (setInterval), not CSS keyframes, so they animate deterministically; entrance reveals transform-only; `prefers-reduced-motion` honored.
- **Focus**: inputs/cards use `--ring`. Hit targets ≥ comfortable sizes; never below 44px on touch contexts.

## State Management (per surface, for the real app)
- **Hub**: `format`, `category`, `query`, `sort` (derive filtered+sorted list); tweak state (accent/dark/density/thumbStyle/showMeta).
- **Editor**: `activeTab`; Script `steps[]` + `selectedId` + drag indices + add-menu open; Capture `sections[]` + `target` + `running/phase/prog/frame` (timer); Audio `selectedTrack` + volumes; Voice `backend` + `selectedVoice` + params; Compose `preset` + `device` + player `t`/`playing`; tweak state.
- **Setup**: `step` + `selections{backend,license}` (drives conditional fields).

## Assets
- **Fonts**: Geist + Geist Mono (Google Fonts; self-host in production).
- **Icons**: inline single-purpose SVGs (download, check, play/pause, search, theme, film, etc.) — all load-bearing. Replace with the codebase's icon set, keeping them informational only.
- **Imagery**: striped placeholders with mono captions (e.g. "capture de l'app", "slot · /demo.mp4") mark where real product shots/video go. No raster assets are shipped.
- **No brand logos** (Apple/Windows/etc.) are drawn — platforms are labelled in text by design.

## Files (in this bundle)
- Pages: `GEN MOTION Landing.html`, `GEN MOTION Hub.html`, `GEN MOTION Editor.html`, `GEN MOTION Download.html`, `GEN MOTION Setup.html`, `GEN MOTION About.html`, `GEN MOTION Legal.html`, `GEN MOTION Design System.html`
- `assets/tokens.css` — **design tokens (start here)**
- `assets/landing.css` · `assets/landing.js` — Landing
- `assets/hub.css` · `assets/hub-app.jsx` — Hub
- `assets/editor.css` · `assets/editor-tabs.jsx` · `assets/editor-app.jsx` — Editor
- `assets/pages.css` · `assets/theme.js` — Download/Setup/About/Legal/Design-System chrome
- `assets/tweaks-app.jsx`, `tweaks-panel.jsx` — the in-prototype Tweaks panel (prototype-only; ignore for production, it's a design exploration tool)

> Tweaks panels are a prototyping affordance for exploring options (accent/dark/density/etc.) — they are **not** a product feature to ship.
