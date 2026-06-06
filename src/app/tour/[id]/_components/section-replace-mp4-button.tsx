"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

/**
 * Bouton "Upload MP4" pour remplacer le contenu vidéo d'une section
 * par un fichier custom (screen recording externe, B-roll, etc.).
 *
 * Sprint UX post-capture · Phase 4.
 *
 * UX :
 *  - Click → ouvre le file picker natif
 *  - Sélection → upload via multipart/form-data, busy state
 *  - Réussite → call onDone() pour refresh le manifest
 *  - Erreur → message inline sous le bouton
 *
 * Le composant est isolé dans son propre fichier (règle Smooth &
 * Design "split quand dense"). Il porte sa logique de upload +
 * son state de erreur/busy autonomement.
 */
export default function SectionReplaceMp4Button({
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
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (busy) return;
    fileRef.current?.click();
  };

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so re-selecting the same file fires onChange again
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("tourId", tourId);
      form.append("sectionIndex", String(sectionIndex));
      form.append("file", file);
      const res = await fetch("/api/motion/tour/replace-section/run", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/quicktime,video/*"
        onChange={onChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        title="Remplacer le MP4 de cette section par un fichier perso"
        className={
          variant === "glass"
            ? "inline-flex items-center gap-1.5 text-[11px] font-medium text-bg/80 hover:text-bg transition-colors px-3 py-1.5 rounded-full hover:bg-surface/15 disabled:opacity-60 disabled:cursor-wait"
            : "inline-flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-ink transition-colors px-2 py-1 rounded-md hover:bg-surface-2 disabled:opacity-60 disabled:cursor-wait"
        }
      >
        {busy ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Upload className="w-3 h-3" />
        )}
        {busy ? "Upload…" : "Upload"}
      </button>
      {error && (
        <p
          className="text-[10px] text-rose-700 mt-1 break-words w-full"
          title={error}
        >
          {error}
        </p>
      )}
    </>
  );
}
