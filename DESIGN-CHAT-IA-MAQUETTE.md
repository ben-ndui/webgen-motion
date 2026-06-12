# Director's Console — Maquette détaillée (direction B « Prises » fusionnée)

> Phase 2 du brief `PROMPT-DESIGN-CHAT-IA.md`. Direction validée :
> **B « Prises »** (REPL éditorial) + emprunts actés :
> préfixes mono & timeline ASCII de A, scope `@S2` & solidification
> dashed→solid de C.
>
> Tout est token-driven (light canonique, dark via `[data-theme="dark"]`),
> Geist Sans/Mono, lucide-react, framer-motion sous `--motion`, zéro
> bulle, zéro emoji UI, zéro dégradé. Chaque interactif porte un
> `data-wm-id="console.…"`.

---

## 1. Anatomie du panneau

### 1.1 Position dans l'éditeur — décision

**Le console-dock ne remplace pas la sidebar 340px : il vit un niveau
au-dessus.** La sidebar `.two-col` est contextuelle au tab actif
(summary du Script, readiness du Compose…) ; la console doit persister
à travers les 5 tabs — c'est la condition pour qu'elle pilote le
pipeline et garde le contexte. Elle s'installe donc dans le **shell de
TourClient**, en 3e colonne de la page, sœur des tabs :

```
┌ topbar éditeur (back · nom · save · tabs) ───────────────┬──────────┐
│                                                          │          │
│   .panel du tab actif                                    │ CONSOLE  │
│   ┌ two-col ────────────────┬───────────┐                │  DOCK    │
│   │ contenu                 │ side-card │                │  420px   │
│   │                         │ 340px     │                │          │
│   └─────────────────────────┴───────────┘                │          │
│                                                          │          │
└──────────────────────────────────────────────────────────┴──────────┘
```

- **Largeur** : 420px par défaut, redimensionnable par poignée sur le
  bord gauche (`min 360px / max 560px`, persistée en localStorage
  `motion-console-w`).
- **Repliée** : rail vertical de 44px (icône `Terminal` lucide +
  pastille `--accent` si des blocs non vus sont arrivés pendant le
  repli). Toggle : clic rail, bouton header, ou `⌘J`.
- **Hauteur** : pleine hauteur sous la topbar ; le flux des prises
  scrolle, header + composer fixes.

### 1.2 Responsive (app desktop-first, fenêtre ≥ 1200px)

| Viewport | Comportement |
|---|---|
| ≥ 1460px | Dock **inline** : grille shell `minmax(0,1fr) 420px`. Le contenu du tab garde sa two-col (la `.panel` max 1180px absorbe la compression). |
| 1200–1459px | Dock **superposé** : `position: fixed; right: 0`, `--shadow-pop`, fine bordure gauche `--line-strong`. Pas de backdrop (on doit pouvoir cliquer l'éditeur) ; la console se replie d'elle-même quand on lance un drag de step dans le Script. |
| < 1200px | Non supporté par l'app (desktop) ; le rail reste accessible, le dock s'ouvre en superposé pleine hauteur. |

> Note phase 3 : la media query `@media (max-width: 980px)` de
> `.two-col` est viewport-based ; en mode inline la colonne contenu
> peut passer sous 980px de *largeur locale* sans déclencher la query.
> Migration en **container query** (`@container`) à prévoir — flaggé,
> trivial en Tailwind v4.

### 1.3 Zones internes

```
┌──────────────────────────────────────────────┐
│ Z1  header     ● console · uzme-landing · v3 │  40px, sticky
│ Z2  timeline   [S1]──[S2]──[S3]──[S4]  23.8s │  28px, sticky
├──────────────────────────────────────────────┤
│ Z3  flux des prises (scroll)                 │  flex 1
│     #01 … #02 … #03 …                        │
├──────────────────────────────────────────────┤
│ Z4  composer   ❯ █          / · @ · ↹        │  auto-grow ≤ 5 lignes
└──────────────────────────────────────────────┘
```

- **Z1** : dot accent + `console` + id du tour + version courante (`v3`
  = nombre de diffs appliqués) + boutons `historique compact` / `replier`.
- **Z2** : timeline ASCII (cf. § 2.10) — sticky avec Z1, toujours
  visible même en session longue.
- **Z3** : le flux. Auto-scroll bas pendant le streaming, avec
  détecteur « l'utilisateur a scrollé vers le haut » → pause de
  l'auto-scroll + chip flottante `↓ reprendre` (mono, `--surface`,
  `--shadow-md`).
- **Z4** : textarea mono auto-grow, chevron `❯` accent à gauche, caret
  block (le caret natif est masqué, remplacé par le block animé en
  overlay — même technique que `compile-caret`). Ligne d'hints sous le
  champ : `/ commandes · @ sections · ↹ compléter` en `--faint`.

### 1.4 Point d'entrée hub — « Nouveau tour avec l'IA »

Sur `/dashboard`, une card de création dédiée (même rang que « Nouveau
tour ») ouvre la console en **mode création plein écran** : route
`/console/new` (pas un modal — une session de création mérite une URL,
et le pattern route-fade existe).

- Colonne unique centrée `max-width: 720px`, mêmes Z1–Z4, mais **Z2
  démarre vide** et se construit sous les yeux de l'utilisateur à
  mesure que l'IA propose des sections — la timeline qui apparaît
  segment par segment EST le feedback de progression.
- La première prise attend : URL du site + intention. L'IA pose ses
  2-3 questions (blocs `text`, une ligne chacun), puis propose le
  scaffold complet : sections en step-cards dashed.
- Le CTA remplace « Appliquer » par **« Créer le tour »** → écrit
  `tours/<id>.json` → redirect `/tour/<id>` avec la console docked
  ouverte et la prise #01 déjà dans l'historique (continuité totale).

---

## 2. Les états — mockups + motion

Conventions mockups : largeur dock 420px ; `█` = caret block ; `░` =
surface dashed/fantôme ; `▸` = puce d'exemple ; `▰▱` = progression.

### 2.1 Vide / première visite

```
┌──────────────────────────────────────────────┐
│ ● console          uzme-landing · v0    [─]  │
│ [S1 4.1s]──[S2 6.5s]──[S3 5.2s]──[S4] 23.8s  │
├──────────────────────────────────────────────┤
│                                              │
│                                              │
│   Décris ce que tu veux — j'écris dans le    │
│   scénario.                                  │
│                                              │
│   essaie :                                   │
│   ▸ raccourcis la section 2                  │
│   ▸ réécris la voix off de l'intro, sobre    │
│   ▸ @S3 ajoute un hotspot sur Réserver       │
│   ▸ /compose en preset cinematic             │
│                                              │
│                                              │
├──────────────────────────────────────────────┤
│ ❯ █                                          │
│   / commandes · @ sections · ↹ compléter     │
└──────────────────────────────────────────────┘
```

- Le message d'accueil : **une ligne**, sans numéro de prise (les `#NN`
  sont réservés aux commandes utilisateur), en Sans `--t-sm` `--ink-soft`.
- Les 4 exemples sont des **boutons** (`data-wm-id="console.suggestion"`) :
  clic = injecte le texte dans le composer, focus, caret en fin — on
  n'envoie pas à la place de l'utilisateur.
- Les exemples sont calculés depuis le tour réel (s'il y a un `@S3`,
  c'est que S3 existe ; si pas de VO, l'exemple 2 devient « écris la
  voix off »).

**Motion** : à l'ouverture du dock, slide-in `x: 24 → 0` + fade,
260ms, ease `cubic-bezier(.2,.7,.2,1)` (le `gmPanelIn`). L'accueil et
les exemples staggerent (60ms) en fade + `y: 4 → 0`. Le caret
clignote `steps(1)` 1s dès le mount, le composer prend le focus.

### 2.2 Saisie — slash commands + scope `@`

Frappe de `/` en début de mot → palette ancrée au-dessus du composer
(même anatomie que `.add-menu` : `--surface`, `--shadow-pop`, radius
`--r-md`) :

```
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ /capture   relance la capture du tour    │ │
│ │ /vo        régénère la voix off          │ │
│ │ /compose   compose le final.mp4        ▸ │ │
│ │ /undo      annule la dernière prise      │ │
│ └──────────────────────────────────────────┘ │
│ ❯ /co█                                       │
│   ↹ compléter · ↵ envoyer · esc fermer       │
└──────────────────────────────────────────────┘
```

Frappe de `@` → **scope picker**, mêmes mécaniques, alimenté par les
steps `section` du tour (index, titre, durée si capture existante) :

```
│ ┌──────────────────────────────────────────┐ │
│ │ @S1   GEN MOTION · intro         4.1s    │ │
│ │ @S2   Dashboard                  6.5s  ▸ │ │
│ │ @S3   Voix off IA                5.2s    │ │
│ └──────────────────────────────────────────┘ │
│ ❯ @S█ raccourcis cette section               │
```

- Le scope validé devient un **chip inline** dans le composer : fond
  `--accent-soft`, texte mono `--accent`, bordure `--accent-line`,
  radius `--r-sm` — supprimable d'un Backspace comme un seul caractère.
- Pendant qu'un scope est actif, le segment correspondant de la
  timeline Z2 passe en `--accent` (lien spatial volé à la direction C).
- La commande slash sélectionnée s'envoie telle quelle ou accepte des
  arguments libres (`/compose en cinematic`).

**Motion** : palette en scale `0.98 → 1` + fade 140ms origin bottom ;
navigation ↑/↓ déplace un surlignage `--surface-2` ; le chip de scope
« pop » à la validation (`scale 0.9 → 1`, spring léger). Le segment
timeline scopé pulse une fois.

### 2.3 Streaming — la prise en cours

```
│ #04 ❯ @S2 raccourcis et ajoute un hotspot    │
│       sur le bouton Réserver                 │
│                                              │
│     plan   lecture du scénario… ok (14 steps)│
│     │      S2 porte 2.4s de temps morts      │
│     │      cible : #reserver (présent au DOM)│
│     step~  trim du wait S2 …█                │
│                                              │
│     [ Échap · annuler ]                      │
├──────────────────────────────────────────────┤
│ ❯                                            │
```

- La ligne de commande est figée dès l'envoi : `#04` `--faint`, `❯`
  `--accent`, texte mono `--ink`, chip scope conservé.
- Les lignes IA arrivent **une par une** (1 event NDJSON = 1 ligne),
  préfixe mono 5ch aligné (`plan`, `step+`, `step−`, `step~`, `vo~`,
  `cut`, `run`, `note`), règle de continuation `│` en `--line-soft`.
- La dernière ligne porte le caret block — l'IA « tape », exactement
  comme le `compile-card` de la landing.
- Le composer reste visible mais désactivé (opacity .5) — une seule
  prise streame à la fois.
- `Échap` ou clic « annuler » : abort du fetch (AbortSignal), la prise
  se clôt sur une ligne `note   interrompu par le réalisateur` en
  `--muted` — pas un état d'erreur, une décision.

**Motion** : chaque ligne fade + `x: -6 → 0` 180ms (le
`compile-line`). Le préfixe apparaît 40ms avant son texte (l'armature
d'abord). Pendant le streaming, le dot du header Z1 clignote comme
`.live-dot` mais en `--accent` (pas le rouge capture).

### 2.4 Proposition de diff reçue

```
│ #04 ❯ @S2 raccourcis et ajoute un hotspot    │
│       sur le bouton Réserver                 │
│                                              │
│     plan   2 modifications sur S2 — Dashboard│
│                                              │
│     step~  ░──────────────────────────────░  │
│            ░ WAIT     dwell               ░  │
│            ░ − "dwellMs": 2400            ░  │
│            ░ + "dwellMs": 800     Δ −1.6s ░  │
│            ░──────────────────────────────░  │
│                                              │
│     step+  ░──────────────────────────────░  │
│            ░ SECTION  Dashboard · hotspot ░  │
│            ░ + t 3.2s · x .62 y .41 · 2.1 ░  │
│            ░ + label "Clique pour         ░  │
│            ░   réserver"                  ░  │
│            ░──────────────────────────────░  │
│                                              │
│     vo~    « Réservez votre créneau en       │
│            deux clics. »                     │
│                                              │
│     Δ S2 : 6.5s → 4.9s · 2 steps             │
│              [ Écarter ]      [ Appliquer ]  │
```

- Les step-cards proposées reprennent l'anatomie `.step` + `.type-badge`
  de l'éditeur mais en état **fantôme** : bordure `1px dashed
  var(--accent-line)`, fond `--accent-soft` très léger, le type-badge
  déjà dans sa teinte définitive (le pont visuel vers le tab Script).
- Lignes de diff : `+` texte `--accent` sur fond accent à 7% ; `−`
  texte warning hue 70 sur fond warning à 12% (les oklch des
  `.rcheck.warn`), valeur barrée.
- La ligne Δ récapitule en mono : durées avant → après + nombre de
  steps touchés. « Appliquer » = bouton primaire (`--accent` /
  `--accent-ink`) ; « Écarter » = ghost (`--line`, `--muted`).
- `⌘↵` = Appliquer. « Écarter » replie les cards en une ligne
  `note   proposition écartée` (récupérable au clic).

**Motion — la solidification (emprunt C), le moment signature** :
1. Clic Appliquer → chaque card passe dashed→solid : la bordure
   `--accent-line` dashed devient `--line` solid, le fond glisse vers
   `--surface` (350ms, ease-out), léger `scale 1 → 0.99 → 1`.
2. Les cards émettent un **écho** : un clone bordure accent qui part en
   fade + `x: +16` vers l'éditeur (200ms) — « c'est parti dans le
   scénario ».
3. Le segment S2 de la timeline Z2 pulse en accent et sa durée
   ticke `6.5s → 4.9s` (count 300ms), le total suit.
4. Les boutons se remplacent par l'estampille (cf. 2.5).
Sous `prefers-reduced-motion` : bascule d'états sans clone ni tick.

### 2.5 Diff appliqué

```
│     Δ S2 : 6.5s → 4.9s · 2 steps             │
│     APPLIQUÉ · V4 · 14:02         défaire    │
│                                              │
│ #05 ❯ █                                      │
```

- Estampille mono 10px uppercase `--tracking-mono` : texte `--accent`,
  fond `--accent-soft`, bordure `--accent-line`, radius `--r-full` —
  cousine du badge `.lock` de l'éditeur.
- `défaire` : lien mono `--muted`, souligné dashed (le `.mono-link`),
  hover `--ink`. Clic = rollback du diff (l'inverse des ops, via le
  même `onChange(tour)`) → l'estampille devient `DÉFAIT · 14:05` en
  `--muted`, les cards repassent fantômes (la prise reste rejouable).
- Le header Z1 incrémente `v3 → v4`.
- Les cards solidifiées restent dans le flux, contractées : seul le
  type-badge + la première ligne restent visibles, le détail se déplie
  au clic (la prise devient archive, pas écran de travail).

**Motion** : l'estampille apparaît en `scale 0.92 → 1` + fade (spring
discret), 80ms après la fin de la solidification — la ponctuation
finale du geste.

### 2.6 Run pipeline — `/capture`, `/vo`, `/compose`

```
│ #06 ❯ /compose                               │
│                                              │
│     run    compose · energetic · 16:9        │
│     │      analyse audio… ok (42 onsets)     │
│     cut    4/4 cuts snappés sur la musique   │
│     trim   16.3s de temps morts coupés       │
│     cut    2 J-cuts posés sur S2→S3          │
│     run    rendu remotion                    │
│            ▰▰▰▰▰▰▱▱▱▱  62% · 01:24           │
│                                              │
│     [ Annuler le rendu ]                     │
```

puis, terminé :

```
│     run    final.mp4 · 24.1s · 38.2 Mo       │
│     TERMINÉ · 14:11        ouvrir le compose │
```

- Le bloc `run` consomme le **même flux NDJSON** que les handlers
  existants de TourClient (`handleCompose` etc.) — la console en est un
  second abonné, elle ne réinvente pas le pipeline. Les states
  capture/vo/compose de l'orchestrateur restent la source de vérité
  (le tab Compose et la console affichent le même job).
- Les lignes du `summary[]` de l'edit-plan sont mappées sur les
  préfixes : `trim` / `cut` → c'est ici que l'Edit Engine raconte son
  montage (l'emprunt narratif à la direction A).
- Barre de progression : anatomie `.phase-prog` (3px, fill `--accent`).
- `ouvrir le compose` : lien mono → `setActiveTab("compose")`.
- Quand l'IA **propose** un run sans slash explicite (« je lance la
  capture ? »), le bloc s'affiche avec `[ Lancer ]` / `[ Pas encore ]`
  — jamais d'exécution non confirmée.

**Motion** : identique au streaming 2.3 ; la barre `scaleX` origin
left ; à la fin, la ligne `TERMINÉ` reprend le style estampille (teinte
verte hue 150 des `.rcheck.ok` pour un run — l'accent reste réservé
aux mutations du scénario).

### 2.7 Erreur LLM + retry

```
│ #07 ❯ allonge l'outro de 2 secondes          │
│                                              │
│     plan   lecture du scénario… ok           │
│     err    Anthropic 429 — limite atteinte.  │
│            nouvel essai possible dans 18s    │
│                                              │
│     [ Réessayer (18s) ]   copier le prompt   │
```

- Préfixe `err` en oklch hue 25 (le rouge du `.live-dot`), texte
  `--ink-soft` — l'erreur est une ligne de log, pas une bannière qui
  crie. Bordure gauche 2px hue 25 sur le bloc.
- Trois familles : `network` (offline — vérifie ta connexion),
  `rate-limit` (countdown live dans le bouton, auto-activé à 0),
  `provider` (clé invalide, modèle indispo → pointe `/setup/agent`).
- `copier le prompt` : la frappe n'est jamais perdue ; ↑ rappelle
  aussi la prise échouée pour ré-édition.
- Le retry **rejoue la même prise** (même `#07`, le bloc d'erreur se
  contracte en une ligne `note   tentative 1 échouée (429)`).

**Motion** : le bloc d'erreur entre sans secousse (même fade que les
autres lignes — sobriété), seul le countdown ticke.

### 2.8 Pas de clé API configurée

```
┌──────────────────────────────────────────────┐
│ ● console               uzme-landing    [─]  │
├──────────────────────────────────────────────┤
│                                              │
│        ┌─────────┐                           │
│        │  ❯ _    │   (icône terminal, --ink  │
│        └─────────┘    sur --surface-2)       │
│                                              │
│   La console pilote Claude avec ta clé.      │
│                                              │
│   GEN MOTION est BYOK : ta clé Anthropic     │
│   reste sur ta machine, dans ta config       │
│   locale. Aucun proxy, aucun compte.         │
│                                              │
│        [ Configurer l'agent ]                │
│                                              │
│   config.json · ~/.webgen-motion             │
│                                              │
├──────────────────────────────────────────────┤
│ ❯ Configure une clé pour commencer           │
└──────────────────────────────────────────────┘
```

- Anatomie de `.cap-empty` (l'empty state Capture) : icône carrée
  `--ink`/`--bg`, titre `--t-lg`, corps `--t-sm` `--muted` max 42ch,
  CTA primaire → `/setup/agent`.
- Le composer reste affiché mais désactivé, placeholder explicite —
  la promesse de l'interface reste visible, on ne montre pas un trou.
- Au retour de `/setup/agent` clé en poche : transition directe vers
  l'état 2.1 (l'accueil + exemples), focus composer.

**Motion** : statique, à dessein — un empty state n'a pas à gesticuler.
Seul le CTA a son hover standard.

### 2.9 Session longue — compaction

Au-delà de **8 prises** ou ~60% de hauteur de flux, les prises
anciennes (tout sauf les 3 dernières) se **compactent en une ligne** :

```
│ ● console            uzme-landing · v6  [─]  │
│ [S1 4.1s]──[S2*4.9s]──[S3 5.2s]──[S4] 22.2s  │  ← sticky
├──────────────────────────────────────────────┤
│ #01 ❯ crée une démo 60s …      appliqué · v1 │
│ #02 ❯ réécris la vo intro      appliqué · v2 │
│ #03 ❯ /capture                 terminé 02:14 │
│ #04 ❯ @S2 raccourcis et a…     appliqué · v4 │
│ ──────────────────────────────────────────── │
│ #05 ❯ /compose                               │
│     run    final.mp4 · 24.1s · 38.2 Mo       │
│     TERMINÉ · 14:11        ouvrir le compose │
│                                              │
│ #06 ❯ ajoute un outro avec le logo           │
│     … (prise dépliée)                        │
```

- Ligne compacte : `#NN` + prompt tronqué (ellipsis) + issue à droite
  en mono (`appliqué · vN` accent, `terminé` vert 150, `écarté` /
  `interrompu` `--faint`, `erreur` hue 25).
- Clic = déplie la prise complète in place (re-compactée au blur).
- Header Z1+Z2 **sticky** : la timeline et la version courante ne
  quittent jamais l'écran — c'est l'état du monde, le flux n'est que
  l'histoire.
- La conversation envoyée au LLM se compacte en parallèle (résumé des
  prises anciennes côté transport) — l'UI et le contexte modèle
  racontent la même chose.

**Motion** : compaction en `height: auto → 1 ligne` 240ms ease-in-out,
par lot (pas une par une — un seul reflow). Dépliage inverse.

### 2.10 Timeline ASCII header — états

La timeline Z2 est la **carte du tour** : segments `[Sn durée]` joints
par `──`, total à droite. Mono 11px.

**a) Sync** (le scénario correspond aux captures sur disque) :

```
│ [S1 4.1s]──[S2 6.5s]──[S3 5.2s]──[S4 8.0s]      23.8s │
```
Segments `--ink-soft`, durées `--muted`, joints `--line-strong`,
total `--ink`.

**b) Dirty** (diff appliqué, re-capture pas relancée) — les sections
touchées portent `*` et passent en accent, hint mono à droite :

```
│ [S1 4.1s]──[S2* 4.9s]──[S3 5.2s]──[S4 8.0s]     22.2s │
│                                  re-capture requise ▸ │
```
`▸` cliquable → pré-remplit `/capture` dans le composer (jamais
d'exécution directe). Si seule la VO est touchée : `re-générer la vo ▸`.

**c) Sans capture** : durées estimées depuis les `dwellMs`, affichées
`~4s`, total `~23.8s estimé` en `--faint`.

**d) Scope actif / hover** : pendant la frappe d'un `@S2` ou au hover
d'une prise qui a touché S2, le segment passe `--accent` fond
`--accent-soft` — la timeline répond à la conversation.

**e) Overflow** : au-delà de ~6 sections en 420px, les segments non
touchés se contractent en `[S3]` (durée au tooltip) ; les segments
dirty et scopés gardent toujours leur durée.

**Motion** : changements de durée en tick (300ms) ; passage sync→dirty
par pulse unique (`--accent-soft` flash 400ms) ; jamais d'animation en
boucle dans le header.

---

## 3. Spécifications design tokens

Fichier cible : `src/app/console.css`, scope `.gm-console` (pattern
`editor.css`). **Aucune couleur hardcodée hors des hues sémantiques
déjà présentes dans `editor.css`** (150 succès, 70 warning/délétion,
25 erreur).

| Élément | Classe | Tokens (light) |
|---|---|---|
| Panneau dock | `.gm-console` | fond `--bg-sunken` ; bordure gauche `1px solid var(--line)` ; superposé : `--shadow-pop`, bordure `--line-strong` |
| Header Z1 | `.con-head` | fond `--surface` ; bordure bas `--line` ; mono `--t-mono` `--muted` ; id tour `--ink` ; dot 8px `--accent` (anim `gmBlink` pendant streaming) |
| Timeline Z2 | `.con-tl` | mono 11px ; segments `--ink-soft` ; durées `--muted` ; joints `──` `--line-strong` ; total `--ink` ; segment dirty/scopé : texte `--accent`, fond `--accent-soft`, radius `--r-sm` ; hint action : `--accent` |
| N° de prise | `.take-n` | mono `--t-xs` `--faint` |
| Chevron prompt | `.take-chev` | `--accent` (idem composer) |
| Texte commande | `.take-cmd` | mono `--t-xs` `--ink` |
| Chip scope `@S2` | `.take-scope` | mono 10px `--accent` ; fond `--accent-soft` ; bordure `--accent-line` ; radius `--r-sm` ; padding 2px 6px |
| Caret block | `.con-caret` | 7×13px fond `--accent` ; `caretBlink 1s steps(1) infinite` |
| Ligne de log | `.take-log` | mono 11px `--muted` ; règle `│` `--line-soft` |
| Préfixes | `.lp` (gutter 5ch, right-align) | `plan`/`note` `--muted` · `step+` `--accent` · `step−` `oklch(55% .12 70)` · `step~`/`vo~` `--ink-soft` · `cut`/`trim` `--accent` · `run` `--ink-soft` · `err` `oklch(55% .18 25)` |
| Step-card proposée | `.take-card.proposed` | bordure `1px dashed var(--accent-line)` ; fond `color-mix(in oklch, var(--accent-soft) 60%, var(--surface))` ; radius `--r-md` ; type-badge : classes `.type-*` d'editor.css réutilisées telles quelles |
| Step-card solidifiée | `.take-card.applied` | bordure `1px solid var(--line)` ; fond `--surface` ; `--shadow-xs` |
| Diff ligne `+` | `.dl-add` | texte `--accent` ; fond `color-mix(in oklch, var(--accent) 7%, transparent)` |
| Diff ligne `−` | `.dl-del` | texte `oklch(55% .12 70)` ; fond `oklch(72% .13 70 / .12)` ; valeur `line-through` |
| Récap Δ | `.take-delta` | mono 11px `--muted` ; valeurs `--ink` |
| Bouton Appliquer | `.con-btn.primary` | fond `--accent` ; texte `--accent-ink` ; radius `--r-md` ; hover `--accent-hover` ; active `--accent-press` ; focus `--ring` |
| Bouton Écarter / Annuler | `.con-btn.ghost` | bordure `--line` ; texte `--muted` ; hover `--line-strong` / `--ink` |
| Estampille appliqué | `.take-stamp` | mono 10px uppercase `--tracking-mono` ; `--accent` / `--accent-soft` / `--accent-line` ; radius `--r-full` ; variante run terminé : hue 150 (`oklch(52% .14 150)` sur `oklch(62% .15 150 / .15)`) ; variante défait/écarté : `--muted` / `--surface-2` / `--line` |
| Lien `défaire` | `.con-link` | mono `--t-mono` `--muted` ; border-bottom dashed `--line-strong` ; hover `--ink`, solid |
| Palette slash / scope picker | `.con-palette` | fond `--surface` ; bordure `--line` ; radius `--r-md` ; `--shadow-pop` ; item actif `--surface-2` ; commande mono `--ink` ; description Sans `--t-xs` `--muted` |
| Composer Z4 | `.con-composer` | fond `--surface` ; bordure top `--line` ; focus-within `--ring` ; texte mono `--t-xs` `--ink` ; placeholder `--faint` ; hints `--faint` |
| Barre progression run | `.run-prog` | piste `color-mix(in oklch, var(--ink) 10%, transparent)` ; fill `--accent` ; 3px radius 2px |
| Bloc erreur | `.take-err` | bordure gauche `2px solid oklch(60% .18 25)` ; texte `--ink-soft` ; fond `oklch(60% .18 25 / .06)` |
| Prise compactée | `.take.compact` | prompt `--muted` ellipsis ; issue mono à droite (couleurs de l'estampille correspondante) |
| Chip `↓ reprendre` | `.con-resume` | fond `--surface` ; bordure `--line` ; `--shadow-md` ; mono `--muted` ; radius `--r-full` |

### Ajustements dark (`[data-theme="dark"] .gm-console`)

Les tokens font 95% du travail. Cas signalés :

1. **Phosphore léger** (autorisé en dark uniquement) :
   ```css
   [data-theme="dark"] .gm-console .take-chev,
   [data-theme="dark"] .gm-console .con-caret {
     filter: drop-shadow(0 0 7px color-mix(in oklch, var(--accent) 40%, transparent));
   }
   ```
   Chevron + caret seulement — pas le texte, pas les cards. En light : rien.
2. **Hues sémantiques** : versions dark calquées sur editor.css —
   délétion `oklch(78% .12 70)` sur fond `oklch(45% .1 70 / .2)` ;
   erreur `oklch(72% .17 25)` sur fond `/ .12` ; succès 150 déjà couvert
   par le précédent `.type-click` dark.
3. **Fond dock** : `--bg-sunken` dark (12.5%) plus profond que le canvas
   — voulu, le dock s'assume « instrument » en dark. Pas d'override.
4. **Diff `+`** : le `color-mix` 7% d'accent reste lisible en dark
   (accent dark = 66%) — pas d'override.

---

## 4. Interactions clavier

Contexte : focus composer sauf mention. `⌘` = Ctrl hors macOS (Tauri).

| Touche | Contexte | Effet |
|---|---|---|
| `↵` | composer | Envoie la prise (non vide, pas de streaming en cours) |
| `⇧↵` | composer | Saut de ligne (auto-grow ≤ 5 lignes puis scroll) |
| `↹` | palette `/` ou `@` ouverte | Accepte la suggestion surlignée ; ↹ répété cycle |
| `↑ / ↓` | palette ouverte | Navigue les suggestions |
| `↑` | composer **vide** | Rappelle le prompt de la prise précédente (historique, `↓` redescend) — inclut les prises échouées |
| `Échap` | streaming | Annule la prise (abort → ligne `note interrompu`) |
| `Échap` | palette ouverte | Ferme la palette (1er), vide le composer (2e), blur (3e) |
| `⌘↵` | diff proposé visible | Appliquer (le bloc proposé le plus récent) |
| `⌘⌫` | diff proposé visible | Écarter |
| `⌘Z` | focus console, après apply | Défait le dernier diff appliqué (scope strict au focus console — ne touche pas l'undo des champs texte de l'éditeur) |
| `⇧⌘Z` | idem | Refait |
| `⌘J` | global éditeur | Toggle dock (ouvre + focus composer / replie) |
| `@` / `/` | composer | Ouvre scope picker / palette (en début de mot uniquement) |

Focus visible partout via `--ring` (`.ring-token`). Toute action
clavier a son équivalent pointeur.

---

## 5. Contrat de données UI (préparation phase 3)

Fichier cible : `src/app/tour/[id]/_components/console/types.ts`.
Signatures seulement — transport réel (route Next →
`src/lib/llm-providers/`) en phase 3 derrière un mock.

```ts
import type { TourEntry, TourStep } from "@/lib/types/tour";

/** Préfixes mono du flux de log (gutter 5ch). */
export type LogPrefix =
  | "plan" | "note"
  | "step+" | "step-" | "step~"
  | "vo~"
  | "run" | "cut" | "trim"
  | "err";

/** Opération atomique sur le tour — applicable ET inversible
 *  (le rollback du lien « défaire » inverse la liste). */
export type DiffOp =
  | { op: "insert-step"; at: number; step: TourStep }
  | { op: "remove-step"; at: number; removed: TourStep }
  | { op: "replace-step"; at: number; before: TourStep; after: TourStep }
  | { op: "set-field"; field: keyof TourEntry; before: unknown; after: unknown };

export interface TourDiff {
  ops: DiffOp[];
  /** Δ durée estimée en secondes (peut être négatif). */
  deltaSec: number;
  /** Index des steps `section` touchés — pilote les `*` de la timeline. */
  touchedSections: number[];
}

/** Carte de step rendue dans une proposition (fantôme/solide). */
export interface StepDiffCard {
  /** Quel op de TourDiff cette carte matérialise. */
  opIndex: number;
  /** Lignes +/− affichées dans la carte. */
  lines: { sign: "+" | "-" | " "; text: string }[];
}

export type TakeBlock =
  | { kind: "text"; text: string }                          // une ligne, Sans
  | { kind: "plan"; lines: { prefix: LogPrefix; text: string }[] }
  | { kind: "step-diff"; diff: TourDiff; cards: StepDiffCard[];
      state: "proposed" | "applied" | "reverted" | "discarded" }
  | { kind: "vo-diff"; stepIndex: number; before: string; after: string;
      state: "proposed" | "applied" | "reverted" | "discarded" }
  | { kind: "run-log"; job: "capture" | "vo" | "compose";
      lines: { prefix: LogPrefix; text: string }[];
      progress?: { pct: number; label: string };
      state: "proposed" | "running" | "done" | "failed" | "cancelled" }
  | { kind: "error"; code: "network" | "rate-limit" | "provider" | "no-key";
      message: string; retryInSec?: number };

export type TakeStatus =
  | "streaming" | "proposed" | "applied"
  | "discarded" | "cancelled" | "error" | "done";

export interface Take {
  id: string;
  /** Numéro affiché (#04) — stable, jamais recyclé. */
  n: number;
  prompt: string;
  /** Index du step `section` scopé via @Sn, s'il y a lieu. */
  scopeSection?: number;
  /** ISO — affiché HH:MM. */
  at: string;
  status: TakeStatus;
  blocks: TakeBlock[];
  /** Version du tour après apply (estampille `appliqué · vN`). */
  appliedVersion?: number;
}

/** Événements streamés (NDJSON ligne par ligne, pattern consumeNdjson). */
export type TakeEvent =
  | { type: "log"; prefix: LogPrefix; text: string }
  | { type: "block"; block: TakeBlock }
  | { type: "progress"; pct: number; label: string }
  | { type: "done"; status: Exclude<TakeStatus, "streaming"> };

export interface TakeRequest {
  tour: TourEntry;
  /** Historique (prises anciennes possiblement pré-compactées). */
  takes: Take[];
  prompt: string;
  scopeSection?: number;
  /** Contexte pipeline pour la narration (manifest, edit-plan…). */
  pipeline?: {
    hasCapture: boolean;
    hasVoiceover: boolean;
    hasFinal: boolean;
    editPlanSummary?: string[];
  };
}

/** Transport mockable — l'implémentation réelle vit derrière
 *  /api/motion/console et src/lib/llm-providers/. Le mock de phase 3
 *  rejoue des scénarios scriptés avec les mêmes événements. */
export interface ChatTransport {
  send(
    req: TakeRequest,
    handlers: { onEvent: (evt: TakeEvent) => void; signal: AbortSignal },
  ): Promise<void>;
  /** État de configuration BYOK — pilote l'empty state 2.8. */
  probe(): Promise<{ configured: boolean; provider?: string; model?: string }>;
}

/** Application pure d'un diff — la console mute le tour exclusivement
 *  via cette fonction puis le même onChange(tour) que le tab Script. */
export declare function applyTourDiff(tour: TourEntry, diff: TourDiff): TourEntry;
export declare function revertTourDiff(tour: TourEntry, diff: TourDiff): TourEntry;
```

Principes : la console ne touche jamais le tour directement
(`applyTourDiff` pure + `onChange(tour)` existant — une seule source de
vérité) ; les blocs `run-log` s'abonnent aux états capture/vo/compose
de l'orchestrateur sans dupliquer le pipeline ; 1 event NDJSON =
1 mutation UI, mock et transport réel indistinguables côté UI.
