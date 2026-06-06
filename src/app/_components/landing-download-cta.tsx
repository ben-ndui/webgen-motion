"use client";

import { usePlatform } from "./smart-download-button";

/**
 * Landing download CTA — keeps the handoff `.btn` look but resolves the
 * label + href from the visitor's OS (usePlatform). When the detected
 * platform isn't shipped yet (Windows/Linux), it points to /download so
 * they see the full platform list instead of a dead direct link.
 */
export default function LandingDownloadCta({
  className,
  "data-wm-id": wmId,
}: {
  className?: string;
  "data-wm-id"?: string;
}) {
  const plat = usePlatform();
  const href = plat.available ? plat.href : "/download";
  return (
    <a className={className} href={href} data-wm-id={wmId}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v12" />
        <path d="m7 11 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
      {plat.label}
    </a>
  );
}
