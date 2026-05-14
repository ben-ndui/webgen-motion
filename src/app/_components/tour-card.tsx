"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Monitor,
  MoreVertical,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { formatDuration } from "@/lib/format-duration";
import type { TourEntry } from "@/lib/types/tour";
import type { MotionCategory } from "@/lib/motion-categories";

/**
 * Hub tour card — client component because of the quick actions
 * dropdown (delete + future duplicate / export). The whole card is
 * a navigation Link to `/tour/<id>`, except for the ⋯ button which
 * stops propagation so its menu doesn't navigate.
 */
export default function TourCard({
  tour,
  cat,
}: {
  tour: TourEntry;
  cat: MotionCategory | null;
}) {
  const router = useRouter();
  const isPortrait = tour.format === "9:16";

  const firstSection = tour.steps.find(
    (s): s is Extract<typeof s, { type: "section" }> => s.type === "section",
  );
  const accent = cat?.bgColor;

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Click outside → close menu. Confirm modal handles its own click
  // outside via its backdrop.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/motion/tour/${encodeURIComponent(tour.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        setDeleting(false);
        return;
      }
      // Close + refresh the server-side tours list so the card
      // disappears without a full page reload.
      setConfirmOpen(false);
      setDeleting(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="group relative bg-white border border-border rounded-2xl overflow-hidden hover:border-border-strong hover:shadow-lg transition-all duration-200">
        {/* Quick-actions menu — absolute, sits on top of the Link's
         *  bounds. stopPropagation prevents the button click from
         *  bubbling to the Link navigation. */}
        <div className="absolute top-2 right-2 z-10" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="w-7 h-7 rounded-lg bg-white/80 backdrop-blur text-slate-500 hover:text-slate-900 hover:bg-white grid place-items-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            aria-label="Quick actions"
            title="Quick actions"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-9 w-44 rounded-xl border border-slate-200 bg-white shadow-xl py-1 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(false);
                  setConfirmOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer
              </button>
            </div>
          )}
        </div>

        <Link
          data-wm-id="dashboard.tour-card-link"
          data-tour-id={tour.id}
          href={`/tour/${tour.id}`}
          className="block cursor-pointer"
        >
          {/* Cat color accent strip */}
          {accent ? (
            <div className="h-1.5" style={{ backgroundColor: accent }} />
          ) : (
            <div className="h-1.5 bg-slate-200" />
          )}

          <div className="p-5">
            {/* Header row : format chip + arrow */}
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono uppercase tracking-wider">
                {isPortrait ? (
                  <Smartphone className="w-3 h-3" />
                ) : (
                  <Monitor className="w-3 h-3" />
                )}
                {tour.format ?? "16:9"}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
            </div>

            {/* Title + description */}
            <h3 className="text-base font-semibold text-slate-900 leading-tight mb-1 line-clamp-1">
              {tour.name}
            </h3>
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
              {tour.description}
            </p>

            {/* Meta row */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span>{tour.steps.length} steps</span>
              <span>·</span>
              <span>~{formatDuration(tour.estimatedSec)}</span>
              {cat && (
                <>
                  <span>·</span>
                  <span style={{ color: cat.bgColor }}>{cat.label}</span>
                </>
              )}
            </div>
          </div>
        </Link>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !deleting && setConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
                  Supprimer
                </p>
                <h2 className="text-sm font-semibold text-slate-900 leading-tight">
                  Supprimer le tour&nbsp;?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !deleting && setConfirmOpen(false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs leading-relaxed text-slate-700 space-y-1">
              <p>
                <strong>{tour.name}</strong>{" "}
                <code className="text-slate-500 font-mono">({tour.id})</code>
              </p>
              <p className="text-slate-500">
                Le fichier{" "}
                <code className="font-mono">tours/{tour.id}.json</code> sera
                supprimé. Les captures, voix off et clips finaux dans{" "}
                <code className="font-mono">~/.webgen-motion/tours/{tour.id}/</code>{" "}
                restent — supprime-les à la main si tu veux libérer l&apos;espace.
              </p>
            </div>

            {firstSection?.title && (
              <p className="hidden sm:block text-[11px] text-slate-400">
                Première section : {firstSection.title}
              </p>
            )}

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-rose-900">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => !deleting && setConfirmOpen(false)}
                disabled={deleting}
                className="px-3 py-1.5 rounded-full text-xs text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Suppression…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
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
