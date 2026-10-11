import type { CSSProperties } from "react";
import { Freeze, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";

/** Une capture est une vidéo si son fichier en est une (« parcours-2.mp4 »). */
export function estUneVideo(fichier: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(fichier);
}

type Props = {
  // Chemin dans public/.
  fichier: string;
  style: CSSProperties;
  // Image (dans la séquence courante) où la vidéo se met à jouer : avant,
  // on voit sa première image, figée. Une image fixe l'ignore.
  debut?: number;
};

/**
 * Un écran RÉEL du produit : une capture, ou une vidéo filmée du site qui
 * se met à défiler au moment où l'écran arrive au premier plan (pas au
 * début du plan, où il n'est encore qu'un voisin en retrait). Muette : la
 * bande son du film est la musique et la voix.
 */
export function EcranReel({ fichier, style, debut = 0 }: Props) {
  const image = useCurrentFrame();
  if (!estUneVideo(fichier)) return <Img src={staticFile(fichier)} style={style} />;
  const video = <OffthreadVideo src={staticFile(fichier)} muted style={style} />;
  if (image < debut) return <Freeze frame={0}>{video}</Freeze>;
  return (
    <Sequence from={debut} layout="none">
      {video}
    </Sequence>
  );
}
