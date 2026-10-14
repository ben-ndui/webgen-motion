# Fiche — Cinéma IA : du Reel à la mini-série

> Statut : direction **B** validée par Ben le 14/10/2026 (« pensé série dès le
> lot 2 »), fiche validée le même jour. **Lots 1 à 5 livrés** (le 5 le 15/10) : moteur,
> format série, portraits, références, répliques (`src/lib/cinema/`), l'étape
> « Ta série » de l'assistant (`film/[id]/creer/_components/serie/`), la
> découpe, le rendu de l'épisode monté, le contrôle des répliques, l'écriture
> d'un épisode par Claude depuis un brief et la photo du vrai produit.

## Ce que la fonctionnalité promet

Une cliente veut des **mini-séries** pour ses réseaux (SAYA, demande relayée
par Eliak le 14/10). GEN MOTION lui fabrique des épisodes de 15 s à 2 min :
des personnages qui restent **les mêmes d'un plan et d'un épisode à l'autre**,
qui **parlent en français**, dans les couleurs de sa marque, et chaque épisode
finit sur son vrai logo. Un Reel publicitaire n'est qu'un épisode d'une scène.

## Ce que les recettes du 14/10 ont prouvé

| Recette | Résultat | Conséquence dans le produit |
|---|---|---|
| Démos SAYA (palais, jardin, flacon) | Rendu cinéma crédible, 6 plans, ~5,8 $ | Le prompt réinjecte décor, personnage et objet mot pour mot |
| Personnage décrit en texte dans deux plans | Parfois deux femmes différentes | Le texte ne suffit pas : **un portrait de référence par personnage** |
| Portrait généré (Gemini image) puis 2 plans Veo qui le citent, dans deux décors | **Même femme** dans la boutique et sur la terrasse | La cohérence vient du portrait, pas de la description |
| Réplique demandée en français | Dite mot pour mot, lèvres synchrones (vérifié par transcription) | Les dialogues entrent dans le plan |
| Veo **Lite** | Refuse `negativePrompt` ET `referenceImages` | Lite seulement pour les plans **sans personnage** ; Fast dès qu'un personnage apparaît |
| Recette réelle du lot 1 (Lite, 0,64 $) | Lancé, suivi, prêt en ~90 s, budget juste, 2e demande bloquée | Le moteur tient contre le vrai Google |

## Les règles de vérité (non négociables)

1. **« Contenu généré par IA »** : PAS incrusté dans la vidéo (décision Ben,
   14/10). La transparence (AI Act art. 50) se fait à la publication, par
   l'étiquette IA d'Instagram ou de TikTok ; l'écran du rendu le rappelle.
2. **Un personnage est fictif par défaut** : son portrait est généré. Un
   portrait déposé (photo d'une vraie personne) exige la case « j'ai son
   accord écrit », conservée dans la fiche ; sans elle, rien ne se génère.
3. **Objet imaginé** (flacon inventé) : autorisé, mais tant qu'un plan en
   montre un, le rendu porte « APERÇU ». La photo du vrai produit (déposée,
   envoyée à Veo en référence) le lève, **plan par plan** : seul un plan
   GÉNÉRÉ avec la photo est marqué `produitReel` (champ serveur) ; un plan
   d'avant reste imaginé tant qu'on ne le refait pas.
4. **Le coût s'affiche avant chaque clic**, au plan près, avec le modèle que
   GEN MOTION a choisi et pourquoi (« Fast : Awa apparaît dans ce plan »).
5. **Une réplique non dite n'est pas un succès** : si la transcription locale
   (whisper) est disponible, GEN MOTION compare ce que le personnage dit au
   texte demandé et signale l'écart ; sinon il dit « indisponible », jamais « dite ».

**Pas de détection automatique de coupe** : mesurée le 14/10 sur dix plans
réels, la différence d'images ne sépare pas le fondu interne de Veo d'un
simple travelling (33 contre 43). La personne regarde la planche contact et
décide.

## Le modèle de données (`FilmSpec.cinema`)

```ts
type Personnage = {
  id: string;                       // "awa"
  nom: string;                      // "Awa", tel qu'on l'appelle dans les consignes
  description: string;              // physique et tenue, en une phrase
  portrait?: string;                // cinema/personnages/<id>.jpg, généré (lot 2)
  // Lot 3, avec l'écran de dépôt : portraitReel?: { consentement: true } pour la
  // photo d'une vraie personne. D'ici là, un portrait ne peut être que GÉNÉRÉ.
};
type PlanDeCinema = {
  id: string;
  consigne: string;                 // ce qui se passe à l'image
  personnages: string[];            // ids, 0 à 3 (Veo accepte 3 références au plus)
  objet: boolean;                   // l'objet du film est-il à l'image ?
  replique?: { personnage: string; texte: string };  // dite dans le plan, en français
  fichier?: string;                 // cinema/<id>.mp4, posé par GEN MOTION
  decoupe?: { debut: number; fin: number; coupe?: [number, number] };
};
type Scene = { id: string; decor: string; plans: PlanDeCinema[] };   // 1 à 6 plans
type Episode = { id: string; titre: string; scenes: Scene[] };      // 1 à 4 scènes
type CinemaDuFilm = {
  personnages: Personnage[];        // 0 à 4
  objet?: string;                   // le produit, décrit une fois
  episodes: Episode[];
  budget?: number;                  // plans payés au plus ; absent : 20
};
```

Ce qui change par rapport au lot 1 : les plans quittent la liste plate pour
**épisode → scène → plan** ; le `role` (scene/geste/objet) disparaît, remplacé
par ce qui est réellement à l'image (`personnages`, `objet`) ; la `qualite`
n'est plus un réglage, elle se déduit du plan. Aucune fiche n'utilise encore
le format du lot 1 : on le remplace sans migration.

**Le choix du modèle** : un plan qui cite au moins un personnage → Veo Fast
avec ses portraits en référence ; sinon → Veo Lite (un tiers moins cher).

**Le prompt d'un plan** = cadrage + décor de la scène + consigne + chaque
personnage (nom + description, ET son portrait en référence) + l'objet s'il
est à l'image + la réplique (« she says softly in French: « … » ») + ambiance
de la direction + palette nommée + interdits (pas de texte, pas de logo).

## Le parcours dans l'assistant (lot 3)

Une étape **« Série »** dans `film/[id]/creer`, après « Marque » :

1. **Le casting** : chaque personnage = un nom, une phrase de description,
   un bouton « Générer son portrait » (quelques centimes). On regénère tant
   qu'il ne plaît pas ; une fois validé, il ne bouge plus.
2. **L'épisode** : titre, puis les scènes (un décor chacune), puis les plans
   (consigne, qui est à l'image, l'objet, une réplique).
3. **Générer** : par plan ou toute la scène d'un coup, coût total affiché
   avant, état en direct (en cours ~1 à 3 min, prêt, refusé).
4. **Découper** (lot 4) : planche contact, début, fin, une coupe au milieu.
5. **Regarder l'épisode** monté, puis le rendre (lot 4).

Livré au lot 3 : chaque scène a sa **pellicule**, ses plans en images 9:16
(la vidéo joue quand le plan est prêt) ; un clic ouvre le plan dessous. Les
textes de départ sont des exemples grisés, que le serveur refuse de payer.

États : aucun personnage (« commence par ton casting »), portrait en cours,
plan en cours, refus de Google (raison + « rien n'a été facturé »), clé
absente, budget atteint, réplique non dite (lot 4).

## Le coût, chiffré (barème Google 09/2026, 8 s en 1080p)

| Ce qu'on génère | Modèle | Coût |
|---|---|---|
| Un portrait de personnage | Gemini 3.1 Flash Image | ~0,05 $ |
| Un plan avec personnage | Veo 3.1 Fast | ~0,96 $ |
| Un plan sans personnage | Veo 3.1 Lite | ~0,64 $ |
| Reel de 15 s (2 plans) | — | ~1,60 à 1,90 $ |
| Épisode de 1 min (~8 plans) | — | ~7 $ |
| Épisode de 2 min (~15 plans) | — | ~13 à 15 $ |

Compter **+30 à 50 %** pour les prises refaites. Google ne facture pas un plan
refusé. **La durée a un coût** : seul un décor de fond peut boucler sans
payer plus ; un épisode, ce sont des plans tous différents.

## Les lots

| Lot | Contenu | Prouvé par |
|---|---|---|
| 1 ✅ | Moteur : prompt, budget sous verrou, génération Veo, reprise, clé | 519 tests + recette réelle |
| 2 ✅ | Format série (personnages, épisodes, scènes), portraits générés, références dans Veo, choix Fast/Lite, répliques | Unitaires + faux Google + recette réelle d'une scène (~3 $) |
| 3 ✅ | Étape « Ta série » de l'assistant : casting, épisodes, scènes, pellicule, génération, états | Tests de composants + vérification réelle à 1440 et 390 px (pas d'outil E2E dans le dépôt) |
| 4 ✅ | Découpe des plans + rendu Remotion de l'épisode (coupes, fondus, musique, incrustations, fin sur le logo) + contrôle des répliques | Rendu réel d'un épisode, contrôle image par image |
| 5 ✅ | Claude écrit le scénario depuis le brief de la cliente ; photo réelle du produit animée | Unitaires + un épisode réel |

Les appels réels à Google ne se font qu'en recette (ils coûtent) ; les tests
automatiques tournent sur un faux Google local qui rejoue la forme exacte des
réponses relevées le 14/10, refus de Lite compris.
