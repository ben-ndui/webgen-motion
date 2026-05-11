import { OffthreadVideo, interpolate, staticFile } from "remotion";
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
  const transitionId = pickTransition(section.categoryId);

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

  const video = (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <OffthreadVideo
        src={staticFile(section.fileName)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          // anchor the crop to the top — Mac chrome's title bar + iPhone
          // Dynamic Island would eat the page header otherwise.
          objectPosition: "top",
          backgroundColor: "#000",
          display: "block",
          // Ken Burns is applied to the video element itself so the
          // device frame stays put while the content "lives".
          transform: kenBurnsTransform,
          transformOrigin: "center",
        }}
      />
    </div>
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
      {frame}
    </div>
  );
}
