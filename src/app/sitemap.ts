import type { MetadataRoute } from "next";

const BASE = "https://genmotion.app";

/**
 * sitemap.xml — uniquement les pages marketing publiques (les écrans de
 * l'app sont exclus via robots.ts). Priorités : conversion (/, /download)
 * en tête, légales en bas.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/download", priority: 0.9, changeFrequency: "weekly" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/help", priority: 0.6, changeFrequency: "monthly" },
    { path: "/confidentialite", priority: 0.2, changeFrequency: "yearly" },
    { path: "/mentions-legales", priority: 0.2, changeFrequency: "yearly" },
    { path: "/cgu", priority: 0.2, changeFrequency: "yearly" },
    { path: "/cgv", priority: 0.2, changeFrequency: "yearly" },
  ];
  return pages.map((p) => ({
    url: `${BASE}${p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
