"use client";

import IPhoneDevice from "./iPhoneDevice";
import MacBookDevice from "./MacBookDevice";

/**
 * DuoDevice — composition multi-device (MacBook + iPhone côte à côte)
 * pour les hero shots type "showcase produit cross-platform". Sprint 7
 * Phase 4. Les deux écrans rendent le MÊME videoSrc (mirroring) —
 * une seule capture source suffit, pas besoin de pipeline dual.
 *
 * Layout : MacBook à gauche, iPhone à droite légèrement en avant +
 * surélevé + tourné vers la caméra pour un cadrage "Apple Keynote".
 * Outer scale 0.85 pour que la bounding-box rentre dans le frustum
 * camera des presets existants (hero-tilt / cinematic-spin / etc.).
 *
 * Optimisé 16:9. En 9:16 la composition déborde — l'utilisateur est
 * orienté vers le 2D iPhone frame ou un device 3D unique pour le
 * portrait.
 *
 * v1 procédural uniquement (pas de GLB loader pour la duo : il
 * faudrait gérer 2 GLBs synchronisés). Si besoin futur, étendre
 * `compose-tour.ts` pour chercher `public/models/iphone.glb` ET
 * `public/models/macbook.glb` quand frame3d === "duo".
 */
export default function DuoDevice({ videoSrc }: { videoSrc: string }) {
  return (
    <group scale={0.85}>
      <group position={[-1.5, 0, 0]}>
        <MacBookDevice videoSrc={videoSrc} scale={1} />
      </group>
      <group position={[3.2, 0.4, 1.0]} rotation={[0, -0.22, 0]}>
        <IPhoneDevice videoSrc={videoSrc} scale={0.85} />
      </group>
    </group>
  );
}
