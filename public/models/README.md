# Custom 3D device models

Sprint 7 — drop tes modèles 3D iPhone / MacBook ici pour qu'ils remplacent automatiquement les devices procéduraux par défaut.

## Convention de naming

| Fichier | Override | Quand actif |
|---|---|---|
| `iphone.glb` | Le device procédural iPhone 15 Pro de webgen-motion | Quand `tour.frame3d === "iphone"` |
| `macbook.glb` | Le device procédural MacBook | Quand `tour.frame3d === "macbook"` |

Si un fichier n'est pas présent, webgen-motion fallback sur le device procédural équivalent. Pas d'erreur.

## Sources gratuites & légales

### Sketchfab (le plus rapide)

1. https://sketchfab.com/feed → recherche "iPhone 15 Pro" ou "MacBook Air"
2. Filtres :
   - **Free Download** : oui
   - **License** : CC Attribution (attribution requise dans tes vidéos finales) ou CC0 (pas d'attribution)
   - **Format** : GLB ou glTF
3. Clique le modèle → onglet **Download** → choisir **glTF (.glb)**
4. Renomme en `iphone.glb` ou `macbook.glb`, drop-le ici

Bons points de départ (vérifie la license au moment du download) :

- iPhone 15 Pro Max : https://sketchfab.com/search?q=iphone+15+pro&type=models
- MacBook Air M2 : https://sketchfab.com/search?q=macbook+air&type=models

### Modèles payants (sans contrainte de licence)

Pour la commercialisation Studio Edition, on recommande des modèles achetés (~$10-30) avec license permissive :

- **TurboSquid** : https://www.turbosquid.com/Search/3D-Models/iphone
- **CGTrader** : https://www.cgtrader.com/3d-models/electronics/phone/apple-iphone-15-pro

## Exigences techniques

Pour que webgen-motion détecte automatiquement l'écran sur lequel projeter la capture, le GLB doit contenir une **mesh nommée `screen`** (ou `display`, `Screen`, `Display`).

Si ton GLB n'a pas ce naming :

1. Ouvre le GLB dans **Blender** (gratuit)
2. Sélectionne la mesh de l'écran
3. Rename → `screen` (lowercase de préférence)
4. Export → Export glTF (.glb)
5. Drop-le ici

Sans cette mesh, le modèle s'affiche mais l'écran reste blanc (la capture MP4 n'a nulle part où être plaquée).

## Auto-scale

webgen-motion auto-scale le GLB pour qu'il matche la taille attendue (iPhone ~3.4 unités R3F, MacBook ~4 unités). Tu n'as pas à toucher l'échelle dans Blender.

## Auto-center

Le pivot est aussi auto-centré sur l'origine. Pas besoin de repositionner.

---

Une fois ton GLB drop ici, relance `npm run compose` ou clique **Composer** dans l'UI — le compositor log `✓ GLB détecté → models/iphone.glb (override du procédural)` au lancement.
