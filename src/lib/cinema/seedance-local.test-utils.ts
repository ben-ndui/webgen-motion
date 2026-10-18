import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { videoMp4 } from "./veo-local.test-utils";

/**
 * Un faux fal.ai local pour les tests de Seedance : il répond avec la forme
 * EXACTE de la file d'attente (soumission, statut, résultat). Aucun appel
 * réel, aucun coût.
 */
export type ReponseLocale = { statut: number; corps: unknown } | { statut: number; video: true };
export type Appel = { methode: string; chemin: string; autorisation: string | undefined; corps: string };

export type FalLocal = {
  base: string;
  appels: Appel[];
  repondre: (...reponses: ReponseLocale[]) => void;
  fermer: () => Promise<void>;
};

export const REQUEST_ID = "7a1b2c3d-saya";

export const soumissionAcceptee = (): ReponseLocale => ({ statut: 200, corps: { request_id: REQUEST_ID } });
export const enFile = (): ReponseLocale => ({ statut: 200, corps: { status: "IN_QUEUE", request_id: REQUEST_ID } });
export const enCours = (): ReponseLocale => ({ statut: 200, corps: { status: "IN_PROGRESS", request_id: REQUEST_ID } });
export const termine = (base: string): [ReponseLocale, ReponseLocale] => [
  { statut: 200, corps: { status: "COMPLETED", request_id: REQUEST_ID } },
  { statut: 200, corps: { video: { url: `${base}/files/plan.mp4`, content_type: "video/mp4" } } },
];

export async function demarrerFalLocal(): Promise<FalLocal> {
  const file: ReponseLocale[] = [];
  const appels: Appel[] = [];
  const serveur: Server = createServer((requete: IncomingMessage, reponse: ServerResponse) => {
    let corps = "";
    requete.on("data", (morceau) => (corps += morceau));
    requete.on("end", () => {
      appels.push({ methode: requete.method ?? "", chemin: requete.url ?? "", autorisation: requete.headers.authorization, corps });
      const suivante = file.shift() ?? { statut: 500, corps: { detail: "aucune réponse prévue" } };
      if ("video" in suivante) {
        reponse.writeHead(suivante.statut, { "Content-Type": "video/mp4" }).end(videoMp4());
        return;
      }
      reponse.writeHead(suivante.statut, { "Content-Type": "application/json" }).end(JSON.stringify(suivante.corps));
    });
  });
  await new Promise<void>((pret) => serveur.listen(0, "127.0.0.1", pret));
  const base = `http://127.0.0.1:${(serveur.address() as AddressInfo).port}`;
  return {
    base,
    appels,
    repondre: (...reponses) => file.push(...reponses),
    fermer: () => new Promise((fin) => serveur.close(() => fin())),
  };
}
