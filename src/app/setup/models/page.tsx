"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Box,
  ChevronRight,
  Film,
  Loader2,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react";

/**
 * Setup wizard — Gestion des modèles 3D Sketchfab.
 * Sprint 7 phase 3.
 *
 * Page dédiée pour drop / supprimer des GLB iPhone et MacBook.
 * Sans GLB, webgen-motion fallback sur les devices procéduraux —
 * cette page est OPTIONNELLE pour les users qui veulent un look
 * réaliste premium.
 */

interface ModelEntry {
  name: string;
  sizeMB: number;
  mtime: number;
  role: "iphone" | "macbook" | "other";
}

export default function ModelsSetupPage() {
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/motion/models/list", { cache: "no-store" });
      const data = await res.json();
      setModels(data.models ?? []);
    } catch {
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const iphoneModel = models.find((m) => m.role === "iphone") ?? null;
  const macbookModel = models.find((m) => m.role === "macbook") ?? null;

  return (
    <div className="min-h-screen bg-surface text-ink" data-wm-id="setup.models.page">
      <header className="border-b border-line">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3 text-sm">
          <Link
            href="/dashboard"
            className="text-muted hover:text-ink transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Tours
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-faint" />
          <Link
            href="/setup"
            className="text-muted hover:text-ink transition"
          >
            Setup
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-faint" />
          <span className="font-semibold">Models 3D</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-7">
            <div className="text-xs uppercase tracking-[0.2em] text-faint mb-3">
              Sprint 7 — Frames 3D
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              Models 3D
              <br />
              <span className="text-faint">premium.</span>
            </h1>
          </div>
          <div className="col-span-12 md:col-span-5">
            <p className="text-sm text-muted leading-relaxed">
              Drop tes GLB Sketchfab pour remplacer les devices procéduraux
              par des modèles iPhone 15 Pro / MacBook réels. Sans GLB, le
              fallback procédural reste actif — la feature 3D marche sans
              prérequis.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <ModelSlot
            role="iphone"
            label="iPhone 15 Pro"
            icon={<Smartphone className="w-5 h-5" />}
            description="Texture vidéo plaquée sur l'écran. Mesh attendue : screen / display."
            current={iphoneModel}
            onChange={refresh}
          />
          <ModelSlot
            role="macbook"
            label="MacBook"
            icon={<Box className="w-5 h-5" />}
            description="Modèle laptop, écran ouvert ~100°. La capture s'affiche sur la mesh screen."
            current={macbookModel}
            onChange={refresh}
          />
        </div>

        {loading && (
          <p className="text-xs text-muted mt-6">Chargement…</p>
        )}

        <section className="mt-12 rounded-2xl border border-line bg-bg-sunken p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-ink-soft" />
            <h2 className="text-sm font-semibold text-ink">
              Workflow Sketchfab
            </h2>
          </div>
          <ol className="text-xs text-muted space-y-1.5 leading-relaxed list-decimal list-inside">
            <li>
              <a
                href="https://sketchfab.com/feed"
                target="_blank"
                rel="noreferrer"
                className="text-ink underline underline-offset-2"
              >
                sketchfab.com
              </a>{" "}
              — recherche &quot;iPhone 15 Pro&quot; ou &quot;MacBook Air&quot;
            </li>
            <li>Filtres : Free Download · License CC Attribution · Format GLB / glTF</li>
            <li>Download → choisis glTF (.glb)</li>
            <li>
              Si la mesh écran ne s&apos;appelle pas <code className="font-mono">screen</code>
              {" "}/{" "}<code className="font-mono">display</code>, ouvre dans Blender,
              renomme + ré-export
            </li>
            <li>Drop le fichier dans le slot ci-dessus → upload + override automatique</li>
          </ol>
          <p className="text-[11px] text-muted">
            Pour la commercialisation Studio (sans contrainte de licence), préférer
            TurboSquid / CGTrader (~$10-30 par modèle).
          </p>
        </section>
      </main>
    </div>
  );
}

function ModelSlot({
  role,
  label,
  icon,
  description,
  current,
  onChange,
}: {
  role: "iphone" | "macbook";
  label: string;
  icon: React.ReactNode;
  description: string;
  current: ModelEntry | null;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const upload = async (file: File) => {
    setBusy("upload");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("role", role);
      const res = await fetch("/api/motion/models/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!current) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(
        `/api/motion/models/${encodeURIComponent(current.name)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      data-wm-id={`setup.models.slot-${role}`}
      className="rounded-2xl border border-line bg-surface p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 rounded-xl bg-ink text-bg grid place-items-center flex-shrink-0">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">
            {role}.glb
          </p>
          <h3 className="text-lg font-semibold text-ink tracking-tight">
            {label}
          </h3>
          <p className="text-xs text-muted leading-relaxed mt-1">
            {description}
          </p>
        </div>
        {current && (
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
            Actif
          </span>
        )}
      </div>

      {current ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg-sunken p-3">
          <div className="text-xs text-ink-soft min-w-0">
            <div className="font-mono truncate">{current.name}</div>
            <div className="text-muted mt-0.5">
              {current.sizeMB.toFixed(2)} MB · maj{" "}
              {new Date(current.mtime).toLocaleString("fr-FR")}
            </div>
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-60"
            data-wm-id={`setup.models.${role}-delete`}
          >
            {busy === "delete" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Supprimer
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted italic">
          Aucun GLB pour le moment — fallback sur le device procédural.
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) upload(f);
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy !== null}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        data-wm-id={`setup.models.${role}-upload`}
      >
        {busy === "upload" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {busy === "upload"
          ? "Upload…"
          : current
            ? "Remplacer"
            : "Drop un GLB"}
      </button>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs font-mono text-rose-800 break-words">{error}</p>
        </div>
      )}
    </section>
  );
}
