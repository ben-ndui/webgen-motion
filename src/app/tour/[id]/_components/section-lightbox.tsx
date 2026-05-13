"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import type { CapturedSection } from "./capture-tab";

/**
 * Lightbox fullscreen pour zoom une capture de section.
 *
 * Extrait de `capture-tab.tsx` pour alléger ce fichier — la modale
 * a son cycle de vie autonome (ESC, click-out, autoplay).
 */
export default function SectionLightbox({
  section,
  onClose,
}: {
  section: CapturedSection | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!section) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [section, onClose]);

  return (
    <AnimatePresence>
      {section && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-6xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-white mb-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                Section {String(section.index).padStart(2, "0")} ·{" "}
                {section.categoryId}
              </p>
              <h3 className="text-lg font-semibold mt-0.5">{section.title}</h3>
              {section.subtitle && (
                <p className="text-sm text-white/70 mt-0.5">
                  {section.subtitle}
                </p>
              )}
            </div>
            <video
              src={section.mp4Url}
              controls
              autoPlay
              className="w-full bg-black rounded-lg shadow-2xl"
            />
            <div className="text-xs text-white/50 mt-3 font-mono flex items-center gap-2">
              <span>{section.durationSec.toFixed(1)}s</span>
              <span>·</span>
              <span>{(section.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
              <span>·</span>
              <span>{section.frames}f</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
