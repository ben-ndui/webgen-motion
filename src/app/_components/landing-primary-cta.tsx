"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePlatform } from "./smart-download-button";
import { isDesktopRuntime } from "@/lib/is-desktop";

/**
 * Landing primary CTA, environment-aware :
 *  - **Desktop (Tauri app)** → "Ouvrir le studio" → /dashboard, because
 *    the local pipeline is usable there.
 *  - **Web (vitrine browser)** → OS-detected download (the pipeline can't
 *    run online, so the only action is to install the app).
 * Keeps the handoff `.btn` look via the passed className.
 */
export default function LandingPrimaryCta({
  className,
  label = "auto",
  "data-wm-id": wmId,
}: {
  className?: string;
  /** "auto" = OS-detected full label · "short" = just "Télécharger". */
  label?: "auto" | "short";
  "data-wm-id"?: string;
}) {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => setDesktop(isDesktopRuntime()), []);
  const plat = usePlatform();

  if (desktop) {
    return (
      <Link className={className} href="/dashboard" data-wm-id={wmId ?? "landing.cta.open-studio"}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Ouvrir le studio
      </Link>
    );
  }

  const href = plat.available ? plat.href : "/download";
  return (
    <a className={className} href={href} data-wm-id={wmId}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v12" />
        <path d="m7 11 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
      {label === "short" ? "Télécharger" : plat.label}
    </a>
  );
}
