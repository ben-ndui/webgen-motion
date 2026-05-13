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

/** Matching STRICT par exact name pour ne pas attraper de false
 *  positives (genre "front_panel" qui matchait "front"). Si rien
 *  match, on tombe sur l'heuristique géométrie qui pick la mesh
 *  la plus plate. */
const SCREEN_NAME_HINTS = ["screen", "display", "écran", "ecran"];

function isScreenMesh(name: string): boolean {
  const lower = name.toLowerCase();
  return SCREEN_NAME_HINTS.includes(lower);
}

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

  // Auto-scale + auto-orient. Sketchfab exports varient beaucoup
  // dans leur orientation par défaut (device couché sur la tronche,
  // sur le côté, etc.). On détecte le shape via bounding box :
  //  - l'axe le PLUS COURT = thickness (épaisseur du device)
  //  - on rotate pour que cet axe pointe vers +Z (la caméra),
  //    ce qui revient à mettre l'écran face caméra par convention
  //    (la majorité des Sketchfab posent le device avec screen
  //    perpendiculaire au thickness axis)
  //  - le scale aligne ensuite la dimension la plus longue sur
  //    targetHeight (3.4 unités pour iPhone, 4 pour MacBook)
  const { scale, rotation } = useMemo(() => {
    if (!gltf.scene) return { scale: 1, rotation: [0, 0, 0] as [number, number, number] };
    const sceneCenter = new THREE.Vector3();
    const box = new THREE.Box3().setFromObject(gltf.scene);
    box.getCenter(sceneCenter);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Find the shortest axis = thickness
    const dims = [size.x, size.y, size.z];
    const shortestIdx = dims.indexOf(Math.min(...dims));
    let rot: [number, number, number] = [0, 0, 0];
    if (shortestIdx === 0) {
      rot = [0, Math.PI / 2, 0];
    } else if (shortestIdx === 1) {
      rot = [-Math.PI / 2, 0, 0];
    }

    // Check si la mesh "screen" finit devant (+Z) ou derrière (-Z)
    // la caméra après notre rotation. Si derrière → flip Y par π pour
    // amener le screen face cam. Ça gère les GLBs Sketchfab dont le
    // screen est sur -Z (back-facing par défaut, très commun).
    let screenCenter: THREE.Vector3 | null = null;
    gltf.scene.traverse((obj) => {
      if (screenCenter || !(obj instanceof THREE.Mesh)) return;
      if (isScreenMesh(obj.name)) {
        const meshBox = new THREE.Box3().setFromObject(obj);
        screenCenter = new THREE.Vector3();
        meshBox.getCenter(screenCenter);
        screenCenter.sub(sceneCenter); // local au scene center
      }
    });
    if (screenCenter !== null) {
      // Appliquer notre rotation au screenCenter pour savoir où il
      // atterrit dans l'espace de la caméra.
      const euler = new THREE.Euler(rot[0], rot[1], rot[2]);
      const rotated = (screenCenter as THREE.Vector3).clone().applyEuler(euler);
      if (rotated.z < -0.001) {
        // Screen est derrière → flip Y de π pour le ramener devant.
        rot = [rot[0], rot[1] + Math.PI, rot[2]];
      }
    } else {
      // Aucune mesh screen détectable → convention Sketchfab : la
      // plupart des GLBs sont exportés avec le device "back facing
      // forward" (screen sur -Z natif). On flip Y par défaut pour
      // que la majorité des cas marchent sans renommer dans Blender.
      // Si le résultat est inversé, l'utilisateur pourra toggle via
      // UI dans /setup/models (phase future).
      rot = [rot[0], rot[1] + Math.PI, rot[2]];
    }

    const longest = Math.max(...dims);
    const s = longest > 0 ? targetHeight / longest : 1;
    return { scale: s, rotation: rot };
  }, [gltf.scene, targetHeight]);

  // Debug : log TOUS les meshes du GLB dès qu'il est chargé (avant
  // même que la texture vidéo soit prête). Permet à l'utilisateur de
  // voir quelle mesh c'est l'écran et la renommer si besoin.
  useEffect(() => {
    if (!gltf.scene) return;
    const allMeshes: THREE.Mesh[] = [];
    gltf.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) allMeshes.push(obj);
    });
    if (allMeshes.length === 0) return;
    const summary = allMeshes
      .map((m) => {
        const b = new THREE.Box3().setFromObject(m);
        const s = new THREE.Vector3();
        b.getSize(s);
        const dims = [s.x, s.y, s.z];
        const ratio = Math.min(...dims) / Math.max(...dims);
        return `  - "${m.name || "(unnamed)"}" : ${s.x.toFixed(2)}×${s.y.toFixed(2)}×${s.z.toFixed(2)} (flat ${ratio.toFixed(3)})`;
      })
      .join("\n");
    console.warn(
      `[webgen-motion] Meshes du GLB ${glbPath} :\n${summary}`,
    );
  }, [gltf.scene, glbPath]);

  // Override the screen mesh material with the video texture. Trois
  // stratégies en fallback :
  //   1. Match par nom strict (screen / display / écran / ecran)
  //   2. Si rien : heuristique géométrie — pick la mesh la plus PLATE
  //      (smallest_dim / largest_dim minimal). C'est très probablement
  //      le screen plane.
  //   3. Si rien quand même : log warn.
  useEffect(() => {
    if (!gltf.scene || !videoTexture) return;
    const allMeshes: THREE.Mesh[] = [];
    gltf.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) allMeshes.push(obj);
    });

    // Stratégie 1 : mesh nommée explicitement (screen/display/etc.)
    const named = allMeshes.find((m) => isScreenMesh(m.name));
    if (named) {
      named.material = new THREE.MeshBasicMaterial({
        map: videoTexture,
        toneMapped: false,
      });
      return;
    }

    // Stratégie 2 : applique à TOUTES les meshes plates significatives
    // (flat ratio < 0.06, surface > 0.5). Comme on ne peut pas
    // distinguer screen avant vs vitre arrière sans naming, on
    // tartine — la mesh visible côté caméra montrera la vidéo, les
    // autres seront cachées dedans le device. Pragmatique mais robuste.
    let appliedCount = 0;
    for (const mesh of allMeshes) {
      const meshBox = new THREE.Box3().setFromObject(mesh);
      const meshSize = new THREE.Vector3();
      meshBox.getSize(meshSize);
      const dims = [meshSize.x, meshSize.y, meshSize.z];
      const max = Math.max(...dims);
      const min = Math.min(...dims);
      const surface = dims.reduce((a, b) => a * b, 1) / Math.max(min, 0.001);
      const flatRatio = min / Math.max(max, 0.001);
      if (flatRatio < 0.06 && surface > 0.5 && max > 1.0) {
        mesh.material = new THREE.MeshBasicMaterial({
          map: videoTexture,
          toneMapped: false,
        });
        appliedCount++;
      }
    }
    if (appliedCount === 0) {
      console.warn(
        `[webgen-motion] Aucune mesh écran candidate trouvée dans ${glbPath}. Tu peux renommer la mesh écran en "screen" dans Blender pour forcer.`,
      );
    } else {
      console.warn(
        `[webgen-motion] Texture vidéo appliquée à ${appliedCount} mesh(es) plate(s) du GLB ${glbPath}. La plus visible côté caméra montrera la capture.`,
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
    <group ref={groupRef} scale={scale} rotation={rotation}>
      <primitive object={gltf.scene} />
    </group>
  );
}
