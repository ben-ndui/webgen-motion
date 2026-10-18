"use client";

import { useEffect, useState } from "react";

import InstallerLeCalage from "@/app/_components/reglages/installer-le-calage";

type EtatDuCalage = { disponible: boolean; present: boolean; enCours: boolean };
type Lecture = { type: "chargement" } | { type: "erreur" } | { type: "lue"; etat: EtatDuCalage };

/**
 * Réglages › Écoute locale, 3e étape : le modèle qui pose les paroles
 * FRANÇAISES au mot près (alignement forcé). Sans lui, whisper cale seul,
 * moins précisément ; avec lui, whisper ne sert plus qu'au brouillon.
 */
export default function CalageMotAMot() {
  const [lecture, setLecture] = useState<Lecture>({ type: "chargement" });

  useEffect(() => {
    let affichee = true;
    fetch("/api/motion/alignement", { cache: "no-store" })
      .then(async (reponse) => {
        const etat = reponse.ok ? ((await reponse.json()) as EtatDuCalage) : null;
        if (affichee) setLecture(etat ? { type: "lue", etat } : { type: "erreur" });
      })
      .catch(() => affichee && setLecture({ type: "erreur" }));
    return () => {
      affichee = false;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-line p-6 space-y-4" aria-labelledby="calage-mot-a-mot" data-wm-id="setup.paroles.calage">
      <h2 id="calage-mot-a-mot" className="text-lg font-semibold">3. Le calage mot à mot (français)</h2>
      <p className="text-sm text-muted">
        Pose tes paroles au mot près sur ton morceau, en une vingtaine de secondes, au lieu de 2 à 3 minutes. Un modèle de
        356 Mo, téléchargé une fois et vérifié avant d&apos;être gardé. Sans lui, whisper cale seul, moins précisément.
      </p>
      {lecture.type === "chargement" && <p className="text-sm text-muted" role="status">Vérification…</p>}
      {lecture.type === "erreur" && <p className="text-sm" role="alert">L&apos;état ne se lit pas : ferme GEN MOTION et relance-le.</p>}
      {lecture.type === "lue" && !lecture.etat.disponible && (
        <p className="text-sm" role="status">Indisponible sur ce Mac (processeur Intel) : whisper cale tes paroles.</p>
      )}
      {lecture.type === "lue" && lecture.etat.disponible && (
        <InstallerLeCalage installe={lecture.etat.present} enCours={lecture.etat.enCours} />
      )}
    </section>
  );
}
