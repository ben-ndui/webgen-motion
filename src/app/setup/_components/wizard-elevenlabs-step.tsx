"use client";

import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Mic,
} from "lucide-react";

/**
 * ElevenLabs config step — API key + voice ID.
 * Sprint refactor wizard.
 */
export default function WizardElevenLabsStep({
  apiKey,
  onApiKey,
  voiceId,
  onVoiceId,
  revealKey,
  onToggleReveal,
  apiKeyMasked,
  existingVoiceId,
  saving,
  error,
  onPrev,
  onSave,
}: {
  apiKey: string;
  onApiKey: (v: string) => void;
  voiceId: string;
  onVoiceId: (v: string) => void;
  revealKey: boolean;
  onToggleReveal: () => void;
  apiKeyMasked: string | null;
  existingVoiceId: string | null;
  saving: boolean;
  error: string | null;
  onPrev: () => void;
  onSave: () => void;
}) {
  return (
    <section
      data-wm-id="setup.step.elevenlabs"
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 space-y-5 sm:space-y-6"
    >
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 rounded-xl bg-zinc-900 text-white grid place-items-center flex-shrink-0">
          <Mic className="w-5 h-5" />
        </span>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
            ElevenLabs
          </p>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
            Voix off
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Récupère ta clé API + voice ID depuis{" "}
            <a
              href="https://elevenlabs.io/app/settings/api-keys"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-900 font-medium underline underline-offset-2 hover:text-zinc-700"
            >
              elevenlabs.io
            </a>
            . Tu peux cloner ta voix dans leur app puis copier le voiceId
            qu&apos;ils te donnent.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* API key */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Key className="w-3 h-3" />
            API key
            {apiKeyMasked && (
              <span className="font-mono text-slate-400 normal-case tracking-normal">
                · actuellement {apiKeyMasked}
              </span>
            )}
          </label>
          <div className="relative">
            <input
              data-wm-id="setup.elevenlabs.apikey"
              type={revealKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => onApiKey(e.target.value)}
              placeholder={apiKeyMasked ?? "sk_…"}
              className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
            />
            <button
              data-wm-id="setup.elevenlabs.apikey-reveal"
              type="button"
              onClick={onToggleReveal}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label={revealKey ? "Masquer" : "Afficher"}
            >
              {revealKey ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
            Stockée localement dans{" "}
            <code className="font-mono">~/.webgen-motion/config.json</code> —
            jamais commit dans git.
          </p>
        </div>

        {/* Voice ID */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Mic className="w-3 h-3" />
            Voice ID
          </label>
          <input
            data-wm-id="setup.elevenlabs.voiceid"
            type="text"
            value={voiceId}
            onChange={(e) => onVoiceId(e.target.value)}
            placeholder={existingVoiceId ?? "ex. 21m00Tcm4TlvDq8ikWAM"}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
          />
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
            Visible dans le détail d&apos;une voix sur ElevenLabs (Voice Lab).
          </p>
        </div>
      </div>

      {error && (
        <div
          data-wm-id="setup.elevenlabs.error"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3"
        >
          <p className="text-xs font-mono text-rose-800 break-words">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          data-wm-id="setup.elevenlabs.prev"
          onClick={onPrev}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </button>
        <button
          data-wm-id="setup.elevenlabs.save"
          onClick={onSave}
          disabled={saving || !apiKey.trim() || !voiceId.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </section>
  );
}
