"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

/**
 * Backend choice step — ElevenLabs cloud vs Voicebox local.
 * Sprint refactor wizard.
 */
export default function WizardBackendStep({
  initial,
  onPick,
  onPrev,
}: {
  initial: "elevenlabs" | "voicebox";
  onPick: (b: "elevenlabs" | "voicebox") => void;
  onPrev: () => void;
}) {
  const [pick, setPick] = useState<"elevenlabs" | "voicebox">(initial);
  return (
    <section
      data-wm-id="setup.step.backend"
      className="rounded-2xl border border-line bg-surface p-5 sm:p-8 space-y-5 sm:space-y-6"
    >
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 rounded-xl bg-ink text-bg grid place-items-center flex-shrink-0">
          <Sparkles className="w-5 h-5" />
        </span>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">
            Backend
          </p>
          <h2 className="text-xl font-semibold text-ink tracking-tight mb-1">
            Choisis ton moteur de voix off
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            ElevenLabs tourne dans le cloud (très bonne qualité, instantané,
            clé API requise). Voicebox tourne 100% en local sur ta machine
            (aucune donnée ne sort, dépend de ton hardware côté vitesse).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          data-wm-id="setup.backend.elevenlabs-card"
          type="button"
          onClick={() => setPick("elevenlabs")}
          className={`text-left rounded-xl border-2 p-4 transition-all ${
            pick === "elevenlabs"
              ? "border-accent bg-surface-2"
              : "border-line hover:border-line-strong bg-surface"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-ink">
              ElevenLabs
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-2 text-muted">
              Cloud
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Voix clonée + char-level timings natifs. Mode narratif supporté.
          </p>
        </button>
        <button
          data-wm-id="setup.backend.voicebox-card"
          type="button"
          onClick={() => setPick("voicebox")}
          className={`text-left rounded-xl border-2 p-4 transition-all ${
            pick === "voicebox"
              ? "border-accent bg-surface-2"
              : "border-line hover:border-line-strong bg-surface"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-ink">
              Voicebox
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
              Local
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            7 moteurs (qwen, kokoro, chatterbox…). Tourne via l&apos;app
            desktop. Privacy totale, vitesse selon machine.
          </p>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          data-wm-id="setup.backend.prev"
          onClick={onPrev}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted hover:text-ink hover:bg-surface-2 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </button>
        <button
          data-wm-id="setup.backend.continue"
          onClick={() => onPick(pick)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 transition-colors"
        >
          Continuer
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
