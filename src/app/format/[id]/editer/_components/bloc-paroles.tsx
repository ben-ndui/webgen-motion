"use client";

import { useCallback, useEffect, useState } from "react";

import type { EtatDesParoles } from "@/lib/formats/karaoke-paroles";
import { useRenduEnFlux } from "@/lib/use-rendu-en-flux";

type Etat = EtatDesParoles & { whisper: { ok: boolean; raison?: string } };
const LANGUES_CHANTEES = [{ valeur: "fr", libelle: "Français" }, { valeur: "en", libelle: "Anglais" }, { valeur: "auto", libelle: "Autre (détectée)" }];

/**
 * Les paroles, en trois gestes, tout en local : whisper écoute et écrit un
 * BROUILLON ; l'artiste le corrige (c'est SON texte qui s'affichera) ; puis
 * ses mots sont calés sur le morceau. Chaque étape dit son état et ses refus.
 */
export default function BlocParoles({ id, morceauPresent }: { id: string; morceauPresent: boolean }) {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [lecture, setLecture] = useState<"chargement" | "erreur" | "ok">("chargement");
  const [texte, setTexte] = useState("");
  const [langue, setLangue] = useState("fr");
  const [enregistre, setEnregistre] = useState(true);
  const { enCours, etats, lancer } = useRenduEnFlux(`/api/motion/formats/${encodeURIComponent(id)}/paroles/ecouter`);
  const url = `/api/motion/formats/${encodeURIComponent(id)}/paroles`;

  // Relire du serveur : au chargement, puis après chaque écoute. `garder` dit si la réponse compte encore.
  const relire = useCallback(
    (garder: () => boolean = () => true) =>
      fetch(url, { cache: "no-store" })
        .then(async (reponse) => {
          const nouveau = reponse.ok ? ((await reponse.json()) as Etat) : null;
          if (!garder()) return;
          if (!nouveau) return setLecture("erreur");
          setEtat(nouveau);
          setTexte((avant) => avant || nouveau.texte || nouveau.brouillon || "");
          setLecture("ok");
        })
        .catch(() => garder() && setLecture("erreur")),
    [url],
  );

  useEffect(() => {
    let annule = false;
    void relire(() => !annule);
    return () => {
      annule = true;
    };
  }, [relire]);

  async function enregistrer(): Promise<boolean> {
    const reponse = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texte }) }).catch(() => null);
    setEnregistre(Boolean(reponse?.ok));
    return Boolean(reponse?.ok);
  }

  async function ecouter(etape: "brouillon" | "calage") {
    if (etape === "calage" && !(await enregistrer())) return;
    await lancer(etape, { etape, langue });
    if (etape === "brouillon") setTexte("");
    await relire();
  }

  if (lecture === "chargement") return <section className="bloc"><p className="film-muted" role="status">Lecture des paroles…</p></section>;
  if (lecture === "erreur" || !etat) return <section className="bloc"><p className="depot-erreur" role="alert">Les paroles ne se lisent pas : recharge la page.</p></section>;

  const suivi = (etape: string) => etats[etape];
  return (
    <section className="bloc" aria-labelledby="bloc-paroles" data-wm-id="format.karaoke.paroles">
      <h3 id="bloc-paroles" className="bloc-titre">Tes paroles</h3>
      {!etat.whisper.ok ? (
        <p className="depot-erreur" role="alert">
          {etat.whisper.raison} <a className="lien" href="/setup/paroles">Régler l&apos;écoute locale</a>
        </p>
      ) : !morceauPresent ? (
        <p className="champ-aide">Dépose d&apos;abord ton morceau : whisper l&apos;écoute pour te proposer un brouillon.</p>
      ) : (
        <>
          <label className="champ">
            <span className="champ-question">La langue chantée</span>
            <select className="champ-saisie" value={langue} onChange={(e) => setLangue(e.target.value)}>
              {LANGUES_CHANTEES.map((l) => <option key={l.valeur} value={l.valeur}>{l.libelle}</option>)}
            </select>
          </label>
          <button type="button" className="film-btn film-btn-ghost" disabled={enCours !== null} onClick={() => void ecouter("brouillon")}>
            {etat.brouillon ? "Réécouter le morceau" : "Écouter le morceau (brouillon)"}
          </button>
        </>
      )}
      <label className="champ">
        <span className="champ-question">Le texte, une ligne par ligne affichée</span>
        <span className="champ-aide">whisper se trompe sur des mots : c&apos;est TON texte qui s&apos;affiche, corrige-le ici.</span>
        <textarea className="champ-saisie zone" rows={12} value={texte} onChange={(e) => { setTexte(e.target.value); setEnregistre(false); }} onBlur={() => void enregistrer()} />
      </label>
      {!enregistre && <p className="film-muted" role="status">Pas encore enregistré : il le sera en quittant la case.</p>}
      <button type="button" className="film-btn" disabled={enCours !== null || !texte.trim() || !etat.whisper.ok || !morceauPresent} onClick={() => void ecouter("calage")}>
        Caler mes paroles sur le morceau
      </button>
      {[suivi("brouillon"), suivi("calage")].map((s, i) =>
        s?.type === "en-cours" ? <p key={i} role="status" className="film-muted">{s.label}</p>
        : s?.type === "erreur" ? <p key={i} role="alert" className="depot-erreur">{s.message}{s.details.length > 0 ? ` (${s.details.at(-1)})` : ""}</p>
        : null,
      )}
      {etat.calees && (
        <p className="film-muted" role="status" data-wm-id="format.karaoke.calees">
          Calées : {etat.calees.lignes} lignes, {Math.round(etat.calees.reconnus * 100)} % des mots reconnus
          {etat.calees.source.includes("brouillon") ? " (sur le brouillon de whisper : le rendu le refusera)" : "."}
        </p>
      )}
    </section>
  );
}
