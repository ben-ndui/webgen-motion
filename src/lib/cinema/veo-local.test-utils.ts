import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";

import { dossierJetable } from "../film-fixtures.test-utils";

/**
 * Un faux Google local pour les tests du cinéma : il répond avec la forme
 * EXACTE des réponses reçues de Veo le 14/10 (lancement, opération en cours,
 * opération finie, téléchargement). Aucun appel réel, aucun coût.
 */
export type ReponseLocale = { statut: number; corps: unknown } | { statut: number; video: true };
export type Appel = { methode: string; chemin: string; cle: string | undefined; corps: string };

export type GoogleLocal = {
  base: string;
  appels: Appel[];
  // La file des réponses, consommée dans l'ordre des requêtes.
  repondre: (...reponses: ReponseLocale[]) => void;
  fermer: () => Promise<void>;
};

let videoDeTest: Buffer | null = null;

/** Une vraie vidéo MP4 de 1 s, fabriquée une fois par ffmpeg. */
export function videoMp4(): Buffer {
  if (videoDeTest) return videoDeTest;
  const chemin = join(dossierJetable("veo-video"), "plan.mp4");
  spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=navy:s=108x192:d=1", "-pix_fmt", "yuv420p", chemin]);
  videoDeTest = readFileSync(chemin);
  return videoDeTest;
}

let portraitDeTest: Buffer | null = null;

/** Une vraie image JPEG, fabriquée une fois par ffmpeg (sert de portrait). */
export function portraitJpeg(): Buffer {
  if (portraitDeTest) return portraitDeTest;
  const chemin = join(dossierJetable("veo-portrait"), "portrait.jpg");
  spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=navy:s=72x128", "-frames:v", "1", chemin]);
  portraitDeTest = readFileSync(chemin);
  return portraitDeTest;
}

/** La réponse de Gemini image : le portrait en base64 dans `inlineData`. */
export const portraitRendu = (octets: Buffer = portraitJpeg()): ReponseLocale => ({
  statut: 200,
  corps: { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/jpeg", data: octets.toString("base64") } }] } }] },
});

export const OPERATION = "models/veo-3.1-fast-generate-preview/operations/ab12cd34";

export const lancementAccepte = (): ReponseLocale => ({ statut: 200, corps: { name: OPERATION } });
export const enCours = (): ReponseLocale => ({ statut: 200, corps: { name: OPERATION } });
export const termine = (base: string): ReponseLocale => ({
  statut: 200,
  corps: {
    name: OPERATION,
    done: true,
    response: { generateVideoResponse: { generatedSamples: [{ video: { uri: `${base}/files/xyz:download?alt=media` } }] } },
  },
});

export async function demarrerGoogleLocal(): Promise<GoogleLocal> {
  const file: ReponseLocale[] = [];
  const appels: Appel[] = [];
  const serveur: Server = createServer((requete: IncomingMessage, reponse: ServerResponse) => {
    let corps = "";
    requete.on("data", (morceau) => (corps += morceau));
    requete.on("end", () => {
      appels.push({ methode: requete.method ?? "", chemin: requete.url ?? "", cle: requete.headers["x-goog-api-key"] as string | undefined, corps });
      const suivante = file.shift() ?? { statut: 500, corps: { error: { message: "aucune réponse prévue" } } };
      if ("video" in suivante) {
        reponse.writeHead(suivante.statut, { "Content-Type": "video/mp4" }).end(videoMp4());
        return;
      }
      reponse.writeHead(suivante.statut, { "Content-Type": "application/json" }).end(JSON.stringify(suivante.corps));
    });
  });
  await new Promise<void>((pret) => serveur.listen(0, "127.0.0.1", pret));
  const base = `http://127.0.0.1:${(serveur.address() as AddressInfo).port}/v1beta`;
  return {
    base,
    appels,
    repondre: (...reponses) => file.push(...reponses),
    fermer: () => new Promise((fin) => serveur.close(() => fin())),
  };
}
