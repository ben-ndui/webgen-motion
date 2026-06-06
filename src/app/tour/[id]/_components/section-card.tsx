"use client";

import { Download, Expand, GripVertical, Scissors } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { getCategory } from "@/lib/motion-categories";
import RecaptureSectionButton from "./recapture-section-button";
import SectionReplaceMp4Button from "./section-replace-mp4-button";
import SectionTrimControls from "./section-trim-controls";
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
  const [trimOpen, setTrimOpen] = useState(false);
  const hasTrim =
    section.trimStartSec !== undefined || section.trimEndSec !== undefined;
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
      className={`group relative rounded-2xl border bg-surface overflow-hidden transition-all ${
        isDragging
          ? "opacity-40 border-line-strong"
          : isDropTarget
            ? "border-accent ring-2 ring-accent ring-offset-2"
            : "border-line"
      }`}
    >
      {/* Header : drag handle + meta */}
      <div className="p-2.5 flex items-start gap-2">
        <div
          className="cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5 text-faint hover:text-muted transition-colors"
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
                  background: `${cat.bgColor}15`,
                  color: cat.bgColor,
                }}
              >
                {String(section.index).padStart(2, "0")} · {cat.label}
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-ink leading-tight line-clamp-1">
            {section.title}
          </h4>
          {section.subtitle && (
            <p className="text-xs text-muted mt-0.5 line-clamp-1">
              {section.subtitle}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-mono text-faint">
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
          <span className="opacity-0 group-hover/zoom:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface/95 text-ink text-xs font-medium">
            <Expand className="w-3 h-3" />
            Agrandir
          </span>
        </div>
      </button>

      {/* Footer : recapture + trim toggle + download */}
      <div className="p-2.5 border-t border-line-soft flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          <RecaptureSectionButton
            tourId={tourId}
            sectionIndex={section.index}
            onDone={onSectionRecaptured}
          />
          <SectionReplaceMp4Button
            tourId={tourId}
            sectionIndex={section.index}
            onDone={onSectionRecaptured}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTrimOpen((v) => !v);
            }}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors px-2 py-1 rounded-md ${
              trimOpen
                ? "bg-ink text-bg hover:opacity-90"
                : hasTrim
                  ? "text-ink bg-surface-2 hover:bg-bg-sunken"
                  : "text-muted hover:text-ink hover:bg-surface-2"
            }`}
            title={hasTrim ? "Trim actif — click pour modifier" : "Trim in/out"}
          >
            <Scissors className="w-3 h-3" />
            {hasTrim ? "Trim ✓" : "Trim"}
          </button>
        </div>
        <a
          href={section.mp4Url}
          download={`webgen-${tourId}-section-${String(section.index).padStart(2, "0")}.mp4`}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-ink transition-colors px-2 py-1 rounded-md hover:bg-surface-2"
        >
          <Download className="w-3 h-3" />
          MP4
        </a>
      </div>
      {trimOpen && (
        <SectionTrimControls
          tourId={tourId}
          sectionIndex={section.index}
          mp4Url={section.mp4Url}
          capturedDurationSec={section.durationSec}
          initialTrimStartSec={section.trimStartSec}
          initialTrimEndSec={section.trimEndSec}
          onSaved={onSectionRecaptured}
          onClose={() => setTrimOpen(false)}
        />
      )}
    </motion.div>
  );
}
