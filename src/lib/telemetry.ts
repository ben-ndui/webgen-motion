/**
 * Télémétrie d'activation — **anonyme, opt-out, app desktop uniquement**.
 *
 * North Star produit = activation (un installeur qui compose un vrai 1er
 * tour). Comme l'app est 100% locale, c'est le SEUL endroit où elle parle
 * à un serveur de son propre chef. Donc, strictement :
 *  - un SEUL event ('activated'), une seule fois, à la 1ère compose réussie ;
 *  - anonyme : id d'install aléatoire, édition, OS — JAMAIS de contenu,
 *    d'URL de tour, d'email ou de clé ;
 *  - opt-out : actif par défaut, désactivable dans /setup (disclosure au
 *    1er lancement) → `telemetry.enabled = false` ;
 *  - ne tourne QUE dans l'app packagée (marqueur `WEBGEN_RUNNERS_DIR` posé
 *    par le shell Tauri) — jamais en dev ni sur le web genmotion.app ;
 *  - best-effort : ne throw jamais, n'écrit `activationSent` que si l'envoi
 *    a réussi (sinon on retentera à la prochaine compose).
 *
 * L'app ne porte PAS la clé PostHog : elle POST sur le relais
 * `genmotion.app/api/telemetry/activation` qui, lui, capture côté serveur.
 */
import { randomUUID } from "node:crypto";
import { getConfig, saveConfig } from "./config";

const RELAY_ORIGIN = "https://genmotion.app";

/** Marqueur d'app packagée (posé par le shell Tauri, cf. src-tauri/src/lib.rs). */
function isPackagedApp(): boolean {
  return Boolean(process.env.WEBGEN_RUNNERS_DIR);
}

/** Consentement courant (opt-out : absent/true = on). */
export function isTelemetryEnabled(): boolean {
  return getConfig().telemetry?.enabled ?? true;
}

/** Désactive (opt-out) ou réactive la télémétrie. Persisté en config. */
export function setTelemetryEnabled(enabled: boolean): void {
  saveConfig({ telemetry: { ...getConfig().telemetry, enabled } });
}

/**
 * Envoie l'event 'activated' si toutes les conditions sont réunies.
 * Fire-and-forget côté appelant (`void maybeSendActivation(...)`).
 */
export async function maybeSendActivation(edition: string): Promise<void> {
  if (!isPackagedApp()) return;
  const cfg = getConfig();
  if ((cfg.telemetry?.enabled ?? true) === false) return;
  if (cfg.telemetry?.activationSent) return;

  // Id généré au 1er envoi seulement (pas pour les opt-out).
  const installId = cfg.telemetry?.installId ?? randomUUID();

  try {
    const res = await fetch(`${RELAY_ORIGIN}/api/telemetry/activation`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ installId, edition, os: process.platform }),
    });
    if (!res.ok) return; // on retentera à la prochaine compose
    saveConfig({
      telemetry: { ...cfg.telemetry, installId, activationSent: true },
    });
  } catch {
    /* offline / relais down : best-effort, on retentera */
  }
}
