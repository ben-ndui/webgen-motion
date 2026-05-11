import { Composition } from "remotion";
import { z } from "zod";
import { HelloWorld } from "./HelloWorld";
import { Tour } from "./Tour";
import { computeDurationInFrames, type TourCompositionProps } from "./lib/types";

// Loose zod schema — we already validate the manifest server-side
// (capture-tour.ts) and the runner serialises a typed object, so
// `.passthrough()` keeps the types honest without re-spelling every
// field. Remotion needs a schema to type the props at the
// `<Composition>` boundary.
const tourPropsSchema = z
  .object({
    tourId: z.string(),
    format: z.enum(["16:9", "9:16"]),
    fps: z.number(),
    sections: z.array(z.any()),
    brand: z.any(),
    voiceoverFile: z.string().nullable(),
    bgMusicFile: z.string().nullable(),
    bgBeats: z.array(z.any()),
    voPauses: z.array(z.any()),
    composeStyle: z.string(),
    bgMusicVolume: z.number(),
    voVolume: z.number(),
  })
  .passthrough();

const FPS = 30;

/**
 * Default props seed each composition with a usable shape. The CLI
 * accepts `--props='{…}'` at render time to override every field —
 * `scripts/compose-remotion.ts` plumbs the real manifest there.
 */
const EMPTY_TOUR_PROPS: TourCompositionProps = {
  tourId: "",
  format: "16:9",
  fps: FPS,
  sections: [],
  brand: { displayName: "webgen-motion", domain: "localhost", tagline: "by Smooth & Design" },
  voiceoverFile: null,
  bgMusicFile: null,
  bgBeats: [],
  voPauses: [],
  composeStyle: "energetic",
  bgMusicVolume: 0.18,
  voVolume: 1.0,
};

/**
 * Root composition registry. Each `<Composition>` is renderable
 * standalone via `npx remotion render --comp <id>`. `calculateMetadata`
 * lets the duration scale with the incoming props (sections array).
 */
export function Root() {
  return (
    <>
      <Composition
        id="hello-world"
        component={HelloWorld}
        durationInFrames={90}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          title: "webgen-motion",
          subtitle: "Remotion pipeline · chunk 1",
        }}
      />

      <Composition<typeof tourPropsSchema, TourCompositionProps>
        schema={tourPropsSchema}
        id="tour-16x9"
        component={Tour}
        durationInFrames={120}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ ...EMPTY_TOUR_PROPS, format: "16:9" }}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(
            60,
            computeDurationInFrames(props.sections, FPS),
          ),
        })}
      />

      <Composition<typeof tourPropsSchema, TourCompositionProps>
        schema={tourPropsSchema}
        id="tour-9x16"
        component={Tour}
        durationInFrames={120}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ ...EMPTY_TOUR_PROPS, format: "9:16" }}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(
            60,
            computeDurationInFrames(props.sections, FPS),
          ),
        })}
      />
    </>
  );
}
