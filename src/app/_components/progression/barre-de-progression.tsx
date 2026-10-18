import "./progression.css";

/**
 * LA barre de progression de GEN MOTION. La barre native du navigateur
 * (`<progress>`) ignorait la charte dans la fenêtre macOS : verte sur gris.
 * `valeur` entre 0 et 1 ; `null` : on ne sait pas encore combien, la barre
 * patiente (animée, sauf si le système demande de réduire les animations).
 */
export default function BarreDeProgression({ valeur, nom }: { valeur: number | null; nom: string }) {
  // NaN (un total à zéro) se traite comme « on ne sait pas », jamais comme « NaN % ».
  const pourcent = valeur === null || !Number.isFinite(valeur) ? null : Math.round(Math.min(1, Math.max(0, valeur)) * 100);
  return (
    <div
      className="barre-de-progression"
      role="progressbar"
      aria-label={nom}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pourcent ?? undefined}
      data-en-attente={pourcent === null}
    >
      <span className="barre-de-progression-remplie" style={pourcent === null ? undefined : { width: `${pourcent}%` }} />
    </div>
  );
}
