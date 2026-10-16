import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TourCard, { type HubTour } from "./hub-tour-card";

const TOUR: HubTour = { id: "uzme-landing", name: "UZME", fmt: "9:16", steps: 8, dur: "35s", cat: "Branding", status: "rendered" };

describe("TourCard — aperçu", () => {
  it("rendu : l'image de la vraie vidéo, dans un cadre de téléphone pour un 9:16", () => {
    const { container } = render(<TourCard tour={TOUR} />);
    expect(container.querySelector("video")?.getAttribute("src")).toBe("/api/motion/tour/preview/final?id=uzme-landing#t=14");
    expect(container.querySelector(".device.phone")).not.toBeNull();
  });

  it("brouillon en 16:9 : le croquis dans un cadre de portable, aucune vidéo", () => {
    const { container } = render(<TourCard tour={{ ...TOUR, fmt: "16:9", status: "draft" }} />);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector(".device.mac")).not.toBeNull();
    expect(container.querySelector("[data-apercu='croquis']")).not.toBeNull();
  });
});
