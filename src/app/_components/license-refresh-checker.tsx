"use client";

import { useEffect } from "react";
import { isWebPublic } from "@/lib/consent";

/**
 * Déclenche l'auto-refresh de licence au lancement de l'app (B.6).
 *
 * Ne tourne QUE dans l'app desktop / local (jamais sur le web public —
 * la route /api/motion/** y est de toute façon refusée par la garde
 * desktop). Fire-and-forget : la route locale décide si un refresh est
 * nécessaire (fenêtre d'expiration) et n'agit que pour un abonnement.
 * Le header desktop-token est ajouté automatiquement par DesktopTokenBridge.
 */
export default function LicenseRefreshChecker(): null {
  useEffect(() => {
    if (isWebPublic()) return; // web public → rien à faire
    fetch("/api/motion/license/refresh", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
