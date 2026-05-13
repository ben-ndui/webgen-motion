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
  | "static-front"
  | "cinematic-spin";

export interface CameraState {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
  /** Optional device transform — quand set, le device est rotated /
   *  translated en plus du mouvement camera. Utilisé par les
   *  presets "cinematic-spin" pour chorégraphier face → 3/4 droite
   *  → drift → 3/4 gauche autour d'une camera fixe. */
  deviceRotation?: [number, number, number];
  devicePosition?: [number, number, number];
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
      // Caméra en 3/4 cinematic : décalée de 1.5 unités sur X pour
      // un angle plus dynamique qu'un full-front (qui paraît figé).
      // Légère élévation + tilt down subtil pendant la durée. Style
      // "showcase Apple Keynote". z=7 + FoV 36° pour cadrer.
      return {
        position: lerpVec3([1.2, 0.5, 6.5], [1.6, 0.7, 6.5], t),
        lookAt: lerpVec3([0, 0, 0], [0, -0.1, 0], t),
        fov: 36,
      };
    }
    case "feature-zoom": {
      // Pull-in : camera rapproche le device, met l'écran en avant.
      return {
        position: lerpVec3([0, 0.2, 8], [0, 0.1, 5.5], t),
        lookAt: [0, 0, 0],
        fov: lerp(40, 32, t),
      };
    }
    case "pan-right": {
      // Slide horizontal : camera dérive de gauche à droite, le
      // device reste centré.
      return {
        position: lerpVec3([-2.2, 0.3, 7], [2.2, 0.3, 7], t),
        lookAt: [0, 0, 0],
        fov: 38,
      };
    }
    case "flip-reveal": {
      // Démarre légèrement par derrière, finit face caméra. On
      // simule la rotation via la caméra qui contourne le device.
      const angle = lerp(Math.PI * 0.55, 0, t);
      const radius = 7;
      return {
        position: [
          Math.sin(angle) * radius,
          0.5,
          Math.cos(angle) * radius,
        ],
        lookAt: [0, 0, 0],
        fov: 36,
      };
    }
    case "cinematic-spin": {
      // Chorégraphie 4 temps avec camera statique reculée + device
      // qui danse sur lui-même. Amplitude conservatrice pour rester
      // dans le cadre (camera z=9, drift max ±0.3, rotation ±0.35).
      //   t=0..0.25 : face caméra → début 3/4 droite
      //   t=0.25..0.50 : 3/4 droite stable, drift léger
      //   t=0.50..0.75 : revient au centre, rotation passe par 0
      //   t=0.75..1.0 : 3/4 gauche, settle
      const phase = t * 4;
      let rotY = 0;
      let posX = 0;
      let posY = 0;
      if (phase < 1) {
        rotY = lerp(0, 0.3, phase);
        posX = lerp(0, 0.2, phase);
      } else if (phase < 2) {
        rotY = lerp(0.3, 0.35, phase - 1);
        posX = lerp(0.2, 0.3, phase - 1);
        posY = lerp(0, 0.08, phase - 1);
      } else if (phase < 3) {
        rotY = lerp(0.35, -0.35, phase - 2);
        posX = lerp(0.3, -0.3, phase - 2);
        posY = lerp(0.08, 0.08, phase - 2);
      } else {
        rotY = lerp(-0.35, -0.3, phase - 3);
        posX = lerp(-0.3, -0.2, phase - 3);
        posY = lerp(0.08, 0, phase - 3);
      }
      return {
        position: [0, 0.4, 9],
        lookAt: [0, 0, 0],
        fov: 36,
        deviceRotation: [0, rotY, 0],
        devicePosition: [posX, posY, 0],
      };
    }
    case "static-front":
    default:
      // Fallback : caméra fixe, droit devant.
      return {
        position: [0, 0, 7],
        lookAt: [0, 0, 0],
        fov: 36,
      };
  }
}
