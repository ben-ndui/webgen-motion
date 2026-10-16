"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Film } from "lucide-react";

type ConfigVideo = { veo: { hasApiKey: boolean; apiKeyMasked: string | null; hasEnvKey: boolean } };
type Lecture = { type: "chargement" } | { type: "erreur" } | { type: "lue"; veo: ConfigVideo["veo"] };

async function lireLaConfig(): Promise<Lecture> {
  try {
    const reponse = await fetch("/api/motion/config");
    if (!reponse.ok) return { type: "erreur" };
    const config = (await reponse.json()) as ConfigVideo;
    return { type: "lue", veo: config.veo };
  } catch {
    return { type: "erreur" };
  }
}

/**
 * Réglages · Vidéo IA : la clé Google (API Gemini) qui fabrique les plans
 * vidéo de la série (Veo) et les portraits des personnages. Le code la lit
 * depuis le début (`veo.apiKey`), mais aucun écran ne l'écrivait : dans
 * l'app installée, la série vidéo était inutilisable (16/10/2026).
 */
export default function ReglageVideo() {
  const [lecture, setLecture] = useState<Lecture>({ type: "chargement" });
  const [cle, setCle] = useState("");
  const [visible, setVisible] = useState(false);
  const [envoi, setEnvoi] = useState<"repos" | "en-cours" | "enregistree" | "retiree">("repos");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let affichee = true;
    void lireLaConfig().then((lecture) => {
      if (affichee) setLecture(lecture);
    });
    return () => {
      affichee = false;
    };
  }, []);

  async function enregistrer(valeur: string) {
    setEnvoi("en-cours");
    setErreur(null);
    try {
      const reponse = await fetch("/api/motion/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ veo: { apiKey: valeur } }),
      });
      if (!reponse.ok) throw new Error(`Erreur ${reponse.status}`);
      setCle("");
      setEnvoi(valeur ? "enregistree" : "retiree");
      setLecture(await lireLaConfig());
    } catch (e) {
      setEnvoi("repos");
      setErreur(`La clé n'a pas été enregistrée : ${(e as Error).message}. Réessaie.`);
    }
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line">
        <nav className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3 text-sm" aria-label="Fil d'Ariane">
          <Link href="/dashboard" className="text-muted hover:text-ink transition">← Mes vidéos</Link>
          <span className="text-faint">/</span>
          <Link href="/setup" className="text-muted hover:text-ink transition">Réglages</Link>
          <span className="text-faint">/</span>
          <span className="font-semibold">Vidéo IA</span>
        </nav>
      </header>

      <main data-wm-id="setup.video.page" className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Vidéo IA</h1>
          <p className="mt-3 text-sm text-muted leading-relaxed max-w-xl">
            Les plans vidéo de ta série et les portraits de tes personnages sont fabriqués par Google (Veo et Gemini). Tu
            colles ta clé : Google te facture directement, au prix coûtant. Le prix de chaque plan s&apos;affiche avant que
            tu cliques sur « Générer ».
          </p>
        </div>

        <section className="rounded-2xl border border-line p-6 space-y-4" aria-labelledby="ou-la-trouver">
          <h2 id="ou-la-trouver" className="text-lg font-semibold">Où trouver ta clé</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted">
            <li>
              Ouvre{" "}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                Google AI Studio
              </a>{" "}
              et connecte-toi avec ton compte Google.
            </li>
            <li>Crée une clé d&apos;API, puis copie-la.</li>
            <li>Active la facturation sur le projet de la clé : la vidéo n&apos;existe pas en version gratuite.</li>
          </ol>
        </section>

        <section className="rounded-2xl border border-line p-6 space-y-5" aria-labelledby="ta-cle">
          <div className="flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl bg-ink text-bg grid place-items-center flex-shrink-0" aria-hidden>
              <Film className="w-5 h-5" />
            </span>
            <div>
              <h2 id="ta-cle" className="text-lg font-semibold">Ta clé Google</h2>
              <p className="text-sm text-muted" role="status">
                {lecture.type === "chargement" && "Lecture de tes réglages…"}
                {lecture.type === "erreur" && "Tes réglages ne se lisent pas. Ferme GEN MOTION et relance-le."}
                {lecture.type === "lue" && lecture.veo.hasApiKey && `Enregistrée : ${lecture.veo.apiKeyMasked}`}
                {lecture.type === "lue" && !lecture.veo.hasApiKey && lecture.veo.hasEnvKey && "Aucune clé ici : celle de ton environnement de développement sert pour l'instant."}
                {lecture.type === "lue" && !lecture.veo.hasApiKey && !lecture.veo.hasEnvKey && "Aucune clé : la série vidéo est bloquée."}
              </p>
            </div>
          </div>

          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (cle.trim()) void enregistrer(cle.trim()); }}>
            <label htmlFor="cle-google" className="text-sm font-medium block">
              {lecture.type === "lue" && lecture.veo.hasApiKey ? "Remplacer la clé" : "Colle ta clé"}
            </label>
            <div className="flex gap-2">
              <input
                id="cle-google"
                type={visible ? "text" : "password"}
                value={cle}
                onChange={(e) => setCle(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="AIza…"
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
              {lecture.type === "lue" && lecture.veo.hasApiKey && (
                <button type="button" onClick={() => void enregistrer("")} disabled={envoi === "en-cours"} className="text-sm text-muted underline underline-offset-2 hover:text-ink">
                  Retirer la clé
                </button>
              )}
              {envoi === "enregistree" && <span className="text-sm text-accent" role="status">Clé enregistrée. Ton premier plan généré dira si Google l&apos;accepte.</span>}
              {envoi === "retiree" && <span className="text-sm text-muted" role="status">Clé retirée.</span>}
            </div>
            {erreur && <p className="text-sm text-ink border-l-2 border-ink pl-3" role="alert">{erreur}</p>}
          </form>
          <p className="text-xs text-muted">La clé reste sur ton ordinateur, dans un fichier que toi seul peux lire. Elle n&apos;est envoyée qu&apos;à Google.</p>
        </section>
      </main>
    </div>
  );
}
