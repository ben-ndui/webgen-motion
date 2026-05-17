"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Trash2 } from "lucide-react";

interface Props {
  currentEdition: "community" | "studio" | "enterprise";
  hasLicense: boolean;
  envOverride: boolean;
}

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; message: string }
  | { kind: "err"; message: string };

export default function LicenseForm({ currentEdition, hasLicense, envOverride }: Props) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function install() {
    if (!content.trim()) return;
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/motion/license", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await res.json()) as
        | { installed: true; edition: string; email: string }
        | { error: string };
      if (!res.ok || !("installed" in data)) {
        setStatus({
          kind: "err",
          message: "error" in data ? data.error : "Install failed",
        });
        return;
      }
      setStatus({
        kind: "ok",
        message: `License installée — edition ${data.edition}, ${data.email}`,
      });
      setContent("");
      router.refresh();
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    }
  }

  async function remove() {
    if (!confirm("Supprimer la license actuelle et repasser en Community ?")) return;
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/motion/license", { method: "DELETE" });
      if (!res.ok) {
        setStatus({ kind: "err", message: `DELETE failed: ${res.status}` });
        return;
      }
      setStatus({ kind: "ok", message: "License supprimée — edition repassée en Community." });
      router.refresh();
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    }
  }

  return (
    <div className="space-y-8" data-wm-id="setup.license-form">
      <div>
        <label
          htmlFor="license-content"
          className="block text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-3"
        >
          {hasLicense ? "Remplacer la license" : "Installer une license"}
        </label>
        <textarea
          id="license-content"
          data-wm-id="setup.license-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`-----BEGIN WEBGEN-MOTION LICENSE v1-----\n<contenu de ton fichier .license>\n-----END WEBGEN-MOTION LICENSE-----`}
          rows={8}
          className="w-full font-mono text-xs bg-zinc-50 border border-zinc-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder-zinc-400 resize-y"
          disabled={envOverride}
        />
        <p className="mt-2 text-xs text-zinc-500">
          Colle le contenu du fichier `.license` reçu (entre les lignes
          BEGIN et END comprises).
        </p>
      </div>

      {status.kind === "ok" && (
        <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          {status.message}
        </div>
      )}
      {status.kind === "err" && (
        <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {status.message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={install}
          disabled={!content.trim() || status.kind === "loading" || envOverride}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
          data-wm-id="setup.license-install"
        >
          {status.kind === "loading" ? "Installation…" : "Installer la license"}
        </button>
        {hasLicense && !envOverride && (
          <button
            type="button"
            onClick={remove}
            disabled={status.kind === "loading"}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-rose-700 border border-rose-300 hover:bg-rose-50 transition-colors"
            data-wm-id="setup.license-remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer la license
          </button>
        )}
      </div>

      <div className="pt-6 border-t border-zinc-200">
        <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-3">
          Comment obtenir une license
        </p>
        <p className="text-sm text-zinc-700 leading-relaxed max-w-2xl">
          GEN MOTION est <strong className="text-zinc-950 font-medium">open
          source MIT</strong>. La Studio Edition débloque les frames 3D, les
          presets Cinematic & Glitch, le multi-format export et la music
          library via un achat one-time (Davinci-style, perpetual license).
          Pour acheter ou obtenir une license d&apos;essai, contacte{" "}
          <a
            href="mailto:contact@smoothandesign.fr"
            className="text-zinc-950 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-950"
          >
            contact@smoothandesign.fr
          </a>
          .
        </p>
      </div>
      {currentEdition === "studio" && hasLicense && (
        <p className="text-xs text-zinc-400">
          Studio Edition active. Toutes les features premium sont
          débloquées.
        </p>
      )}
    </div>
  );
}
