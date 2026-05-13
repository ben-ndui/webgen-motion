"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  FolderSearch,
  Loader2,
  Monitor,
  Smartphone,
  X,
} from "lucide-react";

/**
 * "Scaffold depuis un projet" — Sprint 6.
 *
 * Pointe un projet Next.js local, scanne les routes, génère des
 * tours JSON squelettes. Pair parfait avec l'Agent IA (Sprint 5) :
 * ici on choppe la STRUCTURE multi-routes rapidement, l'Agent
 * enrichit ensuite le narratif + scrollY depuis le live.
 *
 * UX : modal avec input path + base_url + format → POST l'API,
 * stream NDJSON, à la fin → invite l'utilisateur à copier les
 * tours dans `tours/` ou retourner au hub.
 */
export default function ScaffoldFromProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectPath, setProjectPath] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000");
  const [format, setFormat] = useState<"16:9" | "9:16">("16:9");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState<{ scaffolded: number; outDir: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLogs([]);
    setDone(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

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
    if (!projectPath.trim()) {
      setError("Indique un chemin vers un projet Next.js.");
      return;
    }
    if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
      setError("baseUrl invalide.");
      return;
    }
    setBusy(true);
    setError(null);
    setLogs([]);
    setDone(null);
    try {
      const res = await fetch("/api/motion/tour/scaffold-from-project/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectPath: projectPath.trim(),
          baseUrl: baseUrl.trim(),
          format,
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
      while (true) {
        const { value, done: rDone } = await reader.read();
        if (rDone) break;
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
          if (event.type === "info" && typeof event.message === "string") {
            setLogs((l) => [...l, event.message as string]);
          } else if (event.type === "phase" && typeof event.label === "string") {
            setLogs((l) => [...l, event.label as string]);
          } else if (event.type === "warn" && typeof event.message === "string") {
            setLogs((l) => [...l, `⚠ ${event.message}`]);
          } else if (event.type === "done") {
            setDone({
              scaffolded: (event.scaffolded as number) ?? 0,
              outDir: (event.outDir as string) ?? "",
            });
          } else if (event.type === "error") {
            throw new Error((event.message as string) ?? "Erreur scaffolder");
          }
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        data-wm-id="dashboard.scaffold-project-button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-300 bg-white text-slate-900 text-sm font-medium hover:bg-slate-50 transition-colors"
      >
        <FolderSearch className="w-3.5 h-3.5" />
        Scaffold projet
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            data-wm-id="dashboard.scaffold-modal"
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
                  Sprint 6
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Scaffold depuis un projet
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Scanne un repo Next.js local et génère un tour par route détectée.
                </p>
              </div>
              <button
                onClick={() => !busy && setOpen(false)}
                disabled={busy}
                className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <fieldset disabled={busy} className="space-y-3">
              <Field
                label="Chemin du projet"
                hint="Chemin absolu, ex: /Users/toi/IdeaProjects/mon-saas"
              >
                <input
                  ref={inputRef}
                  data-wm-id="dashboard.scaffold.project-path"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="/Users/toi/IdeaProjects/mon-saas"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
                />
              </Field>

              <Field
                label="Base URL"
                hint="URL servie pendant la capture (npm run dev du projet cible)"
              >
                <input
                  data-wm-id="dashboard.scaffold.base-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:3000"
                  type="url"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
                />
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
            </fieldset>

            {busy && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 max-h-40 overflow-y-auto space-y-1">
                <div className="flex items-center gap-2 text-sm text-zinc-900 mb-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  <span className="font-medium">Scan en cours…</span>
                </div>
                {logs.map((l, i) => (
                  <p
                    key={i}
                    className="text-[11px] text-zinc-600 font-mono break-words"
                  >
                    {l}
                  </p>
                ))}
              </div>
            )}

            {done && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                <p className="text-sm font-semibold text-emerald-900">
                  ✓ {done.scaffolded} tour(s) scaffoldé(s)
                </p>
                <p className="text-xs text-emerald-700 break-all">
                  Fichiers JSON écrits dans :{" "}
                  <code className="font-mono">{done.outDir}</code>
                </p>
                <p className="text-xs text-emerald-700">
                  Copie-les dans le <code className="font-mono">tours/</code> de
                  webgen-motion pour les voir dans le hub. Tu peux ensuite
                  enrichir le narratif via l&apos;Agent IA ou éditer
                  manuellement dans le tab Script.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-rose-900 break-words">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="px-4 py-2 rounded-full text-sm text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                {done ? "Fermer" : "Annuler"}
              </button>
              {!done && (
                <button
                  data-wm-id="dashboard.scaffold.submit"
                  onClick={handleSubmit}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderSearch className="w-3.5 h-3.5" />
                  )}
                  {busy ? "Scan…" : "Scaffold"}
                </button>
              )}
              {done && (
                <button
                  onClick={() => {
                    setOpen(false);
                    router.refresh();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
                >
                  Voir les tours
                </button>
              )}
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
