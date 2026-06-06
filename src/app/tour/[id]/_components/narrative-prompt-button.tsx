"use client";

import { useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import type { TourEntry } from "@/lib/types/tour";
import { buildMatchPrompt } from "@/lib/match-prompt";

/**
 * "Copier le prompt" — exports a self-sufficient prompt (timeline +
 * timings + zoom labels) so the user can paste it into Claude and get a
 * narrative that matches the captured video. Closes the script ↔ vidéo
 * loop without leaving the editor.
 */
export default function NarrativePromptButton({ tour }: { tour: TourEntry }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildMatchPrompt(tour));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions) — no-op.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      data-wm-id="voice.copy-match-prompt"
      title="Copie un prompt prêt à coller dans Claude pour matcher le script à la vidéo"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-2 text-ink-soft text-xs font-medium hover:bg-bg-sunken transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-accent" />
          Prompt copié
        </>
      ) : (
        <>
          <ClipboardCopy className="w-3.5 h-3.5" />
          Copier le prompt
        </>
      )}
    </button>
  );
}
