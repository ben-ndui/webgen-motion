"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useOffthreadVideoTexture } from "@remotion/three";
import { staticFile } from "remotion";
import * as THREE from "three";

/**
 * Loader pour GLB / GLTF custom (iPhone 15 Pro, MacBook Air/Pro,
 * etc. téléchargés depuis Sketchfab ou ailleurs).
 *
 * Drop ton fichier dans `public/models/<id>.glb` (par exemple
 * `public/models/iphone.glb`), set `tour.frame3d = "iphone"` dans
 * le JSON et webgen-motion l'auto-load via Remotion staticFile().
 * Si le fichier est absent, le SceneCanvas fallback sur le device
 * procédural équivalent.
 *
 * Le composant :
 *  1. Load le GLB via drei useGLTF
 *  2. Cherche une mesh appelée "screen", "display", "Screen",
 *     "Display" — c'est elle qui reçoit la texture vidéo. Convention
 *     standard sur les modèles Sketchfab device.
 *  3. Si trouvée, override son material avec un meshBasicMaterial
 *     qui map le useOffthreadVideoTexture. Sinon log un warning et
 *     render le GLB tel quel (le screen sera juste blanc/noir).
 *
 * Échelle : on auto-scale le modèle pour que sa bounding box height
 * matche ~3.4 units (taille iPhone) ou ~2.6 units (épaisseur
 * MacBook). Le user n'a pas à se soucier de l'échelle du GLB Sketchfab.
 */

const SCREEN_MESH_NAMES = ["screen", "display", "Screen", "Display"];

export default function GLBDevice({
  glbPath,
  videoSrc,
  targetHeight = 3.4,
}: {
  /** Path relatif à public/, ex: "models/iphone.glb". Si absent
   *  → useGLTF throw et fallback handled par le parent via Suspense
   *  boundary ou try/catch. */
  glbPath: string;
  videoSrc: string;
  targetHeight?: number;
}) {
  const gltf = useGLTF(staticFile(glbPath));
  const videoTexture = useOffthreadVideoTexture({ src: videoSrc });
  const groupRef = useRef<THREE.Group>(null);

  // Auto-scale : compute bounding box of the scene then scale so
  // height matches targetHeight. Cached via memo dependent on the
  // GLB scene (rebuilt seulement si GLB change).
  const scale = useMemo(() => {
    if (!gltf.scene) return 1;
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const currentHeight = Math.max(size.x, size.y, size.z);
    return currentHeight > 0 ? targetHeight / currentHeight : 1;
  }, [gltf.scene, targetHeight]);

  // Override the screen mesh material with the video texture. Walk
  // the scene graph (the GLB peut être nested arbitrairement) et
  // patche la première mesh dont le nom matche notre convention.
  useEffect(() => {
    if (!gltf.scene || !videoTexture) return;
    let patched = false;
    gltf.scene.traverse((obj) => {
      if (patched || !(obj instanceof THREE.Mesh)) return;
      if (SCREEN_MESH_NAMES.includes(obj.name)) {
        obj.material = new THREE.MeshBasicMaterial({
          map: videoTexture,
          toneMapped: false,
        });
        patched = true;
      }
    });
    if (!patched) {
      console.warn(
        `[webgen-motion] Aucune mesh "screen" / "display" trouvée dans ${glbPath} — la vidéo ne s'affichera pas sur l'écran du device. Renomme une mesh dans Blender en "screen" et ré-exporte le GLB.`,
      );
    }
  }, [gltf.scene, videoTexture, glbPath]);

  // Center the model on origin (Sketchfab GLBs sometimes have
  // weird pivot points).
  useEffect(() => {
    if (!groupRef.current || !gltf.scene) return;
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    gltf.scene.position.sub(center);
  }, [gltf.scene]);

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={gltf.scene} />
    </group>
  );
}
