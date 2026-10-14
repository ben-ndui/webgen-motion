/**
 * Le serveur écrit seul les champs qui disent ce qui a été généré : la vidéo
 * d'un plan (`fichier`) et si elle l'a été avec le vrai produit
 * (`produitReel`), le portrait d'un personnage (`portrait`), la photo du
 * produit (`photoDeLObjet`). L'écran renvoie la fiche ENTIÈRE à chaque
 * frappe ; une sauvegarde partie au mauvais moment effacerait la vidéo d'un
 * plan déjà payé, qui s'afficherait « vide ».
 *
 * À chaque enregistrement, ces champs sont donc repris de la fiche du
 * DISQUE, quoi que le navigateur envoie : il ne peut ni les effacer, ni les
 * poser. Les plans et personnages se reconnaissent par leur id.
 */
type Objet = Record<string, unknown>;

const estObjet = (valeur: unknown): valeur is Objet => typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
const liste = (valeur: unknown): unknown[] => (Array.isArray(valeur) ? valeur : []);

function plansDe(cinema: unknown): Objet[] {
  if (!estObjet(cinema)) return [];
  return liste(cinema.episodes)
    .flatMap((episode) => (estObjet(episode) ? liste(episode.scenes) : []))
    .flatMap((scene) => (estObjet(scene) ? liste(scene.plans) : []))
    .filter(estObjet);
}

function personnagesDe(cinema: unknown): Objet[] {
  return estObjet(cinema) ? liste(cinema.personnages).filter(estObjet) : [];
}

function reprendre(entrants: Objet[], actuels: Objet[], champ: "fichier" | "portrait" | "produitReel"): void {
  const parId = new Map(actuels.map((element) => [element.id, element[champ]]));
  for (const element of entrants) {
    const valeur = parId.get(element.id);
    if (valeur !== undefined) element[champ] = valeur;
    else delete element[champ];
  }
}

/** Modifie `entrante` en place et la rend. Une fiche illisible passe telle quelle. */
export function garderLesChampsDuServeur(entrante: unknown, actuelle: unknown): unknown {
  if (!estObjet(entrante) || !estObjet(entrante.cinema)) return entrante;
  const cinemaActuel = estObjet(actuelle) ? actuelle.cinema : undefined;
  reprendre(plansDe(entrante.cinema), plansDe(cinemaActuel), "fichier");
  reprendre(plansDe(entrante.cinema), plansDe(cinemaActuel), "produitReel");
  reprendre(personnagesDe(entrante.cinema), personnagesDe(cinemaActuel), "portrait");
  const photo = estObjet(cinemaActuel) ? cinemaActuel.photoDeLObjet : undefined;
  if (typeof photo === "string") entrante.cinema.photoDeLObjet = photo;
  else delete entrante.cinema.photoDeLObjet;
  return entrante;
}
