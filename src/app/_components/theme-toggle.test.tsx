import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "./theme-toggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  // jsdom lacks matchMedia — default to light.
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

describe("<ThemeToggle/>", () => {
  it("renders a labelled control defaulting to 'switch to dark'", async () => {
    render(<ThemeToggle />);
    const btn = await screen.findByRole("button", { name: /thème sombre/i });
    expect(btn).toHaveAttribute("data-wm-id", "chrome.theme-toggle");
  });

  it("toggles data-theme + persists on click", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const btn = await screen.findByRole("button", { name: /thème sombre/i });

    await user.click(btn);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    // label now offers the reverse
    expect(
      screen.getByRole("button", { name: /thème clair/i }),
    ).toBeInTheDocument();

    await user.click(btn);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("reflects an existing stored preference", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(<ThemeToggle />);
    // stored dark -> offers switch to light
    expect(
      await screen.findByRole("button", { name: /thème clair/i }),
    ).toBeInTheDocument();
  });
});
