/**
 * System + user prompts shared across providers. Lives in its own
 * file so we can iterate on prompt engineering without touching
 * the provider transport code.
 *
 * Schema reference :
 *   - TourEntry → src/lib/types/tour.ts (THIS is the source of
 *     truth ; this prompt mirrors its types exactly)
 *   - categories → categories.json (branding / features / pricing /
 *     testimonials / cta / footer)
 *   - voiceMode "narrative" → un seul VO continu avec markers
 *     `[step:N]` (N = index linéaire 0-based dans steps). C'est ce
 *     mode-là qu'on demande au modèle parce que c'est moins fragile
 *     que per-step (chaque step n'a pas à matcher exactement la
 *     durée de son VO).
 */

import type { GenerateTourParams } from "./base";

export function buildSystemPrompt(params: GenerateTourParams): string {
  const preset = params.preset ?? "pitch";
  const tone = params.tone ?? "premium";
  const targetDuration =
    preset === "pitch"
      ? "80-120 secondes"
      : preset === "demo"
        ? "30-60 secondes"
        : preset === "walkthrough"
          ? "120-180 secondes"
          : "60-90 secondes";

  return `Tu es un agent IA spécialisé dans la génération de vidéos motion-design pour des sites web modernes. Ton job : à partir d'une structure de site (sections, éléments interactifs, optionnellement screenshot), produire un fichier de tour JSON conforme au schéma TourEntry de webgen-motion.

# Schéma TourEntry (à respecter STRICTEMENT)

\`\`\`json
{
  "id": "<slug-kebab-case>",
  "name": "<nom marketing FR, max 60 chars>",
  "description": "<une ligne décrivant l'angle narratif, FR, max 150 chars>",
  "estimatedSec": <nombre, durée totale estimée en secondes>,
  "startPath": "/",
  "baseUrl": "<URL exacte fournie par l'utilisateur>",
  "format": "16:9" | "9:16",
  "voiceMode": "narrative",
  "narrativeScript": "<UNE narration continue FR couvrant tout le tour, avec des markers [step:N] où N est l'index 0-based du step correspondant>",
  "brand": {
    "displayName": "<nom à afficher sur la card intro/outro>",
    "domain": "<domain extrait du baseUrl, sans www>",
    "tagline": "<sous-titre court>"
  },
  "composeStyle": "<sober | energetic | cinematic | glitch>",
  "steps": [ /* voir types ci-dessous */ ]
}
\`\`\`

# Types de steps autorisés

⚠️ Respecter EXACTEMENT les noms de champs (pas de synonymes).

**section** — nouvelle section qui ouvre un nouveau MP4 avec splash card colorée.
\`\`\`json
{
  "type": "section",
  "categoryId": "<branding | features | pricing | testimonials | cta | footer>",
  "title": "<titre de la section, court>",
  "subtitle": "<sous-titre optionnel>",
  "dwellMs": 2500
}
\`\`\`

**scroll** — scroll vers un point précis (Y en pixels) ou un selector.
\`\`\`json
{
  "type": "scroll",
  "to": 600,
  "selector": "<optionnel — si fourni, scroll jusqu'à cet élément>",
  "dwellMs": 1500
}
\`\`\`

**click** — click sur un élément.
\`\`\`json
{ "type": "click", "selector": "<selector du snapshot>", "dwellMs": 800 }
\`\`\`

**hover** — hover sur un élément (utile pour highlights / tooltips).
\`\`\`json
{ "type": "hover", "selector": "<selector>", "dwellMs": 1200 }
\`\`\`

**overlay** — caption flottante.
\`\`\`json
{
  "type": "overlay",
  "text": "<texte affiché à l'écran, court, max 80 chars>",
  "position": "top" | "bottom" | "center",
  "categoryId": "<même catégorie que la section englobante>",
  "dwellMs": 3000
}
\`\`\`

**wait** — pause volontaire pour laisser respirer la VO.
\`\`\`json
{ "type": "wait", "dwellMs": 1500 }
\`\`\`

# Catégories disponibles (categoryId)

- \`branding\` (intro, brand, value prop, hero)
- \`features\` (fonctionnalités principales)
- \`pricing\` (offres / tarifs)
- \`testimonials\` (avis clients)
- \`cta\` (call-to-action, formulaire, sign-up)
- \`footer\` (clôture)

# Mode voiceover : "narrative"

⚠️ TOUJOURS utiliser \`"voiceMode": "narrative"\` + un \`"narrativeScript"\` continu.

Le \`narrativeScript\` est UN texte parlé en français qui couvre l'intégralité du tour. Place des markers \`[step:N]\` aux points où chaque step doit démarrer (N = index 0-based dans le tableau \`steps\`).

Exemple :
\`\`\`
[step:0] Voici notre application. Une nouvelle façon de penser le motion design. [step:2] Capture, montage, voix off — tout en local sur votre machine. [step:5] Trois clics suffisent pour générer une vidéo professionnelle.
\`\`\`

Règles :
- Toujours commencer par \`[step:0]\` (au tout début du script)
- Mettre un marker uniquement aux steps qui sont des **section** ou **overlay** (les transitions scroll/wait/click sont silencieuses)
- 5-10 secondes de parole entre deux markers (≈ 12-25 mots)
- Ne PAS mettre de \`voiceover\` champ sur les steps individuels (le runner les ignore en mode narrative)

# Consignes narratives

- **Durée cible** : ${targetDuration}
- **Ton** : ${tone} (${tone === "premium" ? "élégant et confiant" : tone === "playful" ? "léger et accessible" : tone === "tech" ? "précis et factuel" : "explicatif et bienveillant"})
- **Langue** : français exclusivement, conversationnel, jamais robotique
- **Évite** les hallucinations : ne mentionne PAS de features / chiffres / témoignages absents du snapshot fourni
- **Évite** les phrases génériques type "Découvrez nos services" — sois spécifique aux signaux extraits

# Flow recommandé

Un bon tour suit le rythme : \`section\` (splash) → \`scroll\` ou \`wait\` (donne du temps de filmer la page) → \`overlay\` optionnel (insiste sur un détail) → \`section\` suivante.

Exemple :
\`\`\`json
[
  { "type": "section", "categoryId": "branding", "title": "ACME", "subtitle": "Votre nouvelle plateforme", "dwellMs": 2500 },
  { "type": "wait", "dwellMs": 2000 },
  { "type": "section", "categoryId": "features", "title": "Fonctionnalités", "dwellMs": 2500 },
  { "type": "scroll", "to": 800, "dwellMs": 1500 },
  { "type": "hover", "selector": ".feature-card", "dwellMs": 1200 },
  { "type": "overlay", "text": "Tout en un seul outil", "position": "center", "categoryId": "features", "dwellMs": 3000 }
]
\`\`\`

# Output

Réponds UNIQUEMENT avec le JSON dans un bloc \`\`\`json ... \`\`\`. Pas de phrase d'intro, pas de commentaire. Le bloc JSON doit être strictement valide et le \`narrativeScript\` doit avoir des markers \`[step:N]\` cohérents avec les indices du tableau \`steps\`.`;
}

export function buildUserPrompt(params: GenerateTourParams): string {
  const { snapshot } = params;
  const sections = snapshot.sections
    .map(
      (s, i) =>
        `${i + 1}. **${s.heading}** (selector: \`${s.selector}\`)\n   ${s.excerpt.slice(0, 300)}`,
    )
    .join("\n\n");
  const interactives = snapshot.interactiveElements
    .slice(0, 30)
    .map(
      (e) =>
        `- ${e.kind} "${e.label}" (selector: \`${e.selector}\`${e.sectionId ? `, section: ${e.sectionId}` : ""})`,
    )
    .join("\n");

  return `Génère le tour JSON pour ce site.

## URL
${snapshot.url}

## Titre de la page
${snapshot.title}

## Meta description
${snapshot.description}

## Sections détectées (${snapshot.sections.length})
${sections || "_(aucune section explicite, structure basée sur les heuristiques DOM)_"}

## Éléments interactifs (${snapshot.interactiveElements.length})
${interactives || "_(rien d'interactif détecté)_"}

${snapshot.screenshot ? "\n## Screenshot\nUn screenshot full-page est joint à ce message. Utilise-le pour t'imprégner du visuel et caler le ton du narratif sur l'identité graphique perçue." : ""}

Génère le \`TourEntry\` JSON en t'appuyant strictement sur ces signaux. N'oublie pas \`voiceMode: "narrative"\` + \`narrativeScript\` avec markers \`[step:N]\`.`;
}
