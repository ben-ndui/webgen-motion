# Fiche — Cinéma IA dans le mode Film de marque

> Statut : validée par Ben le 14/10/2026 (lots 1 → 3 d'abord). **Lot 1 livré** :
> fiche, validateur, prompt, budget, génération Veo et reprise (`src/lib/cinema/`).
> Preuve de faisabilité : deux démos SAYA tournées à la main le 14/10
> (la reine au palais, puis la promo parfum au jardin de nuit), 6 plans Veo,
> environ 5,8 $ au total.

## Ce que la fonctionnalité promet

Un client décrit une scène (« une femme en robe bleu nuit cueille un hibiscus,
puis se parfume ») ; GEN MOTION génère les plans par IA dans **les couleurs de
sa marque**, les monte sur sa musique et **finit sur son vrai logo et sa
signature**. Le Reel sort en 9:16, prêt pour Instagram et TikTok.

## Ce que les deux démos nous ont appris (et que le code doit tenir)

| Constat du 14/10 | Règle dans la fonctionnalité |
|---|---|
| Le même personnage décrit deux fois ressort parfois en deux femmes différentes (plan « fenêtre » écarté) | Le personnage et l'objet sont décrits **une fois** dans la fiche, et réinjectés mot pour mot dans chaque plan |
| Veo écrit mal les lettres | Interdiction du texte dans l'image (négatif imposé) ; la marque vient du **vrai logo** en fin de Reel |
| Veo glisse parfois un fondu enchaîné à l'intérieur d'un plan (jardin, 4 à 5 s) | Planche contact + **découpe** du plan (début, fin, une coupe au milieu) ; détection automatique proposée, jamais imposée |
| La fin du film passait par une image blanche avant le logo | Le plan de fin part du fond de la marque, sans transition par une autre couleur |
| Le filigrane « APERÇU » couvrait le logo | Filigrane au centre sur les plans IA, **décalé sous le logo** sur la fin |
| Deux générations lancées ensemble ont faussé le compteur (5 comptés pour 6 payés) | Le budget se **réserve avant** l'appel, sous verrou de fichier |

## Les règles de vérité (non négociables)

1. **« Contenu généré par IA »** est incrusté sur chaque plan généré, sans
   option pour l'enlever (transparence, AI Act art. 50).
2. **Aucun visage réel sans consentement** : animer la photo d'une personne
   exige une case « j'ai son accord écrit », conservée dans la fiche.
3. **Objet imaginé** (flacon, bouteille, plat inventé) : autorisé. Ce n'est pas
   un champ qu'on remplit (il pourrait mentir) : tout plan `geste` ou `objet`
   montre un objet imaginé tant qu'aucune photo réelle ne le remplace (lot 4).
   Tant qu'il en reste un, le rendu porte le filigrane « APERÇU » et l'écran
   le dit : « flacon imaginé pour la démo, remplace-le par la photo du vrai
   produit avant diffusion ».
4. Le coût s'affiche **avant** le clic, en dollars, au plan près.

## Le parcours dans l'assistant

Une nouvelle étape **« Cinéma »** dans `film/[id]/creer`, après « Marque » :

1. **Le casting** : le personnage (un paragraphe) et l'objet (un paragraphe).
   Remplissables depuis le site par Claude, comme le reste de la fiche.
2. **Les plans** (1 à 4) : pour chacun, un rôle (`scene`, `geste`, `objet`)
   et une consigne courte. GEN MOTION compose le prompt complet : consigne +
   personnage + objet + palette de la marque + direction artistique
   (`nocturne` → nuit, lanternes, or ; `editorial` → jour, papier, lumière
   franche).
3. **Générer** : un bouton par plan, coût affiché, état en direct
   (en file, en cours ~1 à 3 min, prêt, refusé).
4. **Découper** : planche contact du plan, début et fin réglables, une coupe
   optionnelle au milieu, coupes suggérées par la détection de scène.
5. **Le Reel** : ordre des plans, fondus, fin sur le logo construit.

États : vide (« aucun plan, décris ta première scène »), génération en cours,
refus de Google (la raison affichée, et « rien n'a été facturé »), clé absente
(lien vers les réglages), budget atteint (« 6 plans sur 6, augmente le budget
pour continuer »).

## Le modèle de données (`FilmSpec.cinema`, optionnel)

```ts
type PlanDeCinema = {
  id: string;                      // "jardin", "geste"…
  role: "scene" | "geste" | "objet";
  consigne: string;                // ce que Ben ou le client écrit
  fichier?: string;                // cinema/<id>.mp4, posé par GEN MOTION
  decoupe?: { debut: number; fin: number; coupe?: [number, number] };
};
type CinemaDuFilm = {
  personnage?: string;             // exigé dès qu'un plan le montre
  objet?: string;                  // exigé par un plan geste ou objet
  plans: PlanDeCinema[];           // 1 à 4
  qualite?: "fast" | "lite";       // absente : fast
  budget?: number;                 // plans payés au plus, 1 à 24 ; absent : 6
};
```

Hors fiche, dans `~/.webgen-motion/films/<id>/cinema.json` (jamais rendu) :
les opérations Veo en cours (nom d'opération, pour reprendre après un
rechargement **sans relancer ni repayer**) et le compteur de budget.

## Côté serveur

- `src/lib/cinema/prompt.ts` : compose le prompt et le négatif (pur, testé).
- `src/lib/cinema/veo.ts` : lance `predictLongRunning`, relit l'opération,
  télécharge (Veo 3.1 Fast par défaut, Lite en option).
- `src/lib/cinema/registre.ts` : réserve, note, rend ou clôt (verrou de
  fichier, éprouvé par huit processus en parallèle).
- `src/lib/cinema/couleurs.ts` : nomme les couleurs de la marque pour Veo.
- `src/lib/cinema/generation.ts` : un pas à la fois (lancer, ou relire
  l'opération une fois), reprise après rechargement, vidéo expirée (48 h).
- `src/lib/cinema/decoupe.ts` (lot 2) : planche contact, détection de scène.
- Route `api/motion/film/[id]/cinema/[plan]` : POST lance, GET suit.
- Clé : `veo.apiKey` dans `config.json` (masquée en lecture), repli sur
  `GEMINI_API_KEY`. Réservé à **Studio Edition**, comme le rendu.

## Le coût, chiffré

| Modèle | 1 plan (8 s, 1080p) | Reel de 3 plans |
|---|---|---|
| Veo 3.1 Fast | ~0,96 $ | ~2,90 $ |
| Veo 3.1 Lite | ~0,64 $ | ~1,90 $ |

Google ne facture pas un plan refusé. Budget par film réglable, 6 plans
par défaut.

## Les lots

| Lot | Contenu | Prouvé par |
|---|---|---|
| 1 | Modèle de fiche + validateur, prompt, budget, génération Veo, reprise | Unitaires (prompt, budget sous concurrence, validateur, reprise d'opération) |
| 2 | Étape « Cinéma » de l'assistant, découpe, états | Tests de composants + E2E du parcours |
| 3 | Composition Remotion « Reel cinéma », incrustations, fin sur le logo | Rendu réel d'un Reel, planche contrôlée image par image |
| 4 | Image-to-video depuis la photo du vrai produit ; Claude écrit le casting depuis le site | Unitaires + un plan réel |

Lot 3 réutilise `PLogoConstruit`, `BandeSon` et le placement sur le tempo.
Un appel réel à Veo n'est fait qu'en recette manuelle (il coûte) ; les tests
automatiques tournent sur les fonctions pures et sur un serveur Veo local
qui rejoue les réponses enregistrées le 14/10.
