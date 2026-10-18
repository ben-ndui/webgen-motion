import type { TourEntry } from "@/lib/types/tour";

export type Platform = "web" | "ios" | "android";

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "localhost";
  }
}

export function makeStarterTour(opts: {
  id: string;
  name: string;
  platform: Platform;
  format: "16:9" | "9:16";
  baseUrl: string;
  appId: string;
}): TourEntry {
  const { id, name, platform, format, baseUrl, appId } = opts;

  if (platform === "ios" || platform === "android") {
    return {
      id,
      name,
      description: "Tour mobile — édite les steps depuis le tab Script.",
      estimatedSec: 20,
      platform,
      appId,
      startPath: "/",
      format: "9:16",
      brand: { displayName: name, domain: appId, tagline: "by Smooth & Design" },
      steps: [
        { type: "launchApp", appId },
        { type: "section", categoryId: "branding", title: name, subtitle: "Première section", dwellMs: 2500 },
        { type: "wait", dwellMs: 2000 },
        { type: "overlay", text: "Édite ce tour dans le tab Script", position: "center", dwellMs: 3500 },
      ],
    } as TourEntry;
  }

  return {
    id,
    name,
    description: "Nouveau tour — édite les steps depuis le tab Script.",
    estimatedSec: 20,
    platform: "web",
    startPath: "/",
    baseUrl,
    format,
    brand: {
      displayName: name,
      domain: safeHost(baseUrl),
      tagline: "by Smooth & Design",
    },
    steps: [
      { type: "section", categoryId: "branding", title: name, subtitle: "Première section", dwellMs: 2500 },
      { type: "wait", dwellMs: 2000 },
      { type: "overlay", text: "Démarre par éditer ce tour dans le tab Script", position: "center", dwellMs: 3500 },
    ],
  };
}
