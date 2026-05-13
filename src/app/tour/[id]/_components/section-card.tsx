"use client";

import { Download, Expand, GripVertical } from "lucide-react";
import { motion } from "framer-motion";
import { getCategory } from "@/lib/motion-categories";
import RecaptureSectionButton from "./recapture-section-button";
import type { CapturedSection } from "./capture-tab";

/**
 * Une card de section capturée — preview MP4 + meta + actions
 * (recapture, download, drag handle pour reorder).
 *
 * Sprint UX post-capture · Phase 2 (reorder).
 *
 * Extrait de `capture-tab.tsx` parce que la card cumulait trop de
 * responsabilités : hover overlay + footer 2 buttons + drag &
 * drop. Conformément à la règle Smooth & Design "split en
 * composants quand c'est trop dense".
 *
 * Props :
 *  - section : la CapturedSection du manifest
 *  - tourId : pour les routes /api spawn
 *  - idx : index dans la grid (pour stagger animation entry)
 *  - onZoom : ouvre le lightbox fullscreen
 *  - onSectionRecaptured : refetch manifest après recapture
 *  - drag handlers : drag/drop reorder (Phase 2)
 */
export default function SectionCard({
  section,
  tourId,
  idx,
  onZoom,
  onSectionRecaptured,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  section: CapturedSection;
  tourId: string;
  idx: number;
  onZoom: (section: CapturedSection) => void;
  onSectionRecaptured: () => void;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const cat = getCategory(section.categoryId);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: idx * 0.04 }}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative rounded-2xl border bg-white overflow-hidden transition-all ${
        isDragging
          ? "opacity-40 border-slate-300"
          : isDropTarget
            ? "border-zinc-900 ring-2 ring-zinc-900 ring-offset-2"
            : "border-slate-200"
      }`}
    >
      {/* Header : drag handle + meta */}
      <div className="p-2.5 flex items-start gap-2">
        <div
          className="cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5 text-slate-300 hover:text-slate-600 transition-colors"
          title="Glisser pour réorganiser"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {cat && (
              <span
                className="text-[9px] font-mono uppercase tracking-[0.15em] px-1.5 py-0.5 rounded"
                style={{
                  background: cat.bgSubtle,
                  color: cat.fg,
                }}
              >
                {String(section.index).padStart(2, "0")} · {cat.label}
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-slate-900 leading-tight line-clamp-1">
            {section.title}
          </h4>
          {section.subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              {section.subtitle}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-mono text-slate-400">
            <span>{section.durationSec.toFixed(1)}s</span>
            <span>·</span>
            <span>{(section.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
            <span>·</span>
            <span>{section.frames}f</span>
          </div>
        </div>
      </div>

      {/* Video preview — clickable to zoom */}
      <button
        type="button"
        onClick={() => onZoom(section)}
        className="relative group/zoom w-full bg-black block overflow-hidden cursor-zoom-in"
        aria-label="Agrandir la capture"
      >
        <video
          src={section.mp4Url}
          className="w-full block pointer-events-none"
          muted
          preload="metadata"
        />
        <div className="absolute inset-0 bg-black/0 group-hover/zoom:bg-black/30 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover/zoom:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/95 text-zinc-900 text-xs font-medium">
            <Expand className="w-3 h-3" />
            Agrandir
          </span>
        </div>
      </button>

      {/* Footer : recapture + download */}
      <div className="p-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <RecaptureSectionButton
          tourId={tourId}
          sectionIndex={section.index}
          onDone={onSectionRecaptured}
        />
        <a
          href={section.mp4Url}
          download={`webgen-${tourId}-section-${String(section.index).padStart(2, "0")}.mp4`}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 transition-colors px-2 py-1 rounded-md hover:bg-slate-100"
        >
          <Download className="w-3 h-3" />
          MP4
        </a>
      </div>
    </motion.div>
  );
}
