import type { Personnage } from "../../../remotion/film/cinema/types";
import { genreDImage } from "../film-fichiers-deposes";
import { nomDeCouleur } from "./couleurs";
import { type ClientVeo, raisonDuRefus } from "./veo";

/**
 * Le portrait de référence d'un personnage, généré par Gemini (image). Il est
 * fait UNE fois, puis envoyé à Veo avec chaque plan où le personnage apparaît :
 * c'est lui qui garde le même visage d'un décor à l'autre (recette du 14/10).
 * Même clé et même serveur que Veo. SERVEUR SEULEMENT.
 */
export const MODELE_DE_PORTRAIT = "gemini-3.1-flash-image";
// Relevé sur ai.google.dev (09/2026), une image ~1 Mpx.
export const COUT_D_UN_PORTRAIT_USD = 0.05;

export type Portrait = { ok: true; octets: Uint8Array; extension: "jpg" | "png" } | { ok: false; statut: number; raison: string };

export function promptDuPortrait(personnage: Pick<Personnage, "description">, couleurDeFond: string): string {
  return (
    "Photorealistic character reference portrait, vertical, upper body, neutral soft studio light, " +
    `plain ${nomDeCouleur(couleurDeFond)} background. ${personnage.description.trim()} ` +
    "Calm, confident expression, looking at the camera. Natural skin texture. No text, no logo."
  );
}

type ReponseGemini = { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] };

export async function genererUnPortraitChezGoogle(client: ClientVeo, prompt: string): Promise<Portrait> {
  let reponse: Response;
  try {
    reponse = await fetch(`${client.base}/models/${MODELE_DE_PORTRAIT}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": client.cle },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "9:16" } },
      }),
    });
  } catch {
    return { ok: false, statut: 0, raison: "Google injoignable : vérifie ta connexion." };
  }
  let corps: ReponseGemini | null = null;
  try {
    corps = (await reponse.json()) as ReponseGemini;
  } catch {
    corps = null;
  }
  if (!reponse.ok) return { ok: false, statut: reponse.status, raison: raisonDuRefus(reponse.status, corps) };
  const donnees = corps?.candidates?.[0]?.content?.parts?.find((partie) => partie.inlineData?.data)?.inlineData?.data;
  if (!donnees) return { ok: false, statut: 200, raison: "Google n'a rendu aucune image (filtre de sécurité ou description refusée)." };
  const octets = new Uint8Array(Buffer.from(donnees, "base64"));
  // On juge le fichier sur son contenu, pas sur le type annoncé.
  const genre = genreDImage(octets);
  if (genre !== "jpeg" && genre !== "png") return { ok: false, statut: 200, raison: "Google a rendu un fichier qui n'est pas une image JPEG ou PNG." };
  return { ok: true, octets, extension: genre === "jpeg" ? "jpg" : "png" };
}
