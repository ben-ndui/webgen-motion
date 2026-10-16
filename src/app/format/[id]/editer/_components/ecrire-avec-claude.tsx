"use client";

import { useState } from "react";

import type { ExplainerSpec } from "../../../../../../remotion/film/explainer/spec";
import type { PropositionDExplainer } from "@/lib/formats/ecrire-l-explainer";

type Props = { id: string; garder: (proposition: PropositionDExplainer) => void };

type Etat = { type: "repos" } | { type: "ecriture" } | { type: "erreur"; message: string } | { type: "proposition"; proposition: PropositionDExplainer };

/** Ce que la scène dit en une ligne, pour relire la proposition d'un coup d'œil. */
function resume(proposition: PropositionDExplainer, id: string): string {
  const textes = proposition.textes.fr.scenes[id];
  if (!textes) return "";
  const mots = textes.mots;
  const visuel = mots.type === "chiffre" ? mots.valeur : mots.type === "phrase" ? mots.phrase : mots.type === "tampon" ? mots.tampon : "";
  return [visuel, textes.sousTitre].filter(Boolean).join(" · ");
}

/**
 * « Écrire avec Claude » : un sujet, des notes (les SEULS faits utilisables),
 * puis une proposition à relire. Garder remplace les scènes ; rien ne part
 * dans le projet sans ce geste.
 */
export default function EcrireAvecClaude({ id, garder }: Props) {
  const [sujet, setSujet] = useState("");
  const [notes, setNotes] = useState("");
  const [etat, setEtat] = useState<Etat>({ type: "repos" });

  async function ecrire() {
    setEtat({ type: "ecriture" });
    try {
      const reponse = await fetch(`/api/motion/formats/${encodeURIComponent(id)}/ecrire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sujet, notes }),
      });
      const corps = (await reponse.json().catch(() => ({}))) as { proposition?: PropositionDExplainer; erreur?: string };
      if (!reponse.ok || !corps.proposition) {
        setEtat({ type: "erreur", message: corps.erreur ?? `Claude n'a pas pu écrire (${reponse.status}).` });
        return;
      }
      setEtat({ type: "proposition", proposition: corps.proposition });
    } catch {
      setEtat({ type: "erreur", message: "GEN MOTION ne répond pas : vérifie que l'application est lancée." });
    }
  }

  return (
    <section className="bloc" aria-labelledby="bloc-claude" data-wm-id="format.ecrire-avec-claude">
      <h3 id="bloc-claude" className="bloc-titre">Écrire avec Claude</h3>
      <p className="champ-aide">Claude propose les scènes en français et en anglais, à partir de tes notes uniquement. Un chiffre absent de tes notes est refusé.</p>
      <label className="champ">
        <span className="champ-question">De quoi parle la vidéo ?</span>
        <input className="champ-saisie" value={sujet} maxLength={120} onChange={(e) => setSujet(e.target.value)} placeholder="Pourquoi une offre en ligne est parfois déjà fermée" />
      </label>
      <label className="champ">
        <span className="champ-question">Tes notes : les faits, les chiffres et leur source</span>
        <textarea className="champ-saisie zone" rows={5} value={notes} maxLength={3000} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <button type="button" className="film-btn" disabled={etat.type === "ecriture" || !sujet.trim() || !notes.trim()} onClick={() => void ecrire()}>
        {etat.type === "ecriture" ? "Claude écrit…" : etat.type === "proposition" ? "Une autre proposition" : "Écrire avec Claude"}
      </button>
      {etat.type === "erreur" && <p className="depot-erreur" role="alert">{etat.message}</p>}
      {etat.type === "proposition" && (
        <div role="status" data-wm-id="format.proposition">
          <ol className="film-list">
            {etat.proposition.scenes.map((scene: ExplainerSpec["scenes"][number]) => (
              <li key={scene.id}>
                <b>{etat.proposition.textes.fr.scenes[scene.id]?.chapitre}</b> · {resume(etat.proposition, scene.id)}
              </li>
            ))}
          </ol>
          <button type="button" className="film-btn" onClick={() => { garder(etat.proposition); setEtat({ type: "repos" }); }}>Garder ces scènes</button>{" "}
          <button type="button" className="lien" onClick={() => setEtat({ type: "repos" })}>Non merci</button>
        </div>
      )}
    </section>
  );
}
