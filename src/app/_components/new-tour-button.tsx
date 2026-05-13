"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Monitor,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import type { TourEntry } from "@/lib/types/tour";

/**
 * "Nouveau tour" button + modal. Creates a starter tour file on disk
 * (PUT /api/motion/tour/<id>) and navigates to its editor. The id is
 * auto-slugified from the name; the user can override it.
 *
 * Validation cascade :
 *  - client-side : id slug regex, name non-empty
 *  - existence check (GET) before write to surface "id pris" cleanly
 *  - server-side : saveTour throws 400 on schema issues
 */
export default function NewTourButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [format, setFormat] = useState<"16:9" | "9:16">("16:9");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  // Auto-slugify id from name until the user manually edits it.
  useEffect(() => {
    if (!idTouched) {
      setId(slugify(name));
    }
  }, [name, idTouched]);

  // Focus the name field when the modal opens.
  useEffect(() => {
    if (open) {
      setError(null);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const reset = () => {
    setName("");
    setId("");
    setIdTouched(false);
    setFormat("16:9");
    setError(null);
    setBusy(false);
  };

  const handleSubmit = async () => {
    if (busy) return;
    if (!name.trim()) {
      setError("Donne un nom au tour.");
      return;
    }
    if (!id || !/^[\w-]+$/.test(id)) {
      setError(
        "L'id doit être un slug : lettres / chiffres / tirets / underscores (ex: mon-projet).",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Existence check — protects against silently overwriting a tour.
      const head = await fetch(`/api/motion/tour/${encodeURIComponent(id)}`);
      if (head.ok) {
        setError(`Un tour "${id}" existe déjà.`);
        setBusy(false);
        return;
      }
      const tour: TourEntry = makeStarterTour(id, name.trim(), format);
      const res = await fetch(`/api/motion/tour/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tour }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        setBusy(false);
        return;
      }
      // Success → navigate to the editor. Reset state on the way out
      // so reopening the modal feels fresh.
      reset();
      setOpen(false);
      router.push(`/tour/${encodeURIComponent(id)}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setBusy(false);
    }
  };

  return (
    <>
      <button
        data-wm-id="dashboard.new-tour-button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Nouveau tour
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
                  Nouveau
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Créer un tour
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Nom">
                <input
                  ref={nameRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mon projet · Landing"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                />
              </Field>

              <Field
                label="Id"
                hint="Auto-généré depuis le nom — édite si besoin"
              >
                <input
                  value={id}
                  onChange={(e) => {
                    setIdTouched(true);
                    setId(slugify(e.target.value));
                  }}
                  placeholder="mon-projet-landing"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
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
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-rose-900">{error}</p>
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
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Création…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Créer le tour
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Le fichier <code className="font-mono">tours/{id || "<id>"}.json</code>{" "}
              sera créé avec un squelette minimal. Tu pourras éditer les
              steps + la voix off depuis le tab Script.
            </p>
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

/** Lower-case, replace runs of non-alphanumeric with `-`, trim dashes. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function makeStarterTour(
  id: string,
  name: string,
  format: "16:9" | "9:16",
): TourEntry {
  return {
    id,
    name,
    description: "Nouveau tour — édite les steps depuis le tab Script.",
    estimatedSec: 20,
    startPath: "/",
    baseUrl: "http://localhost:3000",
    format,
    brand: {
      displayName: name,
      domain: "localhost",
      tagline: "by Smooth & Design",
    },
    steps: [
      {
        type: "section",
        categoryId: "branding",
        title: name,
        subtitle: "Première section",
        dwellMs: 2500,
      },
      { type: "wait", dwellMs: 2000 },
      {
        type: "overlay",
        text: "Démarre par éditer ce tour dans le tab Script",
        position: "center",
        dwellMs: 3500,
      },
    ],
  };
}
