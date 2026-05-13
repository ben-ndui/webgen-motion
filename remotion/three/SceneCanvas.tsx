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
}: {
  videoSrc: string;
  device: Frame3DDeviceId;
  cameraPreset?: CameraPresetId;
  durationFrames: number;
  width: number;
  height: number;
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
      // Canvas transparent — le 3D flotte par-dessus le compositor
      // backdrop existant (BeatsLayer, transitions, motion design
      // par catégorie). Pas de fond uni qui couvre tout.
      style={{ background: "transparent" }}
      gl={{ alpha: true }}
      camera={{
        position: cam.position,
        fov: cam.fov,
      }}
    >
      {/* Lighting setup — augmenté pour SwiftShader software
       *  rendering (sans GPU les PBR materials paraissent trop
       *  sombres). 3-points classique (key + fill + rim) +
       *  ambient généreux pour ne pas perdre le device dans le
       *  noir. Phase 2 swappera contre un Environment HDRI. */}
      <ambientLight intensity={0.9} />
      <directionalLight
        position={[5, 6, 6]}
        intensity={2.4}
        castShadow
      />
      <directionalLight position={[-4, 3, 2]} intensity={1.2} />
      <directionalLight position={[0, -2, -5]} intensity={0.6} />
      {/* Subtle key light directly facing camera pour lever les
       *  zones d'ombre du body titanium qui se confond avec le
       *  background sombre. */}
      <directionalLight position={[0, 0, 8]} intensity={0.8} />

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
