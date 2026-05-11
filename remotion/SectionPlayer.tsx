import { OffthreadVideo, interpolate, staticFile, useVideoConfig } from "remotion";
import type { ManifestSection } from "./lib/types";
import type { MotionCategory } from "@/lib/motion-categories";
import { MacChrome } from "./MacChrome";
import { IPhoneFrame } from "./IPhoneFrame";
import { applyTransition, kenBurns, pickTransition } from "./lib/transitions";

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
  localFrame,
  durationFrames,
  crossfadeFrames,
  sectionIndex,
}: {
  section: ManifestSection;
  cat: MotionCategory;
  format: "16:9" | "9:16";
  url: string;
  localFrame: number;
  durationFrames: number;
  crossfadeFrames: number;
  sectionIndex: number;
}) {
  const { fps } = useVideoConfig();
  const transitionId = pickTransition(section.categoryId);
  // OffthreadVideo plays the MP4 from frame 0 up to `endAt`. We cap
  // it at the section's (possibly trimmed) duration so a section that
  // was shortened by pacing analysis doesn't keep playing its tail.
  const videoEndAt = Math.round(section.durationSec * fps);

  // Entrance: rises 0→1 over the first `crossfadeFrames`.
  // Exit: falls 1→0 over the last `crossfadeFrames`.
  const entrance = interpolate(localFrame, [0, crossfadeFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(
    localFrame,
    [durationFrames - crossfadeFrames, durationFrames],
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
  const kenBurnsTransform = kenBurns(local01, sectionIndex);

  // Video plays cleanly inside the frame — no Ken Burns here. The
  // site content as captured stays steady ; it's the device that
  // moves on top, like a film maker panning a phone in hand.
  const video = (
    <OffthreadVideo
      src={staticFile(section.fileName)}
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

  const frame =
    format === "9:16" ? (
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
          transform: kenBurnsTransform,
          transformOrigin: "center",
        }}
      >
        {frame}
      </div>
    </div>
  );
}
