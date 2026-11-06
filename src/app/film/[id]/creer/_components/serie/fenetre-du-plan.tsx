"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// .remplissage-icone (bouton fermer) vient de là : même geste, même style
// que les autres fenêtres de l'assistant.
import "../remplissage/remplissage.css";

type Props = { numero: number; src: string; fermer: () => void };

/**
 * Le plan en grand, ouvert depuis son petit lecteur de montage : mêmes
 * conventions que FenetreDeReference (fond cliquable, Échap, focus au
 * montage), mais dimensionnée en hauteur — une vidéo 9:16 en pleine largeur
 * dépasserait l'écran.
 */
export default function FenetreDuPlan({ numero, src, fermer }: Props) {
  const fenetre = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fenetre.current?.focus();
  }, []);

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [fermer]);

  return (
    <div className="plan-fond" onClick={fermer}>
      <div ref={fenetre} className="plan-fenetre" role="dialog" aria-modal="true" aria-label={`Plan ${numero} en grand`} tabIndex={-1} onClick={(e) => e.stopPropagation()} data-wm-id="serie.plan.fenetre">
        <button type="button" className="remplissage-icone plan-fenetre-fermer" onClick={fermer} aria-label="Fermer">
          <X aria-hidden />
        </button>
        <video className="plan-fenetre-video" src={src} controls autoPlay playsInline />
      </div>
    </div>
  );
}
