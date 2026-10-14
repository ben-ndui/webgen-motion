"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const REQUETE_MOINS_D_ANIMATIONS = "(prefers-reduced-motion: reduce)";

// play() rend une promesse refusée si le navigateur bloque la lecture, et
// rien du tout sur les navigateurs anciens : on couvre les deux.
function lancer(element: HTMLVideoElement | null) {
  if (element) void Promise.resolve(element.play()).catch(() => undefined);
}

function suivreLaPreference(prevenir: () => void) {
  const requete = window.matchMedia(REQUETE_MOINS_D_ANIMATIONS);
  requete.addEventListener("change", prevenir);
  return () => requete.removeEventListener("change", prevenir);
}

type Props = {
  src: string;
  poster: string;
  // Ce que montre la vidéo, pour les lecteurs d'écran.
  titre: string;
  className?: string;
};

/**
 * Une vidéo de la vitrine : elle joue seule, en boucle et sans le son, pour
 * qu'on voie tout de suite ce que GEN MOTION fabrique. Si le visiteur a
 * demandé moins d'animations, elle reste sur son affiche avec ses
 * commandes. Un bouton remet le son (une lecture automatique ne peut pas).
 */
export default function VideoDeVitrine({ src, poster, titre, className }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const moinsDAnimations = useSyncExternalStore(
    suivreLaPreference,
    () => window.matchMedia(REQUETE_MOINS_D_ANIMATIONS).matches,
    () => false,
  );
  const [sonCoupe, setSonCoupe] = useState(true);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (moinsDAnimations) element.pause();
    else lancer(element);
  }, [moinsDAnimations]);

  return (
    <div className={`vitrine-video ${className ?? ""}`}>
      <video
        ref={video}
        src={src}
        poster={poster}
        muted={sonCoupe}
        loop
        playsInline
        preload="metadata"
        controls={moinsDAnimations}
        aria-label={titre}
      />
      {!moinsDAnimations && (
        <button
          type="button"
          className="vitrine-son"
          onClick={() => {
            setSonCoupe((avant) => !avant);
            lancer(video.current);
          }}
        >
          {sonCoupe ? "Mettre le son" : "Couper le son"}
        </button>
      )}
    </div>
  );
}
