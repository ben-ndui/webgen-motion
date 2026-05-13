/**
 * Factory : pick the right provider based on the resolved agent
 * config. Used by the agent runner + by the wizard's "Test
 * connection" button.
 *
 * Adding a new provider :
 *   1. Implement `AgentProvider` in `<name>.ts`
 *   2. Add a case here + add it to `PROVIDER_KIND` type in base.ts
 *   3. Surface a new option in the Setup wizard Agent IA tab
 */

import type { AgentProvider, ProviderKind } from "./base";
import { createAnthropicProvider } from "./anthropic";

export interface CreateProviderOptions {
  kind: ProviderKind;
  apiKey: string;
  model?: string;
}

export function createProvider(opts: CreateProviderOptions): AgentProvider {
  switch (opts.kind) {
    case "anthropic":
      return createAnthropicProvider({ apiKey: opts.apiKey, model: opts.model });
    case "openai":
    case "mistral":
      // To be implemented in a follow-up — Phase 1 ships Anthropic
      // only because (1) c'est le pick reco, (2) ça nous permet
      // d'itérer sur le prompt sans avoir à le porter ailleurs.
      throw new Error(
        `Provider "${opts.kind}" pas encore branché. Utilise "anthropic" pour l'instant.`,
      );
    default: {
      // Exhaustiveness check : if a new ProviderKind is added in
      // base.ts and we forget to wire it here, TS will compile-fail.
      const _exhaustive: never = opts.kind;
      throw new Error(`Unknown provider kind : ${_exhaustive}`);
    }
  }
}

export type { AgentProvider, ProviderKind } from "./base";
