"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * <SmartDownloadButton /> — Sprint 14 smart OS detection.
 *
 * Détecte l'OS de l'utilisateur via navigator.userAgent et propose
 * le download direct du bon asset via `/api/download/<plat>`.
 *
 * Fallback : si la détection échoue (SSR, vieux nav), affiche
 * "Télécharger pour macOS" comme défaut (notre seule plateforme
 * disponible en v0.2.0).
 *
 * Pattern detection :
 *   - macOS Apple Silicon (M1/M2/M3/M4) → /api/download/macos-arm64
 *   - macOS Intel → /api/download/macos-intel (bientôt)
 *   - Windows → /api/download/windows (bientôt)
 *   - Linux → /api/download/linux-appimage (bientôt)
 */

export interface PlatformInfo {
  href: string;
  label: string;
  available: boolean;
  hint?: string;
}

const FALLBACK: PlatformInfo = {
  href: "/api/download/macos-arm64",
  label: "Télécharger pour macOS",
  available: true,
  hint: "macOS Apple Silicon · .dmg notarisé",
};

function detectPlatform(): PlatformInfo {
  if (typeof navigator === "undefined") return FALLBACK;

  const uaString = navigator.userAgent || "";
  const platformStr = (navigator.platform ?? "").toLowerCase();

  if (platformStr.includes("win") || /windows/i.test(uaString)) {
    return {
      href: "/api/download/windows",
      label: "Télécharger pour Windows",
      available: false,
      hint: "Bientôt — disponible au prochain tag CI",
    };
  }

  if (platformStr.includes("linux") && !/android/i.test(uaString)) {
    return {
      href: "/api/download/linux-appimage",
      label: "Télécharger pour Linux",
      available: false,
      hint: "Bientôt — disponible au prochain tag CI",
    };
  }

  if (platformStr.includes("mac") || /mac/i.test(uaString)) {
    return {
      href: "/api/download/macos-arm64",
      label: "Télécharger pour macOS",
      available: true,
      hint: "macOS Apple Silicon · .dmg notarisé Apple",
    };
  }

  return FALLBACK;
}

/** Detected platform, resolved client-side after mount (SSR-safe). */
export function usePlatform(): PlatformInfo {
  const [plat, setPlat] = useState<PlatformInfo>(FALLBACK);
  useEffect(() => {
    setPlat(detectPlatform());
  }, []);
  return plat;
}

export default function SmartDownloadButton({
  variant = "primary",
  className,
  showHint = true,
}: {
  variant?: "primary" | "secondary";
  className?: string;
  showHint?: boolean;
}) {
  const plat = usePlatform();

  const baseCls =
    variant === "primary"
      ? "inline-flex items-center gap-2 px-6 py-3.5 bg-ink text-bg text-sm font-medium hover:opacity-90 transition-colors"
      : "inline-flex items-center gap-2 px-5 py-3 border border-line-strong text-ink text-sm font-medium hover:bg-bg-sunken transition-colors";

  if (!plat.available) {
    return (
      <div className="inline-flex flex-col items-start gap-1">
        <button
          type="button"
          disabled
          className={`${baseCls} ${className ?? ""} opacity-60 cursor-not-allowed`}
          data-wm-id="download.smart-button.unavailable"
        >
          {plat.label}
        </button>
        {showHint && plat.hint && (
          <span className="text-xs text-muted">{plat.hint}</span>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <a
        href={plat.href}
        onClick={() =>
          track("download_click", {
            platform: plat.label,
            href: plat.href,
          })
        }
        className={`${baseCls} ${className ?? ""}`}
        data-wm-id="download.smart-button"
      >
        {plat.label}
        <ArrowUpRight className="w-4 h-4" />
      </a>
      {showHint && plat.hint && (
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted">
          {plat.hint}
        </span>
      )}
    </div>
  );
}
