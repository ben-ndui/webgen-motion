# Director's Console — 3 directions créatives

> Phase 1 du brief `PROMPT-DESIGN-CHAT-IA.md`. Session design autonome,
> validation Ben attendue avant la maquette détaillée (Phase 2).
>
> Cadre commun aux trois directions : panneau docké à droite de
> l'éditeur (`/tour/[id]`, grille `.two-col` étendue en mode dock
> ~420px, repliable en rail), tokens OKLCH stricts, Geist Sans/Mono,
> lucide-react, framer-motion piloté par `--motion`, streaming NDJSON
> mappé sur des blocs typés, mutations via le même `onChange(tour)` que
> le tab Script. Aucune couleur hardcodée, aucun emoji UI, aucune bulle.

---

## Direction A — « Feuille de service »

### Concept

Le chat est un **document de production qui s'écrit**, pas une
conversation. Sur un plateau de cinéma, la feuille de service (call
sheet) est le document que le 1er assistant réalisateur tient à jour :
qui fait quoi, quand, ce qui a changé depuis hier. Ici, l'IA **est** ce
1er assistant : chaque échange s'inscrit dans un log continu, horodaté,
à préfixes mono (`brief`, `plan`, `step+`, `step−`, `vo~`, `cut`,
`run`). L'utilisateur ne « discute » pas avec un bot — il dicte des
notes de réalisation, et l'assistant les transforme en amendements
formels au scénario. La mémoire de la session est un objet en soi : on
remonte le document comme on feuillette les pages d'une feuille de
service annotée, et chaque diff appliqué laisse une trace `applied · v4`
qui fait du log un **journal de bord versionné** du tour. Ce qui la rend
mémorable : l'interface a l'autorité tranquille d'un document
professionnel — on lit le chat comme on lit un rapport de tournage, et
on a confiance.

### Moodboard verbal

- **Rythme typographique** : une colonne de gutter mono (timecode
  `14:02` + préfixe 6 chars alignés à droite) puis le contenu en Geist
  Sans `--t-sm` pour le texte IA, Mono `--t-mono` pour tout ce qui est
  donnée (sélecteurs, durées, deltas). Les préfixes sont le squelette
  visuel : `plan` en `--muted`, `step+` en accent, `step−` en oklch
  warning (réutilise le hue 70 des `.rcheck.warn`), `vo~` en `--ink-soft`.
- **Tokens** : fond du panneau `--bg-sunken` (comme le `compile-card`),
  entrées sur `--surface` uniquement quand ce sont des cards. Lignes de
  continuation avec une fine règle verticale `--line-soft` sous le
  préfixe (l'IA « développe » son plan comme un thread de log indenté).
- **En-tête** : timeline ASCII du tour `[S1 4.1s]──[S2 6.5s]──[S3]` en
  mono 11px, total à droite. Quand un diff est appliqué, le segment
  concerné pulse une fois en `--accent` et la durée se met à jour
  (framer-motion layout, 300ms).
- **Motion** : les entrées de log apparaissent ligne par ligne (stagger
  60ms, fade + translateX(-6px) — exactement le `compile-line` de la
  landing). Les step-cards proposées « se déplient » depuis leur ligne
  de log (height auto + opacity, origin top). Caret block accent qui
  clignote dans la zone de saisie `❯`.
- **À l'écran** : un document dense mais aéré (padding `--s-4`), zéro
  avatar, zéro bulle. La zone de saisie est une ligne de prompt collée
  en bas, bordure top `--line`, avec hint `/commandes` en `--faint`.

### ASCII-mockup — état « proposition de diff reçue »

```
┌──────────────────────────────────────────────────────────────┐
│ FEUILLE DE SERVICE          uzme-landing · v3       [─] [⤢]  │
│ [S1 4.1s]──[S2 6.5s]──[S3 5.2s]──[S4 8.0s]      total 23.8s  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 14:02  brief   ▸ raccourcis la section 2 et ajoute un        │
│                  hotspot sur le bouton Réserver              │
│                                                              │
│ 14:02  plan    2 modifications sur S2 — Dashboard            │
│        │       lecture du scénario… ok (14 steps)            │
│        │       S2 porte 2.4s de temps morts                  │
│                                                              │
│ 14:02  step~   ┌────────────────────────────────────────┐    │
│                │ WAIT     dwell                          │    │
│                │ − "dwellMs": 2400                       │    │
│                │ + "dwellMs": 800              Δ −1.6s   │    │
│                └────────────────────────────────────────┘    │
│                                                              │
│ 14:02  step+   ┌────────────────────────────────────────┐    │
│                │ SECTION  Dashboard · hotspot            │    │
│                │ + t 3.2s · x .62 y .41 · zoom 2.1       │    │
│                │ + label "Clique pour réserver"          │    │
│                └────────────────────────────────────────┘    │
│                                                              │
│ 14:02  vo~     « Réservez votre créneau en deux clics. »     │
│                                                              │
│        Δ S2 : 6.5s → 4.9s        [ Écarter ]  [ Appliquer ]  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ ❯ █                                             /commandes   │
└──────────────────────────────────────────────────────────────┘
```

(Les cards `step~` / `step+` réutilisent littéralement `.step` +
`.type-badge` de `editor.css` — le pont visuel conversation → scénario
est gratuit.)

### Forces / risques

**Forces**
- Le storytelling « plateau de tournage » est unique, aligné produit
  (le `summary[]` de l'edit-plan se verse naturellement dans ce log :
  `cut · 4/4 cuts snappés sur la musique`).
- Le gutter timecode + préfixes donne une scannabilité exceptionnelle
  des sessions longues — on retrouve un diff d'il y a 20 minutes d'un
  coup d'œil.
- La timeline ASCII en en-tête fait du panneau un instrument, pas un
  chat : l'état du tour est toujours visible.

**Risques**
- Le gutter fixe (timecode + préfixe) mange ~110px : à 420px de dock,
  le contenu respire moins ; il faudra un mode replié du gutter.
- La métaphore « document » peut rigidifier la conversation : poser une
  question libre à l'IA (« pourquoi t'as coupé ça ? ») rentre mal dans
  une taxonomie de préfixes — il faut un préfixe fourre-tout (`note`)
  qui risque de diluer le système.

---

## Direction B — « Prises » (le REPL éditorial)

### Concept

Chaque échange est une **prise numérotée** — `#01`, `#02`, `#03` —
comme les takes d'un tournage, et l'interface est un REPL : un prompt
chevron `❯` en bas, et au-dessus, l'historique des prises. La rupture
avec le chat classique : **l'IA ne répond pas en texte, elle répond en
blocs typés** — un bloc `plan` (une ligne mono de résumé), des
step-cards, un bloc diff, un bloc `run` quand elle propose de lancer le
pipeline. Le texte libre existe mais il est rare et court ; la matière
première de la réponse, ce sont des objets manipulables. C'est la
continuation directe du langage déjà établi sur la landing : le
`compile-card` (`❯ gen capture && gen compose`, caret block, tab
`tour.json`) devient une surface vivante dans l'éditeur. Les slash
commands (`/capture`, `/vo`, `/compose`, `/undo`) s'autocomplètent en
palette au-dessus du prompt, et chaque prise appliquée s'estampille
`appliqué · v4` — l'historique des prises EST l'historique des versions.
Mémorable parce que radicalement honnête : on tape une commande, la
machine rend des artefacts, on les commit. Un REPL pour réalisateurs.

### Moodboard verbal

- **Rythme typographique** : alternance stricte — la ligne de commande
  utilisateur en Mono `--t-xs` couleur `--ink` précédée de `#NN ❯`
  (numéro en `--faint`, chevron en `--accent`) ; les blocs de réponse
  indentés de 16px, séparés par `--s-4`. Le sans-serif n'apparaît que
  dans le contenu des step-cards — l'armature du flux est 100% mono.
- **Tokens** : panneau sur `--bg-sunken`, header façon `compile-tab`
  (dot accent + `console` + nom du tour + durée totale mono). Blocs
  diff : lignes `+` sur `--accent-soft` / texte `--accent`, lignes `−`
  sur l'oklch warning hue 70 déjà présent dans `.rcheck.warn`, le tout
  dans un conteneur `--surface` radius `--r-md` bordé `--line`.
- **Motion** : pendant le streaming, les lignes `plan` tombent une par
  une (le pattern NDJSON du repo mappe naturellement 1 event = 1 ligne) ;
  les step-cards se « matérialisent » avec un scale 0.98→1 + fade
  (200ms, ease du `.panel`). Le bouton Appliquer, une fois cliqué,
  se replie en estampille mono `appliqué · v4 · 14:02` — la prise
  devient un fait accompli, immuable visuellement.
- **À l'écran** : un flux vertical sobre, sans timecodes ni gutter —
  la densité vient des numéros de prise. En bas, le prompt avec caret
  block accent clignotant, et une ligne d'hints `/capture /vo /compose`
  en `--faint` qui devient palette (popup `--shadow-pop`) dès `/`.
- **Dark mode** : le panneau assume davantage le terminal — fond
  `--bg-sunken` plus profond, et le chevron/caret gagnent une lueur
  très légère `0 0 12px` en accent à 20% (le « phosphore » évoqué au
  brief, invisible en light).

### ASCII-mockup — état « proposition de diff reçue »

```
┌──────────────────────────────────────────────────────────┐
│ ● console            uzme-landing · v3          23.8s    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ #03 ❯ réécris la voix off de l'intro, plus sobre         │
│                                                          │
│     vo~ S1 · intro                                       │
│     ┌──────────────────────────────────────────────┐     │
│     │ − « GEN MOTION ! La révolution du motion… »  │     │
│     │ + « GEN MOTION. Vos démos produit,           │     │
│     │ +   générées localement. »                   │     │
│     └──────────────────────────────────────────────┘     │
│     appliqué · v3 · 14:01                                │
│                                                          │
│ #04 ❯ ajoute un hotspot sur le bouton Réserver           │
│                                                          │
│     plan  1 step modifié · S2 — Dashboard                │
│                                                          │
│     ┌──────────────────────────────────────────────┐     │
│     │ SECTION  Dashboard                           │     │
│     │ + hotspot  t 3.2s · (.62, .41) · zoom 2.1    │     │
│     │ + label    "Clique pour réserver"            │     │
│     └──────────────────────────────────────────────┘     │
│                                                          │
│     Δ durée +0s · 1 step       [ Écarter ] [ Appliquer ] │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ ❯ █                                                      │
│   /capture   /vo   /compose   /undo              ↹ tab   │
└──────────────────────────────────────────────────────────┘
```

### Forces / risques

**Forces**
- Cohérence maximale avec l'existant : le `compile-card` de la landing
  est littéralement la promesse marketing de cette interface — le
  produit tient sa promesse au pixel près.
- L'architecture « 1 event NDJSON = 1 bloc typé » est la plus simple et
  la plus robuste à implémenter : le streaming, les états d'erreur et
  le replay d'historique tombent naturellement du pattern
  `consumeNdjson` déjà en place.
- Les slash commands + numéros de prise donnent un modèle mental de
  versionnage gratuit (`/undo` = revenir à la prise #03).

**Risques**
- Moins narratif que A : sans les préfixes timecodés, les explications
  de l'Edit Engine (« 16.3s de temps morts coupés ») ont moins de
  scène pour briller — il faut soigner le bloc `run`/`cut` pour
  compenser.
- Le côté commande peut intimider le persona marketer non-dev ; le
  premier message d'accueil et les placeholders doivent montrer qu'on
  peut écrire en langage naturel, pas seulement en slash commands.

---

## Direction C — « Copie de travail » (la marge du monteur)

### Concept

La direction radicale : **il n'y a pas de fil de chat**. Au montage
argentique, la « copie de travail » (workprint) est la pellicule que le
monteur marque au crayon gras — les annotations vivent SUR le film, pas
à côté. Ici, le panneau est organisé autour d'une **bande verticale du
tour** (mini step-cards condensées = la pellicule) qui occupe une
colonne fine à gauche, et la conversation vit dans la **marge** à
droite, ancrée aux steps qu'elle concerne. Quand l'utilisateur écrit
« ajoute un hotspot sur Réserver », la réponse de l'IA ne s'empile pas
dans un historique : elle **se matérialise dans la bande** sous forme de
cartes fantômes (`░` hachurées, teintées `--accent-soft`) insérées à
leur position réelle dans le scénario, avec les annotations `+`/`−`
en marge connectées par un filet. Appliquer un diff = les cartes
fantômes se solidifient et la bande se recompacte. Le prompt en bas
accepte un scope (`@S2 …`) qui surligne la zone visée pendant la
frappe. L'historique de conversation existe mais en couche secondaire
(`⌥ historique`). Mémorable parce qu'elle abolit la distance entre
discuter et éditer : on ne parle pas DU scénario, on écrit DANS le
scénario.

### Moodboard verbal

- **Rythme typographique** : la bande est ultra-condensée — type-badges
  mono 9px + durée mono, rien d'autre ; toute la richesse typographique
  vit dans la marge (annotations IA en `--t-xs` sans, données en mono).
  Contraste fort entre la colonne machine (bande) et la colonne humaine
  (marge) — c'est le duo Geist Mono / Geist Sans spatialisé.
- **Tokens** : bande sur `--bg-sunken` avec un filet `--line-strong` de
  séparation ; cartes fantômes en `--accent-soft` bordure dashed
  `--accent-line` (le pattern `.add-step` dashed existe déjà) ; steps
  supprimés barrés, teinte warning hue 70. Filets de connexion
  bande↔marge en `--line-strong`, 1px.
- **Motion** : c'est ici que `--motion` brille — insertion des cartes
  fantômes avec un layout-shift animé de la bande (framer-motion
  `layout`), solidification à l'Apply (dashed→solid, fond
  accent-soft→surface, 350ms), recompactage des durées. Le scope `@S2`
  pulse le segment visé. Streaming : les annotations s'écrivent dans la
  marge ligne à ligne, le filet de connexion se trace (scaleX).
- **À l'écran** : un instrument de monteur — on voit TOUJOURS le tour
  entier, l'œil ne quitte jamais la matière. Prompt en bas pleine
  largeur, chevron accent, caret block.

### ASCII-mockup — état « proposition de diff reçue »

```
┌────────────────────────────────────────────────────────────────┐
│ COPIE DE TRAVAIL · v3        ⌥ historique       23.8s → 22.2s  │
├──────────────┬─────────────────────────────────────────────────┤
│  BANDE       │  MARGE                                          │
│              │                                                 │
│ ▮ S1 intro   │                                                 │
│ │ 4.1s       │                                                 │
│              │                                                 │
│ ▮ S2 dash ───┼── ❯ ajoute un hotspot sur Réserver       14:02  │
│ │ 6.5s       │    plan : 1 ajout, 1 trim sur S2                │
│ │            │                                                 │
│ ░ hotspot ───┼── + t 3.2s · (.62, .41) · zoom 2.1              │
│ ░ (proposé)  │    label "Clique pour réserver"                 │
│ │            │                                                 │
│ ▮ wait    ───┼── − dwell 2400 → 800              Δ −1.6s       │
│ │ 2.4s ̶  ̶ ̶   │                                                 │
│              │                                                 │
│ ▮ S3 voix    │      [ Écarter ]  [ Appliquer à la bande ]      │
│ │ 5.2s       │                                                 │
│              │                                                 │
│ ▮ S4 outro   │                                                 │
│ │ 8.0s       │                                                 │
├──────────────┴─────────────────────────────────────────────────┤
│ ❯ @S2 █                                                        │
└────────────────────────────────────────────────────────────────┘
```

### Forces / risques

**Forces**
- Le pont conversation→scénario n'est plus un pont, c'est une fusion :
  le diff est vu À SA POSITION réelle — aucune charge mentale de
  projection (« la section 2, c'est laquelle déjà ? »).
- Spectaculaire en démo : c'est l'interface qu'on filme pour le pitch
  GEN MOTION, personne d'autre n'a ça.
- Le scope `@S2` est un pattern d'adressage puissant qui réduit
  l'ambiguïté des prompts et donc le coût LLM des allers-retours.

**Risques**
- Coût d'implémentation nettement supérieur : double colonne
  synchronisée, ancrage des annotations, layout-shifts animés — et la
  bande duplique partiellement le tab Script (risque de désync
  perceptuelle entre deux représentations du même tour).
- Les conversations non-spatiales (questions ouvertes, pilotage
  pipeline, explications Edit Engine) n'ont pas d'ancre naturelle dans
  la bande — il faut une zone « marge libre » qui réintroduit de facto
  un mini-chat.
- À 420px de dock, deux colonnes c'est serré ; cette direction demande
  presque un mode étendu (~560px) pour exister pleinement.

---

## Recommandation

**Je recommande la direction B — « Prises », avec deux vols assumés.**

Pourquoi B :

1. **C'est la promesse déjà signée.** La landing v0.3 vend GEN MOTION
   « as code » avec un terminal au chevron accent et un caret block ;
   le hero `compile-card` est un teaser fonctionnel de cette interface.
   B est la seule direction où le produit ressemble exactement à son
   marketing — cohérence rare, et la DA n'a rien à inventer, juste à
   amplifier (`compile-tab`, `compile-chevron`, `compile-caret` ont
   déjà leurs classes).
2. **C'est l'architecture la plus honnête techniquement.** Le repo
   parle déjà NDJSON ligne par ligne ; « 1 event = 1 bloc typé » donne
   un streaming naturel, un replay d'historique trivial, et des états
   erreur/vide/sans-clé qui sont juste des blocs de plus. Moins de
   risque = plus de budget pour les micro-interactions qui rendent
   l'interface mémorable (matérialisation des cards, estampille
   `appliqué`, palette slash).
3. **Le modèle « prise numérotée » résout le versionnage UX
   gratuitement** : l'historique des versions appliquées (exigence 3 du
   brief) n'est pas un écran à part, c'est la colonne vertébrale du
   flux, et `/undo` a un référent visuel évident.

Ce que je vole aux deux autres :

- **À la « Feuille de service » (A)** : le vocabulaire de préfixes mono
  (`plan`, `step+`, `vo~`, `cut`, `run`) pour les lignes de streaming à
  l'intérieur d'une prise, et la **timeline ASCII du tour en en-tête**
  qui pulse quand un diff est appliqué. C'est aussi par ces préfixes
  que le `summary[]` de l'Edit Engine devient narration
  (`cut · 4/4 cuts snappés sur la musique`) — le meilleur de A sans son
  gutter encombrant.
- **À la « Copie de travail » (C)** : le **scope `@S2`** dans le prompt
  (autocomplété comme les slash commands), et la **solidification** —
  quand un diff est appliqué, les step-cards de la prise passent
  dashed→solid avec un écho visuel vers le tab Script, pour garder ce
  sentiment que la conversation écrit dans la matière. C, en entier,
  reste une excellente cible v2 pour un mode étendu plein écran (le
  mode création depuis `/dashboard`), une fois le transport et le
  moteur de diff éprouvés dans B.

Prochain pas (Phase 2, après validation) : maquette détaillée de B —
tous les états (vide, saisie, streaming, diff reçu, appliqué, erreur
LLM, pas de clé → `/setup/agent`, session longue), light + dark,
desktop ≥ 1200px.
