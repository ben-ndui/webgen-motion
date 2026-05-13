/**
 * Camera presets pour les compositions 3D — Sprint 7 phase 1.
 *
 * Chaque preset retourne la position + lookAt + champs annexes
 * (FoV, etc.) pour un `progress` 0..1 sur la durée d'une section.
 * Le composant `SceneCanvas` consomme ça via `useCurrentFrame` /
 * `useVideoConfig` de Remotion et interpole entre les états.
 *
 * Convention :
 *  - Position en mètres (unités R3F), origine = centre du device.
 *  - lookAt en mètres, idem.
 *  - FoV en degrés (default 35° pour un rendu cinematic).
 *
 * 5 presets ship en phase 1, tous gated par le flag `frames-3d`
 * (Studio Edition). Sprint 7 phase 2 ajoutera plus de variations
 * + lighting / post-process.
 */

export type CameraPresetId =
  | "hero-tilt"
  | "feature-zoom"
  | "pan-right"
  | "flip-reveal"
  | "static-front";

export interface CameraState {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
}

/** Lerp utilitaire — Remotion ferait pareil via interpolate mais on
 *  garde l'API simple et frame-rate-independent ici. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** easeInOutCubic — utilisé partout pour les transitions caméra,
 *  donne un mouvement "polished" sans à-coups début/fin. */
function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function resolveCamera(
  preset: CameraPresetId,
  progress: number,
): CameraState {
  const t = ease(Math.max(0, Math.min(1, progress)));

  switch (preset) {
    case "hero-tilt": {
      // Caméra légèrement haute et inclinée vers le bas → tilt-down
      // subtil pendant la durée de la section. Style "showcase Apple".
      return {
        position: lerpVec3([0, 0.4, 4], [0, 0.55, 4], t),
        lookAt: lerpVec3([0, 0, 0], [0, -0.05, 0], t),
        fov: 32,
      };
    }
    case "feature-zoom": {
      // Pull-in : camera rapproche le device, met l'écran en avant.
      return {
        position: lerpVec3([0, 0.1, 5.2], [0, 0.05, 3.6], t),
        lookAt: [0, 0, 0],
        fov: lerp(36, 28, t),
      };
    }
    case "pan-right": {
      // Slide horizontal : camera dérive de gauche à droite, le
      // device reste centré.
      return {
        position: lerpVec3([-1.4, 0.2, 4.2], [1.4, 0.2, 4.2], t),
        lookAt: [0, 0, 0],
        fov: 34,
      };
    }
    case "flip-reveal": {
      // Démarre légèrement par derrière, finit face caméra. On
      // simule la rotation via la caméra qui contourne le device.
      const angle = lerp(Math.PI * 0.55, 0, t);
      const radius = 4.2;
      return {
        position: [
          Math.sin(angle) * radius,
          0.3,
          Math.cos(angle) * radius,
        ],
        lookAt: [0, 0, 0],
        fov: 32,
      };
    }
    case "static-front":
    default:
      // Fallback : caméra fixe, droit devant. Utile pour les
      // sections où on veut pas de mouvement parasite (cas "compose
      // classique en 3D mais sans animation cam").
      return {
        position: [0, 0, 4],
        lookAt: [0, 0, 0],
        fov: 32,
      };
  }
}
