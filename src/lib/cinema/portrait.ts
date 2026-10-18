import { genreDImage } from "../film-fichiers-deposes";
import { type ClientVeo, raisonDuRefus } from "./veo";

/**
 * Le client Gemini (image) : envoie un prompt déjà composé, rend l'image.
 * Le prompt lui-même vient de `bible/prompt.ts` (une vue de la bible :
 * personnage, créature, objet ou décor). Même clé et même serveur que Veo.
 * SERVEUR SEULEMENT.
 */
export const MODELE_DE_PORTRAIT = "gemini-3.1-flash-image";

export type Portrait = { ok: true; octets: Uint8Array; extension: "jpg" | "png" } | { ok: false; statut: number; raison: string };

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
