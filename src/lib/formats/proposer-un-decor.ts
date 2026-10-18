import { lignesChantees } from "../../../remotion/film/karaoke/alignement";
import type { KaraokeSpec } from "../../../remotion/film/karaoke/spec";
import { paletteEnMots } from "../cinema/couleurs";
import { type ResolvedAgent, resolveAgent } from "../config-resolve";
import { type AppelerAvecOutil, appelerClaudeAvecOutil } from "./claude-outil";
import { chargerProjet } from "./format-loader";
import { getFormatPublicDir, getFormatsDir } from "./format-store";
import { etatDesParoles } from "./karaoke-paroles";

/**
 * Claude lit les paroles et propose trois décors pour le clip. Rend des
 * PROPOSITIONS, sans rien enregistrer : l'artiste en choisit une (ou écrit la
 * sienne), qui devient la description envoyée à Veo. SERVEUR SEULEMENT.
 * Les paroles partent chez Anthropic pour ça (l'écran le dit avant le clic) ;
 * le calage, lui, reste local.
 */

export const LONGUEUR_MAX_DESCRIPTION = 400;
export type PropositionDeDecor = { titre: string; description: string };
export type Reponse = { ok: true; propositions: PropositionDeDecor[] } | { ok: false; statut: 400 | 404 | 409 | 412 | 502; raison: string };

const OUTIL = {
  name: "proposer_des_decors",
  description: "Propose trois décors visuels pour le clip karaoké de ce morceau.",
  input_schema: {
    type: "object",
    properties: {
      decors: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            titre: { type: "string", description: "Deux à cinq mots, en français" },
            description: { type: "string", description: `Le décor en une ou deux phrases, en français, ${LONGUEUR_MAX_DESCRIPTION} caractères au plus` },
          },
          required: ["titre", "description"],
        },
      },
    },
    required: ["decors"],
  },
};

const SYSTEME = `Tu es directeur artistique de clips musicaux. À partir des paroles, tu proposes TROIS décors de fond pour un clip karaoké, très différents entre eux, avec l'outil proposer_des_decors.
Un décor est une scène qui tient 8 secondes et boucle : un lieu, une lumière, un mouvement lent et continu (pluie, néons, vagues, foule floue, fumée, ciel). Il porte l'ambiance du morceau, sans raconter son histoire.
Interdits : du texte écrit dans l'image, des visages reconnaissables, une marque, une personne réelle, la violence explicite. Le bas de l'image reste calme : les paroles s'y affichent.
Écris en français, concret et visuel.`;

export async function proposerDesDecors(
  id: string,
  agent: ResolvedAgent | null = resolveAgent(),
  appeler: AppelerAvecOutil = appelerClaudeAvecOutil,
  lieux: { fiches: string; public: (id: string) => string } = { fiches: getFormatsDir(), public: getFormatPublicDir },
): Promise<Reponse> {
  const projet = chargerProjet(id, lieux.fiches);
  if (!projet) return { ok: false, statut: 404, raison: "Projet introuvable" };
  if (projet.etat === "invalide" || projet.fiche.format !== "karaoke") return { ok: false, statut: 409, raison: "Ce projet n'est pas un karaoké lisible." };
  const spec: KaraokeSpec = projet.fiche.spec;
  const paroles = etatDesParoles(lieux.public(id), spec.paroles);
  const lignes = lignesChantees(paroles.texte ?? paroles.brouillon ?? "");
  if (lignes.length < 4) return { ok: false, statut: 400, raison: "Écris d'abord tes paroles : Claude s'en sert pour proposer tes décors." };
  if (!agent) return { ok: false, statut: 412, raison: "Aucune clé Claude : ajoute-la dans les Réglages." };
  if (agent.provider !== "anthropic") return { ok: false, statut: 412, raison: "Les propositions fonctionnent avec une clé Claude (Anthropic)." };

  const { couleurs } = spec.marque;
  const message = `Titre : ${spec.morceau.titre}
Artiste : ${spec.morceau.artiste}
Couleurs de l'artiste : ${paletteEnMots([couleurs.encre, couleurs.accent, couleurs.clair])}

Paroles :
${[...new Set(lignes)].join("\n").slice(0, 4000)}`;
  const reponse = await appeler(agent, SYSTEME, message, OUTIL);
  if (!reponse.ok) return { ok: false, statut: 502, raison: reponse.raison };
  const decors = ((reponse.entree as { decors?: Partial<PropositionDeDecor>[] })?.decors ?? [])
    .map((d) => ({ titre: (d.titre ?? "").trim(), description: (d.description ?? "").trim().slice(0, LONGUEUR_MAX_DESCRIPTION) }))
    .filter((d) => d.titre && d.description);
  if (decors.length === 0) return { ok: false, statut: 502, raison: "Claude n'a pas proposé de décor : relance." };
  return { ok: true, propositions: decors };
}
