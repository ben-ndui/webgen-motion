import { PostHog } from "posthog-node";

/**
 * Capture PostHog côté serveur (webhook Stripe, routes API publiques).
 *
 * - Clé : `POSTHOG_KEY` (serveur) en priorité, sinon `NEXT_PUBLIC_POSTHOG_KEY`
 *   (même Project API Key — PostHog accepte capture client ET serveur avec).
 * - No-op total si aucune clé → safe en dev / tant que non configuré.
 * - `flushAt: 1` + `await flush()` : en serverless le process gèle après la
 *   réponse, il FAUT envoyer immédiatement, pas batcher.
 * - Ne throw jamais : l'analytics ne doit pas faire échouer un webhook payé.
 */
let client: PostHog | null = null;
let resolved = false;

function getClient(): PostHog | null {
  if (resolved) return client;
  resolved = true;
  const key = process.env.POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  client = new PostHog(key, {
    host:
      process.env.POSTHOG_HOST ??
      process.env.NEXT_PUBLIC_POSTHOG_HOST ??
      "https://eu.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

export async function captureServer(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    c.capture({ distinctId, event, properties });
    await c.flush();
  } catch {
    /* swallow */
  }
}
