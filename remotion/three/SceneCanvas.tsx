"use client";

import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import IPhoneDevice from "./iPhoneDevice";
import MacBookDevice from "./MacBookDevice";
import { resolveCamera, type CameraPresetId } from "./camera-presets";

/**
 * Scene wrapper qui assemble device + lighting + camera animée.
 * Utilisé par SectionPlayer quand `composeStyle` / `frame3d` opt-in
 * et que le flag `frames-3d` est activé (Studio Edition).
 *
 * Sprint 7 phase 1 — version procédurale (pas de GLB), Three.js
 * basic lighting. Phase 2 ajoutera env map (chrome/studio lighting
 * realistic) + post-process (bloom, AO).
 */
export type Frame3DDeviceId = "iphone" | "macbook";

export default function SceneCanvas({
  videoSrc,
  device,
  cameraPreset = "hero-tilt",
  durationFrames,
  width,
  height,
  backdrop = "#0a0a0a",
}: {
  videoSrc: string;
  device: Frame3DDeviceId;
  cameraPreset?: CameraPresetId;
  durationFrames: number;
  width: number;
  height: number;
  /** Couleur de fond derrière le device. Slightly off-black par
   *  défaut, on peut overrider par catégorie. */
  backdrop?: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Progress 0..1 sur la durée de la section. Clamp pour rester
  // dans [0, 1] même si la composition étend le rendu pendant les
  // crossfades.
  const progress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cam = resolveCamera(cameraPreset, progress);

  return (
    <ThreeCanvas
      width={width}
      height={height}
      style={{ background: backdrop }}
      camera={{
        position: cam.position,
        fov: cam.fov,
      }}
    >
      {/* Lighting setup — key light + fill + rim pour donner du
       *  volume au device. Sprint 7 phase 2 swappera contre un
       *  Environment (HDRI studio) pour des reflections vraies. */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[5, 6, 6]}
        intensity={1.4}
        castShadow
      />
      <directionalLight position={[-4, 3, 2]} intensity={0.7} />
      <directionalLight position={[0, -2, -5]} intensity={0.45} />

      {/* Camera target — on bouge le lookAt via key prop pour forcer
       *  Three à reset l'orientation. Pas idéal mais simple. */}
      <CameraTarget lookAt={cam.lookAt} />

      {/* Device */}
      {device === "iphone" && (
        <IPhoneDevice videoSrc={videoSrc} scale={1} />
      )}
      {device === "macbook" && (
        <MacBookDevice videoSrc={videoSrc} scale={1} />
      )}
    </ThreeCanvas>
  );
}

/** Petit helper qui re-oriente la caméra active vers `lookAt`. R3F
 *  ne nous donne pas ça par défaut côté <ThreeCanvas> ; on accède
 *  à la caméra via useThree. */
function CameraTarget({ lookAt }: { lookAt: [number, number, number] }) {
  return (
    <Reorient lookAt={lookAt} />
  );
}

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

function Reorient({ lookAt }: { lookAt: [number, number, number] }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
  }, [camera, lookAt]);
  return null;
}
