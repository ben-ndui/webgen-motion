# Landing v0.3 — Wireframe & copy, section par section

> Spec de la refonte landing pour la release v0.3.0 (chat IA + landing +
> licence FSL ✅). Positionnement central : **« vidéos produit écrites
> comme du code, régénérées à chaque release »** — on vend la MÉCANIQUE,
> pas la catégorie. Cf. discussion positionnement du 2026-06-12.
>
> Base existante : `src/app/page.tsx` (Nav → Hero → Démo → Pipeline →
> Pricing → CTA → Footer, 235 lignes). On garde le squelette et la DA
> (tokens OKLCH, Geist, reveals) ; on réarme le message et on ajoute
> 4 sections. Les touches "terminal" introduites ici doivent rester
> cohérentes avec la DA du chat IA (cf. PROMPT-DESIGN-CHAT-IA.md).

---

## Hiérarchie du message (l'ordre raconte une histoire)

1. **Hero** — la promesse-mécanique (vidéos-as-code, régénérées)
2. **Démo** — la preuve (méta-démo : GEN MOTION filmé par GEN MOTION)
3. **La Boucle** *(nouveau)* — le moment "aha" : ship → re-render
4. **Pipeline** — comment ça marche, avec l'Edit Engine en vedette
5. **Cibles** *(nouveau)* — « c'est pour moi » : 3 personas, 3 jobs
6. **Comparaison honnête** *(nouveau)* — désamorcer Screen Studio / Arcade
7. **Pricing** — l'angle anti-abonnement chiffré
8. **Manifeste** *(nouveau, court)* — local-first, fair-code, client zéro
9. **CTA final** + Footer

Un visiteur pressé qui ne lit que les titres des sections doit pouvoir
reconstituer tout l'argumentaire.

---

## 0. Nav — inchangée, un ajout

- Garder : brand, liens ancres, CTA env-aware (`LandingPrimaryCta`).
- Liens : `La boucle` · `Pipeline` · `Pour qui` · `Pricing` · `Docs`.
- Ajouter à droite du CTA un badge discret mono : `fair-code · FSL`
  (lien vers section manifeste). C'est un signal de confiance dev.

## 1. Hero — la promesse-mécanique

**Objectif** : en 5 secondes, sortir de la catégorie "screen recorder".
**Message** : ta vidéo produit est un build, pas un enregistrement.

- **H1** : `Tes vidéos produit, écrites comme du code.`
- **Sous-titre** : `GEN MOTION rejoue ton produit — site web ou app
  native —, pose la voix off, monte sur la musique. Et le refait à
  l'identique après chaque release. En local, sans abonnement.`
- **CTA primaire** : existant (env-aware download / ouvrir le studio).
  **CTA secondaire** : `Voir la boucle ↓` (ancre section 3 — PAS "voir
  la démo" : on veut qu'ils comprennent la mécanique).
- **Spec-strip** (existant, à réarmer) :
  `["Fair-code", "FSL · GitHub"]` · `["Local-first", "0 cloud"]` ·
  `["Web + Mobile", "Puppeteer · Maestro"]` · `["Montage", "Edit Engine"]`
- **Visuel droite (hero-b)** : un fichier de tour JSON **stylisé
  terminal** (Geist Mono, 8-10 lignes, syntax highlight tokens) qui se
  "compile" en miniature vidéo — animation framer-motion : les lignes
  JSON s'écrivent, puis morph/wipe vers le player. C'est LA métaphore
  du produit en une image. (Réutiliser le pattern caret/chevron du
  futur chat.)

## 2. Démo — la preuve (existant, copy à réarmer)

**Objectif** : crédibilité immédiate. **Garder le player tel quel.**

- **Kicker** : `LA PREUVE PAR SOI-MÊME`
- **Titre** : `Cette vidéo a été générée par l'outil qu'elle présente.`
- **Body** : `Le pitch ci-dessous est un tour GEN MOTION : 9 sections
  scriptées en JSON, capturées par Puppeteer, voix off ElevenLabs,
  montage automatique. Quand l'app change, on relance — la vidéo se
  régénère.` + lien mono `voir le tour source → tours/webgen-motion-pitch.json`
  (lien GitHub — transparence radicale, personne d'autre ne peut faire ça).

## 3. La Boucle *(NOUVEAU — la section signature)*

**Objectif** : le moment "aha" qui nous sépare de tous les concurrents.
**Message** : les vidéos des autres pourrissent ; les tiennes se régénèrent.

- **Kicker** : `SHIP → RE-RENDER`
- **Titre** : `La vidéo de démo qui ne pourrit jamais.`
- **Body court** : `Un enregistrement manuel est mort à ton prochain
  redesign. Un tour GEN MOTION est du JSON versionné dans ton repo :
  ton produit change, tu relances, la vidéo est fraîche. Même voix,
  même musique, mêmes cuts.`
- **Visuel central — frise en 3 temps** (cards horizontales reliées) :
  1. `v1.0` mini-thumbnail vidéo + tag mono `tour.json`
  2. **commit** `feat: nouveau dashboard` (ligne git stylisée)
  3. `v1.1` thumbnail mise à jour + badge `re-render · 4 min`
  En dessous, une ligne terminal animée :
  `❯ gen capture && gen compose` ... `✓ final.mp4 régénéré`
- **3 puces bénéfices** : `Une vidéo par release` · `Démo qui ne peut
  pas mentir (vraie app, vrais clics)` · `Industrialisable (10 clients
  = 10 vidéos)`

## 4. Pipeline — comment, avec l'Edit Engine en vedette

**Objectif** : montrer la profondeur sans noyer. L'existant a 3 steps ;
passer à **4 cards** et donner à l'Edit Engine le traitement héros.

1. **Script** — `Décris ton tour en JSON — ou laisse l'agent IA
  l'écrire pour toi.` (prépare l'arrivée du chat, mention sobre)
2. **Capture** — `Puppeteer (web) ou Maestro (iOS/Android) rejouent
  ton produit, section par section.`
3. **Voix off** — `ElevenLabs (voix clonée) ou Voicebox 100% local.
  Alignement au mot près.`
4. **Edit Engine + Compose** ⭐ — `Un monteur dans le pipeline : temps
  morts coupés, cuts calés sur les beats, J-cuts, crossfades adaptés à
  la musique. Puis Remotion compose en frame-accurate.`
  - **Preuve chiffrée** en encart mono : `uzme-landing · 38.4s capturés
    → 22.1s montés · 4/4 cuts sur le beat` (vrais chiffres du test).
  - Micro-lien : `le plan de montage est inspectable → edit-plan.json`.
- Sous la grille, une ligne d'icônes "aussi dans la boîte" (renvoie
  section 6 features ou tooltip) : frames 3D · sous-titres karaoké ·
  export OTIO · hotspots punch-in.

## 5. Pour qui *(NOUVEAU)* — 3 personas, 3 jobs

**Objectif** : que chaque cible se reconnaisse en une carte.
**Forme** : 3 cards égales (pas de tabs — tout visible au scroll).

1. **Agences & studios**
   - Titre : `Livrez une vidéo de lancement avec chaque site.`
   - Body : `Un livrable facturable en plus du site — une vidéo motion
     60s coûte 500 à 2000 € en prestation. Branding par client,
     captures sous NDA qui ne quittent jamais votre machine.`
   - Tag mono : `white-label en Enterprise`
2. **Founders & indie hackers**
   - Titre : `Une vidéo par release.`
   - Body : `Changelog vidéo, lancement Product Hunt, posts réseaux en
     9:16 sous-titrés — sans rouvrir un logiciel de montage à chaque
     update.`
   - Tag mono : `subtitles: true · 9:16`
3. **Équipes mobile**
   - Titre : `Vos App Store previews, scriptés.`
   - Body : `Maestro pilote votre app dans le simulateur, GEN MOTION
     filme, monte et habille dans un iPhone 3D. Re-générez à chaque
     version soumise.`
   - Tag mono : `platform: "ios" · Maestro`

## 6. Comparaison honnête *(NOUVEAU)*

**Objectif** : désamorcer la comparaison au lieu de la subir. Le ton
honnête est un différenciateur de confiance (et qualifie les leads).

- **Kicker** : `CHOISIS LE BON OUTIL` — **Titre** : `On n'est pas fait
  pour tout le monde.`
- Tableau 3 colonnes, formulation respectueuse :
  | | Screen Studio | Arcade / Storylane | **GEN MOTION** |
  |---|---|---|---|
  | Vous voulez… | une belle vidéo, une fois, à la main | des démos interactives pour le marketing | des vidéos **reproductibles** qui survivent aux releases |
  | Méthode | enregistrement manuel | éditeur no-code SaaS | **tour as code** (JSON dans git) |
  | Quand le produit change | ré-enregistrer | rééditer | **re-render** |
  | Mobile natif | mirroring manuel | — | **scripté (Maestro)** |
  | Vos données | local | leur cloud | **local, jamais uploadé** |
  | Prix | one-time | ~38 $/mois/siège | **49 $ one-time** |
- Une ligne de bas de tableau assumée : `Si vous ne ferez qu'UNE vidéo,
  prenez Screen Studio — sincèrement. Si vous shippez chaque semaine,
  on est fait pour vous.`

## 7. Pricing — l'angle anti-abonnement (existant, à affûter)

- Garder la structure 3 tiers. Ajouts :
  - Au-dessus des cards : `Un outil qu'on possède, pas un abonnement
    qu'on subit.` + sous-ligne chiffrée : `Arcade : ~456 $/an/siège.
    GEN MOTION Studio : 49 $ une fois, mises à jour à vie.`
  - Tier note Community déjà à jour (`Fair-code · FSL · MIT après 2 ans`).
  - Sur la card Studio, lister les NOUVELLES armes en premier :
    `Export timeline .otio (Resolve/Premiere)` · `Frames 3D` ·
    `Presets Cinematic & Glitch` · `Music library` · `Multi-format`.

## 8. Manifeste *(NOUVEAU, court — 3 colonnes texte, pas de cards)*

**Objectif** : l'ancrage confiance/identité pour les devs et agences.

1. **Local-first, vraiment.** `Captures, voix, renders : tout reste
   sur ta machine. Aucun compte requis pour le pipeline.`
2. **Fair-code.** `Code source lisible et auditable (FSL). Chaque
   version devient MIT après 2 ans. Pas de rug-pull possible : c'est
   dans la licence.`
3. **Client zéro.** `GEN MOTION est né dans une agence (Smooth &
   Design, Nice) qui livrait des sites et voulait livrer leurs vidéos.
   On utilise l'outil tous les jours pour nos propres clients.`

## 9. CTA final + Footer

- **Titre** : `Ta prochaine release mérite sa vidéo.`
- Sous-ligne existante à jour (`source-available FSL`). Garder le CTA
  env-aware + lien docs. Footer inchangé.

---

## Notes d'implémentation

- **Aucune nouvelle dépendance** : reveals existants + framer-motion
  pour l'animation hero (JSON → vidéo) et la ligne terminal de la
  Boucle. Toutes les touches terminal en `var(--font-mono)` + tokens.
- **Réutiliser** : `.section`, `.spec-strip`, `.tier`, `.video-frame`,
  pattern kicker. Nouvelles classes : `.loop-strip`, `.persona-grid`,
  `.compare-table`, `.manifesto`.
- **data-wm-id** sur chaque nouveau bloc (`landing.loop.*`,
  `landing.personas.*`, `landing.compare.*`, `landing.manifesto.*`) —
  et ça nous servira à hotspoter la landing dans le pitch vidéo 😏.
- **Assets à produire** : 2 thumbnails v1.0/v1.1 pour la Boucle
  (extraits de vrais renders uzme), chiffres Edit Engine déjà vrais.
- **SEO/meta** : title → `GEN MOTION — Vidéos produit as code,
  régénérées à chaque release` ; description déjà migrée FSL.
- **Ce qu'on ne dit PAS** : "plus beau que X", "le meilleur", "IA
  magique". Le ton : précis, technique, sûr de sa niche.
