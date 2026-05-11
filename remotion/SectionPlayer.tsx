import { OffthreadVideo, interpolate, staticFile } from "remotion";
import type { ManifestSection } from "./lib/types";
import type { MotionCategory } from "@/lib/motion-categories";
import { MacChrome } from "./MacChrome";
import { IPhoneFrame } from "./IPhoneFrame";

/**
 * Single section playback in the chosen device frame, with a fade
 * in / fade out window aligned on the surrounding crossfade
 * transitions. `localFrame` = current composition frame minus the
 * section's `startFrame`, so the section's first frame is 0.
 *
 * `OffthreadVideo` decodes the MP4 frame-accurately in a worker
 * thread — way more reliable than `<Video>` for batched renders.
 */
export function SectionPlayer({
  section,
  cat,
  format,
  url,
  localFrame,
  durationFrames,
  crossfadeFrames,
}: {
  section: ManifestSection;
  cat: MotionCategory;
  format: "16:9" | "9:16";
  url: string;
  localFrame: number;
  durationFrames: number;
  crossfadeFrames: number;
}) {
  const opacity = interpolate(
    localFrame,
    [0, crossfadeFrames, durationFrames - crossfadeFrames, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const scale = interpolate(
    localFrame,
    [0, crossfadeFrames, durationFrames - crossfadeFrames, durationFrames],
    [0.92, 1, 1, 1.04],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // anchored crop at the top so site headers stay visible — Mac
  // chrome's title bar + iPhone Dynamic Island would eat the top
  // otherwise.
  const video = (
    <OffthreadVideo
      src={staticFile(section.fileName)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
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
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {frame}
    </div>
  );
}
