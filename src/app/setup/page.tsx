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
  defaultBackend: "elevenlabs" | "voicebox";
  elevenlabs: {
    hasApiKey: boolean;
    apiKeyMasked: string | null;
    voiceId: string | null;
    model: string;
  };
  voicebox: {
    url: string;
    profileId: string | null;
    engine: string;
    modelSize: string;
    language: string;
  };
  envFallback: {
    hasApiKey: boolean;
    hasVoiceId: boolean;
  };
  configured: boolean;
}

interface VoiceboxProfile {
  id: string;
  name: string;
  language: string | null;
  voice_type: string | null;
  default_engine: string | null;
  sample_count: number;
  description: string | null;
}

type Step = "welcome" | "backend" | "elevenlabs" | "voicebox" | "done";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [revealKey, setRevealKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Voicebox flow state
  const [voiceboxUrl, setVoiceboxUrl] = useState("http://127.0.0.1:17493");
  const [voiceboxProfileId, setVoiceboxProfileId] = useState("");
  const [voiceboxEngine, setVoiceboxEngine] = useState("qwen");
  const [voiceboxModelSize, setVoiceboxModelSize] = useState("1.7B");
  const [voiceboxProfiles, setVoiceboxProfiles] = useState<
    VoiceboxProfile[] | null
  >(null);
  const [voiceboxStatus, setVoiceboxStatus] = useState<
    "idle" | "checking" | "found" | "unreachable"
  >("idle");

  useEffect(() => {
    fetch("/api/motion/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((c: PublicConfig | null) => {
        if (c) {
          setConfig(c);
          setVoiceId(c.elevenlabs.voiceId ?? "");
          setVoiceboxUrl(c.voicebox.url);
          setVoiceboxProfileId(c.voicebox.profileId ?? "");
          setVoiceboxEngine(c.voicebox.engine);
          setVoiceboxModelSize(c.voicebox.modelSize);
          // Auto-jump to "done" only when config.json carries a usable
          // backend setup. Env-only or empty config keeps the wizard
          // visible from the welcome screen.
          const elevenSaved =
            c.elevenlabs.hasApiKey && !!c.elevenlabs.voiceId;
          const voiceboxSaved = !!c.voicebox.profileId;
          if (
            (c.defaultBackend === "elevenlabs" && elevenSaved) ||
            (c.defaultBackend === "voicebox" && voiceboxSaved)
          ) {
            setStep("done");
          }
        }
      })
      .catch(() => {});
  }, []);

  // Probe Voicebox when the user lands on its step (auto-detect).
  useEffect(() => {
    if (step !== "voicebox") return;
    setVoiceboxStatus("checking");
    fetch("/api/motion/voicebox/profiles")
      .then(async (r) => {
        if (!r.ok) {
          setVoiceboxStatus("unreachable");
          setVoiceboxProfiles(null);
          return;
        }
        const data = (await r.json()) as { profiles: VoiceboxProfile[] };
        setVoiceboxProfiles(data.profiles);
        setVoiceboxStatus("found");
      })
      .catch(() => {
        setVoiceboxStatus("unreachable");
        setVoiceboxProfiles(null);
      });
  }, [step]);

  const saveVoicebox = async () => {
    if (!voiceboxProfileId.trim()) {
      setError("Choisis une voix Voicebox (ou colle un UUID).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/motion/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultBackend: "voicebox",
          voicebox: {
            url: voiceboxUrl.trim(),
            profileId: voiceboxProfileId.trim(),
            engine: voiceboxEngine,
            modelSize: voiceboxModelSize,
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
          defaultBackend: "elevenlabs",
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
        {/* Progress dots — 4 slots since the user picks one of two
         *  branches at the Backend step. The current step lights up
         *  as wider, completed steps go emerald, the unrelated branch
         *  stays muted. */}
        <div className="flex items-center justify-center gap-2">
          {(["welcome", "backend", "branch", "done"] as const).map((slot, i) => {
            // Map abstract slots to the actual step. "branch" covers
            // both elevenlabs and voicebox so we don't grow the dots.
            const slotMatches = (s: Step) => {
              if (slot === "welcome") return s === "welcome";
              if (slot === "backend") return s === "backend";
              if (slot === "branch") return s === "elevenlabs" || s === "voicebox";
              return s === "done";
            };
            const order: Step[][] = [
              ["welcome"],
              ["backend"],
              ["elevenlabs", "voicebox"],
              ["done"],
            ];
            const currentIdx = order.findIndex((arr) => arr.includes(step));
            const myIdx = i;
            const state =
              myIdx < currentIdx
                ? "done"
                : slotMatches(step)
                  ? "current"
                  : "upcoming";
            return (
              <span
                key={slot}
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
            onContinue={() => setStep("backend")}
            onSkip={() => router.push("/")}
          />
        )}

        {step === "backend" && (
          <BackendStep
            initial={config?.defaultBackend ?? "elevenlabs"}
            onPick={(b) => setStep(b === "voicebox" ? "voicebox" : "elevenlabs")}
            onPrev={() => setStep("welcome")}
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
            onPrev={() => setStep("backend")}
            onSave={saveElevenLabs}
          />
        )}

        {step === "voicebox" && (
          <VoiceboxStep
            url={voiceboxUrl}
            onUrl={setVoiceboxUrl}
            profileId={voiceboxProfileId}
            onProfileId={setVoiceboxProfileId}
            engine={voiceboxEngine}
            onEngine={setVoiceboxEngine}
            modelSize={voiceboxModelSize}
            onModelSize={setVoiceboxModelSize}
            profiles={voiceboxProfiles}
            status={voiceboxStatus}
            saving={saving}
            error={error}
            onPrev={() => setStep("backend")}
            onSave={saveVoicebox}
          />
        )}

        {step === "done" && (
          <DoneStep
            config={config}
            onFinish={() => router.push("/")}
            onEdit={() => {
              // Reset the form fields and bounce the user back to the
              // backend picker so they can change branch if needed.
              // apiKey input stays empty (we never surface the saved
              // key in cleartext) — masked value shows as placeholder.
              setApiKey("");
              setStep("backend");
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

// ── Step — Backend choice ───────────────────────────────────────

function BackendStep({
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 space-y-5 sm:space-y-6">
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 rounded-xl bg-zinc-900 text-white grid place-items-center flex-shrink-0">
          <Sparkles className="w-5 h-5" />
        </span>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
            Backend
          </p>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
            Choisis ton moteur de voix off
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            ElevenLabs tourne dans le cloud (très bonne qualité, instantané,
            clé API requise). Voicebox tourne 100% en local sur ta machine
            (aucune donnée ne sort, dépend de ton hardware côté vitesse).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setPick("elevenlabs")}
          className={`text-left rounded-xl border-2 p-4 transition-all ${
            pick === "elevenlabs"
              ? "border-zinc-900 bg-zinc-50"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-slate-900">
              ElevenLabs
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              Cloud
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Voix clonée + char-level timings natifs. Mode narratif supporté.
          </p>
        </button>
        <button
          type="button"
          onClick={() => setPick("voicebox")}
          className={`text-left rounded-xl border-2 p-4 transition-all ${
            pick === "voicebox"
              ? "border-zinc-900 bg-zinc-50"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-slate-900">
              Voicebox
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
              Local
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            7 moteurs (qwen, kokoro, chatterbox…). Tourne via l&apos;app
            desktop. Privacy totale, vitesse selon machine.
          </p>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onPrev}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </button>
        <button
          onClick={() => onPick(pick)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          Continuer
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}

// ── Step — Voicebox ─────────────────────────────────────────────

function VoiceboxStep({
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 space-y-5 sm:space-y-6">
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 rounded-xl bg-zinc-900 text-white grid place-items-center flex-shrink-0">
          <Mic className="w-5 h-5" />
        </span>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
            Voicebox
          </p>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
            Voix locale
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            On détecte automatiquement Voicebox sur{" "}
            <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
              127.0.0.1:17493
            </code>{" "}
            et on liste tes voix existantes. Crée-en une dans l&apos;app desktop
            si ce n&apos;est pas déjà fait,{" "}
            <a
              href="https://github.com/jamiepine/voicebox"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-900 font-medium underline underline-offset-2"
            >
              github.com/jamiepine/voicebox
            </a>
            .
          </p>
        </div>
      </div>

      {/* Status banner */}
      {status === "checking" && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
          <p className="text-xs text-slate-700">Détection de Voicebox…</p>
        </div>
      )}
      {status === "unreachable" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
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
          <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1.5 flex items-center gap-1.5">
            URL Voicebox
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => onUrl(e.target.value)}
            placeholder="http://127.0.0.1:17493"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
          />
        </div>

        {/* Profile dropdown OR UUID fallback */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Mic className="w-3 h-3" />
            Voix
          </label>
          {profiles && profiles.length > 0 ? (
            <select
              value={profileId}
              onChange={(e) => onProfileId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
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
              type="text"
              value={profileId}
              onChange={(e) => onProfileId(e.target.value)}
              placeholder="profile UUID (fallback si non détecté)"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
            />
          )}
        </div>

        {/* Engine + model size */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1.5 block">
              Engine
            </label>
            <select
              value={engine}
              onChange={(e) => onEngine(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
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
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1.5 block">
              Size
            </label>
            <select
              value={modelSize}
              onChange={(e) => onModelSize(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
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
          disabled={saving || !profileId.trim()}
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

function DoneStep({
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
            Backend{" "}
            <strong>
              {backend === "voicebox" ? "Voicebox (local)" : "ElevenLabs (cloud)"}
            </strong>{" "}
            actif. Tu peux générer la voix off depuis le tab{" "}
            <strong>Voix off</strong> de chaque tour.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-white p-4 space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
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
            <p className="text-xs text-slate-700 leading-relaxed">
              Voicebox sélectionné mais aucune voix renseignée — clique{" "}
              <strong>Modifier</strong>.
            </p>
          )
        ) : elevenSaved ? (
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
          {elevenSaved || voiceboxSaved
            ? "Modifier"
            : "Override via wizard"}
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
