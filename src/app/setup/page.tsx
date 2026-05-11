"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Film,
  Key,
  Loader2,
  Mic,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface PublicConfig {
  elevenlabs: {
    hasApiKey: boolean;
    apiKeyMasked: string | null;
    voiceId: string | null;
    model: string;
  };
  envFallback: {
    hasApiKey: boolean;
    hasVoiceId: boolean;
  };
  configured: boolean;
}

type Step = "welcome" | "elevenlabs" | "done";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [revealKey, setRevealKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/motion/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((c: PublicConfig | null) => {
        if (c) {
          setConfig(c);
          setVoiceId(c.elevenlabs.voiceId ?? "");
          // Auto-jump to "done" ONLY if config.json itself has been
          // populated by a previous wizard run. Env-only fallback
          // doesn't count — the user hasn't actually saved via the
          // wizard yet, so they should still see the welcome screen
          // (which surfaces the env detection banner explaining the
          // override semantics).
          const savedViaWizard =
            c.elevenlabs.hasApiKey && !!c.elevenlabs.voiceId;
          if (savedViaWizard) setStep("done");
        }
      })
      .catch(() => {});
  }, []);

  const saveElevenLabs = async () => {
    if (!apiKey.trim() || !voiceId.trim()) {
      setError("API key et voice ID requis.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/motion/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elevenlabs: {
            apiKey: apiKey.trim(),
            voiceId: voiceId.trim(),
          },
        }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }));
        setError(err.error);
        return;
      }
      const next = (await res.json()) as PublicConfig;
      setConfig(next);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-3xl xl:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="flex items-center gap-2 group"
            >
              <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white grid place-items-center group-hover:bg-zinc-800 transition-colors">
                <Film className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
              <span className="font-semibold text-sm tracking-tight">
                webgen-motion
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-1" />
              <span className="text-sm text-slate-500 font-medium">Setup</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour au hub
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl xl:max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {(["welcome", "elevenlabs", "done"] as const).map((s, i) => {
            const order: Step[] = ["welcome", "elevenlabs", "done"];
            const currentIdx = order.indexOf(step);
            const myIdx = i;
            const state =
              myIdx < currentIdx
                ? "done"
                : myIdx === currentIdx
                  ? "current"
                  : "upcoming";
            return (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  state === "current"
                    ? "w-12 bg-zinc-900"
                    : state === "done"
                      ? "w-6 bg-emerald-500"
                      : "w-6 bg-slate-200"
                }`}
              />
            );
          })}
        </div>

        {/* Step content */}
        {step === "welcome" && (
          <WelcomeStep
            envFallback={config?.envFallback}
            onContinue={() => setStep("elevenlabs")}
            onSkip={() => router.push("/")}
          />
        )}

        {step === "elevenlabs" && (
          <ElevenLabsStep
            apiKey={apiKey}
            onApiKey={setApiKey}
            voiceId={voiceId}
            onVoiceId={setVoiceId}
            revealKey={revealKey}
            onToggleReveal={() => setRevealKey((v) => !v)}
            apiKeyMasked={config?.elevenlabs.apiKeyMasked ?? null}
            existingVoiceId={config?.elevenlabs.voiceId ?? null}
            saving={saving}
            error={error}
            onPrev={() => setStep("welcome")}
            onSave={saveElevenLabs}
          />
        )}

        {step === "done" && (
          <DoneStep
            config={config}
            onFinish={() => router.push("/")}
            onEdit={() => {
              // Reset the form fields and let the user re-enter or
              // change the voiceId. apiKey field stays empty (we never
              // surface the saved key in cleartext) — the masked
              // value is shown in the input placeholder.
              setApiKey("");
              setStep("elevenlabs");
            }}
          />
        )}
      </main>
    </div>
  );
}

// ── Step 1 — Welcome ─────────────────────────────────────────────

function WelcomeStep({
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 space-y-5 sm:space-y-6">
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 rounded-xl bg-zinc-900 text-white grid place-items-center flex-shrink-0">
          <Sparkles className="w-5 h-5" />
        </span>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
            Bienvenue
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
            Setup webgen-motion
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            En 2 minutes : on connecte ta voix ElevenLabs pour la voix off
            automatisée. Tout reste local — config dans{" "}
            <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
              ~/.webgen-motion/config.json
            </code>
            , clés jamais commit, pas de cloud.
          </p>
        </div>
      </div>

      {envHasBoth && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
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
          onClick={onSkip}
          className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          Passer le setup
        </button>
        <button
          onClick={onContinue}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          Continuer
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}

// ── Step 2 — ElevenLabs ──────────────────────────────────────────

function ElevenLabsStep({
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 space-y-5 sm:space-y-6">
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
              type={revealKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => onApiKey(e.target.value)}
              placeholder={apiKeyMasked ?? "sk_…"}
              className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
            />
            <button
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
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs font-mono text-rose-800 break-words">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onPrev}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </button>
        <button
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

// ── Step 3 — Done ────────────────────────────────────────────────

function DoneStep({
  config,
  onFinish,
  onEdit,
}: {
  config: PublicConfig | null;
  onFinish: () => void;
  onEdit: () => void;
}) {
  const hasWizardConfig = !!config?.elevenlabs.hasApiKey;
  const masked = config?.elevenlabs.apiKeyMasked ?? null;
  const voiceId = config?.elevenlabs.voiceId ?? null;

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-8 space-y-4 sm:space-y-5">
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white grid place-items-center flex-shrink-0">
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
            Tu peux générer des voix off ElevenLabs depuis le tab{" "}
            <strong>Voix off</strong> de chaque tour.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-white p-4 space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
          Source active
        </p>
        {hasWizardConfig ? (
          <>
            <Row
              label="API key"
              value={masked ?? "—"}
              source="config.json"
            />
            <Row
              label="Voice ID"
              value={voiceId ?? "—"}
              source="config.json"
            />
          </>
        ) : (
          <p className="text-xs text-slate-700 leading-relaxed">
            Configuré via{" "}
            <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">
              .env.local
            </code>{" "}
            du repo (pas via le wizard). Ces valeurs marchent — si tu veux les
            override depuis l&apos;UI, clique <strong>Modifier</strong>.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors"
        >
          {hasWizardConfig ? "Modifier" : "Override via wizard"}
        </button>
        <button
          onClick={onFinish}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
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
      <span className="text-slate-500">{label}</span>
      <span className="font-mono text-slate-900 truncate flex-1 text-right">
        {value}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
        {source}
      </span>
    </div>
  );
}
