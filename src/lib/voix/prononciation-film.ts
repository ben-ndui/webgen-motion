/**
 * Ce que la voix doit DIRE d'un texte écrit pour l'écran. La voix de
 * synthèse lit « / » « barre oblique » ; on veut « slash », comme on le dit
 * d'une adresse. Entre deux nombres (« 24/7 »), « / » se lit « sur » : on n'y
 * touche pas. Le « https:// » d'une adresse ne se prononce pas.
 */
export function texteAPrononcer(texte: string): string {
  return texte
    .replace(/https?:\/\//gi, "")
    .replace(/(?<!\d)\/|\/(?!\d)/g, " slash ")
    .replace(/\s+slash\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}
