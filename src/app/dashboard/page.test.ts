import { afterEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect }));

const getAllTours = vi.fn(() => []);
vi.mock("@/lib/tour-loader", () => ({ getAllTours }));

describe("/dashboard sur la vitrine publique", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("renvoie vers /download sans toucher au disque (le hub n'existe que dans l'app locale)", async () => {
    vi.stubEnv("VERCEL", "1");
    const { default: DashboardPage } = await import("./page");
    expect(() => DashboardPage()).toThrow("NEXT_REDIRECT:/download");
    expect(redirect).toHaveBeenCalledWith("/download");
    expect(getAllTours).not.toHaveBeenCalled();
  });
});
