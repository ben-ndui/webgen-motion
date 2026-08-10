# GEN MOTION — Handoff produit & landing

> Document de travail pour Claude Code. Repo : `ben-ndui/webgen-motion` · Site : `genmotion.app` (Next.js, App Router).
> Trois parties : **A.** correctifs landing · **B.** positionnement concurrentiel · **C.** spike « import de tests existants ».
> **La partie C est prioritaire sur tout le reste** — elle peut invalider une partie de la partie A (la copy de la landing dépend du différenciateur qu'on choisit de mettre en avant).

---

# PARTIE A — Audit de la landing

## A.0 — Ce qui fonctionne, à ne pas casser

- Le positionnement **« vidéos produit as code / re-render à chaque release »**.
- La section preuve : **« Cette vidéo a été générée par l'outil qu'elle présente »** + lien vers le tour JSON source. Meilleur asset de la page.
- Le tableau comparatif et sa ligne d'auto-disqualification (« si vous ne ferez qu'une vidéo, prenez un screen recorder, sincèrement »).
- Le manifeste fair-code FSL → MIT après 2 ans (anti rug-pull).
- Le ton direct, sans vocabulaire marketing.

Toute modif qui dilue un de ces points est une régression.

---

## A.1 — P0 · Bloquants conversion

### A.1.1 — Le pricing se cannibalise

**Problème.** Trois points de prix : `199 € à vie` (avec « mises à jour à vie »), `15 €/mois`, `120 €/an`. L'abonnement annuel devient strictement perdant face au lifetime au bout de **20 mois**. Le visiteur fait le calcul en 3 secondes et, au lieu d'acheter, il hésite. Une offre qui se compare défavorablement à elle-même produit de l'inaction.

**Décision à trancher par Smooth avant toute implémentation :**

- **Option A — Supprimer l'abonnement.** Community gratuit / Studio 199 € à vie. Le plus lisible, cohérent avec « un outil qu'on possède ».
- **Option B — Borner le lifetime.** `Studio 199 €` = licence perpétuelle + **12 mois de mises à jour**, renouvellement optionnel (~79 €/an) pour continuer à recevoir les updates. Modèle JetBrains / Sublime. L'abo mensuel redevient une porte d'entrée basse et non un doublon.

**À implémenter une fois tranché :**
- Un seul bloc de pricing sur la home, cohérent avec `/download`. Supprimer l'indirection « Voir les offres Studio » → le prix doit être décidable sur la home.
- Retirer `« 199 € à vie ou dès 15 €/mois »` du tableau comparatif si Option A.
- Cohérence de devise sur l'ancrage `~456 $/an/siège` : convertir en € ou sourcer.

**Acceptation.** Un visiteur froid peut dire en 10 s combien coûte le produit et pourquoi choisir une offre plutôt que l'autre.

---

### A.1.2 — Le watermark caché

**Problème.** Studio liste `« sans watermark »`. Par déduction, Community en appose un — mais ce n'est écrit nulle part côté Community. Sur une page dont l'argument central est la transparence, une limitation découverte après téléchargement coûte plus cher en confiance qu'elle ne rapporte en upsell.

**Fix.**
- Ajouter explicitement dans Community : `Watermark GEN MOTION sur les exports`. Formulation neutre, sans excuse.
- Si le watermark est discret, le préciser (ça désamorce la peur du bandeau plein écran).
- Idéalement : une frame d'export Community visible en lightbox.

**Acceptation.** Faire un diff des deux listes : chaque item Studio doit avoir son pendant explicite côté Community. Aucune limitation ne doit être découvrable uniquement par déduction.

---

### A.1.3 — La contrainte macOS Apple Silicon est invisible

**Problème.** `macOS Apple Silicon · .dmg notarisé` n'apparaît qu'en bas de page. Le CTA du hero ne dit rien d'Intel, Windows ou Linux.

**Fix.**
- Sous le CTA du hero : `macOS 13+ · Apple Silicon (M1 et +) · .dmg notarisé`.
- Lien secondaire `Windows / Linux ?` → capture email (waitlist = donnée qualifiée gratuite) ou phrase honnête.
- Idem sur `/download`.

**Acceptation.** La contrainte de plateforme est lisible sans scroll, à moins de 100 px du bouton de téléchargement principal.

---

## A.2 — P1 · Cohérence & crédibilité

### A.2.1 — Tutoiement / vouvoiement incohérent

- Hero : `tes vidéos`, `ton produit`, `ta machine` → **tu**
- Section « Pour qui » : `Livrez`, `votre machine`, `Vos App Store previews` → **vous**
- Tableau comparatif : `Vous voulez…`, `Vos données` → **vous**
- Éditions et manifeste : `tu` → **tu**

**Fix.** Uniformiser sur le **tutoiement** (cohérent avec le ton indie/dev et la majorité du contenu). Repasser `#personas` et les en-têtes de lignes de `#compare`.

**Acceptation.** `grep -i "vous\|votre\|vos "` sur les composants landing ne retourne que des occurrences intentionnelles.

---

### A.2.2 — Tension « 0 cloud requis » vs ElevenLabs / Claude BYOK

**Problème.** Le hero affiche `Local-first · 0 cloud requis`, le manifeste dit `Aucun compte requis pour le pipeline`. Mais ElevenLabs et l'agent Claude sont dans le pipeline documenté, et la démo officielle tourne à l'ElevenLabs. Techniquement défendable, mais la cible dev y verra une contradiction.

**Fix.** Rendre la frontière explicite plutôt que l'atténuer. Sous « Local-first, vraiment » :

> Deux appels réseau sont **optionnels** et sous ton contrôle : la voix ElevenLabs (remplaçable par Voicebox, 100 % local) et l'agent d'écriture Claude (ta clé, ton compte). Tes captures d'écran, elles, ne quittent jamais ta machine — jamais, dans aucune configuration.

**Acceptation.** Un lecteur sceptique trouve la réponse à « oui mais ElevenLabs c'est du cloud ? » sans quitter la page.

---

### A.2.3 — CTA Enterprise mal câblé

`Enterprise → /about`. Une page « à propos » ne convertit pas une demande entreprise. Router vers un formulaire court (nom, société, besoin, volume) ou un Calendly. À défaut, un `mailto:` avec objet pré-rempli reste supérieur.

---

### A.2.4 — Zéro preuve sociale externe

Toute la crédibilité est auto-produite (démo générée par l'outil, « client zéro »). Pour un achat à 199 €, c'est le frein résiduel principal.

Par coût croissant : compteur d'étoiles GitHub via API (`stargazers_count`, cache ISR 1 h) · logos clients agence (avec accord) · une citation réelle nom + rôle + photo · à défaut une galerie de 3-4 vidéos réelles générées avec l'outil.

**Interdit.** Témoignages inventés ou logos non autorisés — incompatible avec le positionnement.

---

## A.3 — P2 · Polish & SEO

- **Démo 102 s** : ajouter (sans remplacer) un cut de 20-25 s en autoplay muet dans le hero. `poster` sur la balise `<video>`, `preload="metadata"` pour le LCP.
- **JSON-LD `SoftwareApplication`** : `name`, `operatingSystem: "macOS"`, `applicationCategory`, `offers`. `meta-keywords` est ignoré par Google, ne pas y investir.
- **FAQ absente** — 5 questions max, avant le CTA final. Les trois obligatoires :
  1. « Ça marche avec une app derrière un login ? » (auth, seed data, staging)
  2. « Combien de temps pour un premier tour depuis zéro ? »
  3. « Que se passe-t-il si mon UI change et que le sélecteur casse ? » ← **la plus dangereuse**, elle attaque la promesse du re-render. Y répondre franchement (stratégie de sélecteurs, fallback, message d'erreur clair) convainc plus que l'ignorer.
- Contraste des badges hero en mode clair (WCAG AA).
- La ligne `38.4s capturés → 22.1s montés · 4/4 cuts sur le beat` est excellente : la remonter plus haut, c'est le chiffre qui fait cliquer un dev.
- `/api/download/macos-arm64` doit renvoyer une erreur explicite, pas un 500, si l'artefact est indisponible.

**Ordre d'exécution partie A :** A.1.1 (décision d'abord) → A.1.2 + A.1.3 → A.2.1 → A.2.2 + A.2.3 → A.3 FAQ → A.2.4 → reste P2.

---

# PARTIE B — Positionnement concurrentiel

## B.1 — État du marché (recherche août 2026)

| Catégorie | Acteurs | Menace |
|---|---|---|
| Screen recorders premium | Screen Studio, Tella, Focusee | Faible — manuel, one-shot. Déjà traité dans le tableau. |
| Démos interactives SaaS | Arcade, Storylane, Supademo, Guidde | Faible — besoin différent (cliquable embarqué, pas de vidéo). |
| Frameworks vidéo programmatique | Remotion, Rendervid | Nulle — c'est une brique, pas un concurrent. À surveiller côté licence : Remotion est gratuit ≤ 3 personnes, 100 $/mois au-delà. |
| **Génération de démo narrée en CI** | **PageBolt.dev** | **Élevée — concurrent frontal.** |
| OSS « demo-as-code » | Repos GitHub taggés `demo-as-code` (YAML → vidéo via Playwright) | Moyenne — érode la nouveauté du concept. |

## B.2 — PageBolt.dev, le concurrent réel

API cloud qui transforme un flow web en vidéo démo narrée (voix IA, tooltips, curseur animé), depuis un script ou depuis la CI. GitHub Action où un agent IA lit le diff de la PR, inspecte le preview deployment, décide du flow à filmer et poste la vidéo en commentaire — sans fichier de spec. À partir de 9 $/mois, free tier 100 req/mois. Serveur MCP pour Claude / Cursor / Windsurf.

**Conséquence directe : « video as code » n'est plus un différenciateur.** La landing ne peut plus reposer uniquement dessus.

**Terrain à ne PAS disputer.** La GitHub Action et l'agent qui lit les PR. Ils ont l'avance, le cloud et le prix. Y aller, c'est perdre chez eux.

## B.3 — Ce qui reste défendable, par ordre de solidité

1. **Local-first / NDA.** PageBolt est une API cloud : les captures partent chez eux. Pour une agence sous NDA, c'est rédhibitoire. Argument n°1, à pousser plus fort qu'aujourd'hui.
2. **Mobile natif via Maestro.** Personne d'autre ne fait les App Store previews scriptées. Marché probablement le plus défendable — et actuellement enterré en 3ᵉ carte de `#personas`.
3. **La couche montage.** Edit Engine, cuts sur les beats, J-cuts, export `.otio`. Les concurrents sortent un MP4 brut de capture ; GEN MOTION sort du monté.
4. **App desktop.** Une agence ne branche pas une GitHub Action. PageBolt vise le dev en CI ; GEN MOTION peut viser le studio qui livre un site.

**Faiblesse structurelle à assumer.** macOS ARM only face à des concurrents cloud cross-platform par nature. Handicap sur la vitesse d'adoption, à compenser par la profondeur produit, pas par la course aux features.

## B.4 — Pistes de différenciation évaluées

**Retenue (voir partie C) — l'import de tests existants.** Un dev qui ship chaque semaine a déjà écrit ses parcours en Playwright. Ce sont les mêmes clics que la vidéo. Importer un test → générer un tour fait tomber le coût d'entrée à zéro. Et ça retourne la pire objection : si la vidéo se génère, c'est que le parcours marche. **La vidéo marketing devient un smoke test.** Un outil cloud de capture ne peut pas copier ça : il n'a pas accès au repo de tests.

**Retenue — spécialisation App Store previews.** Apple et Google imposent résolutions, durées et formats exacts : contrainte chiante, obligatoire, récurrente à chaque soumission, non automatisée. Sortir des previews conformes aux specs des stores déplace GEN MOTION du marché « vidéo produit » (encombré) vers « compliance de publication mobile » (vide). Marché plus petit, mais possédé.

**Retenues, à moyen terme :**
- **Le diff vidéo.** Même tour, v1.0 vs v1.1, split-screen automatique = changelog visuel. Impossible sans reproductibilité, donc impossible pour la concurrence. C'est le payoff du « as code » que personne n'a sorti.
- **La localisation.** Une capture, N voix off, N marchés. Couplé aux App Store previews localisées, directement facturable.

**Écartée.** Course à la GitHub Action / agent PR (cf. B.2).

## B.5 — Cadrage marketing de l'import de tests — formulation à respecter

Ne **pas** vendre « on fait communiquer la QA et le com ». C'est un outil de collaboration : deux acheteurs à convaincre, cycle de vente long, injouable en solo.

Vendre : **il n'y a plus rien à communiquer.** Un seul artefact — le parcours — consommé par deux usages. La QA vérifie que ça marche, le com reçoit la vidéo. Pas de réunion, pas de ticket « il me faudrait une vidéo de la nouvelle feature pour vendredi ».

Chez l'ICP réel (founder, indie hacker, petit studio), **la QA et le com sont la même personne**. Le pitch marche sans aucune histoire d'organigramme. La version « deux équipes » est un argument Enterprise, à ressortir plus tard, pas sur la landing.

**Honnêteté obligatoire sur la promesse.** Un test et une démo n'ont pas les mêmes objectifs : un test va vite, headless, laid, il assert ; une démo respire, se cale sur une voix, montre ce qui est beau et saute ce qui ne l'est pas. L'import ne peut donc **pas** être une conversion 1:1 — c'est un **scaffold**. Formulation cible : « Ton test devient un tour à 70 %, tu ajustes le rythme et la voix. » Promettre mieux = le premier dev voit le décalage en 5 minutes et toute la crédibilité de la page tombe.

---

# PARTIE C — Spike « import de tests Playwright »

> **À faire avant d'écrire une ligne de code de feature.** Objectif : savoir en une soirée si l'idée tient.

## C.1 — Cadrage technique

Playwright et Cypress sont du code **impératif** (`await page.click('#btn')`), pas des specs déclaratives. L'import n'est donc pas un parseur : c'est de l'analyse de code source. Deux conséquences :

1. **L'agent IA existant suffit.** Le BYOK Claude est déjà dans le pipeline. Lire un `.spec.ts` et sortir un `tour.json` est un problème de prompt, pas de compilateur. Le vrai travail n'est pas de parser : c'est de savoir **quoi jeter** — assertions, setup, `beforeEach`, parcours d'erreur sans intérêt en démo.
2. **Un seul framework pour valider : Playwright.** Il a mangé le marché, il est en TypeScript comme le projet, il a déjà les concepts de trace et de vidéo. Si ça ne marche pas là, ça ne marchera nulle part. Cypress et Maestro viennent après, jamais avant.

**Piste alternative à évaluer en parallèle : le trace viewer de Playwright.** Une trace est un artefact structuré — actions, timings, sélecteurs, screenshots — déjà produit à chaque run de CI. Partir de la trace au lieu du code source, c'est du déterministe au lieu du probabiliste. À regarder avant de tout miser sur le LLM.

## C.2 — Protocole du spike (aucun code produit)

1. Rassembler **5 fichiers de tests Playwright réels** : ceux du projet, ceux de clients, ceux d'un repo open source connu. Diversité voulue — un test court, un long, un avec auth, un avec upload/état, un flaky.
2. Écrire **un prompt de conversion** vers le schéma `tour.json` existant. Le prompt doit expliciter les règles de rejet : ignorer les assertions, ignorer le setup technique, ne garder que les actions visuellement lisibles, fusionner les micro-étapes, générer un texte de voix off par section.
3. Passer les 5 fichiers à la main dans Claude, sans tooling.
4. **Mesurer le taux de sortie exploitable** : un tour est « exploitable » s'il se rejoue sans erreur et produit une vidéo qu'on oserait montrer, après retouches mineures uniquement.

## C.3 — Critères de décision

| Résultat | Décision |
|---|---|
| ≥ 70 % exploitable | La feature existe. Industrialiser : commande `genmotion import <path>`, mode scaffold, doc. |
| 40-70 % | À creuser, mais probablement via les traces Playwright (C.1) plutôt que le code source. |
| < 40 % | Idée morte. L'abandonner et rebasculer l'effort sur les App Store previews (B.4). |

**Livrable du spike** : un court rapport — 5 tests, 5 sorties, taux, et les 3 causes d'échec les plus fréquentes. Rien d'autre.

---

# Instructions pour Claude Code

- **Ne rien implémenter de la partie C avant que le spike C.2 soit fait et que Smooth ait tranché.** Le spike est manuel, il ne demande pas de code.
- **Ne rien implémenter de A.1.1 avant arbitrage explicite entre Option A et Option B** (tout le bloc Éditions en dépend).
- Partie A : pas de refonte du design system ni de la structure de sections. Ce sont des modifs de **copy**, de **routing** et des **ajouts de blocs ponctuels**.
- Un commit par item, message conventionnel : `fix(pricing):`, `copy(personas):`, `feat(faq):`.
- Pour A.2.1, produire le diff de copy **avant** de l'appliquer — Smooth valide le registre.
- Français partout, registre direct, tutoiement. Bannir « révolutionnaire », « solution innovante », « boostez ».
- Si la partie C aboutit positivement, la landing devra être re-priorisée autour de l'import de tests — donc ne pas sur-investir dans la copy du hero tant que C n'est pas tranché.
