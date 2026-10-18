import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SettingsMenu from "./settings-menu";

/**
 * Une page de réglages sans lien pour y arriver est une porte orpheline
 * (conventions/portes-orphelines.md) : /setup/video a existé plusieurs
 * jours dans ce cas avant d'être repéré. Ce test fige la présence du lien.
 */
describe("SettingsMenu", () => {
  it("ouvre le menu et propose un lien vers chaque page de réglages, Vidéo IA comprise", () => {
    render(<SettingsMenu />);
    fireEvent.click(screen.getByRole("button", { name: /Settings/ }));
    for (const [label, href] of [
      ["Voix off", "/setup"],
      ["Agent IA", "/setup/agent"],
      ["Models 3D", "/setup/models"],
      ["Vidéo IA", "/setup/video"],
      ["Licence Studio", "/setup/license"],
    ] as const) {
      expect(screen.getByRole("menuitem", { name: new RegExp(label) })).toHaveAttribute("href", href);
    }
  });
});
