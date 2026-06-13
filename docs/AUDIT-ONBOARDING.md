# Audit onboarding — « filmer son app facilement » + friction des installs

> Revue du parcours premier-lancement (web ET mobile) et de ce qu'on peut
> **embarquer** pour réduire les installs à la charge du user. 2026-06-13.

---

## TL;DR

- **Web = déjà quasi sans friction.** Tout le pipeline est embarqué (Node,
  ffmpeg, ffprobe) et le **Chromium est unifié + auto-téléchargé** au 1er
  usage (capture Puppeteer **et** compose Remotion partagent UN binaire, ou
  réutilisent Chrome système). Reste 2 frictions mineures (URL pas éditable
  dans l'UI, download Chromium silencieux).
- **Mobile natif = power-user non documenté.** Pas d'entrée UI (JSON manuel),
  zéro doc in-app, prérequis lourds (Maestro+JDK, Xcode/simulator, SDK/adb)
  non détectés.
- **À embarquer pour couper des installs** : `adb` (petit binaire) et
  **Maestro + mini-JRE** sont bundlables. Xcode/simulateur iOS et émulateur
  Android **ne le sont pas** (taille/licence) — inhérents au natif.

---

## 1. Parcours premier-lancement (étape par étape)

### 0. Installer le `.dmg` — ✅
Signé + notarisé Apple, double-clic, aucun pop-up bloquant. RAS.

### 1. Setup wizard (`/setup`) — 🟠
- Skippable (« Passer le setup ») ou guidé.
- Configure la **voix off** : ElevenLabs (clé cloud payante) **ou** Voicebox
  (app tierce à installer). **Pas d'option voix zéro-config.**
- Agent IA (`/setup/agent`) : clé Anthropic (BYOK) pour « Générer avec IA ».
- **Friction** : un user tout neuf sans clé ElevenLabs ni Voicebox ne peut pas
  faire de voix off (capture + compose marchent quand même, muets).

### 2. Créer un tour de SON app — 🟠 (web) / 🔴 (mobile)
Le hub propose 3 entrées :
- **Générer avec IA** — colle ton `base_url` → l'agent écrit le script *(clé Anthropic requise)*. ✅ meilleur chemin web.
- **Scaffold projet** — `projectPath` + `baseUrl`. ✅ web.
- **Nouveau tour** — page blanche, **`baseUrl` figé sur `localhost:3000` et non éditable dans l'UI**. 🟠 friction : pour pointer son URL sans IA/scaffold → éditer le JSON.
- **Mobile natif** : ❌ aucune entrée — « Nouveau tour » ne règle que le format 9:16, pas `platform`/`appId`/`deviceId`. → **édition JSON manuelle obligatoire**.

### 3. Capture — ✅ (web) / 🔴 (mobile)
- **Web** : Chromium **auto-téléchargé au 1er besoin** (~150 Mo, une fois) ou
  Chrome système réutilisé. Sans friction ensuite. 🟠 le user n'est pas
  prévenu du download initial (pas d'écran « préparation du navigateur »).
- **Mobile** : exige **Maestro** + (iOS : **Xcode/Simulator ~7 Go**) ou
  (Android : **SDK + adb + émulateur**). Ni bundlé, ni détecté → un clic
  « Capturer » sur un tour mobile sans outils = **échec cryptique**.

### 4. Voix off — 🟠
ElevenLabs (clé) ou Voicebox (install). Dégradation propre si absent.
**Pas de voix par défaut hors-ligne.**

### 5. Compose — ✅
Auto-suffisant : ffmpeg bundlé + Remotion utilise le **Chromium partagé**
(plus de 2ᵉ download). Marche hors-ligne une fois Chromium présent.

### 6. Export — ✅
`final.mp4` dans `~/.webgen-motion/tours/<id>/`. Export `.otio`
(Resolve/Premiere) en Studio.

---

## 2. Embarquer pour couper les installs (la question de Ben)

| Dépendance | État actuel | Embarquable ? |
|---|---|---|
| Node 22 · ffmpeg · ffprobe | ✅ bundlés (sidecars) | **déjà fait** |
| Chromium (capture **+** compose, unifié) | ✅ auto-download 1er usage / Chrome système | 🟡 option : **bundler Chrome-for-Testing dans le .dmg** (+~150 Mo installeur) → zéro download, zéro réseau |
| **adb** (Android) | manuel (Android SDK) | 🟢 **bundlable** : binaire ~5 Mo, sidecar comme ffmpeg |
| **Maestro + JDK** | manuel (`brew` + JVM) | 🟡 **bundlable** : JAR Maestro + **mini-JRE** (~50–100 Mo) → supprime l'install Maestro/JDK |
| Voix off | ElevenLabs (clé) / Voicebox (install) | 🟡 option : **bundler un TTS local (Piper)** → voix par défaut, zéro clé, hors-ligne |
| iOS Simulator / Xcode (~7 Go) | manuel | 🔴 **non bundlable** (Apple, taille) — inhérent à iOS natif |
| Émulateur Android + SDK (multi-Go) | manuel | 🔴 **non bundlable** — mais filmer un **vrai device USB** (juste `adb`) évite l'émulateur |

> ⚠️ Le doc `DEPENDANCES-ET-INSTALL.md` est en partie **périmé** (il liste
> Chromium/Remotion comme 🔴 non-embarqués) — à mettre à jour : c'est résolu.

---

## 3. Plan priorisé (à arbitrer)

**P0 — friction web (quick wins, fort impact)**
- `[XS]` Capture-tab : écran « préparation du navigateur » la 1ʳᵉ fois (on a déjà `/api/motion/chromium/{ensure,status}` — juste à surfacer).
- `[S]` Rendre `baseUrl` éditable dans l'UI (réglages du tour) **ou** faire de « Générer avec IA » le CTA primaire (il prend l'URL).

**P1 — rendre le mobile possible & guidé (doc + détection)**
- `[S]` Section **« Filmer une app mobile »** dans `/help` : prérequis, champs JSON (`platform`/`appId`/`deviceId`), step types mobiles (`launchApp`/`tapOn`/`swipe`), exemple.
- `[M]` **Détection des outils** (Maestro/simctl/adb) → message guidé clair au lieu d'un échec cryptique.

**P2 — embarquer pour couper des installs**
- `[M]` Bundler **`adb`** en sidecar (Android device/émulateur sans installer les platform-tools).
- `[L]` Bundler **Maestro + mini-JRE** (supprime l'install Maestro/JDK).
- `[M]` Option : **bundler Chrome-for-Testing** dans le .dmg (zéro download au 1er lancement).
- `[L]` Option : **TTS local (Piper)** → voix par défaut sans clé.

**P3 — UI mobile**
- `[M]` Champs `platform`/`appId`/`deviceId` dans « Nouveau tour » (créer un tour mobile sans JSON).

**P-doc**
- `[XS]` Mettre à jour `DEPENDANCES-ET-INSTALL.md` (Chromium unifié = résolu).
