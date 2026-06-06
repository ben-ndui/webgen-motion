"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Trash2, X } from "lucide-react";

/**
 * Quick-actions menu for a Hub tour card — kebab dropdown + delete with
 * confirm modal. Restores the actions lost when the card was rebuilt on
 * the handoff layout. stopPropagation/preventDefault keep clicks from
 * triggering the card's <Link> navigation.
 */
export default function TourCardMenu({
  tourId,
  tourName,
}: {
  tourId: string;
  tourName: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/motion/tour/${encodeURIComponent(tourId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        setDeleting(false);
        return;
      }
      setConfirmOpen(false);
      setDeleting(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setDeleting(false);
    }
  };

  return (
    <div ref={ref} className="relative" data-wm-id="hub.card.actions">
      <button
        type="button"
        className="kebab"
        aria-label="Actions du tour"
        title="Actions"
        onClick={(e) => {
          stop(e);
          setMenuOpen((v) => !v);
        }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16}>
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 top-9 z-20 w-44 rounded-md border border-line bg-surface shadow-pop py-1"
          onClick={stop}
        >
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              setMenuOpen(false);
              setConfirmOpen(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[oklch(55%_0.16_25)] hover:bg-surface-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </button>
        </div>
      )}

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            stop(e);
            if (!deleting) setConfirmOpen(false);
          }}
        >
          <div
            className="bg-surface rounded-xl shadow-pop border border-line w-full max-w-sm p-5 space-y-4"
            onClick={stop}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">Supprimer</p>
                <h2 className="text-sm font-semibold text-ink leading-tight">Supprimer le tour&nbsp;?</h2>
              </div>
              <button type="button" onClick={(e) => { stop(e); if (!deleting) setConfirmOpen(false); }} className="text-faint hover:text-ink" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-md bg-bg-sunken border border-line p-3 text-xs leading-relaxed text-ink-soft space-y-1">
              <p><strong>{tourName}</strong> <code className="text-muted font-mono">({tourId})</code></p>
              <p className="text-muted">
                Le fichier <code className="font-mono">tours/{tourId}.json</code> sera supprimé. Les captures, voix off et clips finaux dans <code className="font-mono">~/.webgen-motion/tours/{tourId}/</code> restent.
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-[oklch(60%_0.14_25_/_0.4)] bg-[oklch(95%_0.04_25_/_0.5)] p-2.5 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[oklch(52%_0.16_25)] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-ink">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={(e) => { stop(e); if (!deleting) setConfirmOpen(false); }} disabled={deleting} className="px-3 py-1.5 rounded-md text-xs text-muted hover:bg-surface-2 transition-colors disabled:opacity-50">Annuler</button>
              <button type="button" onClick={(e) => { stop(e); handleDelete(); }} disabled={deleting} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[oklch(55%_0.16_25)] text-white text-xs font-medium hover:opacity-90 transition disabled:opacity-60">
                {deleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Suppression…</> : <><Trash2 className="w-3.5 h-3.5" />Supprimer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
