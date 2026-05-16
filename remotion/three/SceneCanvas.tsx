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
import DuoDevice from "./DuoDevice";
import GLBDevice from "./GLBDevice";
import { resolveCamera, type CameraPresetId } from "./camera-presets";
import { useThree } from "@react-three/fiber";
import { Suspense, useEffect } from "react";

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
export type Frame3DDeviceId = "iphone" | "macbook" | "duo";

export default function SceneCanvas({
  videoSrc,
  device,
  cameraPreset = "hero-tilt",
  durationFrames,
  width,
  height,
  glbPath,
}: {
  videoSrc: string;
  device: Frame3DDeviceId;
  cameraPreset?: CameraPresetId;
  durationFrames: number;
  width: number;
  height: number;
  /** Path d'un GLB Sketchfab optionnel (relatif à public/). Si
   *  fourni, on rend ce GLB au lieu du device procédural. La
   *  validation existence se fait côté compose-tour avant de
   *  passer la prop. */
  glbPath?: string;
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
      {/* Force le scene background à null — sinon SwiftShader laisse
       *  passer un dégradé clair du HDRI Environment même avec
       *  `background={false}`. Doit être set explicitement. */}
      <ForceTransparentBackground />

      {/* HDRI environment uniquement pour les reflections sur le
       *  titanium / glass. background={false} + null fait que le HDRI
       *  ne contribue PAS au render direct du fond, seulement aux
       *  matériaux PBR du device. */}
      <Environment preset="apartment" background={false} />

      {/* Lighting plus chaleureux pour compenser. */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 6, 6]} intensity={1.8} />
      <directionalLight position={[-4, 3, 2]} intensity={0.8} />
      <directionalLight position={[0, 0, 8]} intensity={0.6} />

      <CameraDriver
        position={cam.position}
        lookAt={cam.lookAt}
        fov={cam.fov}
      />

      {/* Wrapper qui applique deviceRotation + devicePosition pour
       *  les presets type cinematic-spin (camera statique, c'est le
       *  device qui danse). Pour les autres presets ces valeurs sont
       *  undefined → wrapper neutre. */}
      <group
        rotation={cam.deviceRotation ?? [0, 0, 0]}
        position={cam.devicePosition ?? [0, 0, 0]}
      >
        {glbPath && device !== "duo" ? (
          <Suspense fallback={null}>
            <GLBDevice
              glbPath={glbPath}
              videoSrc={videoSrc}
              targetHeight={device === "iphone" ? 3.4 : 4}
            />
          </Suspense>
        ) : device === "iphone" ? (
          <IPhoneDevice videoSrc={videoSrc} scale={1} />
        ) : device === "macbook" ? (
          <MacBookDevice videoSrc={videoSrc} scale={1} />
        ) : (
          <DuoDevice videoSrc={videoSrc} />
        )}
      </group>

      {/* Post-process — bloom réduit pour éviter les halos blancs
       *  autour du device (SwiftShader software amplifie les
       *  bordures). Threshold pushé pour ne crame que les vraies
       *  highlights, pas les edges. Vignette + contrast légers. */}
      <EffectComposer>
        <Bloom
          intensity={0.2}
          luminanceThreshold={0.92}
          luminanceSmoothing={0.6}
          mipmapBlur
        />
        <BrightnessContrast brightness={0.0} contrast={0.05} />
        <Vignette eskil={false} offset={0.25} darkness={0.45} />
      </EffectComposer>
    </ThreeCanvas>
  );
}

/** Drive la camera (position + FoV + lookAt) à chaque frame.
 *  Le prop `camera` du ThreeCanvas applique uniquement au mount,
 *  donc pour avoir une animation cinematic (hero-tilt, feature-zoom,
 *  pan-right, flip-reveal) il faut updater per frame. useCurrentFrame
 *  côté parent re-trigger le re-render qui re-trigger ce useEffect. */
function CameraDriver({
  position,
  lookAt,
  fov,
}: {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
}) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(position[0], position[1], position[2]);
    camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
    // PerspectiveCamera a un fov ; on cast pour TS
    if ("fov" in camera) {
      (camera as unknown as { fov: number }).fov = fov;
      (camera as unknown as { updateProjectionMatrix: () => void }).updateProjectionMatrix();
    }
  }, [camera, position, lookAt, fov]);
  return null;
}

/** Force scene.background = null pour vraiment retirer le HDRI du
 *  rendu de fond. Drei Environment `background={false}` n'est pas
 *  toujours respecté par SwiftShader. */
function ForceTransparentBackground() {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = null;
  }, [scene]);
  return null;
}
