"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";
import type { PublicConfig } from "./wizard-types";

/**
 * Welcome step — premier écran du Setup wizard.
 *
 * Sprint refactor wizard : extrait de page.tsx pour alléger
 * (règle Smooth & Design split-when-dense). Auto-contenu, ne
 * dépend que du callback continue/skip + la flag envFallback
 * pour afficher la mention ".env.local détecté".
 *
 * data-wm-id : tags ajoutés pour cibler chaque élément depuis
 * l'Agent IA quand on génèrera des tours de présentation de
 * webgen-motion lui-même.
 */
export default function WizardWelcomeStep({
  envFallback,
  onContinue,
  onSkip,
}: {
  envFallback?: PublicConfig["envFallback"];
  onContinue: () => void;
  onSkip: () => void;
}) {
  const envHasBoth = envFallback?.hasApiKey && envFallback?.hasVoiceId;
  return (
    <section
      data-wm-id="setup.step.welcome"
      className="rounded-2xl border border-line bg-surface p-5 sm:p-8 space-y-5 sm:space-y-6"
    >
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 rounded-xl bg-ink text-bg grid place-items-center flex-shrink-0">
          <Sparkles className="w-5 h-5" />
        </span>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">
            Bienvenue
          </p>
          <h1 className="text-2xl font-semibold text-ink tracking-tight mb-2">
            Setup GEN MOTION
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            En 2 minutes : on connecte ta voix ElevenLabs pour la voix off
            automatisée. Tout reste local — config dans{" "}
            <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">
              ~/.webgen-motion/config.json
            </code>
            , clés jamais commit, pas de cloud.
          </p>
        </div>
      </div>

      {envHasBoth && (
        <div
          data-wm-id="setup.welcome.env-banner"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3"
        >
          <Check
            className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600"
            strokeWidth={2.5}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900">
              `.env.local` détecté
            </p>
            <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
              Tu as déjà des clés ElevenLabs en variables d&apos;environnement.
              Le wizard sauvegarde dans config.json (qui prend le pas) — utile
              pour overrider sans toucher à l&apos;env.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          data-wm-id="setup.welcome.skip"
          onClick={onSkip}
          className="text-sm text-muted hover:text-ink transition-colors"
        >
          Passer le setup
        </button>
        <button
          data-wm-id="setup.welcome.continue"
          onClick={onContinue}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 transition-colors"
        >
          Continuer
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
