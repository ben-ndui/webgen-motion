"use client";

import { useState } from "react";

import { LONGUEUR_MAX_DE_LA_BIBLE_COLLEE } from "@/lib/cinema/assistant/types";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import AideDeClaude from "./aide-de-claude";
import { useAssistant } from "./use-assistant";

type Props = {
  filmId: string;
  cinema: CinemaDuFilm;
  modifierLaSerie: (changement: (cinema: CinemaDuFilm) => void) => void;
};

const TEXTE_MIN = 20;
// Garde-fou client, en plus de la route : évite un aller-retour pour rien
// quand le fichier dépasse déjà la limite qu'elle applique.
const TAILLE_MAX_PDF_OCTETS = 8 * 1024 * 1024;

type EtatPdf = { type: "repos" } | { type: "en-cours" } | { type: "tronque"; longueurOriginale: number };

/**
 * Coller la bible de production de la cliente (personnages, monde, épisodes
 * déjà écrits ou résumés) : Claude en extrait les personnages, les
 * créatures/objets/décors et un brief par épisode. Même proposition à
 * garder ou non que le reste de l'assistant : rien n'est ajouté d'un clic.
 * Un PDF déposé passe par la même case : on en extrait le texte côté serveur
 * puis il remplit la zone ci-dessous, exactement comme un copier-coller.
 */
export default function ImporterLaBible({ filmId, cinema, modifierLaSerie }: Props) {
  const [texte, setTexte] = useState("");
  const [etatPdf, setEtatPdf] = useState<EtatPdf>({ type: "repos" });
  const [erreurPdf, setErreurPdf] = useState<string | null>(null);
  const assistant = useAssistant(filmId, cinema, modifierLaSerie);
  const enCours = assistant.etat.type === "en-cours";
  // Une proposition de Claude attend un « Garder » ou un « Non merci » sur LE
  // TEXTE ACTUEL : déposer un PDF maintenant changerait la zone sous elle
  // sans qu'elle le sache, et « Garder » appliquerait alors une proposition
  // qui ne correspond plus à ce qui est affiché.
  const propositionEnAttente = assistant.etat.type === "proposition";
  const depotBloque = enCours || propositionEnAttente || etatPdf.type === "en-cours";

  const deposerUnPdf = async (fichier: File) => {
    setErreurPdf(null);
    if (fichier.size > TAILLE_MAX_PDF_OCTETS) {
      setErreurPdf(`Fichier trop gros (${Math.round(fichier.size / 1024 / 1024)} Mo) : limite 8 Mo.`);
      return;
    }
    if (texte.trim().length > 0 && !window.confirm("Remplacer le texte déjà présent dans la zone par celui du PDF ?")) {
      return;
    }
    setEtatPdf({ type: "en-cours" });
    try {
      const formulaire = new FormData();
      formulaire.set("fichier", fichier);
      const reponse = await fetch("/api/motion/cinema/bible/pdf", { method: "POST", body: formulaire });
      const corps = (await reponse.json().catch(() => ({}))) as { texte?: string; tronque?: boolean; longueurOriginale?: number; erreur?: string };
      if (!reponse.ok || !corps.texte) {
        setErreurPdf(corps.erreur ?? "Le PDF n'a pas pu être lu.");
        setEtatPdf({ type: "repos" });
        return;
      }
      setTexte(corps.texte);
      setEtatPdf(corps.tronque ? { type: "tronque", longueurOriginale: corps.longueurOriginale ?? corps.texte.length } : { type: "repos" });
    } catch {
      setErreurPdf("GEN MOTION ne répond pas.");
      setEtatPdf({ type: "repos" });
    }
  };

  return (
    <section className="bloc importer-bible" aria-label="Importer la bible de la série">
      <h3 className="bloc-titre">Importer la bible de la série</h3>
      <p className="champ-aide">
        Colle le texte de la bible de production de ta cliente (personnages, monde, épisodes déjà écrits ou résumés),
        ou dépose directement son PDF : Claude en extrait ce qu&apos;il trouve. Rien n&apos;est ajouté avant que tu
        l&apos;acceptes, comme chaque proposition.
      </p>
      <label className={`film-btn film-btn-ghost${depotBloque ? " desactive" : ""}`}>
        {etatPdf.type === "en-cours" ? "Lecture du PDF…" : "Déposer un PDF"}
        <input
          type="file"
          accept="application/pdf,.pdf"
          hidden
          disabled={depotBloque}
          onChange={(e) => {
            const fichier = e.target.files?.[0] ?? null;
            e.target.value = "";
            if (fichier) void deposerUnPdf(fichier);
          }}
        />
      </label>
      {propositionEnAttente && <p className="champ-aide">Réponds à la proposition de Claude ci-dessous avant de déposer un autre PDF.</p>}
      {erreurPdf && (
        <p className="depot-erreur" role="alert">
          {erreurPdf}
        </p>
      )}
      {etatPdf.type === "tronque" && (
        <p className="champ-aide">
          Ce PDF contenait {etatPdf.longueurOriginale} caractères : coupé à {LONGUEUR_MAX_DE_LA_BIBLE_COLLEE}, à la dernière fin de paragraphe.
        </p>
      )}
      <textarea
        className="champ-saisie zone"
        rows={6}
        value={texte}
        disabled={enCours || etatPdf.type === "en-cours"}
        maxLength={LONGUEUR_MAX_DE_LA_BIBLE_COLLEE}
        placeholder="Colle ici le texte de sa bible…"
        onChange={(e) => {
          setTexte(e.target.value);
          if (etatPdf.type === "tronque") setEtatPdf({ type: "repos" });
        }}
      />
      <span className="champ-compteur" aria-live="polite">
        {texte.length} / {LONGUEUR_MAX_DE_LA_BIBLE_COLLEE}
      </span>
      <button
        type="button"
        className="film-btn film-btn-ghost"
        disabled={enCours || etatPdf.type === "en-cours" || texte.trim().length < TEXTE_MIN}
        onClick={() => void assistant.demander({ type: "importer-bible", texte: texte.trim() })}
      >
        {enCours ? "Claude lit la bible…" : "Importer avec Claude"}
      </button>
      <AideDeClaude
        cinema={cinema}
        gestes={[]}
        etat={assistant.etat}
        demander={(d) => void assistant.demander(d)}
        // Le texte ne se vide qu'une fois GARDÉ : sur une erreur (pas de clé,
        // série invalide, réponse coupée…) ou sur « Non merci », il reste
        // collé, rien à retrouver et recoller pour relancer.
        garder={() => assistant.garder(() => setTexte(""))}
        refuser={assistant.refuser}
        autre={assistant.autre}
        visibleSansGeste
        permettreAutre={false}
      />
    </section>
  );
}
