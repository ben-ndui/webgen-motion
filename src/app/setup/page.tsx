"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Film } from "lucide-react";

import WizardWelcomeStep from "./_components/wizard-welcome-step";
import WizardBackendStep from "./_components/wizard-backend-step";
import WizardElevenLabsStep from "./_components/wizard-elevenlabs-step";
import WizardVoiceboxStep from "./_components/wizard-voicebox-step";
import WizardDoneStep from "./_components/wizard-done-step";
import type {
  PublicConfig,
  VoiceboxProfile,
  WizardStep,
} from "./_components/wizard-types";

/**
 * Setup wizard — orchestrateur léger.
 *
 * Avant Sprint refactor : 1018 lignes (state machine + 6 step
 * components inline + Row helper + types locaux).
 * Après : ~230 lignes. Chaque step vit dans son propre fichier
 * sous `_components/wizard-<step>-step.tsx`, types partagés dans
 * `_components/wizard-types.ts`.
 *
 * Le page.tsx garde la responsabilité :
 *  - state machine (`step`, `apiKey`, `voiceId`, voicebox state…)
 *  - handlers de save (saveElevenLabs / saveVoicebox)
 *  - layout principal (header, progress dots)
 *  - dispatch vers le step component actif
 *
 * Tous les éléments interactifs ont un `data-wm-id` pour
 * tour-ability future via l'Agent IA (cf. règle Smooth & Design).
 */
export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("welcome");
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

  // Initial config fetch + auto-jump to "done" si déjà configuré.
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

  // Probe Voicebox quand l'utilisateur arrive sur ce step.
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
    <div className="min-h-screen flex flex-col" data-wm-id="setup.page">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-3xl xl:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              data-wm-id="setup.header.home"
              className="flex items-center gap-2 group"
            >
              <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white grid place-items-center group-hover:bg-zinc-800 transition-colors">
                <Film className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
              <span className="font-semibold text-sm tracking-tight">
                GEN MOTION
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-1" />
              <span className="text-sm text-slate-500 font-medium">Setup</span>
            </Link>
            <Link
              href="/dashboard"
              data-wm-id="setup.header.dashboard"
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
         *  branches at the Backend step. */}
        <ProgressDots step={step} />

        {/* Step content */}
        {step === "welcome" && (
          <WizardWelcomeStep
            envFallback={config?.envFallback}
            onContinue={() => setStep("backend")}
            onSkip={() => router.push("/dashboard")}
          />
        )}

        {step === "backend" && (
          <WizardBackendStep
            initial={config?.defaultBackend ?? "elevenlabs"}
            onPick={(b) => setStep(b === "voicebox" ? "voicebox" : "elevenlabs")}
            onPrev={() => setStep("welcome")}
          />
        )}

        {step === "elevenlabs" && (
          <WizardElevenLabsStep
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
          <WizardVoiceboxStep
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
          <WizardDoneStep
            config={config}
            onFinish={() => router.push("/dashboard")}
            onEdit={() => {
              // Reset the form fields + bounce back to the backend picker.
              // apiKey input stays empty (we never surface the saved key
              // in cleartext) — masked value shows as placeholder.
              setApiKey("");
              setStep("backend");
            }}
          />
        )}
      </main>
    </div>
  );
}

/** Progress dots — 4 slots, current = wider zinc, done = emerald,
 *  upcoming = slate. Reste inline parce que purement visuel et
 *  utilisé uniquement ici. */
function ProgressDots({ step }: { step: WizardStep }) {
  return (
    <div className="flex items-center justify-center gap-2" data-wm-id="setup.progress">
      {(["welcome", "backend", "branch", "done"] as const).map((slot, i) => {
        const slotMatches = (s: WizardStep) => {
          if (slot === "welcome") return s === "welcome";
          if (slot === "backend") return s === "backend";
          if (slot === "branch") return s === "elevenlabs" || s === "voicebox";
          return s === "done";
        };
        const order: WizardStep[][] = [
          ["welcome"],
          ["backend"],
          ["elevenlabs", "voicebox"],
          ["done"],
        ];
        const currentIdx = order.findIndex((arr) => arr.includes(step));
        const state =
          i < currentIdx
            ? "done"
            : slotMatches(step)
              ? "current"
              : "upcoming";
        return (
          <span
            key={slot}
            data-wm-id={`setup.progress.slot-${slot}`}
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
  );
}
