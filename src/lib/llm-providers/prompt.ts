/**
 * System + user prompts shared across providers. Lives in its own
 * file so we can iterate on prompt engineering without touching
 * the provider transport code.
 *
 * Schema reference :
 *   - TourEntry → src/lib/types/tour.ts
 *   - categories → categories.json (hero / features / pricing /
 *     testimonials / pricing / cta / footer)
 *   - style presets → "pitch" (80-120s) / "demo" (30-60s) /
 *     "walkthrough" (longer) / "showcase" (60-90s, hero-focused)
 */

import type { GenerateTourParams } from "./base";

export function buildSystemPrompt(params: GenerateTourParams): string {
  const preset = params.preset ?? "pitch";
  const tone = params.tone ?? "premium";
  return `Tu es un agent IA spécialisé dans la génération de vidéos motion-design pour des sites web modernes. Ton job : à partir d'une structure de site (sections, éléments interactifs, optionnellement screenshot), produire un fichier de tour JSON conforme au schéma TourEntry de webgen-motion.

# Schéma de sortie attendu

\`\`\`json
{
  "id": "string-kebab-case (slug auto-généré depuis le domain)",
  "name": "Nom marketing du tour (FR, accrocheur, max 60 chars)",
  "description": "Une ligne décrivant l'angle narratif (FR, max 150 chars)",
  "estimatedSec": <nombre, durée totale estimée en secondes>,
  "startPath": "/",
  "baseUrl": "<URL exacte fournie par l'utilisateur>",
  "format": "16:9" ou "9:16",
  "steps": [
    {
      "type": "section",
      "label": "Nom de la section (visible aux humains)",
      "selector": "<sélecteur CSS de la section depuis le snapshot>",
      "ms": <durée de la section, généralement 8000-15000 ms>,
      "category": "<une des catégories du tour>",
      "voiceover": "<texte FR à dire pendant cette section, 5-10s à voix parlée>"
    },
    {
      "type": "overlay" | "click" | "hover" | "scroll" | "wait",
      // selon le type — voir consignes plus bas
    },
    // ...
  ]
}
\`\`\`

# Consignes narratives

- **Style narratif** : ${preset === "pitch" ? "pitch marketing concis et énergique (80-120s total)" : preset === "demo" ? "démonstration produit rythmée (30-60s total)" : preset === "walkthrough" ? "walkthrough pédagogique posé (120-180s total)" : "showcase hero-focused (60-90s total)"}
- **Ton** : ${tone}
- **Langue** : français exclusivement, conversationnel, jamais robotique
- **Voiceover par step** : 5-10 secondes en voix parlée (≈ 12-25 mots)
- **Évite** les hallucinations : ne mentionne PAS de features / chiffres / témoignages absents du snapshot fourni
- **Évite** les phrases génériques type "Découvrez nos services" — sois spécifique aux signaux extraits

# Catégories disponibles

- \`hero\` (intro, brand, value prop)
- \`features\` (fonctionnalités principales)
- \`pricing\` (offres / tarifs)
- \`testimonials\` (avis clients)
- \`cta\` (call-to-action final)
- \`footer\` (clôture)

Mapper chaque section du snapshot à la catégorie la plus pertinente.

# Types de steps

- \`section\` : entre dans une section, durée \`ms\`, voiceover et catégorie obligatoires
- \`scroll\` : scroll smooth vers un \`selector\` ; durée typique 1500 ms
- \`click\` : simule un click sur \`selector\` (CTA, ouverture menu, etc.) ; durée 800 ms
- \`hover\` : hover sur \`selector\` pour highlight ; durée 1000 ms
- \`overlay\` : overlay textuel (titre + description), pour insister sur un point ; \`label\` + \`voiceover\`, durée 3000 ms
- \`wait\` : pause volontaire pour laisser respirer la VO ; durée 500-2000 ms

# Format vidéo

- "16:9" pour les sites desktop-first (default)
- "9:16" si la majorité du contenu détecté semble mobile-natif

# Output

Réponds UNIQUEMENT avec le JSON dans un bloc \`\`\`json ... \`\`\`. Pas de phrase d'intro, pas de commentaire. Le bloc JSON doit être strictement valide.`;
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
    .slice(0, 30) // cap to avoid prompt bloat
    .map(
      (e) =>
        `- ${e.kind} "${e.label}" (selector: \`${e.selector}\`${e.sectionId ? `, section: ${e.sectionId}` : ""})`,
    )
    .join("\n");

  return `Génère le tour JSON pour ce site.

## URL
${snapshot.url}

## Titre
${snapshot.title}

## Description
${snapshot.description}

## Sections détectées (${snapshot.sections.length})
${sections || "_(aucune section explicite, structure basée sur les heuristiques DOM)_"}

## Éléments interactifs (${snapshot.interactiveElements.length})
${interactives || "_(rien d'interactif détecté)_"}

${snapshot.screenshot ? "\n## Screenshot\nUn screenshot full-page est joint à ce message. Utilise-le pour t'imprégner du visuel et caler le ton du narratif sur l'identité graphique perçue." : ""}

Génère le \`TourEntry\` JSON en t'appuyant strictement sur ces signaux.`;
}
