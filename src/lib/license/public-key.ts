/**
 * Public key Ed25519 embedded pour vérifier les licenses webgen-motion.
 *
 * Sprint 9 — le format de license est signé par le private key de Ben
 * (gardé OFFLINE dans keys/license-private.pem), et chaque install
 * vérifie la signature contre la constante ci-dessous.
 *
 * Format : 32 bytes raw Ed25519 public key, encodé en base64 standard
 * (pas base64url). Généré via scripts/generate-license-keypair.mjs
 * qui imprime la valeur exacte à copier ici.
 *
 * ⚠ PROD vs DEV :
 * - La constante ci-dessous est actuellement la **DEV** key
 *   (générée pour les tests E2E). Ben doit la REMPLACER par la prod
 *   key avant le premier release commercial qui vend Studio Edition.
 * - Override possible via env `WEBGEN_MOTION_LICENSE_PUBKEY` pour
 *   le dev / CI / changement de key en hot-fix sans rebuild.
 *
 * Workflow rotation prod (futur) : si on doit changer le key (clé
 * compromise, etc.), bump LICENSE_FORMAT_VERSION et embed les 2 keys
 * (old + new) pendant une période de transition pour pas casser les
 * licenses déjà émises.
 */

/**
 * PROD key (générée 2026-05-17). Le `keys/license-private.pem` matching
 * est gardé OFFLINE par Ben (jamais commit). Toute license signée avec
 * cette key sera vérifiée par tous les clients de l'app.
 *
 * Pour dev/test sans la prod private key, override via env var
 * `WEBGEN_MOTION_LICENSE_PUBKEY` avec la dev pub key
 * (`keys/dev-license-public-base64.txt`) et utiliser
 * `keys/dev-license-private.pem` côté `scripts/issue-license.mjs --key`.
 */
const LICENSE_PUBLIC_KEY_B64_EMBEDDED =
  "lCU3dfKuEbpkqTbKW894qS8bhcJXCoTlz1GVkKoZNiE=";

/** Resolved public key (env override priorité sur embed). */
export function getLicensePublicKeyB64(): string {
  return (
    process.env.WEBGEN_MOTION_LICENSE_PUBKEY ?? LICENSE_PUBLIC_KEY_B64_EMBEDDED
  );
}
