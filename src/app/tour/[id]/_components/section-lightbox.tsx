"use client";

import { Download, Scissors, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import RecaptureSectionButton from "./recapture-section-button";
import SectionReplaceMp4Button from "./section-replace-mp4-button";
import SectionTrimControls from "./section-trim-controls";
import type { CapturedSection } from "./capture-tab";

/**
 * Lightbox fullscreen pour zoom une capture de section.
 *
 * Les mêmes actions que la card (Recapturer / Upload / Trim /
 * Download) sont accessibles ici — ergonomie : quand on est en
 * train d'examiner une capture en grand, on veut pouvoir agir
 * dessus sans devoir fermer la modale d'abord.
 *
 * Cycle de vie autonome (ESC, click-out, autoplay). Le panel
 * trim s'ouvre EN DESSOUS de la vidéo dans le modal (et non
 * partout dans la grille), donc on doit lever ses limites de
 * largeur.
 */
export default function SectionLightbox({
  section,
  tourId,
  onClose,
  onSectionUpdated,
}: {
  section: CapturedSection | null;
  tourId: string;
  onClose: () => void;
  /** Appelé quand une action (recapture / upload / trim) a modifié
   *  le manifest. Le parent doit refetch les sections pour mettre
   *  à jour la modale qui reste ouverte. */
  onSectionUpdated: () => void;
}) {
  const [trimOpen, setTrimOpen] = useState(false);
  // Render into <body> via a portal so the fixed inset-0 backdrop covers
  // the WHOLE app — otherwise a transformed ancestor (framer-motion
  // wrappers, .route-fade) becomes the containing block and confines the
  // overlay to the editor content area instead of the viewport.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!section) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [section, onClose]);
  // Reset trim open state when the section changes (e.g. user
  // navigates between captures via keyboard / parent).
  useEffect(() => {
    if (!section) setTrimOpen(false);
  }, [section]);

  if (!mounted) return null;
  if (!section) {
    return createPortal(<AnimatePresence />, document.body);
  }
  const hasTrim =
    section.trimStartSec !== undefined || section.trimEndSec !== undefined;
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto"
        onClick={onClose}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-surface/10 hover:bg-surface/20 text-bg transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col my-auto mx-auto w-fit max-w-[95vw]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="text-bg mb-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-bg/60">
              Section {String(section.index).padStart(2, "0")} ·{" "}
              {section.categoryId}
            </p>
            <h3 className="text-lg font-semibold mt-0.5">{section.title}</h3>
            {section.subtitle && (
              <p className="text-sm text-bg/70 mt-0.5">{section.subtitle}</p>
            )}
          </div>

          {/* Video — controls natifs intacts, pas d'overlay qui gêne
           *  la timeline. */}
          <video
            src={section.mp4Url}
            controls
            autoPlay
            className="w-auto h-[82vh] max-w-[95vw] object-contain bg-black rounded-2xl shadow-2xl"
          />

          {/* Liquid pill action bar — sous la vidéo, fond sombre
           *  semi-transparent + border white/15 + inner highlight,
           *  shadow ambient pour la profondeur. Pas de backdrop-blur
           *  ici (le fond modal est déjà uniforme bg-black/90, il
           *  n'y a rien à flouter — on simule le verre par les
           *  bordures + shadows). */}
          <div className="mt-3 mx-auto max-w-fit">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-surface/[0.07] border border-white/15 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12)]">
              {/* Stats pill */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono">
                <span className="text-bg">
                  {section.durationSec.toFixed(1)}s
                </span>
                <span className="text-bg/30">·</span>
                <span className="text-bg">
                  {(section.sizeBytes / 1024 / 1024).toFixed(1)} MB
                </span>
                <span className="text-bg/30">·</span>
                <span className="text-bg">{section.frames}f</span>
              </div>
              <span className="hidden sm:block w-px h-4 bg-surface/15" />
              {/* Actions — liquid pill buttons */}
              <div className="flex items-center gap-1">
                <RecaptureSectionButton
                  tourId={tourId}
                  sectionIndex={section.index}
                  onDone={onSectionUpdated}
                  variant="glass"
                />
                <SectionReplaceMp4Button
                  tourId={tourId}
                  sectionIndex={section.index}
                  onDone={onSectionUpdated}
                  variant="glass"
                />
                <button
                  type="button"
                  onClick={() => setTrimOpen((v) => !v)}
                  className={`inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors px-3 py-1.5 rounded-full ${
                    trimOpen
                      ? "bg-surface text-ink"
                      : hasTrim
                        ? "bg-surface/20 text-bg hover:bg-surface/30"
                        : "text-bg/80 hover:text-bg hover:bg-surface/15"
                  }`}
                  title={
                    hasTrim
                      ? "Trim actif — click pour modifier"
                      : "Trim in/out"
                  }
                >
                  <Scissors className="w-3 h-3" />
                  {hasTrim ? "Trim ✓" : "Trim"}
                </button>
                <a
                  href={section.mp4Url}
                  download={`webgen-${tourId}-section-${String(section.index).padStart(2, "0")}.mp4`}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-bg/80 hover:text-bg hover:bg-surface/15 transition-colors px-3 py-1.5 rounded-full"
                >
                  <Download className="w-3 h-3" />
                  MP4
                </a>
              </div>
            </div>
          </div>

          {/* Trim panel — slides in under the video when open */}
          {trimOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 bg-surface rounded-2xl overflow-hidden shadow-2xl"
            >
              <SectionTrimControls
                tourId={tourId}
                sectionIndex={section.index}
                mp4Url={section.mp4Url}
                capturedDurationSec={section.durationSec}
                initialTrimStartSec={section.trimStartSec}
                initialTrimEndSec={section.trimEndSec}
                onSaved={onSectionUpdated}
                onClose={() => setTrimOpen(false)}
              />
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
