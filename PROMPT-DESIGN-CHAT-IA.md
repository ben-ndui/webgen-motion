# Prompt — Design du Chat IA "Director's Console" pour GEN MOTION

> À coller tel quel dans une session Claude orientée design/frontend,
> lancée depuis la racine du repo `webgen-motion`.

---

Tu es un designer-développeur frontend senior. Ta mission : concevoir et
implémenter **l'interface du chat IA de GEN MOTION** — une interface
**hors du commun, inspirée du terminal**, mais réinterprétée dans la
direction artistique premium de l'app. Pas un clone de ChatGPT, pas un
terminal Matrix cliché : un **poste de commande de réalisateur**.

## Le produit

GEN MOTION est un outil desktop (Tauri + Next.js 16) qui génère des
vidéos motion design de sites web et d'apps mobiles : capture
automatisée (Puppeteer/Maestro), voix off IA (ElevenLabs), montage
automatique (Edit Engine : trims, cuts snappés sur les beats, J-cuts),
compose Remotion. Un "tour" est un scénario JSON (sections, steps :
click/scroll/overlay/tapOn/swipe…, voiceovers, hotspots) — voir
`src/lib/types/tour.ts` et les exemples dans `tours/*.json`.

**Le rôle du chat IA** : un agent conversationnel (Claude, BYOK —
l'abstraction provider existe dans `src/lib/llm-providers/`, et un agent
de génération existe déjà en CLI : `scripts/agent-generate-tour.ts`) qui :

1. **Crée un scénario** par la conversation — l'utilisateur décrit son
   site/app et son intention ("une démo de 60s de mon SaaS de booking,
   ton énergique, focus sur le dashboard"), l'IA pose 2-3 questions
   ciblées puis propose un tour complet (sections, steps, voiceovers).
2. **Modifie un tour existant** — "raccourcis la section 2", "ajoute un
   hotspot sur le bouton Réserver", "réécris la voix off plus sobre" →
   l'IA propose un **diff de steps** que l'utilisateur applique en un clic.
3. **Met à jour au fil de la discussion** — itérations successives, avec
   un historique des versions appliquées.
4. **Pilote le pipeline** — peut proposer de lancer capture / voix off /
   compose, et **explique les décisions de l'Edit Engine** (le fichier
   `edit-plan.json` contient un `summary[]` de décisions de montage :
   "trim : 16.3s de temps morts coupés", "4/4 cuts snappés sur la
   musique" — c'est une matière narrative parfaite pour le chat).

## La direction artistique existante (à respecter strictement)

Lis `src/app/globals.css` (tokens) et `src/app/editor.css` (patterns
`.gm-editor`) avant tout. L'essentiel :

- **Light slate premium, canonique** ; dark mode via `[data-theme="dark"]`.
  Couleurs en **OKLCH**, accent hue 257 (`--accent: oklch(55% 0.205 257)`).
  **Interdit de hardcoder une couleur** — tout passe par les tokens
  (`var(--ink)`, `var(--surface)`, `var(--line)`, `var(--accent-soft)`…).
- **Typo** : Geist Sans (UI) + **Geist Mono** (déjà chargée,
  `var(--font-mono)`) — la touche terminal vit DÉJÀ dans l'app : kickers
  mono uppercase 10px letter-spacing 0.08em, type-badges des steps.
  Amplifie ce langage, ne le remplace pas.
- **Radius** 7→30px (`--r-sm`→`--r-2xl`), ombres douces (`--shadow-sm/md/pop`),
  focus ring accent (`--ring`), spacing 4px base (`--s-*`).
- **Icons** : lucide-react. **Motion** : framer-motion, intensité pilotée
  par `--motion: 0.6` — animations qui respirent, jamais gratuites.
- Chaque élément interactif porte un `data-wm-id="…"` (convention repo).

## Le concept à explorer : le terminal réinventé

L'inspiration terminal doit être **évoquée, pas imitée**. Pistes (libre
à toi d'en proposer de meilleures — je veux 3 directions avant de coder) :

- Un **prompt chevron** (`▸` ou `❯`) comme zone de saisie, caret block
  qui clignote, la frappe en Geist Mono.
- Les réponses de l'IA en **log structuré** plutôt qu'en bulles : lignes
  horodatées, préfixes mono (`plan`, `step+`, `vo~`), sections pliables.
- Les **propositions de steps** rendues comme les cards `.step` de
  l'éditeur (type-badge mono + contenu) qui "se matérialisent" depuis le
  flux du terminal — le pont visuel entre conversation et scénario.
- Les **diffs** façon git : lignes `+`/`−` teintées (réutilise
  `--accent-soft` / les oklch de warning existants), avec un bouton
  "Appliquer" par bloc ou global.
- Les **commandes slash** (`/capture`, `/compose`, `/vo`) avec
  autocomplétion en palette.
- Une **timeline ASCII** compacte du tour en en-tête de session
  (`[S1]──[S2]──[S3]` avec durées), qui se met à jour quand un diff est
  appliqué.
- En dark mode, le côté terminal peut s'assumer davantage (phosphore
  très léger sur l'accent ?) — en light, ça reste slate, précis, éditorial.

**Anti-brief** : pas de vert Matrix sur fond noir en light, pas de
scanlines kitsch, pas de bulles arrondies type messagerie, pas de
dégradés violets IA génériques, pas d'emojis dans l'UI.

## Intégration dans l'app

Propose et justifie, mais mon a priori :

- **Dans l'éditeur** (`/tour/[id]`, orchestré par
  `src/app/tour/[id]/TourClient.tsx` — 5 tabs state-based) : un panneau
  latéral droit **dockable/repliable** (la grille `.two-col` existe :
  contenu + sidebar 340px), accessible depuis tous les tabs — l'IA a le
  contexte du tour ouvert et ses mutations passent par le même
  `onChange(tour)` que le tab Script.
- **Sur le hub** (`/dashboard`) : entrée "Nouveau tour avec l'IA" qui
  ouvre la même interface en mode création (plein écran ou modal large).
- Une **palette ⌘K** globale peut être le point d'entrée universel.

Contraintes techniques : Next 16 App Router (client components, `use()`
pour les params), Tailwind v4 + tokens, streaming des réponses (le repo
utilise un pattern **NDJSON ligne par ligne** — voir
`/api/motion/tour/run/route.ts` et le `consumeNdjson` de TourClient) ;
pas de nouvelle dépendance lourde (pas de lib de chat toute faite).
L'API LLM passera par une route Next qui réutilise
`src/lib/llm-providers/` (BYOK — gère l'état "pas de clé configurée"
avec un empty state élégant qui pointe vers `/setup/agent`).

## Livrables attendus, dans l'ordre

1. **3 directions** (une page chacune : concept, moodboard verbal,
   ASCII-mockup de l'écran principal) — attends ma validation.
2. **Maquette détaillée** de la direction retenue : tous les états
   (vide/première visite, saisie, streaming, proposition de diff,
   diff appliqué, erreur LLM, pas de clé API, session longue), light +
   dark, desktop (l'app est desktop-first, fenêtre ≥ 1200px).
3. **Implémentation production** : composants React dans
   `src/app/tour/[id]/_components/` + CSS dans le pattern de
   `editor.css` (classes préfixées, tokens), types TS stricts, états de
   loading/error/empty soignés, micro-interactions framer-motion.
   Le wiring LLM peut être mocké derrière une interface propre
   (`ChatTransport`) — le branchement réel viendra après.

## Qualité

Soigne ce qui rend une interface mémorable : le rythme typographique
mono/sans, les transitions d'apparition des propositions, le caret, les
états vides qui donnent envie d'écrire, le premier message d'accueil
(une ligne, pas un paragraphe marketing). L'utilisateur est un créateur
pressé : chaque interaction doit raccourcir le chemin vers une vidéo.
