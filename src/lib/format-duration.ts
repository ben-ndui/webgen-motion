/**
 * Format une durée en secondes en string lisible humain.
 *
 *   formatDuration(8)    → "8s"
 *   formatDuration(45.5) → "46s"
 *   formatDuration(60)   → "1min"
 *   formatDuration(95)   → "1min 35s"
 *   formatDuration(500)  → "8min 20s"
 *   formatDuration(3725) → "1h 2min"
 *
 * Mode precise (pour les courtes durées de captures, trim, etc.) :
 *   formatDuration(4.5, { precise: true }) → "4.5s"
 *   formatDuration(12.7, { precise: true }) → "12.7s"
 *   formatDuration(95, { precise: true })   → "1min 35s" (idem normal au-dessus de 60s)
 */
export function formatDuration(
  seconds: number,
  opts?: { precise?: boolean },
): string {
  const sec = Math.max(0, seconds);
  if (sec < 60) {
    return opts?.precise ? `${sec.toFixed(1)}s` : `${Math.round(sec)}s`;
  }
  const min = Math.floor(sec / 60);
  const remainSec = Math.round(sec % 60);
  if (min < 60) {
    return remainSec === 0 ? `${min}min` : `${min}min ${remainSec}s`;
  }
  const h = Math.floor(min / 60);
  const remainMin = min % 60;
  return remainMin === 0 ? `${h}h` : `${h}h ${remainMin}min`;
}
