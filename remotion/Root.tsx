import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";

/**
 * Root composition registry. Each `<Composition>` is renderable
 * standalone via `npx remotion render --comp <id>`. Compositions
 * declare their dimensions, fps, duration, default props.
 *
 * Chunk 1 ships only `hello-world` — a sanity-check that proves the
 * Remotion pipeline boots end-to-end. Chunks 2+ will add `tour-16x9`
 * and `tour-9x16` that consume manifest.json + voiceover-alignment.
 */
export function Root() {
  return (
    <>
      <Composition
        id="hello-world"
        component={HelloWorld}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "webgen-motion",
          subtitle: "Remotion pipeline · chunk 1",
        }}
      />
    </>
  );
}
