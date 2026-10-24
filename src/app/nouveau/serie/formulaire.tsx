"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { LONGUEUR_MAX_DE_LA_BIBLE_COLLEE } from "@/lib/cinema/assistant/types";
import { couperProprement } from "@/lib/cinema/bible/troncature";
import { cleDuTexteDeDepart } from "@/lib/cinema/bible/texte-de-depart";
import { LONGUEUR_MAX_DU_NOM } from "@/lib/film-fiche-depart";

// Garde-fou client, en plus de la route d'extraction : évite un aller-retour
// pour rien quand le fichier dépasse déjà la limite qu'elle applique.
const TAILLE_MAX_DOCUMENT_OCTETS = 20 * 1024 * 1024;

function estDuTextePur(fichier: File): boolean {
  return fichier.type === "text/plain" || /\.txt$/i.test(fichier.name);
}

/**
 * Nouveau projet de série IA — page pleine, dédiée (comme « Nouveau format »
 * et contrairement à « Nouveau film » : pas de langues/formats/style à
 * choisir, ils ne servent à rien pour une série). Le texte déposé est
 * transmis à l'étape « Ta série » du film créé, prêt pour « Importer avec
 * Claude » : rien n'est envoyé à Claude ici, cet écran n'a pas encore de film
 * à charger pour construire la demande (marque, direction).
 */
export default function FormulaireNouvelleSerie() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [texte, setTexte] = useState("");
  const [tronque, setTronque] = useState<number | null>(null);
  const [lecture, setLecture] = useState<"repos" | "en-cours">("repos");
  const [erreurDepot, setErreurDepot] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);

  const poserLeTexte = (brut: string) => {
    const resultat = couperProprement(brut.trim(), LONGUEUR_MAX_DE_LA_BIBLE_COLLEE);
    setTexte(resultat.texte);
    setTronque(resultat.tronque ? resultat.longueurOriginale : null);
  };

  const deposerUnTxt = (fichier: File) => {
    setErreurDepot(null);
    setLecture("en-cours");
    fichier
      .text()
      .then((brut) => poserLeTexte(brut))
      .catch(() => setErreurDepot("Ce fichier n'a pas pu être lu."))
      .finally(() => setLecture("repos"));
  };

  const deposerUnDocument = async (fichier: File) => {
    setErreurDepot(null);
    if (fichier.size > TAILLE_MAX_DOCUMENT_OCTETS) {
      setErreurDepot(`Fichier trop gros (${Math.round(fichier.size / 1024 / 1024)} Mo) : limite 20 Mo.`);
      return;
    }
    setLecture("en-cours");
    try {
      const formulaire = new FormData();
      formulaire.set("fichier", fichier);
      const reponse = await fetch("/api/motion/cinema/bible/document", { method: "POST", body: formulaire });
      const corps = (await reponse.json().catch(() => ({}))) as { texte?: string; erreur?: string };
      if (!reponse.ok || !corps.texte) {
        setErreurDepot(corps.erreur ?? "Le fichier n'a pas pu être lu.");
        return;
      }
      poserLeTexte(corps.texte);
    } catch {
      setErreurDepot("GEN MOTION ne répond pas.");
    } finally {
      setLecture("repos");
    }
  };

  const deposer = (fichier: File) => (estDuTextePur(fichier) ? deposerUnTxt(fichier) : void deposerUnDocument(fichier));

  async function creer() {
    setEnvoi(true);
    setErreurs([]);
    try {
      const reponse = await fetch("/api/motion/film", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, langues: ["fr"], formats: ["court"], direction: "marque" }),
      });
      const corps = (await reponse.json().catch(() => ({}))) as { id?: string; erreurs?: string[] };
      if (!reponse.ok || !corps.id) {
        const refus = reponse.status === 403 ? "GEN MOTION n'a pas reconnu cette fenêtre : ferme l'application et relance-la." : "La création a échoué, réessaie.";
        setErreurs(corps.erreurs ?? [refus]);
        setEnvoi(false);
        return;
      }
      if (texte.trim()) {
        try {
          sessionStorage.setItem(cleDuTexteDeDepart(corps.id), texte);
        } catch {
          // Tant pis pour le pré-remplissage : le texte reste collable à la main sur l'étape suivante.
        }
      }
      // `envoi` reste vrai : on navigue, pas la peine de laisser le bouton
      // recliquable pendant que l'assistant se charge (double création).
      router.push(`/film/${corps.id}/creer?etape=serie`);
    } catch {
      setErreurs(["GEN MOTION ne répond pas : vérifie que l'application est lancée."]);
      setEnvoi(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line">
        <nav className="max-w-xl mx-auto px-6 py-5 flex items-center gap-3 text-sm" aria-label="Fil d'Ariane">
          <Link href="/dashboard" className="text-muted hover:text-ink transition">← Mes vidéos</Link>
          <span className="text-faint">/</span>
          <span className="font-semibold">Nouvelle série</span>
        </nav>
      </header>

      <main data-wm-id="nouveau.serie.page" className="max-w-xl mx-auto px-6 py-12 space-y-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">Nouveau</p>
          <h1 className="text-3xl font-semibold tracking-tight">Créer une série</h1>
          <p className="text-sm text-muted mt-1">Dépose la bible de ta cliente : tu arrives directement sur ta série, prête à importer.</p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Le nom du projet</span>
          <input
            className="h-10 rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent focus:shadow-[var(--ring)]"
            value={nom}
            maxLength={LONGUEUR_MAX_DU_NOM}
            placeholder="L'héritière des deux couronnes"
            autoFocus
            onChange={(evenement) => setNom(evenement.target.value)}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">La bible de production (facultatif, PDF, Word ou texte)</span>
          <label className={`inline-flex items-center gap-1.5 self-start px-4 py-2 rounded-full border border-line text-sm cursor-pointer hover:bg-surface-2${lecture === "en-cours" ? " opacity-60 pointer-events-none" : ""}`}>
            {lecture === "en-cours" ? "Lecture du fichier…" : texte ? "Remplacer le document" : "Déposer un document"}
            <input
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              hidden
              disabled={lecture === "en-cours"}
              onChange={(e) => {
                const fichier = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (fichier) deposer(fichier);
              }}
            />
          </label>
          {erreurDepot && (
            <p className="text-sm text-ink border-l-2 border-ink pl-3" role="alert">
              {erreurDepot}
            </p>
          )}
          {texte && (
            <p className="text-[11px] text-muted">
              {texte.length} caractères prêts à importer{tronque ? ` (coupé depuis ${tronque} caractères)` : ""}.
            </p>
          )}
        </div>

        {erreurs.length > 0 && (
          <ul role="alert" className="text-sm text-ink border-l-2 border-ink pl-3 space-y-1">
            {erreurs.map((erreur) => (
              <li key={erreur}>{erreur}</li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Link href="/dashboard" className="px-4 py-2 rounded-full text-sm text-ink-soft hover:bg-surface-2">
            Annuler
          </Link>
          <button
            type="button"
            onClick={() => void creer()}
            disabled={envoi || !nom.trim() || lecture === "en-cours"}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {envoi ? "Création…" : "Créer et ouvrir"}
          </button>
        </div>
      </main>
    </div>
  );
}
