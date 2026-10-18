"use client";

import Link from "next/link";
import { Film, Zap } from "lucide-react";
import SectionCle from "./_components/section-cle";

/**
 * Réglages · Vidéo IA : les clés des fournisseurs qui fabriquent les plans
 * vidéo de la série. Google (Veo) est le fournisseur par défaut ; fal.ai
 * (Seedance) est un second choix, exposé plan par plan dans l'éditeur.
 */
export default function ReglageVideo() {
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
            Les plans vidéo de ta série et les portraits de tes personnages sont fabriqués par Google (Veo et Gemini), ou
            par Seedance (via fal.ai) quand tu le choisis sur un plan. Tu colles ta clé : le fournisseur te facture
            directement, au prix coûtant. Pour Veo, le prix de chaque plan s&apos;affiche avant que tu cliques sur «
            Générer » ; Seedance facture au token chez fal.ai, sans prix fixe à annoncer à l&apos;avance.
          </p>
        </div>

        <section className="rounded-2xl border border-line p-6 space-y-4" aria-labelledby="ou-la-trouver">
          <h2 id="ou-la-trouver" className="text-lg font-semibold">Où trouver ta clé Google</h2>
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

        <SectionCle
          champ="veo"
          icone={<Film className="w-5 h-5" />}
          titre="Ta clé Google"
          idChamp="cle-google"
          placeholder="AIza…"
          variableEnv="GEMINI_API_KEY"
          messageAbsente="Aucune clé : la série vidéo est bloquée."
          messageConfirmation="Clé enregistrée. Ton premier plan généré dira si Google l'accepte."
          aidePied="La clé reste sur ton ordinateur, dans un fichier que toi seul peux lire. Elle n'est envoyée qu'à Google."
        />

        <section className="rounded-2xl border border-line p-6 space-y-4" aria-labelledby="ou-la-trouver-fal">
          <h2 id="ou-la-trouver-fal" className="text-lg font-semibold">Où trouver ta clé fal.ai</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted">
            <li>
              Ouvre{" "}
              <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                le tableau de bord fal.ai
              </a>{" "}
              et connecte-toi (ou crée un compte).
            </li>
            <li>Crée une clé, puis copie-la.</li>
            <li>Dépose du crédit sur ton compte : Seedance n&apos;a pas de version gratuite.</li>
          </ol>
        </section>

        <SectionCle
          champ="fal"
          icone={<Zap className="w-5 h-5" />}
          titre="Ta clé fal.ai"
          idChamp="cle-fal"
          placeholder="fal_…"
          variableEnv="FAL_KEY"
          messageAbsente="Aucune clé : Seedance est indisponible, Veo reste utilisable seul."
          messageConfirmation="Clé enregistrée. Ton premier plan Seedance dira si fal.ai l'accepte."
          aidePied="La clé reste sur ton ordinateur, dans un fichier que toi seul peux lire. Les images de référence partent encodées DANS la demande envoyée à fal.ai : aucune n'est déposée sur un hébergement intermédiaire avant la génération."
        />
      </main>
    </div>
  );
}
