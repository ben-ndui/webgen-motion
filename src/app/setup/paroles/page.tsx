"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import ModeleWhisper from "./modele-whisper";

export type EtatWhisper = {
  cli: boolean;
  pret: boolean;
  raison: string | null;
  modeles: { nom: "medium" | "small"; libelle: string; octets: number; present: boolean }[];
};
type Lecture = { type: "chargement" } | { type: "erreur" } | { type: "lue"; etat: EtatWhisper };

const COMMANDE = "brew install whisper-cpp";

/**
 * Réglages · Écoute locale : whisper.cpp et son modèle, qui calent les paroles
 * des clips karaoké et vérifient les répliques de la série, sur l'ordinateur
 * (rien ne part en ligne). Le binaire s'installe avec Homebrew ; le modèle se
 * télécharge ici, vérifié (taille et empreinte) avant d'être gardé.
 */
export default function ReglageParoles() {
  const [lecture, setLecture] = useState<Lecture>({ type: "chargement" });
  const [copiee, setCopiee] = useState(false);

  const relire = useCallback(
    (garder: () => boolean = () => true) =>
      fetch("/api/motion/whisper", { cache: "no-store" })
        .then(async (reponse) => {
          const etat = reponse.ok ? ((await reponse.json()) as EtatWhisper) : null;
          if (garder()) setLecture(etat ? { type: "lue", etat } : { type: "erreur" });
        })
        .catch(() => garder() && setLecture({ type: "erreur" })),
    [],
  );

  useEffect(() => {
    let affichee = true;
    void relire(() => affichee);
    return () => {
      affichee = false;
    };
  }, [relire]);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line">
        <nav className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3 text-sm" aria-label="Fil d'Ariane">
          <Link href="/dashboard" className="text-muted hover:text-ink transition">← Mes vidéos</Link>
          <span className="text-faint">/</span>
          <Link href="/setup" className="text-muted hover:text-ink transition">Réglages</Link>
          <span className="text-faint">/</span>
          <span className="font-semibold">Écoute locale</span>
        </nav>
      </header>

      <main data-wm-id="setup.paroles.page" className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Écoute locale</h1>
          <p className="mt-3 text-sm text-muted leading-relaxed max-w-xl">
            whisper écoute ton morceau pour caler tes paroles mot à mot, et vérifie les répliques de ta série. Tout se passe sur
            ton ordinateur : ta musique ne part nulle part.
          </p>
          <p className="mt-3 text-sm" role="status">
            {lecture.type === "chargement" && "Vérification…"}
            {lecture.type === "erreur" && "L'état ne se lit pas : ferme GEN MOTION et relance-le."}
            {lecture.type === "lue" && (lecture.etat.pret ? "Prêt : l'écoute locale fonctionne." : lecture.etat.raison)}
          </p>
        </div>

        <section className="rounded-2xl border border-line p-6 space-y-4" aria-labelledby="whisper-cpp">
          <h2 id="whisper-cpp" className="text-lg font-semibold">1. Le programme whisper.cpp</h2>
          {lecture.type === "lue" && lecture.etat.cli ? (
            <p className="text-sm" role="status">Installé.</p>
          ) : (
            <>
              <p className="text-sm text-muted">Ouvre le Terminal, colle cette commande, puis reviens ici :</p>
              <div className="flex flex-wrap items-center gap-3">
                <code className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm font-mono">{COMMANDE}</code>
                <button type="button" className="text-sm text-muted underline underline-offset-2 hover:text-ink"
                  onClick={() => void navigator.clipboard?.writeText(COMMANDE).then(() => setCopiee(true))}>
                  {copiee ? "Copiée" : "Copier"}
                </button>
                <button type="button" className="text-sm text-muted underline underline-offset-2 hover:text-ink" onClick={() => void relire()}>
                  Vérifier à nouveau
                </button>
              </div>
              <p className="text-xs text-muted">
                Pas de Homebrew ? Il s&apos;installe depuis{" "}
                <a href="https://brew.sh" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">brew.sh</a>.
              </p>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-line p-6 space-y-4" aria-labelledby="le-modele">
          <h2 id="le-modele" className="text-lg font-semibold">2. Le modèle</h2>
          <p className="text-sm text-muted">Il se télécharge une fois, depuis le dépôt officiel de whisper.cpp, et il est vérifié avant d&apos;être gardé.</p>
          {lecture.type === "lue" && (
            <ul className="space-y-3">
              {lecture.etat.modeles.map((modele) => (
                <ModeleWhisper key={modele.nom} modele={modele} onTelecharge={() => void relire()} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
