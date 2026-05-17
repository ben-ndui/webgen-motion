"use client";

import { useEffect, useState } from "react";
import { Box, Lock, Smartphone } from "lucide-react";
import type { TourEntry } from "@/lib/types/tour";

/**
 * Sélecteur frame3d + camera preset pour le Compose tab.
 * Sprint 7 phase 1 — UI gating Studio.
 *
 * 3 choix de device :
 *  - 2D (default Community) — pas de 3D, frame Mac chrome / iPhone 2D
 *  - iPhone 3D (Studio) — render via R3F + iPhone procédural
 *  - MacBook 3D (Studio) — render via R3F + MacBook procédural
 *
 * 5 camera presets (visible quand 3D actif) :
 * hero-tilt / feature-zoom / pan-right / flip-reveal / static-front.
 *
 * Gating : si Community Edition, les options 3D sont cliquables
 * (on stocke la valeur dans le tour pour quand l'utilisateur
 * upgradera) mais avec un badge "Studio" + tooltip explicatif.
 * Côté server, compose-tour applique le feature flag check :
 * Community fallback silencieux sur 2D.
 */

type Frame3DId = "iphone" | "macbook";
type CameraPresetId =
  | "hero-tilt"
  | "feature-zoom"
  | "pan-right"
  | "flip-reveal"
  | "static-front"
  | "cinematic-spin";

const CAMERA_PRESETS: Array<{ id: CameraPresetId; label: string; hint: string }> = [
  { id: "cinematic-spin", label: "Cinematic spin", hint: "Face → 3/4 droite → drift → 3/4 gauche · le device danse, camera fixe" },
  { id: "hero-tilt", label: "Hero tilt", hint: "Tilt down subtil 3/4, style showcase Apple" },
  { id: "feature-zoom", label: "Feature zoom", hint: "Pull-in qui rapproche l'écran" },
  { id: "pan-right", label: "Pan right", hint: "Caméra slide horizontale" },
  { id: "flip-reveal", label: "Flip reveal", hint: "Rotation 90° autour du device" },
  { id: "static-front", label: "Statique", hint: "Caméra fixe face au device" },
];

export default function Frame3DSelector({
  tour,
  onTourChange,
}: {
  tour: TourEntry;
  onTourChange: (next: TourEntry) => void;
}) {
  const [edition, setEdition] = useState<
    "community" | "studio" | "enterprise"
  >("community");

  useEffect(() => {
    fetch("/api/motion/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((c: { edition?: typeof edition } | null) => {
        if (c?.edition) setEdition(c.edition);
      })
      .catch(() => {});
  }, []);

  const isStudio = edition === "studio" || edition === "enterprise";
  const activeFrame3d = tour.frame3d ?? null;
  const activeCameraPreset = tour.cameraPreset3d ?? "hero-tilt";

  const setFrame3d = (frame: Frame3DId | null) => {
    if (frame === null) {
      const { frame3d: _f, cameraPreset3d: _c, ...rest } = tour;
      onTourChange(rest as TourEntry);
    } else {
      onTourChange({
        ...tour,
        frame3d: frame,
        cameraPreset3d: tour.cameraPreset3d ?? "hero-tilt",
      });
    }
  };

  return (
    <div className="space-y-2" data-wm-id="compose.frame3d-selector">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase tracking-wider font-mono text-slate-500 block">
          Device frame
        </label>
        <div className="flex items-center gap-1">
          <span
            className="text-[9px] uppercase tracking-wider font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"
            title="Frames 3D = preview expérimental. Bug connu : rotation parasite de l'iPhone à certains timestamps/sections (root cause non identifiée après diagnostic Sprint 8). Recommandé : fallback 2D pour usage production. Polish en sprint futur."
          >
            3D Beta
          </span>
          {!isStudio && (
            <span
              className="text-[9px] uppercase tracking-wider font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
              title="Les frames 3D sont gated en Studio Edition. Tu peux activer la valeur (elle reste sauvegardée) mais le compose fallback sur le frame 2D classique tant que l'edition n'est pas débloquée."
            >
              Studio gated
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <FrameOption
          active={activeFrame3d === null}
          onClick={() => setFrame3d(null)}
          label="2D"
          hint="Mac chrome / iPhone 2D"
          icon={<Box className="w-3 h-3" />}
          locked={false}
        />
        <FrameOption
          active={activeFrame3d === "iphone"}
          onClick={() => setFrame3d("iphone")}
          label="iPhone 3D"
          hint={
            isStudio
              ? "iPhone procédural R3F — ⚠ beta, rotation parasite à certains frames"
              : "Studio Edition + beta 3D — fallback 2D en Community"
          }
          icon={<Smartphone className="w-3 h-3" />}
          locked={!isStudio}
        />
        <FrameOption
          active={activeFrame3d === "macbook"}
          onClick={() => setFrame3d("macbook")}
          label="MacBook 3D"
          hint={
            isStudio
              ? "MacBook procédural R3F — ⚠ beta, screen orientation reverse"
              : "Studio Edition + beta 3D — fallback 2D en Community"
          }
          icon={<Box className="w-3 h-3" />}
          locked={!isStudio}
        />
      </div>

      {activeFrame3d && (
        <div className="space-y-1 pt-1">
          <label className="text-[10px] uppercase tracking-wider font-mono text-slate-500 block">
            Camera preset
          </label>
          <select
            data-wm-id="compose.camera-preset"
            value={activeCameraPreset}
            onChange={(e) =>
              onTourChange({
                ...tour,
                cameraPreset3d: e.target.value as CameraPresetId,
              })
            }
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
          >
            {CAMERA_PRESETS.map((p) => (
              <option key={p.id} value={p.id} title={p.hint}>
                {p.label}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            {CAMERA_PRESETS.find((p) => p.id === activeCameraPreset)?.hint}
          </p>
        </div>
      )}
    </div>
  );
}

function FrameOption({
  active,
  onClick,
  label,
  hint,
  icon,
  locked,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
  icon: React.ReactNode;
  locked: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className={`relative inline-flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg border text-[10px] font-medium transition-colors ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span className="flex items-center gap-1">
        {icon}
        {label}
      </span>
      {locked && (
        <span
          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white grid place-items-center"
          title="Studio Edition"
        >
          <Lock className="w-2 h-2" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
