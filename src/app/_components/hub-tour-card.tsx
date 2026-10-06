// Carte d'un tour dans le hub (extraite de hub-app.tsx, qui dépassait 250 lignes).
import Link from "next/link";
import TourCardMenu from "./tour-card-menu";

export interface HubTour {
  id: string;
  name: string;
  fmt: "16:9" | "9:16";
  steps: number;
  dur: string;
  cat: string;
  status: "draft" | "ready" | "rendered";
}

const STATUS_LABEL = { draft: "Brouillon", ready: "Prêt", rendered: "Rendu" } as const;

function Thumb({ tour }: { tour: HubTour }) {
  const phone = tour.fmt === "9:16";
  const body = (
    <div className="dev-body">
      <div className="b lg" />
      <div className="b w1" />
      {!phone && <div className="dev-accent" />}
      <div className="b w3" />
      <div className="b w2" />
      {phone && <div className="dev-accent" />}
    </div>
  );
  return (
    <div className="thumb" data-wm-id="hub.card.thumb">
      <div className="thumb-tl"><span className="fbadge">{tour.fmt}</span></div>
      <div className="thumb-br"><span className="dur">{tour.dur}</span></div>
      {phone ? (
        <div className="device phone">{body}</div>
      ) : (
        <div className="device mac">
          <div className="dev-bar"><i /><i /><i /></div>
          {body}
        </div>
      )}
      <div className="thumb-play"><span /></div>
    </div>
  );
}

export default function TourCard({ tour }: { tour: HubTour }) {
  return (
    <Link className="tcard" href={`/tour/${tour.id}`} data-wm-id="hub.card">
      <Thumb tour={tour} />
      <div className="tbody">
        <div className="tbody-top">
          <h3 className="tname">{tour.name}</h3>
          <TourCardMenu tourId={tour.id} tourName={tour.name} />
        </div>
        <div className="tmeta">
          <span className="tcat">{tour.cat}</span>
          <span>{tour.steps} étapes</span>
          <span className="sep" />
          <span>{tour.dur}</span>
          <span className="sep" />
          <span>{tour.fmt}</span>
        </div>
        <div className="tfoot">
          <span className={"status " + tour.status}>
            <span className="sdot" />{STATUS_LABEL[tour.status]}
          </span>
        </div>
      </div>
    </Link>
  );
}

