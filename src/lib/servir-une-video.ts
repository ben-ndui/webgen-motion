import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";

/**
 * Sert une vidéo du disque PAR MORCEAUX (requêtes `Range`), en flux.
 *
 * Sans ça, le navigateur ne peut pas sauter à un instant : une vignette
 * `#t=14` restait sur la première image (l'intro, un aplat de couleur), et
 * chaque vignette du tableau de bord téléchargeait le film entier (37 Mo pour
 * un seul tour) en le chargeant d'abord tout en mémoire.
 */

export type Plage = { debut: number; fin: number };

/**
 * Lit l'en-tête `Range` (`bytes=debut-fin`, `bytes=debut-`, `bytes=-suffixe`).
 * `null` : pas de plage exploitable, on sert tout (plages multiples comprises).
 * `"hors-limites"` : la plage ne tombe pas dans le fichier (réponse 416).
 */
export function plageDemandee(entete: string | null, taille: number): Plage | "hors-limites" | null {
  if (!entete) return null;
  const trouve = /^bytes=(\d*)-(\d*)$/.exec(entete.trim());
  if (!trouve) return null;
  const [, debutEcrit, finEcrite] = trouve;
  if (debutEcrit === "" && finEcrite === "") return null;

  if (debutEcrit === "") {
    const suffixe = Number(finEcrite);
    if (suffixe === 0 || taille === 0) return "hors-limites";
    return { debut: Math.max(0, taille - suffixe), fin: taille - 1 };
  }
  const debut = Number(debutEcrit);
  if (debut >= taille) return "hors-limites";
  const fin = finEcrite === "" ? taille - 1 : Math.min(Number(finEcrite), taille - 1);
  if (fin < debut) return "hors-limites";
  return { debut, fin };
}

function flux(chemin: string, plage?: Plage): ReadableStream<Uint8Array> {
  const lecture = createReadStream(chemin, plage ? { start: plage.debut, end: plage.fin } : undefined);
  return Readable.toWeb(lecture) as ReadableStream<Uint8Array>;
}

/** La réponse pour un fichier qui EXISTE (l'appelant a vérifié le chemin). */
export function reponseVideo(req: Request, chemin: string, typeDeContenu = "video/mp4"): Response {
  const taille = statSync(chemin).size;
  const communs = { "Content-Type": typeDeContenu, "Accept-Ranges": "bytes", "Cache-Control": "no-store" };
  const plage = plageDemandee(req.headers.get("range"), taille);

  if (plage === "hors-limites") {
    return new Response(null, { status: 416, headers: { ...communs, "Content-Range": `bytes */${taille}` } });
  }
  if (plage === null) {
    return new Response(flux(chemin), { status: 200, headers: { ...communs, "Content-Length": String(taille) } });
  }
  return new Response(flux(chemin, plage), {
    status: 206,
    headers: {
      ...communs,
      "Content-Length": String(plage.fin - plage.debut + 1),
      "Content-Range": `bytes ${plage.debut}-${plage.fin}/${taille}`,
    },
  });
}
