/**
 * La vignette d'une carte du hub : un cadre de téléphone (portrait, 9:16) ou
 * de portable (paysage, 16:9) qui dit le format d'un coup d'œil, et dedans
 * une image de la VRAIE vidéo quand elle est rendue (une image fixe : rien
 * ne bouge dans la grille), prise là où le contenu se voit, pas dans l'intro
 * (à 1,5 s, tout n'était qu'un aplat de couleur). Pas encore rendue : le croquis
 * d'écran, comme avant — on ne montre pas une vidéo qui n'existe pas.
 */
type Props = {
  portrait: boolean;
  // L'adresse de la vidéo rendue, ou null.
  video: string | null;
  // Le badge en haut à gauche (« 9:16 ») et la durée en bas à droite.
  badge: string;
  duree?: string;
  // La seconde de la vidéo à montrer.
  instant: number;
};

function Croquis({ portrait }: { portrait: boolean }) {
  return (
    <div className="dev-body">
      <div className="b lg" />
      <div className="b w1" />
      {!portrait && <div className="dev-accent" />}
      <div className="b w3" />
      <div className="b w2" />
      {portrait && <div className="dev-accent" />}
    </div>
  );
}

export default function ApercuDuCadre({ portrait, video, badge, duree, instant }: Props) {
  // Le fragment #t= fait afficher cette image ; preload="metadata" ne charge
  // que de quoi l'afficher, pas toute la vidéo.
  const ecran = video ? <video className="dev-video" src={`${video}#t=${instant}`} muted playsInline preload="metadata" aria-hidden tabIndex={-1} /> : <Croquis portrait={portrait} />;
  return (
    <div className="thumb" data-wm-id="hub.card.thumb" data-apercu={video ? "video" : "croquis"}>
      <div className="thumb-tl"><span className="fbadge">{badge}</span></div>
      {duree && <div className="thumb-br"><span className="dur">{duree}</span></div>}
      {portrait ? (
        <div className="device phone">{ecran}</div>
      ) : (
        <div className="device mac">
          <div className="dev-bar"><i /><i /><i /></div>
          {ecran}
        </div>
      )}
      <div className="thumb-play"><span /></div>
    </div>
  );
}

/** « 1min 35s » → 95 ; « 25s » → 25 ; illisible → null. */
export function secondes(duree: string): number | null {
  const minutes = /(\d+)\s*min/.exec(duree);
  const sec = /(\d+)\s*s\b/.exec(duree);
  if (!minutes && !sec) return null;
  return Number(minutes?.[1] ?? 0) * 60 + Number(sec?.[1] ?? 0);
}
