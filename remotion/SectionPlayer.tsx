import { OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { ManifestSection } from "./lib/types";
import type { MotionCategory } from "@/lib/motion-categories";
import { MacChrome } from "./MacChrome";
import { IPhoneFrame } from "./IPhoneFrame";
import { applyTransition, kenBurns, pickTransition } from "./lib/transitions";
import { resolveStyle } from "./lib/style-presets";
import {
  getActiveHotspot,
  labelStyle,
  punchInTransform,
} from "./lib/hotspots";
import SceneCanvas, {
  type Frame3DDeviceId,
} from "./three/SceneCanvas";
import type { CameraPresetId } from "./three/camera-presets";

/**
 * Single section playback in the chosen device frame.
 *
 * Motion design layers stacked on top of the captured MP4 :
 *   1. Per-category transition (fade / scale-blur / swipe / wipe /
 *      glitch) for the entrance + exit windows (chunks of length
 *      `crossfadeFrames`).
 *   2. Ken Burns slow zoom + alternating pan across the section's
 *      full duration.
 *
 * `localFrame` = composition frame minus the section's startFrame,
 * so the section's first frame is 0.
 */
export function SectionPlayer({
  section,
  cat,
  format,
  url,
  durationFrames,
  entranceFrames,
  exitFrames,
  sectionIndex,
  styleId,
  frame3d,
  cameraPreset3d,
  frame3dGlbPath,
}: {
  section: ManifestSection;
  cat: MotionCategory;
  format: "16:9" | "9:16";
  url: string;
  durationFrames: number;
  /** Edit Engine — per-boundary crossfade durations. The entrance
   *  window belongs to THIS section's incoming boundary, the exit
   *  window to the NEXT section's incoming boundary, so both sides
   *  of a cut always breathe at the same beat-adapted pace. */
  entranceFrames: number;
  exitFrames: number;
  sectionIndex: number;
  styleId: string;
  /** Sprint 7 — quand set, on rend en 3D via SceneCanvas au lieu
   *  des frames 2D Mac chrome / iPhone. Compose-tour ne propage
   *  cette valeur que si Studio Edition est active (feature flag
   *  `frames-3d`). */
  frame3d?: Frame3DDeviceId;
  cameraPreset3d?: string;
  /** Path optionnel d'un GLB Sketchfab à utiliser à la place du
   *  device procédural. Set par compose-tour si fichier existe. */
  frame3dGlbPath?: string;
}) {
  // useCurrentFrame() inside a <Sequence> returns frames relative
  // to the sequence's `from`. Negative during the premount window,
  // 0 when the section starts, up to durationFrames + crossfade at
  // the exit tail. The interpolate calls below all use clamp so out
  // of range values resolve cleanly to opacity 0.
  const localFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = resolveStyle(styleId);
  const transitionId = pickTransition(
    section.categoryId,
    style.transitionOverride,
  );
  // OffthreadVideo plays the MP4 from `startFrom` to `endAt`.
  //   - startFrom = section.startFromSec * fps (default 0)
  //   - endAt    = startFrom + section.durationSec * fps
  // section.durationSec is the EFFECTIVE playback window (already
  // takes the trim into account — compose-tour does the math). This
  // way SectionPlayer reasons in section-local frame land sans avoir
  // à connaître la longueur du MP4 source.
  const videoStartFrom = Math.round((section.startFromSec ?? 0) * fps);
  const videoEndAt =
    videoStartFrom + Math.round(section.durationSec * fps);

  // Entrance: rises 0→1 over the first `entranceFrames`.
  // Exit: falls 1→0 over the last `exitFrames`.
  const entrance = interpolate(localFrame, [0, entranceFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(
    localFrame,
    [durationFrames - exitFrames, durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // The entrance preset drives the entrance window ; the exit window
  // re-runs the same preset reversed for symmetry.
  const onEntrance = entrance < 1;
  const transitionStyle = onEntrance
    ? applyTransition(transitionId, entrance)
    : applyTransition(transitionId, exit);

  // Ken Burns runs over the WHOLE section, layered on top of the
  // transition transform. local01 = 0..1 across the section.
  const local01 = interpolate(
    localFrame,
    [0, durationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // Edit Engine — when the section declares hotspots, the camera
  // drifts toward the first one instead of alternating by parity.
  const focusHotspot = section.hotspots?.[0];
  const kenBurnsTransform = kenBurns(
    local01,
    sectionIndex,
    style.kenBurnsScale,
    style.kenBurnsPan,
    focusHotspot ? { x: focusHotspot.x, y: focusHotspot.y } : undefined,
  );

  // Video plays cleanly inside the frame — no Ken Burns here. The
  // site content as captured stays steady ; it's the device that
  // moves on top, like a film maker panning a phone in hand.
  const rawVideo = (
    <OffthreadVideo
      src={staticFile(section.fileName)}
      startFrom={videoStartFrom}
      endAt={videoEndAt}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        // anchor the crop to the top — Mac chrome's title bar + iPhone
        // Dynamic Island would eat the page header otherwise.
        objectPosition: "top",
        backgroundColor: "#000",
        display: "block",
      }}
    />
  );

  // Sprint 15.A — punch-in hotspots. Skip silently en mode 3D
  // (gestion R3F différente, viendra en S15.D si on en a besoin).
  // En 2D : on wrap la vidéo dans un conteneur transform-origin
  // animé qui zoome vers (x, y), avec un label flottant collé.
  const hotspotState = frame3d
    ? null
    : getActiveHotspot(section.hotspots, localFrame, fps);
  const punchIn = punchInTransform(hotspotState);
  const label = labelStyle(hotspotState);

  const video = hotspotState ? (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        transform: punchIn.transform,
        transformOrigin: punchIn.transformOrigin,
      }}
      data-wm-id="tour.hotspot-zoom"
    >
      {rawVideo}
      {label.visible && (
        <div style={label.containerStyle} data-wm-id="tour.hotspot-label">
          <div
            style={{
              background: "rgba(8, 8, 12, 0.82)",
              color: "#fff",
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, "Geist Sans", Inter, sans-serif',
              fontWeight: 600,
              fontSize: format === "9:16" ? 30 : 26,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow:
                "0 8px 24px rgba(0, 0, 0, 0.32), 0 1px 0 rgba(255, 255, 255, 0.06) inset",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              whiteSpace: "nowrap",
            }}
          >
            {hotspotState.hotspot.label}
          </div>
        </div>
      )}
    </div>
  ) : (
    rawVideo
  );

  // Frame 3D (Sprint 7 — Studio Edition) si le tour le demande.
  // Sinon fallback sur les frames 2D Mac chrome / iPhone classiques.
  const frame = frame3d ? (
    <SceneCanvas
      videoSrc={staticFile(section.fileName)}
      device={frame3d}
      cameraPreset={(cameraPreset3d ?? "hero-tilt") as CameraPresetId}
      durationFrames={durationFrames}
      width={format === "9:16" ? 1080 : 1920}
      height={format === "9:16" ? 1920 : 1080}
      glbPath={frame3dGlbPath}
    />
  ) : format === "9:16" ? (
    <IPhoneFrame cat={cat} tabTitle={section.title}>
      {video}
    </IPhoneFrame>
  ) : (
    <MacChrome url={url} tabTitle={section.title} cat={cat}>
      {video}
    </MacChrome>
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 80px 60px",
        opacity: transitionStyle.opacity,
        transform: transitionStyle.transform,
        filter: transitionStyle.filter,
        clipPath: transitionStyle.clipPath,
      }}
    >
      {/* Ken Burns on the FRAME wrapper, not the video — the device
       *  itself zooms / pans cinematically while the captured page
       *  content inside stays steady. */}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Disable Ken Burns CSS quand on est en mode 3D — la
          // scène a déjà sa propre animation camera + device, le
          // Ken Burns par-dessus crée un double mouvement qui fait
          // sortir le device du cadre. Pour le 2D rendering classique
          // (Mac chrome / iPhone frame), Ken Burns reste actif.
          transform: frame3d ? undefined : kenBurnsTransform,
          transformOrigin: "center",
        }}
      >
        {frame}
      </div>
    </div>
  );
}
