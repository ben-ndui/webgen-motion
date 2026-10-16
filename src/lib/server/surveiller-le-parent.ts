/**
 * Dans l'app de bureau, le serveur Next est lancé par la coque Tauri. Si
 * la coque disparaît sans l'arrêter (plantage, arrêt forcé), le serveur
 * restait vivant sur son port : la version suivante s'y branchait, avec un
 * jeton qu'il ne connaissait pas, et tout répondait 403 (16/10/2026).
 *
 * Ici, le serveur regarde régulièrement qui est son parent : quand le
 * parent meurt, le système lui en donne un autre (launchd, pid 1), et le
 * serveur s'arrête.
 */
type Options = {
  parentAuDepart: number;
  parentActuel: () => number;
  arreter: () => void;
  intervalleMs?: number;
};

export function surveillerLeParent({ parentAuDepart, parentActuel, arreter, intervalleMs = 2000 }: Options): () => void {
  const minuterie = setInterval(() => {
    if (parentActuel() !== parentAuDepart) {
      clearInterval(minuterie);
      arreter();
    }
  }, intervalleMs);
  // La surveillance ne doit pas, à elle seule, garder le serveur en vie.
  minuterie.unref?.();
  return () => clearInterval(minuterie);
}
