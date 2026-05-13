"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Monitor, Smartphone, Sparkles, Wand2, X } from "lucide-react";

/**
 * "Générer avec IA" button + modal (Sprint 5).
 *
 * UX :
 *  - User pastes base_url + slug + picks preset/format/tone
 *  - We POST /api/motion/tour/generate/run, consume NDJSON
 *  - Show progress events live (phase / info / warn)
 *  - On done : navigate to /tour/<id> editor so user can review +
 *    refine before capture
 *
 * Pre-check : if /api/motion/config says agent.hasApiKey === false,
 * route the user to /setup/agent instead of failing in the runner.
 */

interface PublicConfig {
  agent: { hasApiKey: boolean };
}

type Preset = "pitch" | "demo" | "walkthrough" | "showcase";
type Tone = "premium" | "playful" | "tech" | "educational";
type Format = "16:9" | "9:16";

const PRESET_LABELS: Record<Preset, string> = {
  pitch: "Pitch · 80-120 s",
  demo: "Démo · 30-60 s",
  walkthrough: "Walkthrough · 120-180 s",
  showcase: "Showcase · 60-90 s",
};

const TONE_LABELS: Record<Tone, string> = {
  premium: "Premium",
  playful: "Playful",
  tech: "Tech",
  educational: "Educational",
};

export default function GenerateWithAiButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [outputId, setOutputId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [preset, setPreset] = useState<Preset>("pitch");
  const [format, setFormat] = useState<Format>("16:9");
  const [tone, setTone] = useState<Tone>("premium");
  const [skipScreenshot, setSkipScreenshot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/motion/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((c: PublicConfig | null) => c && setConfig(c))
      .catch(() => {});
    setError(null);
    setPhase(null);
    setInfo(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Auto-slug from the URL hostname until user edits.
  useEffect(() => {
    if (idTouched) return;
    try {
      const u = new URL(baseUrl);
      const host = u.hostname.replace(/^www\./, "");
      const slug = host
        .replace(/\..*$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      setOutputId(slug ? `${slug}-${Date.now().toString(36)}` : "");
    } catch {
      // not a valid URL yet
    }
  }, [baseUrl, idTouched]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  const handleSubmit = async () => {
    if (busy) return;
    if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
      setError("URL invalide. Format attendu : https://exemple.com");
      return;
    }
    if (!outputId || !/^[\w-]+$/.test(outputId)) {
      setError("Slug invalide (lettres / chiffres / tirets uniquement).");
      return;
    }
    if (!config?.agent.hasApiKey) {
      setError(
        "Agent IA pas configuré. Va dans /setup/agent pour coller ta clé Claude.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    setPhase("Démarrage…");
    setInfo(null);
    try {
      const res = await fetch("/api/motion/tour/generate/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          outputId,
          preset,
          format,
          tone,
          skipScreenshot,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error("Réponse vide");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let success = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === "phase" && typeof event.label === "string") {
            setPhase(event.label);
          } else if (
            event.type === "info" &&
            typeof event.message === "string"
          ) {
            setInfo(event.message);
          } else if (event.type === "done") {
            success = true;
          } else if (event.type === "error") {
            throw new Error((event.message as string) ?? "Erreur agent");
          }
        }
      }
      if (!success) throw new Error("L'agent n'a pas produit de tour");
      setBusy(false);
      setOpen(false);
      router.push(`/tour/${encodeURIComponent(outputId)}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-300 bg-white text-slate-900 text-sm font-medium hover:bg-slate-50 transition-colors"
      >
        <Wand2 className="w-3.5 h-3.5" />
        Générer avec IA
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
                  Agent IA
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Générer un tour
                </h2>
              </div>
              <button
                onClick={() => !busy && setOpen(false)}
                className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
                aria-label="Fermer"
                disabled={busy}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!busy && !config?.agent.hasApiKey && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Aucune clé API détectée. Va dans{" "}
                <a
                  href="/setup/agent"
                  className="font-semibold underline underline-offset-2"
                >
                  /setup/agent
                </a>{" "}
                pour coller ta clé Claude avant de générer.
              </div>
            )}

            {busy && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm text-zinc-900 min-w-0">
                  <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  <span className="font-medium truncate">{phase ?? "En cours…"}</span>
                </div>
                {info && (
                  <p className="text-xs text-zinc-600 pl-5 break-words">
                    {info}
                  </p>
                )}
              </div>
            )}

            <fieldset disabled={busy} className="space-y-3">
              <Field label="URL du site">
                <input
                  ref={inputRef}
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://exemple.com"
                  type="url"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
                />
              </Field>

              <Field
                label="Slug (id)"
                hint="Auto-généré depuis le domaine — édite si besoin"
              >
                <input
                  value={outputId}
                  onChange={(e) => {
                    setIdTouched(true);
                    setOutputId(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    );
                  }}
                  placeholder="acme-landing"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
                />
              </Field>

              <Field label="Preset narratif">
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as Preset)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
                >
                  {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
                    <option key={p} value={p}>
                      {PRESET_LABELS[p]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Ton">
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(TONE_LABELS) as Tone[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        tone === t
                          ? "bg-zinc-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {TONE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Format">
                <div className="flex items-center gap-2">
                  <FormatPill
                    active={format === "16:9"}
                    onClick={() => setFormat("16:9")}
                    label="Desktop · 16:9"
                    Icon={Monitor}
                  />
                  <FormatPill
                    active={format === "9:16"}
                    onClick={() => setFormat("9:16")}
                    label="Mobile · 9:16"
                    Icon={Smartphone}
                  />
                </div>
              </Field>

              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipScreenshot}
                  onChange={(e) => setSkipScreenshot(e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                Désactiver le screenshot multimodal (économise des tokens)
              </label>
            </fieldset>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-rose-900 break-all whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {error}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="px-4 py-2 rounded-full text-sm text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={busy || !config?.agent.hasApiKey}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Génération…
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    Générer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
          {label}
        </label>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function FormatPill({
  active,
  onClick,
  label,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
        active
          ? "bg-zinc-900 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
