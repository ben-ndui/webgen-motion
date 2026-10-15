"use client";

import { useEffect, useState } from "react";

import { urlDuRendu } from "@/lib/film-store";
import type { DeclinaisonDuFilm } from "../../../../../../../remotion/film/spec";
import { cleDuRendu, useRenduDeFilm } from "../../../_components/use-rendu-de-film";
import ExportVersLeMontage from "./export-vers-le-montage";

type Props = {
  filmId: string;
  episodeId: string;
  titre: string;
  // Une déclinaison par langue suffit : l'épisode est toujours vertical.
  declinaisons: DeclinaisonDuFilm[];
  // Enregistre la fiche avant le rendu : le serveur rend ce qui est sur le disque.
  avantDeRendre: () => Promise<boolean>;
};

const LANGUES = { fr: "en français", en: "en anglais" } as const;

/**
 * Rendre l'épisode monté (plans, fondus, musique, logo) et le regarder, ou
 * l'ouvrir dans un logiciel de montage (.otio). Un rendu déjà fait se retrouve à l'ouverture (HEAD sur la vidéo).
 * Si un plan manque, le serveur refuse et la liste s'affiche.
 */
export default function RenduDeLEpisode({ filmId, episodeId, titre, declinaisons, avantDeRendre }: Props) {
  const { enCours, etats, lancer } = useRenduDeFilm(filmId);
  const [dejaRendus, setDejaRendus] = useState<Record<string, string>>({});
  const parLangue = declinaisons.filter((d, i) => declinaisons.findIndex((autre) => autre.langue === d.langue) === i);

  useEffect(() => {
    for (const declinaison of parLangue) {
      const url = urlDuRendu(filmId, declinaison.nom, undefined, "episode", episodeId);
      void fetch(url, { method: "HEAD", cache: "no-store" })
        .then((reponse) => reponse.ok && setDejaRendus((avant) => ({ ...avant, [declinaison.nom]: `${url}&t=${Date.now()}` })))
        .catch(() => undefined);
    }
    // parLangue se recalcule à chaque rendu : la liste des noms suffit comme dépendance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filmId, episodeId, parLangue.map((d) => d.nom).join("|")]);

  const rendre = async (nom: string) => {
    if (!(await avantDeRendre())) return;
    await lancer(nom, "episode", episodeId);
  };

  return (
    <section className="bloc rendu-episode" aria-label={`Rendu de ${titre}`}>
      <h3 className="bloc-titre">L&apos;épisode monté</h3>
      <p className="champ-aide">
        Les plans bout à bout, un fondu entre les scènes, ta musique baissée sous les répliques, puis ton logo. Le rendu se fait sur ton ordinateur : il
        ne coûte rien.
      </p>
      <p className="champ-aide">
        À la publication, coche l&apos;étiquette « Contenu généré par IA » d&apos;Instagram ou de TikTok : la loi l&apos;impose pour une vidéo réaliste
        générée par IA, et elle n&apos;est pas écrite dans la vidéo.
      </p>
      {parLangue.map((declinaison) => {
        const etat = etats[cleDuRendu("episode", declinaison.nom, episodeId)];
        const video = etat?.type === "fait" ? etat.url : dejaRendus[declinaison.nom];
        return (
          <div key={declinaison.nom} className="rendu-ligne">
            <button type="button" className="film-btn" disabled={enCours !== null} onClick={() => void rendre(declinaison.nom)}>
              {video ? "Rendre à nouveau" : "Rendre l'épisode"} {parLangue.length > 1 ? LANGUES[declinaison.langue] : ""}
            </button>
            {etat?.type === "en-cours" && (
              <p className="champ-aide" role="status">
                {etat.label}
                {etat.total > 0 ? ` (${Math.round((etat.frames / etat.total) * 100)} %)` : ""}
              </p>
            )}
            {etat?.type === "erreur" && (
              <div className="depot-erreur" role="alert">
                <p>{etat.message}</p>
                {etat.details.length > 0 && (
                  <ul>
                    {etat.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {video && <video className="rendu-video" src={video} controls playsInline aria-label={`${titre}, ${LANGUES[declinaison.langue]}`} />}
            <ExportVersLeMontage filmId={filmId} episodeId={episodeId} declinaison={declinaison.nom} avantDExporter={avantDeRendre} />
          </div>
        );
      })}
    </section>
  );
}
