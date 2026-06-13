import type { MetadataRoute } from "next";

const BASE = "https://genmotion.app";

/**
 * robots.txt généré par Next. On indexe les pages marketing (/, /download,
 * /about, /help, légales) et on EXCLUT les écrans de l'outil (servis aussi
 * sur le web mais ce sont des UI applicatives, pas du contenu) + l'API.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/tour/",
        "/setup",
        "/compose/",
        "/console",
        "/notary",
        "/thanks",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
