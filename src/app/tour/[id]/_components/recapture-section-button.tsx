"use client";

import { useState } from "react";
import { Loader2, RotateCw } from "lucide-react";

/**
 * Bouton "Recapturer cette section" pour le Capture tab.
 *
 * Sprint UX post-capture · Phase 1.
 *
 * Logique :
 *  - POST /api/motion/tour/recapture/run { tourId, sectionIndex }
 *  - Consume NDJSON streamé
 *  - Affiche le dernier message "log" en tooltip-like sous le bouton
 *    pendant la recapture (~30-60 s par section)
 *  - Sur "done", appelle onDone() pour que le parent reload le manifest
 *  - Sur "error", affiche l'erreur sous le bouton, restaure l'état idle
 *
 * Le composant est volontairement isolé du `capture-tab.tsx` parent
 * pour ne pas alourdir la grid des cards — convention Smooth & Design :
 * quand un composant a un cycle de vie autonome (busy/done/error +
 * streaming), il vit dans son propre fichier.
 */
export default function RecaptureSectionButton({
  tourId,
  sectionIndex,
  onDone,
  variant = "default",
}: {
  tourId: string;
  sectionIndex: number;
  onDone: () => void;
  /** "default" : ligne claire dans la card. "glass" : pastille
   *  blanche translucide pour le contexte dark du lightbox. */
  variant?: "default" | "glass";
}) {
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recapture = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setPhase("Démarrage…");
    try {
      const res = await fetch("/api/motion/tour/recapture/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourId, sectionIndex }),
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
            event.type === "log" &&
            typeof event.message === "string"
          ) {
            const msg = event.message.trim();
            // On garde la dernière ligne de log significative comme phase.
            if (msg.length > 0 && msg.length < 100) setPhase(msg);
          } else if (event.type === "done") {
            success = true;
          } else if (event.type === "error") {
            throw new Error((event.message as string) ?? "Erreur recapture");
          }
        }
      }
      if (!success) throw new Error("Recapture incomplète");
      setBusy(false);
      setPhase(null);
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      setPhase(null);
    }
  };

  const cls =
    variant === "glass"
      ? "inline-flex items-center gap-1.5 text-[11px] font-medium text-white/80 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/15 disabled:opacity-60 disabled:cursor-wait"
      : "inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 transition-colors px-2 py-1 rounded-md hover:bg-slate-100 disabled:opacity-60 disabled:cursor-wait";
  return (
    <>
      <button
        type="button"
        onClick={recapture}
        disabled={busy}
        className={cls}
        title="Recapturer cette section sans recapturer le tour entier"
      >
        {busy ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <RotateCw className="w-3 h-3" />
        )}
        {busy ? "Recapture…" : "Recapturer"}
      </button>
      {busy && phase && (
        <p className="text-[10px] text-slate-400 mt-1 truncate" title={phase}>
          {phase}
        </p>
      )}
      {error && (
        <p className="text-[10px] text-rose-700 mt-1 break-words" title={error}>
          {error}
        </p>
      )}
    </>
  );
}
