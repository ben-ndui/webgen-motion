"use client";

import { useMemo } from "react";
import { useOffthreadVideoTexture } from "@remotion/three";
import * as THREE from "three";

/**
 * iPhone procedural 3D pour les compositions Sprint 7.
 *
 * Pas de GLB externe — on construit la silhouette avec des box +
 * cylinder + cone primitives R3F. Ratio 9:16 = ratio iPhone 15 Pro.
 * Le screen plane reçoit le MP4 de la section via `useVideoTexture`.
 *
 * Materials : titanium-style frame (PBR metalness + roughness)
 * pour le body, glass-style pour le verre devant l'écran. Légère
 * specular sur les bords arrondis pour le wow.
 *
 * Phase 2 swappera ces primitives contre un vrai GLB iPhone 15 Pro
 * (Sketchfab gratuit ou achat ~$30). Pour V1 procédural suffit pour
 * valider l'architecture + un look propre.
 */
export default function IPhoneDevice({
  videoSrc,
  scale = 1,
}: {
  videoSrc: string;
  scale?: number;
}) {
  // Dimensions logiques (sans le scale). On part d'une hauteur de
  // 3 unités R3F pour le body, ratio 9:16 → largeur 1.7. Le bezel
  // visible = body - 0.1 unités de chaque côté.
  const bodyWidth = 1.7;
  const bodyHeight = 3.4;
  const bodyDepth = 0.08;
  const cornerRadius = 0.22;

  const screenWidth = bodyWidth - 0.14;
  const screenHeight = bodyHeight - 0.14;

  // Video texture sur le screen plane. useOffthreadVideoTexture
  // accepte un src direct et participe au pipeline offthread de
  // Remotion (frame-accurate sans glitch). Indispensable pour
  // que la texture suive currentFrame pendant le render.
  const videoTexture = useOffthreadVideoTexture({ src: videoSrc });

  // Body geometry — rounded box approx via une box + corners adoucis.
  // ExtrudeGeometry sur une shape rounded donne le look "Pro" sans
  // GLB. Cached via useMemo pour ne pas reconstruire à chaque frame.
  const bodyGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const w = bodyWidth / 2;
    const h = bodyHeight / 2;
    const r = cornerRadius;
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);
    return new THREE.ExtrudeGeometry(shape, {
      depth: bodyDepth,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 4,
    });
  }, [bodyWidth, bodyHeight, bodyDepth, cornerRadius]);

  return (
    <group scale={scale}>
      {/* Body — titanium dark, légère metalness */}
      <mesh geometry={bodyGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#2a2a2c"
          metalness={0.85}
          roughness={0.35}
        />
      </mesh>

      {/* Screen — plane positionnée devant le body, vidéo en texture */}
      <mesh position={[0, 0, bodyDepth + 0.001]}>
        <planeGeometry args={[screenWidth, screenHeight]} />
        <meshBasicMaterial map={videoTexture} toneMapped={false} />
      </mesh>

      {/* Glass overlay — subtle reflective layer devant la vidéo */}
      <mesh position={[0, 0, bodyDepth + 0.002]}>
        <planeGeometry args={[screenWidth, screenHeight]} />
        <meshPhysicalMaterial
          transparent
          opacity={0.05}
          roughness={0.05}
          metalness={0}
          transmission={0.95}
        />
      </mesh>

      {/* Dynamic Island — petite pill noire en haut */}
      <mesh position={[0, bodyHeight / 2 - 0.22, bodyDepth + 0.003]}>
        <boxGeometry args={[0.46, 0.13, 0.005]} />
        <meshStandardMaterial color="#000" roughness={0.4} metalness={0.1} />
      </mesh>
    </group>
  );
}
