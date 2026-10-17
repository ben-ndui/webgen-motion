import { CATALOGUE, type FicheDeFormat } from "./catalogue";

/**
 * Les textes d'un projet encore identiques à l'EXEMPLE du format : tant qu'il
 * en reste un, la vidéo dirait la phrase de quelqu'un d'autre (l'exemple est
 * une histoire vraie, mais pas la sienne). Le serveur en déduit `exemple` à
 * chaque enregistrement : ce n'est jamais le navigateur qui le décide.
 *
 * Méthode : toute chaîne des textes (dans les langues rendues) qui figure
 * parmi les chaînes de l'exemple. Les clés `type` (« chiffre », « liste »)
 * sont des choix de visuel, pas du texte.
 */

export type TexteAEcrire = { chemin: string; texte: string };

function chaines(valeur: unknown, chemin: string, sortie: TexteAEcrire[]): TexteAEcrire[] {
  if (typeof valeur === "string") {
    if (valeur.trim()) sortie.push({ chemin, texte: valeur });
  } else if (Array.isArray(valeur)) {
    valeur.forEach((element, index) => chaines(element, `${chemin}[${index}]`, sortie));
  } else if (typeof valeur === "object" && valeur !== null) {
    for (const [cle, element] of Object.entries(valeur)) {
      if (cle !== "type") chaines(element, chemin ? `${chemin}.${cle}` : cle, sortie);
    }
  }
  return sortie;
}

export function textesAEcrire(fiche: FicheDeFormat): TexteAEcrire[] {
  const modele = CATALOGUE[fiche.format].modele as FicheDeFormat["spec"];
  const exemple = new Set(chaines(modele.textes, "", []).map((t) => t.texte.trim()));
  const langues = [...new Set(fiche.spec.declinaisons.map((d) => d.langue))];
  const restants = langues.flatMap((langue) => chaines(fiche.spec.textes[langue], `textes.${langue}`, []));
  // Le karaoké d'exemple porte un vrai titre et un vrai artiste : ceux de l'exemple, pas les siens.
  if (fiche.format === "karaoke" && modele && "morceau" in modele) {
    for (const cle of ["titre", "artiste"] as const) {
      if (fiche.spec.morceau[cle].trim() === modele.morceau[cle].trim()) exemple.add(fiche.spec.morceau[cle].trim());
      restants.push({ chemin: `morceau.${cle}`, texte: fiche.spec.morceau[cle] });
    }
  }
  // La signature de l'exemple (son nom, son contact) n'est pas celle de la personne : une vidéo
  // neuve ne doit pas partir signée par quelqu'un d'autre.
  const signature: [string, string, string][] = [
    ["marque.nom", fiche.spec.marque.nom ?? "", modele.marque.nom ?? ""],
    ["marque.logo", fiche.spec.marque.logo.type === "motSymbole" ? fiche.spec.marque.logo.texte : "", modele.marque.logo.type === "motSymbole" ? modele.marque.logo.texte : ""],
    ["marque.contact", fiche.spec.marque.contact, modele.marque.contact],
  ];
  for (const [chemin, actuel, deLExemple] of signature) {
    if (actuel.trim() && actuel.trim() === deLExemple.trim()) restants.push({ chemin, texte: actuel });
  }
  const confirmes = new Set(fiche.confirmes ?? []);
  return restants.filter((t) => (exemple.has(t.texte.trim()) || t.chemin.startsWith("marque.")) && !confirmes.has(t.chemin));
}
