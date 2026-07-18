"use client";

import { ArrowLeft, Check, KeyRound } from "lucide-react";

/**
 * Google Cloud TTS config step — voix Neural2 gratuite (quota Google).
 * Credentials = service account JSON (chemin), sinon la variable d'env
 * GOOGLE_APPLICATION_CREDENTIALS est utilisée à l'exécution. Le dico de
 * prononciation vit PAR TOUR (voicePronunciation), pas ici.
 */
export default function WizardGoogleStep({
  credentialsPath,
  setCredentialsPath,
  voice,
  setVoice,
  saving,
  error,
  onSave,
  onPrev,
}: {
  credentialsPath: string;
  setCredentialsPath: (v: string) => void;
  voice: string;
  setVoice: (v: string) => void;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onPrev: () => void;
}) {
  return (
    <section
      data-wm-id="setup.step.google"
      className="rounded-2xl border border-line bg-surface p-5 sm:p-8 space-y-5 sm:space-y-6"
    >
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 rounded-xl bg-ink text-bg grid place-items-center flex-shrink-0">
          <KeyRound className="w-5 h-5" />
        </span>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">
            Google Cloud TTS
          </p>
          <h2 className="text-xl font-semibold text-ink tracking-tight mb-1">
            Voix gratuite (quota Google)
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Neural2 FR, gratuit jusqu&apos;à ~1M caractères/mois. Renseigne le
            chemin du service account JSON, ou laisse vide pour utiliser la
            variable d&apos;env{" "}
            <code className="font-mono text-xs">GOOGLE_APPLICATION_CREDENTIALS</code>.
          </p>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-ink">
          Chemin du service account JSON
        </span>
        <input
          data-wm-id="setup.google.creds"
          type="text"
          value={credentialsPath}
          onChange={(e) => setCredentialsPath(e.target.value)}
          placeholder="/Users/…/pa-service-account.json (optionnel si env défini)"
          className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink font-mono placeholder:text-muted focus:outline-none focus:border-accent"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-ink">Voix (optionnel)</span>
        <input
          data-wm-id="setup.google.voice"
          type="text"
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          placeholder="fr-FR-Neural2-D"
          className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink font-mono placeholder:text-muted focus:outline-none focus:border-accent"
        />
      </label>

      {error && (
        <p
          data-wm-id="setup.google.error"
          className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          data-wm-id="setup.google.prev"
          onClick={onPrev}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted hover:text-ink hover:bg-surface-2 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </button>
        <button
          data-wm-id="setup.google.save"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
          <Check className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
