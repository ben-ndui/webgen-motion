"use client";

import { useEffect, useRef, useState } from "react";

import { type EtatDuRemplissage, useRemplissage } from "./use-remplissage";

const LIBELLES_A_ECRIRE: Record<string, string> = {
  conversation: "la conversation", constat: "le constat", chiffre: "le chiffre", promesse: "la promesse",
  parcours: "les légendes du parcours", momentCle: "le moment clé", troisMots: "les trois mots", ouTrouver: "la fin",
  motSignature: "le mot signature", anneau: "la phrase qui tourne", legendes: "les légendes des Reels", signature: "la ligne sous le logo",
};

function Resume({ etat }: { etat: Extract<EtatDuRemplissage, { type: "fait" }> }) {
  const { resume } = etat;
  const aEcrire = [...new Set(resume.aEcrire.map((cle) => LIBELLES_A_ECRIRE[cle.split(".")[1] ?? ""] ?? cle))];
  return (
    <div className="remplir-resume" role="status">
      <p><b>C&apos;est rempli.</b> {resume.captures} captures, {resume.videos > 0 ? `${resume.videos} écrans filmés, ` : ""}{resume.logo ? "logo trouvé" : "logo à déposer"}, {resume.textesProposes} textes proposés.</p>
      {resume.suggestionsEnAttente > 0 && (
        <p className="champ-aide">
          {resume.suggestionsEnAttente} texte{resume.suggestionsEnAttente > 1 ? "s" : ""} que tu avais déjà écrit{resume.suggestionsEnAttente > 1 ? "s" : ""} {resume.suggestionsEnAttente > 1 ? "ont été gardés" : "a été gardé"} : la proposition du site s&apos;affiche dessous, avec « Utiliser ».
        </p>
      )}
      {resume.capturesGardees > 0 && <p className="champ-aide">{resume.capturesGardees} captures déjà présentes ont été gardées telles quelles.</p>}
      <p className="champ-aide">Tout ce qui vient du site porte « Proposé, à vérifier » : relis-le, change ce qui ne te ressemble pas.</p>
      {resume.textesProposes === 0 && <p className="champ-aide">Textes : {resume.redaction}.</p>}
      {aEcrire.length > 0 && <p className="champ-aide">À écrire toi-même : {aEcrire.join(", ")}.</p>}
      {resume.marque.map((note) => <p key={note} className="champ-aide">{note.charAt(0).toUpperCase() + note.slice(1)}.</p>)}
    </div>
  );
}

type Props = {
  id: string;
  adresseAuDepart?: string;
  avantDeLancer: () => Promise<boolean>;
  recharger: () => Promise<void>;
  // Pendant le remplissage, le formulaire est gelé : le serveur réécrit la fiche.
  onOccupe: (occupe: boolean) => void;
};

/**
 * « Remplir depuis ton site » : une adresse, et GEN MOTION capture le site,
 * lit la marque et propose les textes. Lancé tout seul si l'adresse a été
 * donnée à la création du film.
 */
export default function RemplirDepuisLeSite({ id, adresseAuDepart, avantDeLancer, recharger, onOccupe }: Props) {
  const [adresse, setAdresse] = useState(adresseAuDepart ?? "");
  const [remplacerCaptures, setRemplacerCaptures] = useState(false);
  const { etat, lancer, arreter } = useRemplissage(id, recharger);
  const dejaLance = useRef(false);

  async function demarrer(url: string) {
    if (!(await avantDeLancer())) return;
    onOccupe(true);
    try {
      await lancer(url, remplacerCaptures);
    } finally {
      onOccupe(false);
    }
  }

  useEffect(() => {
    if (!adresseAuDepart || dejaLance.current) return;
    dejaLance.current = true;
    // L'adresse quitte la barre : recharger la page ne relancera pas le remplissage.
    window.history.replaceState(null, "", window.location.pathname);
    void demarrer(adresseAuDepart);
    // Lancement unique au montage, avec l'adresse de la création.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adresseAuDepart]);

  const enCours = etat.type === "en-cours";
  return (
    <section className="bloc remplir" aria-labelledby="remplir-titre" data-wm-id="film.remplir">
      <h3 id="remplir-titre" className="bloc-titre">Remplir depuis ton site</h3>
      <p className="champ-aide">
        GEN MOTION ouvre ton site, le filme au téléphone et sur ordinateur, lit tes couleurs et ton logo, et propose
        tes textes. Ce que tu as déjà écrit n&apos;est jamais remplacé.
      </p>
      <form className="remplir-ligne" onSubmit={(e) => { e.preventDefault(); void demarrer(adresse); }}>
        <input className="champ-saisie" value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="monsite.fr" aria-label="Adresse de ton site" disabled={enCours} />
        {enCours ? (
          <button type="button" className="film-btn film-btn-ghost" onClick={arreter}>Arrêter</button>
        ) : (
          <button type="submit" className="film-btn" disabled={!adresse.trim()}>Remplir</button>
        )}
      </form>
      <label className="case-a-cocher">
        <input type="checkbox" checked={remplacerCaptures} disabled={enCours} onChange={(e) => setRemplacerCaptures(e.target.checked)} />
        Remplacer aussi mes captures actuelles par des vidéos filmées (sinon, seules les cases vides ou remplies par GEN MOTION passent en vidéo)
      </label>
      {enCours && (
        <ol className="remplir-etapes" aria-live="polite">
          {etat.etapes.map((etape, i) => (
            <li key={`${i}-${etape}`} className={i === etat.etapes.length - 1 ? "courante" : ""}>{etape}</li>
          ))}
          {etat.etapes.length === 0 && <li className="courante">Démarrage…</li>}
        </ol>
      )}
      {etat.type === "fait" && <Resume etat={etat} />}
      {etat.type === "erreur" && <p className="depot-erreur" role="alert">{etat.message}</p>}
    </section>
  );
}
