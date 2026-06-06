"use client";

import { ArrowRight, Check } from "lucide-react";
import type { PublicConfig } from "./wizard-types";

/**
 * Done step — recap des valeurs sauvegardées + CTA hub / edit.
 * Sprint refactor wizard.
 *
 * Le Row helper était dans page.tsx, on l'inline ici puisqu'il n'est
 * utilisé QUE dans DoneStep (~15 lignes, pas la peine d'un fichier
 * dédié pour ça).
 */
export default function WizardDoneStep({
  config,
  onFinish,
  onEdit,
}: {
  config: PublicConfig | null;
  onFinish: () => void;
  onEdit: () => void;
}) {
  const backend = config?.defaultBackend ?? "elevenlabs";
  const elevenSaved = !!config?.elevenlabs.hasApiKey;
  const voiceboxSaved = !!config?.voicebox.profileId;
  const masked = config?.elevenlabs.apiKeyMasked ?? null;
  const voiceId = config?.elevenlabs.voiceId ?? null;
  const profileId = config?.voicebox.profileId ?? null;

  return (
    <section
      data-wm-id="setup.step.done"
      className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-8 space-y-4 sm:space-y-5"
    >
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 rounded-xl bg-emerald-600 text-bg grid place-items-center flex-shrink-0">
          <Check className="w-5 h-5" strokeWidth={2.5} />
        </span>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-700 mb-1">
            Configuré
          </p>
          <h2 className="text-xl font-semibold text-emerald-900 tracking-tight mb-1">
            Voix off prête
          </h2>
          <p className="text-sm text-emerald-700 leading-relaxed">
            Backend{" "}
            <strong>
              {backend === "voicebox"
                ? "Voicebox (local)"
                : "ElevenLabs (cloud)"}
            </strong>{" "}
            actif. Tu peux générer la voix off depuis le tab{" "}
            <strong>Voix off</strong> de chaque tour.
          </p>
        </div>
      </div>

      <div
        data-wm-id="setup.done.summary"
        className="rounded-xl border border-emerald-200 bg-surface p-4 space-y-2"
      >
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
          Source active
        </p>
        {backend === "voicebox" ? (
          voiceboxSaved ? (
            <>
              <Row
                label="Voicebox URL"
                value={config?.voicebox.url ?? ""}
                source="config.json"
              />
              <Row
                label="Profile ID"
                value={profileId ?? "—"}
                source="config.json"
              />
              <Row
                label="Engine"
                value={`${config?.voicebox.engine} · ${config?.voicebox.modelSize}`}
                source="config.json"
              />
            </>
          ) : (
            <p className="text-xs text-ink-soft leading-relaxed">
              Voicebox sélectionné mais aucune voix renseignée — clique{" "}
              <strong>Modifier</strong>.
            </p>
          )
        ) : elevenSaved ? (
          <>
            <Row label="API key" value={masked ?? "—"} source="config.json" />
            <Row label="Voice ID" value={voiceId ?? "—"} source="config.json" />
          </>
        ) : (
          <p className="text-xs text-ink-soft leading-relaxed">
            Configuré via{" "}
            <code className="font-mono bg-surface-2 px-1 py-0.5 rounded">
              .env.local
            </code>{" "}
            du repo (pas via le wizard). Ces valeurs marchent — si tu veux les
            override depuis l&apos;UI, clique <strong>Modifier</strong>.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          data-wm-id="setup.done.edit"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors"
        >
          {elevenSaved || voiceboxSaved ? "Modifier" : "Override via wizard"}
        </button>
        <button
          data-wm-id="setup.done.finish"
          onClick={onFinish}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 transition-colors"
        >
          Aller au hub
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  source,
}: {
  label: string;
  value: string;
  source: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-ink truncate flex-1 text-right">
        {value}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
        {source}
      </span>
    </div>
  );
}
