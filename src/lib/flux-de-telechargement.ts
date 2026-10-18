import type { Progression, ResultatDuTelechargement } from "./modeles-whisper";

/**
 * Diffuser le téléchargement d'un modèle à l'écran, en NDJSON :
 * { type: "progress", recus, total } (une ligne par pour-cent), puis
 * { type: "done", ok: true } ou { type: "error", message }. Partagé par les
 * modèles whisper et le modèle d'alignement du karaoké. SERVEUR SEULEMENT.
 */
export function diffuserUnTelechargement(
  telecharger: (surProgression: Progression) => Promise<ResultatDuTelechargement>,
  termine: () => void = () => {},
): Response {
  const encodeur = new TextEncoder();
  const flux = new ReadableStream({
    async start(controller) {
      const emettre = (evenement: Record<string, unknown>) => {
        try {
          controller.enqueue(encodeur.encode(`${JSON.stringify(evenement)}\n`));
        } catch {}
      };
      // Une ligne tous les 1 % : assez pour une barre fluide, sans noyer l'écran de 1,5 Go de messages.
      let dernierPourcent = -1;
      let resultat: ResultatDuTelechargement;
      try {
        resultat = await telecharger((recus, total) => {
          const pourcent = Math.floor((recus / total) * 100);
          if (pourcent !== dernierPourcent) {
            dernierPourcent = pourcent;
            emettre({ type: "progress", recus, total });
          }
        });
      } catch {
        resultat = { ok: false, raison: "Le téléchargement a échoué : relance-le." };
      } finally {
        termine();
      }
      emettre(resultat.ok ? { type: "done", ok: true } : { type: "error", message: resultat.raison });
      try {
        controller.close();
      } catch {}
    },
  });
  return new Response(flux, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
