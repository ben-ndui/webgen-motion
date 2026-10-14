/**
 * Le serveur écrit seul deux champs de la série : la vidéo d'un plan
 * (`fichier`) et le portrait d'un personnage (`portrait`). L'écran renvoie la
 * fiche ENTIÈRE à chaque frappe ; une sauvegarde partie au mauvais moment
 * effacerait la vidéo d'un plan déjà payé, qui s'afficherait « vide ».
 *
 * À chaque enregistrement, ces deux champs sont donc repris de la fiche du
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

function reprendre(entrants: Objet[], actuels: Objet[], champ: "fichier" | "portrait"): void {
  const parId = new Map(actuels.map((element) => [element.id, element[champ]]));
  for (const element of entrants) {
    const valeur = parId.get(element.id);
    if (typeof valeur === "string") element[champ] = valeur;
    else delete element[champ];
  }
}

/** Modifie `entrante` en place et la rend. Une fiche illisible passe telle quelle. */
export function garderLesChampsDuServeur(entrante: unknown, actuelle: unknown): unknown {
  if (!estObjet(entrante) || !estObjet(entrante.cinema)) return entrante;
  const cinemaActuel = estObjet(actuelle) ? actuelle.cinema : undefined;
  reprendre(plansDe(entrante.cinema), plansDe(cinemaActuel), "fichier");
  reprendre(personnagesDe(entrante.cinema), personnagesDe(cinemaActuel), "portrait");
  return entrante;
}
