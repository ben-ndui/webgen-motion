import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

/**
 * Un objet posé qui respire : il monte et descend de quelques pixels, en
 * continu, pour que la scène ne soit jamais une image figée.
 */
export function Flottement({ children, amplitude = 10, periode = 90 }: { children: ReactNode; amplitude?: number; periode?: number }) {
  const image = useCurrentFrame();
  const decalage = Math.sin((image / periode) * Math.PI * 2) * amplitude;
  return <div style={{ transform: `translateY(${decalage}px)` }}>{children}</div>;
}
