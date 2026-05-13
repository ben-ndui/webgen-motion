"use client";

import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { Environment } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  BrightnessContrast,
} from "@react-three/postprocessing";
import IPhoneDevice from "./iPhoneDevice";
import MacBookDevice from "./MacBookDevice";
import { resolveCamera, type CameraPresetId } from "./camera-presets";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/**
 * Scene wrapper qui assemble device + lighting + camera animée +
 * post-processing. Sprint 7 phase 2 : on passe d'un setup basique
 * (3 directionalLights, no env map) à un studio look :
 *  - Environment HDRI "studio" via drei → reflections vraies sur
 *    le titanium body + glass screen
 *  - Bloom modéré pour faire luire les edges
 *  - Vignette subtle pour cadrer l'attention
 *  - BrightnessContrast pour booster le contrast du software
 *    rendering SwiftShader
 *
 * Phase 3 ajoutera : real GLBs (drop-in via public/models/),
 * multi-device scene, ambient occlusion + DOF.
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
  void fps;

  const progress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cam = resolveCamera(cameraPreset, progress);

  return (
    <ThreeCanvas
      width={width}
      height={height}
      style={{ background: "transparent" }}
      gl={{ alpha: true, antialias: true }}
      camera={{
        position: cam.position,
        fov: cam.fov,
      }}
    >
      {/* HDRI environment — apporte reflections vraies sur titanium
       *  + glass. Preset "studio" = lighting trois-points équivalent
       *  professionnel sans avoir à set ses propres lights. */}
      <Environment preset="studio" background={false} />

      {/* Subtle direct lights pour creuser le volume — l'env map
       *  donne le base lighting + reflections, ces directionals
       *  ajoutent du modeling. */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 6, 6]} intensity={1.2} />
      <directionalLight position={[-4, 3, 2]} intensity={0.5} />

      <CameraTarget lookAt={cam.lookAt} />

      {device === "iphone" && (
        <IPhoneDevice videoSrc={videoSrc} scale={1} />
      )}
      {device === "macbook" && (
        <MacBookDevice videoSrc={videoSrc} scale={1} />
      )}

      {/* Post-process — bloom modéré sur les highlights (edges
       *  du device, screen glow) + vignette pour cadrer l'attention
       *  + contrast bump pour compenser le rendering software un
       *  peu plat de SwiftShader. */}
      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
        <BrightnessContrast brightness={0.02} contrast={0.08} />
        <Vignette eskil={false} offset={0.18} darkness={0.55} />
      </EffectComposer>
    </ThreeCanvas>
  );
}

function CameraTarget({ lookAt }: { lookAt: [number, number, number] }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
  }, [camera, lookAt]);
  return null;
}
