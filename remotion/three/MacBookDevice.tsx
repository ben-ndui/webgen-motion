"use client";

import { useOffthreadVideoTexture } from "@remotion/three";
import { useMemo } from "react";

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

  const videoTexture = useOffthreadVideoTexture({ src: videoSrc });

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

      {/* Trackpad — vitre sombre légèrement renfoncée */}
      <mesh position={[0, 0.005, baseDepth / 2 - 0.7]}>
        <boxGeometry args={[1.7, 0.01, 1.15]} />
        <meshStandardMaterial
          color="#1d1d1f"
          metalness={0.3}
          roughness={0.25}
        />
      </mesh>

      {/* Keyboard area — fond noir + grille de touches */}
      <mesh position={[0, 0.005, -0.55]}>
        <boxGeometry args={[3.6, 0.008, 1.1]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.6} metalness={0.1} />
      </mesh>
      <KeyboardGrid />

      {/* Ports USB-C — 2 à gauche, 1 à droite (MagSafe simulated)
       *  + jack 3.5mm. Ces côtés ne sont visibles qu'avec pan-right
       *  ou flip-reveal mais ajoutent du détail au look. */}
      <mesh position={[-baseWidth / 2 - 0.001, -baseHeight / 2, 0.3]}>
        <boxGeometry args={[0.005, 0.04, 0.18]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-baseWidth / 2 - 0.001, -baseHeight / 2, 0]}>
        <boxGeometry args={[0.005, 0.04, 0.18]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[baseWidth / 2 + 0.001, -baseHeight / 2, 0]}>
        <boxGeometry args={[0.005, 0.04, 0.18]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.5} roughness={0.4} />
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

/** Grille de touches du clavier MacBook — 6 rangées × 15 colonnes
 *  d'instances de petits cubes noirs. Pas une vraie réplique mais
 *  donne l'impression d'un clavier de loin. */
function KeyboardGrid() {
  const keys = useMemo(() => {
    const list: Array<[number, number]> = [];
    const cols = 15;
    const rows = 5;
    const colGap = 0.21;
    const rowGap = 0.16;
    const xStart = -((cols - 1) * colGap) / 2;
    const zStart = -0.55 - ((rows - 1) * rowGap) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        list.push([xStart + c * colGap, zStart + r * rowGap]);
      }
    }
    return list;
  }, []);
  return (
    <group position={[0, 0.013, 0]}>
      {keys.map(([x, z], i) => (
        <mesh key={i} position={[x, 0, z]}>
          <boxGeometry args={[0.16, 0.008, 0.13]} />
          <meshStandardMaterial
            color="#2a2a2c"
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}
