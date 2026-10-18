/**
 * Ce que GEN MOTION a besoin de savoir pour tout faire, et ce que chaque
 * réglage débloque. Module pur : la lecture de la config est faite par
 * l'appelant (`lire-l-etat-des-reglages.ts`, côté serveur).
 *
 * Pourquoi : après une installation, l'app n'a pas les clés du `.env.local`
 * de développement. Elle ne le disait pas : la pastille « Configuré » ne
 * regardait que la voix off, et la série échouait plus loin (16/10/2026).
 */
export type CleDuReglage = "claude" | "video" | "voix" | "paroles" | "karaoke";

export type Reglage = {
  cle: CleDuReglage;
  titre: string;
  debloque: string;
  pret: boolean;
  page: string;
  // Un module en plus (le calage mot à mot, 356 Mo) : proposé, jamais compté comme « à faire ».
  optionnel?: boolean;
};

// `null` : le réglage ne peut pas servir sur cette machine (il n'est pas proposé du tout).
export type ReglagesPresents = Record<Exclude<CleDuReglage, "karaoke">, boolean> & { karaoke: boolean | null };

const DESCRIPTIONS: Record<CleDuReglage, Omit<Reglage, "cle" | "pret">> = {
  claude: {
    titre: "Claude",
    debloque: "Écrit tes textes, ton épisode de série, et répond dans la console.",
    page: "/setup/agent",
  },
  video: {
    titre: "Vidéo IA (Google)",
    debloque: "Génère les plans vidéo de ta série et les portraits de tes personnages.",
    page: "/setup/video",
  },
  voix: {
    titre: "Voix off",
    debloque: "Dit tes textes dans tes films et tes tours.",
    page: "/setup",
  },
  paroles: {
    titre: "Écoute locale (whisper)",
    debloque: "Cale les paroles de tes clips karaoké et vérifie les répliques de ta série, sans rien envoyer en ligne.",
    page: "/setup/paroles",
  },
  karaoke: {
    titre: "Calage mot à mot (karaoké)",
    debloque: "Pose tes paroles en français au mot près sur ton morceau, en 20 secondes. Un modèle de 356 Mo, téléchargé une fois.",
    page: "/setup/paroles",
  },
};

const ORDRE: CleDuReglage[] = ["claude", "video", "voix", "paroles", "karaoke"];

const OPTIONNELS: CleDuReglage[] = ["karaoke"];

export function etatDesReglages(presents: ReglagesPresents): Reglage[] {
  const reglages: Reglage[] = [];
  for (const cle of ORDRE) {
    const pret = presents[cle];
    if (pret === null) continue;
    reglages.push({ cle, ...DESCRIPTIONS[cle], pret, ...(OPTIONNELS.includes(cle) ? { optionnel: true } : {}) });
  }
  return reglages;
}

/** Ce qui manque pour TOUT faire : les modules optionnels n'en font pas partie. */
export function reglagesManquants(reglages: Reglage[]): Reglage[] {
  return reglages.filter((reglage) => !reglage.pret && !reglage.optionnel);
}

/** Les modules optionnels pas encore installés : à proposer, une fois. */
export function optionnelsAProposer(reglages: Reglage[]): Reglage[] {
  return reglages.filter((reglage) => !reglage.pret && reglage.optionnel);
}

/**
 * La page de réglage dont parle un message d'erreur (« Aucune clé Gemini :
 * ajoute-la dans les Réglages »), pour y envoyer d'un clic au bon endroit.
 */
export function pageDuReglage(message: string): string {
  if (/gemini|veo|vid[ée]o ia/i.test(message)) return DESCRIPTIONS.video.page;
  if (/claude|anthropic/i.test(message)) return DESCRIPTIONS.claude.page;
  if (/whisper/i.test(message)) return DESCRIPTIONS.paroles.page;
  return "/setup";
}
