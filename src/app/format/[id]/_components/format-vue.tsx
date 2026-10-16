"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ResumeDuProjet, StatutDuProjet } from "@/lib/formats/format-etat";
import { useRenduEnFlux } from "@/lib/use-rendu-en-flux";
import CadreDuFormat from "./cadre-du-format";
import DepotDeMusique from "./depot-de-musique";
import RenduDeFormat from "./rendu-de-format";

const STATUT: Record<StatutDuProjet, { libelle: string; classe: string }> = {
  invalide: { libelle: "À corriger", classe: "film-status" },
  exemple: { libelle: "Contenu d'exemple", classe: "film-status film-status-brouillon" },
  "medias-manquants": { libelle: "Fichiers à déposer", classe: "film-status film-status-medias-manquants" },
  pret: { libelle: "Prêt à rendre", classe: "film-status film-status-pret" },
  rendu: { libelle: "Rendu", classe: "film-status film-status-rendu" },
};

type Props = { id: string; resume: ResumeDuProjet | null; pourQui: string | null; studio: boolean };

/**
 * La page d'un projet de format, dans ses trois cas : introuvable, invalide
 * (toutes ses erreurs, chemin du champ compris), lisible (ce qui bloque dit en
 * clair, les fichiers attendus, puis un rendu par déclinaison).
 */
export default function FormatVue({ id, resume, pourQui, studio }: Props) {
  const router = useRouter();
  const { enCours, etats, lancer, annuler } = useRenduEnFlux("/api/motion/formats/render");

  if (!resume) {
    return (
      <CadreDuFormat nom={id} kicker="Format" titre="Projet introuvable" sousTitre={`Aucun projet « ${id} » dans le dossier des formats.`}>
        <div className="film-block film-alert" role="alert">
          <p>Le projet a peut-être été renommé ou supprimé. Reviens à la liste des formats pour l&apos;ouvrir.</p>
        </div>
      </CadreDuFormat>
    );
  }

  const statut = STATUT[resume.statut];
  const bloque = resume.statut === "exemple" || resume.statut === "medias-manquants";
  return (
    <CadreDuFormat
      nom={resume.id}
      kicker={`${resume.libelle} · formats/${resume.id}.json`}
      titre={resume.id}
      sousTitre={pourQui ?? "Format inconnu."}
      statut={
        <div className="film-actions">
          <span className={statut.classe} data-wm-id="format.statut">{statut.libelle}</span>
          {resume.statut !== "invalide" && (
            <Link className="film-btn film-btn-ghost" href={`/format/${id}/editer`} data-wm-id="format.modifier">
              Modifier le contenu
            </Link>
          )}
        </div>
      }
    >
      {resume.statut === "invalide" ? (
        <div className="film-block film-alert" role="alert">
          <h2 className="film-h2">
            Projet à corriger · {resume.erreurs.length} erreur{resume.erreurs.length > 1 ? "s" : ""}
          </h2>
          <ul className="film-list">
            {resume.erreurs.map((erreur) => (
              <li key={erreur}>
                <code>{erreur}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="film-main">
          {resume.statut === "exemple" && (
            <p className="film-warning" role="note" data-wm-id="format.exemple">
              Ce projet porte encore l&apos;exemple du format : le rendu reste refusé tant que tu ne l&apos;as pas remplacé par ton contenu.
            </p>
          )}
          <section className="film-block" aria-labelledby="fichiers" data-wm-id="format.medias">
            <h2 id="fichiers" className="film-h2">Fichiers</h2>
            <ul className="film-list">
              {resume.medias.map((media) => (
                <li key={media.relatif}>
                  <code>{media.relatif}</code> · {media.present ? "déposé" : "à déposer"}
                </li>
              ))}
            </ul>
            <DepotDeMusique id={id} karaoke={resume.format === "karaoke"} onDepose={() => router.refresh()} />
          </section>
          <section className="film-section" aria-labelledby="rendus" data-wm-id="format.rendus">
            <h2 id="rendus" className="film-h2">Rendus</h2>
            {!studio && <p className="film-muted">Le rendu des formats est une fonction Studio.</p>}
            <ul className="film-rendus-liste">
              {resume.declinaisons.map((declinaison) => (
                <RenduDeFormat
                  key={declinaison.nom}
                  declinaison={declinaison}
                  bloque={bloque}
                  studio={studio}
                  etat={etats[declinaison.nom] ?? (declinaison.rendu ? { type: "fait", ...declinaison.rendu } : { type: "repos" })}
                  occupe={enCours !== null}
                  onLancer={() => void lancer(declinaison.nom, { id, declinaison: declinaison.nom })}
                  onAnnuler={annuler}
                />
              ))}
            </ul>
          </section>
        </div>
      )}
    </CadreDuFormat>
  );
}
