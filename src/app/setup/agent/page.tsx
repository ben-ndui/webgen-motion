"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Sparkles,
} from "lucide-react";

/**
 * Setup wizard — Agent IA (Sprint 5).
 *
 * Sépare du wizard voix off principal parce que c'est une feature
 * indépendante : l'utilisateur peut très bien activer la voix off
 * (ElevenLabs/Voicebox) sans agent IA, et inversement.
 *
 * Bring-your-own-key — la clé reste dans `~/.webgen-motion/config.json`
 * (local-first, jamais commit). Smooth & Design ne proxifie rien, le
 * coût des tokens est facturé directement par le provider.
 *
 * Phase 1 ship Anthropic Claude only (recommandé pour la qualité
 * narrative FR). OpenAI / Mistral seront branchés dans une phase
 * suivante quand le prompt sera stabilisé.
 */

type Provider = "anthropic" | "openai" | "mistral";

interface PublicConfig {
  agent: {
    provider: Provider;
    hasApiKey: boolean;
    apiKeyMasked: string | null;
    model: string;
  };
}

const MODELS: Record<Provider, { id: string; label: string; cost: string }[]> = {
  anthropic: [
    {
      id: "claude-sonnet-4-6",
      label: "Sonnet 4.6",
      cost: "$3 / $15 par M tokens — meilleur ratio qualité/prix",
    },
    {
      id: "claude-opus-4-7",
      label: "Opus 4.7",
      cost: "$15 / $75 par M tokens — multimodal, qualité max",
    },
    {
      id: "claude-haiku-4-5-20251001",
      label: "Haiku 4.5",
      cost: "$0.80 / $4 par M tokens — rapide, suffisant pour drafts",
    },
  ],
  openai: [],
  mistral: [],
};

export default function AgentSetupPage() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [revealKey, setRevealKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/motion/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((c: PublicConfig | null) => {
        if (!c) return;
        setConfig(c);
        if (c.agent.provider) setProvider(c.agent.provider);
        if (c.agent.model) setModel(c.agent.model);
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    if (!apiKey.trim()) {
      setError("La clé API est requise.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/motion/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: {
            provider,
            apiKey: apiKey.trim(),
            model,
          },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Erreur ${res.status}`);
      }
      setSaved(true);
      setApiKey("");
      // Refresh public config to show the new masked value.
      fetch("/api/motion/config")
        .then((r) => (r.ok ? r.json() : null))
        .then((c: PublicConfig | null) => c && setConfig(c));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const apiKeyMasked = config?.agent.apiKeyMasked;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3 text-sm">
          <Link
            href="/dashboard"
            className="text-slate-500 hover:text-slate-900 transition"
          >
            ← Tours
          </Link>
          <span className="text-slate-300">/</span>
          <Link
            href="/setup"
            className="text-slate-500 hover:text-slate-900 transition"
          >
            Setup
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-semibold">Agent IA</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-7">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">
              05 — Sprint 5
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              Agent IA
              <br />
              <span className="text-slate-400">auto-tour.</span>
            </h1>
          </div>
          <div className="col-span-12 md:col-span-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              Colle ta clé API, l&apos;agent scan ton site et propose un
              tour complet (sections, steps, voiceover). Bring-your-own-key —
              les tokens sont facturés direct par le provider, on ne proxifie
              rien.
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl bg-zinc-900 text-white grid place-items-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
                Provider
              </p>
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
                Configuration
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Phase 1 : Anthropic Claude uniquement (best narratif FR).
                OpenAI / Mistral arriveront dans une phase suivante.
              </p>
            </div>
          </div>

          {/* Provider selector */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1.5 block">
              Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["anthropic", "openai", "mistral"] as Provider[]).map((p) => {
                const enabled = p === "anthropic";
                const selected = provider === p;
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={!enabled}
                    onClick={() => enabled && setProvider(p)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                      selected
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : enabled
                          ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          : "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {p === "anthropic" ? "Anthropic" : p === "openai" ? "OpenAI" : "Mistral"}
                    {!enabled && (
                      <span className="block text-[10px] font-normal mt-0.5">
                        bientôt
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1.5 block">
              Modèle
            </label>
            <div className="space-y-2">
              {MODELS[provider].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModel(m.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                    model === m.id
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="font-medium text-sm text-slate-900">
                    {m.label}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{m.cost}</div>
                </button>
              ))}
            </div>
          </div>

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
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={apiKeyMasked ?? "sk-ant-…"}
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
              />
              <button
                type="button"
                onClick={() => setRevealKey(!revealKey)}
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
              Récupère-la sur{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-900 font-medium underline underline-offset-2 hover:text-zinc-700"
              >
                console.anthropic.com
              </a>{" "}
              · stockée dans{" "}
              <code className="font-mono">~/.webgen-motion/config.json</code>
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p className="text-xs font-mono text-rose-800 break-words">
                {error}
              </p>
            </div>
          )}
          {saved && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-800">
                ✓ Configuration sauvegardée. Tu peux maintenant générer un
                tour avec l&apos;IA depuis le hub.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour au hub
            </Link>
            <button
              onClick={save}
              disabled={saving || !apiKey.trim()}
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
      </main>
    </div>
  );
}
