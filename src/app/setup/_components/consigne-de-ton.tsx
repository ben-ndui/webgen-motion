"use client";

import { useEffect, useState } from "react";

import { CONSIGNE_DE_TON_CONSEILLEE, LONGUEUR_MAX_CONSIGNE } from "@/lib/voix/consigne";

/**
 * La consigne de ton envoyée à Voicebox (« Voix enjouée, souriante… »). Autonome :
 * elle lit et enregistre SON réglage (PUT partiel de la config), sans passer par le
 * formulaire de l'étape. Banc à l'aveugle du 18/10/2026 : avec la consigne conseillée,
 * la voix clonée de Ben passe de 3,75 à 4,13 / 5 (à égalité avec Google Neural2).
 * Vide = aucune consigne (voix neutre). Seul Qwen la suit : avec un autre moteur, elle
 * n'est ni envoyée ni comptée dans le cache (voix/consigne.ts, `consigneSuivie`).
 */
const CONSEILLEE = CONSIGNE_DE_TON_CONSEILLEE;

type Etat = { type: "chargement" } | { type: "lecture-ratee" } | { type: "erreur" } | { type: "pret" } | { type: "enregistre" };

export default function ConsigneDeTon() {
  const [consigne, setConsigne] = useState("");
  // La dernière valeur ENREGISTRÉE : sans changement, quitter la case n'envoie rien.
  const [enregistree, setEnregistree] = useState("");
  const [etat, setEtat] = useState<Etat>({ type: "chargement" });

  useEffect(() => {
    let affiche = true;
    fetch("/api/motion/config", { cache: "no-store" })
      .then(async (r) => {
        const config = r.ok ? ((await r.json()) as { voicebox?: { instruct?: string } }) : null;
        if (!affiche) return;
        if (!config) return setEtat({ type: "lecture-ratee" });
        setConsigne(config.voicebox?.instruct ?? "");
        setEnregistree(config.voicebox?.instruct ?? "");
        setEtat({ type: "pret" });
      })
      .catch(() => affiche && setEtat({ type: "lecture-ratee" }));
    return () => {
      affiche = false;
    };
  }, []);

  async function enregistrer(valeur: string) {
    setConsigne(valeur);
    if (valeur === enregistree) return;
    const r = await fetch("/api/motion/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voicebox: { instruct: valeur } }),
    }).catch(() => null);
    if (r?.ok) setEnregistree(valeur);
    setEtat(r?.ok ? { type: "enregistre" } : { type: "erreur" });
  }

  if (etat.type === "chargement") return <p className="text-xs text-muted" role="status">Lecture de la consigne de ton…</p>;
  // Lecture ratée : AUCUNE case à remplir, sinon un passage au clavier écraserait la consigne enregistrée.
  if (etat.type === "lecture-ratee") {
    return <p className="text-xs text-ink" role="alert">La consigne de ton ne se lit pas : recharge la page.</p>;
  }
  return (
    <div className="space-y-1.5" data-wm-id="setup.voicebox.consigne">
      <label htmlFor="consigne-de-ton" className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted block">
        Consigne de ton (Qwen)
      </label>
      <textarea id="consigne-de-ton" rows={2} maxLength={LONGUEUR_MAX_CONSIGNE} value={consigne}
        onChange={(e) => { setConsigne(e.target.value); setEtat({ type: "pret" }); }}
        onBlur={() => void enregistrer(consigne)}
        placeholder="Vide : voix neutre"
        className="w-full px-3 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1" />
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {consigne !== CONSEILLEE && (
          <button type="button" className="text-muted underline underline-offset-2 hover:text-ink"
            // Garde le focus dans la case : sinon son « blur » enverrait l'ancienne valeur EN MÊME TEMPS.
            onMouseDown={(e) => e.preventDefault()} onClick={() => void enregistrer(CONSEILLEE)}>
            Reprendre la consigne conseillée
          </button>
        )}
        {etat.type === "enregistre" && <span className="text-accent" role="status">Enregistrée : les voix seront régénérées avec ce ton.</span>}
        {etat.type === "erreur" && <span className="text-ink" role="alert">La consigne ne s&apos;enregistre pas : GEN MOTION est-il lancé ?</span>}
      </div>
    </div>
  );
}
