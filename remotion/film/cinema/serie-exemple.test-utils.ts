import type { CinemaDuFilm } from "./types";

/**
 * L'épisode de la recette du 14/10, au format série : Awa dans la boutique
 * (un plan avec elle, un plan du flacon seul), puis sur la terrasse avec sa
 * réplique. Partagé par les tests du validateur, du prompt et de la génération.
 */
export function serieSaya(): CinemaDuFilm {
  return {
    personnages: [
      {
        id: "awa",
        nom: "Awa",
        description: "A Black woman in her early thirties with an elegant braided updo, small gold hoop earrings and a midnight navy silk blouse with gold embroidery on the collar.",
      },
    ],
    objet: "An amber faceted glass perfume bottle with a sculpted gold stopper shaped like a hibiscus flower.",
    episodes: [
      {
        id: "ep1",
        titre: "L'héritage",
        scenes: [
          {
            id: "boutique",
            decor: "A small elegant perfume boutique with warm lights and wooden shelves.",
            plans: [
              { id: "rangement", consigne: "Awa places the bottle on a shelf, then turns toward the camera with a gentle smile.", personnages: ["awa"], objet: true },
              { id: "flacon", consigne: "The bottle on the shelf, a slow sweep of golden light across the glass.", personnages: [], objet: true },
            ],
          },
          {
            id: "terrasse",
            decor: "A rooftop terrace overlooking the sea at night, warm string lights.",
            plans: [
              {
                id: "confidence",
                consigne: "Close-up on Awa looking at someone just off camera.",
                personnages: ["awa"],
                objet: false,
                replique: { personnage: "awa", texte: "Ce parfum, c'est l'histoire de ma grand-mère." },
              },
            ],
          },
        ],
      },
    ],
  };
}
