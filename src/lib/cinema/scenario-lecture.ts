import type { CinemaDuFilm, EpisodeDeCinema, Personnage, PlanDeCinema } from "../../../remotion/film/cinema/types";
import { erreursDuCinema } from "../../../remotion/film/cinema/validerCinema";
import { EXEMPLES_DE_SERIE } from "../../../remotion/film/cinema/exemples";
import { LIMITES_DU_SCENARIO } from "./scenario-demande";

/**
 * Transformer la réponse de Claude en épisode AJOUTÉ à la série : les
 * personnages déjà là sont reconnus à leur prénom (ils gardent leur portrait),
 * les nouveaux sont créés, les ids sont libres dans tout le film. Module pur.
 * Rien n'est gardé de ce qui sort des règles : la série rendue passe le
 * validateur, sinon c'est un refus avec la liste.
 */
type Objet = Record<string, unknown>;
const estObjet = (v: unknown): v is Objet => typeof v === "object" && v !== null && !Array.isArray(v);
const texte = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Un id de fichier tiré du prénom (« Léa » → « lea »), libre dans la série. */
function idDe(nom: string, pris: Set<string>): string {
  const sansAccents = nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const avecTirets = sansAccents.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const base = avecTirets || "personnage";
  let id = base;
  for (let n = 2; pris.has(id); n++) id = `${base}-${n}`;
  pris.add(id);
  return id;
}

const numeroLibre = (ids: string[], prefixe: string) => Math.max(0, ...ids.map((id) => Number(id.replace(prefixe, ""))).filter(Number.isFinite)) + 1;

// L'épisode d'exemple de « Commencer la série », jamais touché : il n'a rien à faire devant l'épisode écrit.
function estLEpisodeDeDepartVierge(episode: EpisodeDeCinema): boolean {
  const plans = episode.scenes.flatMap((s) => s.plans);
  return (
    episode.titre === EXEMPLES_DE_SERIE.titre &&
    episode.scenes.length === 1 &&
    episode.scenes[0].decor === EXEMPLES_DE_SERIE.decor &&
    plans.length === 1 &&
    plans[0].consigne === EXEMPLES_DE_SERIE.consigne &&
    !plans[0].fichier
  );
}

export type LectureDuScenario = { ok: true; cinema: CinemaDuFilm; episodeId: string } | { ok: false; erreurs: string[] };

export function ajouterLEpisodeEcrit(actuel: CinemaDuFilm | undefined, reponse: unknown): LectureDuScenario {
  if (!estObjet(reponse)) return { ok: false, erreurs: ["la réponse n'est pas un objet JSON"] };
  const cinema: CinemaDuFilm = actuel ? structuredClone(actuel) : { personnages: [], episodes: [] };
  cinema.episodes = cinema.episodes.filter((e) => !estLEpisodeDeDepartVierge(e));
  const idsPris = new Set(cinema.personnages.map((p) => p.id));
  const parPrenom = new Map(cinema.personnages.map((p) => [p.nom.toLowerCase(), p.id]));

  for (const brut of liste(reponse.personnages).filter(estObjet)) {
    const nom = texte(brut.nom);
    if (!nom || parPrenom.has(nom.toLowerCase())) continue;
    const nouveau: Personnage = { id: idDe(nom, idsPris), nom, description: texte(brut.description) };
    cinema.personnages.push(nouveau);
    parPrenom.set(nom.toLowerCase(), nouveau.id);
  }
  if (!cinema.objet && texte(reponse.objet)) cinema.objet = texte(reponse.objet);

  const tousLesPlans = cinema.episodes.flatMap((e) => e.scenes.flatMap((s) => s.plans.map((p) => p.id)));
  const toutesLesScenes = cinema.episodes.flatMap((e) => e.scenes.map((s) => s.id));
  let prochainPlan = numeroLibre(tousLesPlans, "plan-");
  let prochaineScene = numeroLibre(toutesLesScenes, "scene-");
  const episodeId = `ep${numeroLibre(cinema.episodes.map((e) => e.id), "ep")}`;
  const L = LIMITES_DU_SCENARIO;

  const episode: EpisodeDeCinema = { id: episodeId, titre: texte(reponse.titre) || `Épisode ${cinema.episodes.length + 1}`, scenes: [] };
  for (const brute of liste(reponse.scenes).filter(estObjet).slice(0, L.scenes)) {
    const plans: PlanDeCinema[] = [];
    for (const brut of liste(brute.plans).filter(estObjet).slice(0, L.plansParScene)) {
      const personnages = [...new Set(liste(brut.personnages).map((n) => parPrenom.get(texte(n).toLowerCase())).filter((id): id is string => !!id))].slice(0, L.personnagesParPlan);
      const plan: PlanDeCinema = { id: `plan-${prochainPlan++}`, consigne: texte(brut.consigne), personnages, objet: brut.objet === true && !!cinema.objet };
      const replique = estObjet(brut.replique) ? brut.replique : null;
      const orateur = replique ? parPrenom.get(texte(replique.personnage).toLowerCase()) : undefined;
      // Une réplique n'est gardée que si celui qui parle est à l'image.
      if (replique && orateur && personnages.includes(orateur) && texte(replique.texte)) {
        plan.replique = { personnage: orateur, texte: texte(replique.texte).slice(0, L.replique) };
      }
      plans.push(plan);
    }
    if (plans.length > 0) episode.scenes.push({ id: `scene-${prochaineScene++}`, decor: texte(brute.decor), plans });
  }
  const total = episode.scenes.reduce((n, s) => n + s.plans.length, 0);
  if (total === 0) return { ok: false, erreurs: ["Claude n'a proposé aucun plan"] };
  if (total > L.plansAuTotal) return { ok: false, erreurs: [`Claude a proposé ${total} plans, ${L.plansAuTotal} au plus : raccourcis le brief`] };
  cinema.episodes.push(episode);

  const erreurs = erreursDuCinema({ cinema });
  return erreurs.length > 0 ? { ok: false, erreurs } : { ok: true, cinema, episodeId };
}
