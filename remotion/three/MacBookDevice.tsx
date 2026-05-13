"use client";

import { useVideoTexture } from "@remotion/three";

/**
 * MacBook procedural 3D pour les compositions Sprint 7.
 *
 * Silhouette : base aluminium + hinge fin + screen panel ouvert à
 * ~100° (angle réaliste d'un laptop ouvert sur un bureau). Le screen
 * plane reçoit le MP4 de la section via `useVideoTexture`.
 *
 * Ratio 16:10 sur le screen (matche MacBook Air 13"). Pas de GLB
 * — primitives R3F. Phase 2 swappera contre un vrai modèle 3D pour
 * plus de détail (clavier, trackpad, ports, etc.).
 *
 * Le device est centré sur la base. La camera doit cibler le
 * milieu du screen pour un cadrage propre (cf. camera-presets).
 */
export default function MacBookDevice({
  videoSrc,
  scale = 1,
}: {
  videoSrc: string;
  scale?: number;
}) {
  // Dimensions logiques. Base 4 × 2.6 × 0.1 unités, screen 4 × 2.5.
  const baseWidth = 4;
  const baseDepth = 2.6;
  const baseHeight = 0.12;
  const screenWidth = 4;
  const screenHeight = 2.5;
  const screenThickness = 0.07;
  // Angle d'ouverture (radians). 100° donne un look "laptop ouvert sur
  // bureau" naturel.
  const openAngle = (100 * Math.PI) / 180;

  const videoTexture = useVideoTexture(videoSrc);

  return (
    <group scale={scale}>
      {/* Base aluminium */}
      <mesh position={[0, -baseHeight / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[baseWidth, baseHeight, baseDepth]} />
        <meshStandardMaterial
          color="#d4d4d8"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Trackpad — subtle dimple sur la base */}
      <mesh position={[0, 0.001, baseDepth / 2 - 0.7]}>
        <boxGeometry args={[1.6, 0.005, 1.1]} />
        <meshStandardMaterial
          color="#bbb"
          metalness={0.4}
          roughness={0.45}
        />
      </mesh>

      {/* Screen group — pivoté sur la hinge (bord arrière de la base) */}
      <group
        position={[0, 0, -baseDepth / 2]}
        rotation={[-(Math.PI - openAngle), 0, 0]}
      >
        {/* Screen panel — son origine est le bord bas, donc on offset
         *  vers le haut pour que la rotation pivote sur la hinge. */}
        <group position={[0, screenHeight / 2, -screenThickness / 2]}>
          {/* Back of screen (aluminium) */}
          <mesh receiveShadow castShadow>
            <boxGeometry
              args={[screenWidth, screenHeight, screenThickness]}
            />
            <meshStandardMaterial
              color="#d4d4d8"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          {/* Bezel + screen plane (vidéo) */}
          <mesh position={[0, 0, screenThickness / 2 + 0.001]}>
            <planeGeometry
              args={[screenWidth - 0.18, screenHeight - 0.22]}
            />
            <meshBasicMaterial map={videoTexture} toneMapped={false} />
          </mesh>
          {/* Notch — minimal au centre haut */}
          <mesh
            position={[
              0,
              screenHeight / 2 - 0.08,
              screenThickness / 2 + 0.002,
            ]}
          >
            <boxGeometry args={[0.5, 0.07, 0.005]} />
            <meshStandardMaterial color="#000" roughness={0.4} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
