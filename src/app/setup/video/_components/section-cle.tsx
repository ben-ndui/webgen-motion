"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

export type LectureDeLaCle = { hasApiKey: boolean; apiKeyMasked: string | null; hasEnvKey: boolean };
type Etat = LectureDeLaCle | "chargement" | "erreur";

type Props = {
  champ: "veo" | "fal";
  icone: ReactNode;
  titre: string;
  idChamp: string;
  placeholder: string;
  variableEnv: string;
  messageAbsente: string;
  messageConfirmation: string;
  aidePied: string;
};

const SANS_CLE: LectureDeLaCle = { hasApiKey: false, apiKeyMasked: null, hasEnvKey: false };

async function lireLaCle(champ: Props["champ"]): Promise<Etat> {
  try {
    const reponse = await fetch("/api/motion/config");
    if (!reponse.ok) return "erreur";
    const config = (await reponse.json()) as Record<string, LectureDeLaCle | undefined>;
    return config[champ] ?? SANS_CLE;
  } catch {
    return "erreur";
  }
}

/**
 * Une clé BYOK d'un fournisseur du cinéma : même mécanique pour Google
 * (Veo) et fal.ai (Seedance), seuls les textes changent.
 */
export default function SectionCle({ champ, icone, titre, idChamp, placeholder, variableEnv, messageAbsente, messageConfirmation, aidePied }: Props) {
  const [lecture, setLecture] = useState<Etat>("chargement");
  const [cle, setCle] = useState("");
  const [visible, setVisible] = useState(false);
  const [envoi, setEnvoi] = useState<"repos" | "en-cours" | "enregistree" | "retiree">("repos");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let affichee = true;
    void lireLaCle(champ).then((valeur) => {
      if (affichee) setLecture(valeur);
    });
    return () => {
      affichee = false;
    };
  }, [champ]);

  async function enregistrer(valeur: string) {
    setEnvoi("en-cours");
    setErreur(null);
    try {
      const reponse = await fetch("/api/motion/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [champ]: { apiKey: valeur } }),
      });
      if (!reponse.ok) throw new Error(`Erreur ${reponse.status}`);
      setCle("");
      setEnvoi(valeur ? "enregistree" : "retiree");
      setLecture(await lireLaCle(champ));
    } catch (e) {
      setEnvoi("repos");
      setErreur(`La clé n'a pas été enregistrée : ${(e as Error).message}. Réessaie.`);
    }
  }

  const presente = lecture !== "chargement" && lecture !== "erreur" && lecture.hasApiKey;

  return (
    <section className="rounded-2xl border border-line p-6 space-y-5" aria-labelledby={`${idChamp}-titre`}>
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 rounded-xl bg-ink text-bg grid place-items-center flex-shrink-0" aria-hidden>
          {icone}
        </span>
        <div>
          <h2 id={`${idChamp}-titre`} className="text-lg font-semibold">
            {titre}
          </h2>
          <p className="text-sm text-muted" role="status">
            {lecture === "chargement" && "Lecture de tes réglages…"}
            {lecture === "erreur" && "Tes réglages ne se lisent pas. Ferme GEN MOTION et relance-le."}
            {lecture !== "chargement" && lecture !== "erreur" && lecture.hasApiKey && `Enregistrée : ${lecture.apiKeyMasked}`}
            {lecture !== "chargement" && lecture !== "erreur" && !lecture.hasApiKey && lecture.hasEnvKey && `Aucune clé ici : ${variableEnv} de ton environnement de développement sert pour l'instant.`}
            {lecture !== "chargement" && lecture !== "erreur" && !lecture.hasApiKey && !lecture.hasEnvKey && messageAbsente}
          </p>
        </div>
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (cle.trim()) void enregistrer(cle.trim());
        }}
      >
        <label htmlFor={idChamp} className="text-sm font-medium block">
          {presente ? "Remplacer la clé" : "Colle ta clé"}
        </label>
        <div className="flex gap-2">
          <input
            id={idChamp}
            type={visible ? "text" : "password"}
            value={cle}
            onChange={(e) => setCle(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            className="flex-1 h-11 rounded-lg border border-line bg-surface-2 px-3 text-sm font-mono outline-none focus:border-accent focus:shadow-[var(--ring)]"
          />
          <button type="button" onClick={() => setVisible((v) => !v)} className="h-11 w-11 grid place-items-center rounded-lg border border-line text-muted hover:text-ink" aria-label={visible ? "Masquer la clé" : "Afficher la clé"}>
            {visible ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!cle.trim() || envoi === "en-cours"} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {envoi === "en-cours" ? "Enregistrement…" : "Enregistrer"}
          </button>
          {presente && (
            <button type="button" onClick={() => void enregistrer("")} disabled={envoi === "en-cours"} className="text-sm text-muted underline underline-offset-2 hover:text-ink">
              Retirer la clé
            </button>
          )}
          {envoi === "enregistree" && (
            <span className="text-sm text-accent" role="status">
              {messageConfirmation}
            </span>
          )}
          {envoi === "retiree" && (
            <span className="text-sm text-muted" role="status">
              Clé retirée.
            </span>
          )}
        </div>
        {erreur && (
          <p className="text-sm text-ink border-l-2 border-ink pl-3" role="alert">
            {erreur}
          </p>
        )}
      </form>
      <p className="text-xs text-muted">{aidePied}</p>
    </section>
  );
}
