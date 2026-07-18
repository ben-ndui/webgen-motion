"use client";

import "../pages.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Film } from "lucide-react";

import WizardWelcomeStep from "./_components/wizard-welcome-step";
import WizardBackendStep from "./_components/wizard-backend-step";
import WizardElevenLabsStep from "./_components/wizard-elevenlabs-step";
import WizardVoiceboxStep from "./_components/wizard-voicebox-step";
import WizardGoogleStep from "./_components/wizard-google-step";
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
  // Google flow state
  const [googleCredsPath, setGoogleCredsPath] = useState("");
  const [googleVoice, setGoogleVoice] = useState("");

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
          setGoogleCredsPath(c.google.credentialsPath ?? "");
          setGoogleVoice(c.google.voice ?? "");
          const elevenSaved =
            c.elevenlabs.hasApiKey && !!c.elevenlabs.voiceId;
          const voiceboxSaved = !!c.voicebox.profileId;
          const googleSaved = c.google.hasCredentials;
          if (
            (c.defaultBackend === "elevenlabs" && elevenSaved) ||
            (c.defaultBackend === "voicebox" && voiceboxSaved) ||
            (c.defaultBackend === "google" && googleSaved)
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

  const saveGoogle = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/motion/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultBackend: "google",
          google: {
            credentialsPath: googleCredsPath.trim() || undefined,
            voice: googleVoice.trim() || undefined,
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
      if (!next.google.hasCredentials) {
        setError(
          "Backend Google enregistré, mais aucun credentials trouvé. Renseigne le chemin du service account ou définis GOOGLE_APPLICATION_CREDENTIALS.",
        );
        return;
      }
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
    <div className="gm-page" data-wm-id="setup.page">
      <div className="wiz-stage">
        <main className="wiz space-y-6">
          <Link href="/" className="wiz-brand" data-wm-id="setup.header.home">
            <span className="brand-mark" aria-hidden />
            <span className="brand-name">GEN&nbsp;MOTION</span>
          </Link>
          <WizSteps step={step} />

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
            onPick={(b) => setStep(b)}
            onPrev={() => setStep("welcome")}
          />
        )}

        {step === "google" && (
          <WizardGoogleStep
            credentialsPath={googleCredsPath}
            setCredentialsPath={setGoogleCredsPath}
            voice={googleVoice}
            setVoice={setGoogleVoice}
            saving={saving}
            error={error}
            onPrev={() => setStep("backend")}
            onSave={saveGoogle}
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
    </div>
  );
}

/** Wizard stepper — 4 slots (Bienvenue · Backend · Voix · Terminé).
 *  Handoff wiz-dot design : done = accent ✓, active = accent ring. */
function WizSteps({ step }: { step: WizardStep }) {
  const order: WizardStep[][] = [
    ["welcome"],
    ["backend"],
    ["elevenlabs", "voicebox"],
    ["done"],
  ];
  const cur = order.findIndex((arr) => arr.includes(step));
  return (
    <div className="wiz-steps" data-wm-id="setup.progress">
      {order.map((_, i) => {
        const st = i < cur ? "done" : i === cur ? "active" : "";
        return (
          <div key={i} className={"wiz-dot " + st} data-wm-id={`setup.progress.slot-${i}`}>
            <span className="b">{i < cur ? "✓" : i + 1}</span>
            <span className="line" />
          </div>
        );
      })}
    </div>
  );
}
