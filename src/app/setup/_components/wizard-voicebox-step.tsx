"use client";

import { ArrowLeft, Check, Loader2, Mic } from "lucide-react";
import type { VoiceboxProfile } from "./wizard-types";

/**
 * Voicebox config step — URL + profile + engine + model size.
 * Sprint refactor wizard. Le plus gros step (status banner +
 * dropdown adaptatif + 4 selects), bien isolé maintenant.
 */
export default function WizardVoiceboxStep({
  url,
  onUrl,
  profileId,
  onProfileId,
  engine,
  onEngine,
  modelSize,
  onModelSize,
  profiles,
  status,
  saving,
  error,
  onPrev,
  onSave,
}: {
  url: string;
  onUrl: (v: string) => void;
  profileId: string;
  onProfileId: (v: string) => void;
  engine: string;
  onEngine: (v: string) => void;
  modelSize: string;
  onModelSize: (v: string) => void;
  profiles: VoiceboxProfile[] | null;
  status: "idle" | "checking" | "found" | "unreachable";
  saving: boolean;
  error: string | null;
  onPrev: () => void;
  onSave: () => void;
}) {
  return (
    <section
      data-wm-id="setup.step.voicebox"
      className="rounded-2xl border border-line bg-surface p-5 sm:p-8 space-y-5 sm:space-y-6"
    >
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 rounded-xl bg-ink text-bg grid place-items-center flex-shrink-0">
          <Mic className="w-5 h-5" />
        </span>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">
            Voicebox
          </p>
          <h2 className="text-xl font-semibold text-ink tracking-tight mb-1">
            Voix locale
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            On détecte automatiquement Voicebox sur{" "}
            <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">
              127.0.0.1:17493
            </code>{" "}
            et on liste tes voix existantes. Crée-en une dans l&apos;app desktop
            si ce n&apos;est pas déjà fait,{" "}
            <a
              href="https://github.com/jamiepine/voicebox"
              target="_blank"
              rel="noreferrer"
              className="text-ink font-medium underline underline-offset-2"
            >
              github.com/jamiepine/voicebox
            </a>
            .
          </p>
        </div>
      </div>

      {/* Status banner */}
      {status === "checking" && (
        <div
          data-wm-id="setup.voicebox.status-checking"
          className="rounded-xl border border-line bg-bg-sunken p-3 flex items-center gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin text-muted" />
          <p className="text-xs text-ink-soft">Détection de Voicebox…</p>
        </div>
      )}
      {status === "unreachable" && (
        <div
          data-wm-id="setup.voicebox.status-unreachable"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1"
        >
          <p className="text-sm font-semibold text-amber-900">
            Voicebox non détecté sur {url}
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">
            Lance l&apos;app Voicebox (Tauri desktop). Si tu utilises un port
            custom, change l&apos;URL ci-dessous. Tu peux aussi continuer en
            collant un UUID profile à la main et sauver — la config sera
            consommée quand Voicebox tournera.
          </p>
        </div>
      )}
      {status === "found" && profiles && profiles.length === 0 && (
        <div
          data-wm-id="setup.voicebox.status-empty"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1"
        >
          <p className="text-sm font-semibold text-amber-900">
            Aucune voix dans Voicebox
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">
            Crée une voix (clone ou preset) dans l&apos;app desktop, puis
            reviens sur cet écran.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* URL */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1.5 flex items-center gap-1.5">
            URL Voicebox
          </label>
          <input
            data-wm-id="setup.voicebox.url"
            type="text"
            value={url}
            onChange={(e) => onUrl(e.target.value)}
            placeholder="http://127.0.0.1:17493"
            className="w-full px-3 py-2.5 rounded-xl border border-line bg-surface text-sm font-mono text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
          />
        </div>

        {/* Profile dropdown OR UUID fallback */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1.5 flex items-center gap-1.5">
            <Mic className="w-3 h-3" />
            Voix
          </label>
          {profiles && profiles.length > 0 ? (
            <select
              data-wm-id="setup.voicebox.profile-select"
              value={profileId}
              onChange={(e) => onProfileId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-line bg-surface text-sm font-mono text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
            >
              <option value="">— Choisis ta voix —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.language ? ` · ${p.language}` : ""}
                  {p.voice_type ? ` · ${p.voice_type}` : ""}
                </option>
              ))}
            </select>
          ) : (
            <input
              data-wm-id="setup.voicebox.profile-uuid"
              type="text"
              value={profileId}
              onChange={(e) => onProfileId(e.target.value)}
              placeholder="profile UUID (fallback si non détecté)"
              className="w-full px-3 py-2.5 rounded-xl border border-line bg-surface text-sm font-mono text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
            />
          )}
        </div>

        {/* Engine + model size */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1.5 block">
              Engine
            </label>
            <select
              data-wm-id="setup.voicebox.engine"
              value={engine}
              onChange={(e) => onEngine(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-line bg-surface text-sm font-mono text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
            >
              <option value="qwen">qwen (qualité)</option>
              <option value="qwen_custom_voice">qwen_custom_voice</option>
              <option value="kokoro">kokoro (rapide)</option>
              <option value="chatterbox">chatterbox</option>
              <option value="chatterbox_turbo">chatterbox_turbo</option>
              <option value="luxtts">luxtts</option>
              <option value="tada">tada</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1.5 block">
              Size
            </label>
            <select
              data-wm-id="setup.voicebox.size"
              value={modelSize}
              onChange={(e) => onModelSize(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-line bg-surface text-sm font-mono text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
            >
              <option value="0.6B">0.6B</option>
              <option value="1B">1B</option>
              <option value="1.7B">1.7B</option>
              <option value="3B">3B</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div
          data-wm-id="setup.voicebox.error"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3"
        >
          <p className="text-xs font-mono text-rose-800 break-words">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          data-wm-id="setup.voicebox.prev"
          onClick={onPrev}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted hover:text-ink hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </button>
        <button
          data-wm-id="setup.voicebox.save"
          onClick={onSave}
          disabled={saving || !profileId.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
