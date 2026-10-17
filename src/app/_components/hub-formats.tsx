import Link from "next/link";

import type { StatutDuProjet } from "@/lib/formats/format-etat";
import ApercuDuCadre from "./apercu-du-cadre";
import NouveauFormatBouton, { type FormatProposable } from "./nouveau-format-bouton";

/**
 * Section « Formats » du hub : les vidéos du catalogue (explainer, conte,
 * karaoké), une carte par projet, statut tiré du disque (format-etat.ts).
 * Trois états explicites : erreur de lecture, aucun projet, liste.
 */

export interface HubFormat {
  id: string;
  libelle: string;
  statut: StatutDuProjet;
  erreurs: number;
  apercu: { video: string | null; portrait: boolean };
}

const STATUT: Record<StatutDuProjet, { libelle: string; classe: string }> = {
  invalide: { libelle: "À corriger", classe: "missing" },
  exemple: { libelle: "Exemple", classe: "draft" },
  "medias-manquants": { libelle: "Fichiers à déposer", classe: "missing" },
  pret: { libelle: "Prêt à rendre", classe: "ready" },
  rendu: { libelle: "Rendu", classe: "rendered" },
};

function CarteDeFormat({ projet }: { projet: HubFormat }) {
  const statut = STATUT[projet.statut];
  return (
    <Link className="tcard fcard" href={`/format/${projet.id}`} data-wm-id="hub.format.card">
      <ApercuDuCadre portrait={projet.apercu.portrait} video={projet.apercu.video} badge={projet.apercu.portrait ? "9:16" : "16:9"} instant={3} />
      <div className="tbody">
        <div className="tbody-top">
          <h3 className="tname">{projet.id}</h3>
        </div>
        <div className="tmeta">
          <span className="tcat">{projet.libelle}</span>
        </div>
        <div className="tfoot">
          <span className={`status ${statut.classe}`}>
            <span className="sdot" />
            {statut.libelle}
          </span>
          {projet.erreurs > 0 && <span className="tedit">{projet.erreurs} erreur{projet.erreurs > 1 ? "s" : ""}</span>}
        </div>
      </div>
    </Link>
  );
}

type Props = { projets: HubFormat[]; formats: FormatProposable[]; error: string | null };

export default function HubFormats({ projets, formats, error }: Props) {
  return (
    <section id="formats" className="films-wrap" data-wm-id="hub.formats" aria-labelledby="hub-formats-title">
      <div className="films-head">
        <h2 id="hub-formats-title" className="section-title">
          Formats <span className="n">{error ? "" : projets.length}</span>
        </h2>
        <NouveauFormatBouton formats={formats} />
      </div>
      {error ? (
        <div className="films-note error" role="alert">
          <b>Impossible de lire le dossier des formats</b>
          <span>{error}</span>
        </div>
      ) : projets.length === 0 ? (
        <div className="films-note">
          <b>Aucune vidéo de format</b>
          <span>
            Un explainer pour expliquer un sujet, un conte à compteur pour vendre avec un chiffre, un clip karaoké
            pour un morceau : clique sur « Nouvelle vidéo ».
          </span>
        </div>
      ) : (
        <div className="grid">
          {projets.map((projet) => (
            <CarteDeFormat key={projet.id} projet={projet} />
          ))}
        </div>
      )}
    </section>
  );
}
