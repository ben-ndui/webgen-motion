/**
 * Remotion entry point — registered as the default entry in
 * `remotion.config.ts`. Pulls in the Root component which declares
 * every composition the CLI / renderer can target.
 */
import { registerRoot } from "remotion";
import { Root } from "./Root";

registerRoot(Root);
