import { notFound } from "next/navigation";

import { etatDeLEditeur } from "@/lib/film-editeur";
import { isPublicWebRuntime } from "@/lib/server/desktop-guard";
import CadreDuFilm, { EnTeteDuFilm } from "../_components/cadre-du-film";
import AssistantDuFilm from "./_components/assistant-du-film";
import "./assistant.css";

/**
 * L'assistant de création d'un film. La fiche se lit sur le disque ici, côté
 * serveur ; l'assistant la modifie ensuite par l'API (enregistrement auto).
 * Jamais sur la vitrine publique : un film est un projet local.
 */
export const dynamic = "force-dynamic";

export default async function CreerUnFilmPage({ params }: { params: Promise<{ id: string }> }) {
  if (isPublicWebRuntime(process.env)) notFound();
  const { id } = await params;
  const etat = etatDeLEditeur(id);
  if (!etat) {
    return (
      <CadreDuFilm nom={id}>
        <EnTeteDuFilm id={id} titre="Film introuvable" sousTitre="Aucun film à ce nom : crée-le depuis le hub, bouton « Nouveau film »." />
      </CadreDuFilm>
    );
  }
  const nom = etat.fiche.marque?.logo?.type === "motSymbole" ? etat.fiche.marque.logo.texte : id;
  return (
    <CadreDuFilm nom={nom}>
      <EnTeteDuFilm id={id} titre={`Créer le film de ${nom}`} sousTitre="Cinq étapes, dans l'ordre que tu veux. Tout s'enregistre au fur et à mesure." />
      <AssistantDuFilm etatInitial={etat} />
    </CadreDuFilm>
  );
}
