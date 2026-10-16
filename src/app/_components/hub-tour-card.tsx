// Carte d'un tour dans le hub (extraite de hub-app.tsx, qui dépassait 250 lignes).
import Link from "next/link";
import ApercuDuCadre, { secondes } from "./apercu-du-cadre";
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

export default function TourCard({ tour }: { tour: HubTour }) {
  return (
    <Link className="tcard" href={`/tour/${tour.id}`} data-wm-id="hub.card">
      <ApercuDuCadre
        portrait={tour.fmt === "9:16"}
        video={tour.status === "rendered" ? `/api/motion/tour/preview/final?id=${encodeURIComponent(tour.id)}` : null}
        badge={tour.fmt}
        duree={tour.dur}
        // À 40 % : passé le carton d'intro, au milieu d'une section.
        instant={Math.round((secondes(tour.dur) ?? 10) * 0.4)}
      />
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

