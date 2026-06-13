/**
 * Fulfillment automatique d'un achat Stripe : émission de la licence
 * signée + envoi par email au client, sans intervention humaine.
 *
 * Chemin critique = licence émise + email envoyé. Le notif Discord
 * reste best-effort (cf. webhook route). On n'ajoute PAS le SDK Resend :
 * un simple POST sur l'API REST suffit et reste mockable en test.
 *
 * Clé de signature : la private key Ed25519 de prod doit être fournie
 * via env (sur Vercel). On accepte deux formes :
 *   - `LICENSE_SIGNING_PRIVATE_KEY`      : PEM PKCS#8 brut (multi-ligne)
 *   - `LICENSE_SIGNING_PRIVATE_KEY_B64`  : ce même PEM encodé base64
 *     (pratique quand l'UI d'env vars n'aime pas les retours ligne)
 * Absente → on ne peut pas émettre : fallback propre (log + Discord
 * manuel), le dev local n'est jamais cassé.
 */

import { issueLicense, type IssuableEdition } from "./issue";

export interface FulfillmentEnv {
  // Signature d'index : accepte directement `process.env` (ProcessEnv).
  [key: string]: string | undefined;
  LICENSE_SIGNING_PRIVATE_KEY?: string;
  LICENSE_SIGNING_PRIVATE_KEY_B64?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
}

export interface FulfillmentInput {
  email: string;
  edition: IssuableEdition;
  /** Référence libre (id session Stripe) inscrite dans la note licence. */
  reference?: string;
  /** Expiration unix ms (abo : fin de période + grâce) ou null = perpétuel
   *  (Lifetime). Défaut null. */
  expiresAt?: number | null;
  /** Plan acheté (monthly/annual/lifetime) — tracé dans la note. */
  plan?: string;
}

export interface FulfillmentResult {
  /** Licence signée produite. */
  licensed: boolean;
  /** Email envoyé au client. */
  emailed: boolean;
  /** Contenu .license (présent si licensed) — pour fallback / log. */
  licenseContent?: string;
  /** Raison explicite quand un maillon est sauté/échoué. */
  reason?:
    | "ok"
    | "no-signing-key"
    | "issue-error"
    | "email-skipped-no-key"
    | "email-error";
  /** True si le souci est transitoire et mérite un retry Stripe. */
  retryable: boolean;
}

/** Résout la private key de signature depuis l'env. Null si absente. */
export function resolveSigningKey(env: FulfillmentEnv): string | null {
  if (env.LICENSE_SIGNING_PRIVATE_KEY && env.LICENSE_SIGNING_PRIVATE_KEY.trim()) {
    return env.LICENSE_SIGNING_PRIVATE_KEY;
  }
  if (
    env.LICENSE_SIGNING_PRIVATE_KEY_B64 &&
    env.LICENSE_SIGNING_PRIVATE_KEY_B64.trim()
  ) {
    return Buffer.from(env.LICENSE_SIGNING_PRIVATE_KEY_B64, "base64").toString(
      "utf-8",
    );
  }
  return null;
}

const DEFAULT_FROM = "GEN MOTION <licenses@genmotion.app>";

/**
 * Envoie la licence par email via l'API Resend. Retourne un statut
 * structuré plutôt que de throw, pour que l'appelant décide du retry.
 * Si `RESEND_API_KEY` est absente → skip propre (dev), pas d'erreur.
 */
export async function sendLicenseEmail(
  params: { to: string; licenseContent: string; edition: IssuableEdition },
  env: FulfillmentEnv,
): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    // Dev / pas encore configuré : on ne casse rien.
    console.warn(
      "[fulfillment] RESEND_API_KEY absente → email NON envoyé (licence émise, à livrer manuellement)",
    );
    return { sent: false, skipped: true };
  }
  const from = env.RESEND_FROM ?? DEFAULT_FROM;
  const filename = `gen-motion-${params.edition}.license`;
  const body = {
    from,
    to: [params.to],
    subject: "Ta licence GEN MOTION " + params.edition,
    text:
      "Merci pour ton achat de GEN MOTION " +
      params.edition +
      " !\n\nTa licence est en pièce jointe (" +
      filename +
      "). Installe-la via /setup/license dans l'app, ou dépose-la dans " +
      "~/.webgen-motion/.license\n\n— Smooth & Design",
    attachments: [
      {
        filename,
        content: Buffer.from(params.licenseContent, "utf-8").toString("base64"),
      },
    ],
  };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { sent: false, error: `Resend ${res.status}: ${detail.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: (e as Error).message };
  }
}

/**
 * Orchestration complète : émet la licence puis l'envoie par email.
 * Ne throw jamais — retourne un `FulfillmentResult` que le webhook mappe
 * sur un statut HTTP (et décide de marquer l'event comme traité ou non).
 */
export async function fulfillCheckout(
  input: FulfillmentInput,
  env: FulfillmentEnv,
): Promise<FulfillmentResult> {
  const key = resolveSigningKey(env);
  if (!key) {
    // Pas transitoire : retry n'aiderait pas. Fallback manuel côté webhook.
    console.warn(
      "[fulfillment] clé de signature absente (LICENSE_SIGNING_PRIVATE_KEY[_B64]) → fulfillment manuel requis",
    );
    return { licensed: false, emailed: false, reason: "no-signing-key", retryable: false };
  }

  let licenseContent: string;
  try {
    const noteParts = [
      input.plan ? `plan ${input.plan}` : null,
      input.reference ? `Stripe ${input.reference}` : null,
    ].filter(Boolean);
    const { content } = issueLicense(
      {
        email: input.email,
        edition: input.edition,
        expiresAt: input.expiresAt ?? null,
        note: noteParts.length ? noteParts.join(" · ") : undefined,
      },
      key,
    );
    licenseContent = content;
  } catch (e) {
    // Clé présente mais invalide / payload mauvais → config cassée,
    // non transitoire.
    console.error("[fulfillment] échec d'émission :", (e as Error).message);
    return { licensed: false, emailed: false, reason: "issue-error", retryable: false };
  }

  const email = await sendLicenseEmail(
    { to: input.email, licenseContent, edition: input.edition },
    env,
  );

  if (email.sent) {
    return { licensed: true, emailed: true, licenseContent, reason: "ok", retryable: false };
  }
  if (email.skipped) {
    // Licence émise mais pas d'email (dev) : on considère le critique
    // « fait » côté serveur, livraison manuelle. Pas de retry.
    return {
      licensed: true,
      emailed: false,
      licenseContent,
      reason: "email-skipped-no-key",
      retryable: false,
    };
  }
  // Erreur d'envoi réelle (Resend down, 5xx…) → transitoire, retry utile.
  console.error("[fulfillment] envoi email échoué :", email.error);
  return {
    licensed: true,
    emailed: false,
    licenseContent,
    reason: "email-error",
    retryable: true,
  };
}
