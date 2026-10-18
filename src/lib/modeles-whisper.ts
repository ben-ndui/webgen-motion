import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

import { dossierDesModeles } from "./whisper";

/**
 * Télécharger un modèle whisper.cpp dans ~/.whisper-models, depuis le dépôt
 * officiel (huggingface.co/ggerganov/whisper.cpp). SERVEUR SEULEMENT.
 *
 * L'empreinte sha256 et la taille sont ÉCRITES ICI (relevées le 17/10/2026,
 * identiques à la copie de Ben) et non lues sur le serveur au moment du
 * téléchargement : un fichier coupé, abîmé ou remplacé est refusé avant
 * d'arriver dans le dossier. On écrit dans `.part`, renommé seulement si tout
 * concorde : un téléchargement interrompu ne laisse jamais un faux modèle.
 */

/** Ce qu'il faut pour télécharger un modèle et prouver que c'est le bon. */
export type ModeleATelecharger = { fichier: string; octets: number; sha256: string };
export type ModeleWhisper = ModeleATelecharger & { nom: "medium" | "small"; libelle: string };

export const MODELES_WHISPER: Record<ModeleWhisper["nom"], ModeleWhisper> = {
  medium: {
    nom: "medium",
    fichier: "ggml-medium.bin",
    octets: 1_533_763_059,
    sha256: "6c14d5adee5f86394037b4e4e8b59f1673b6cee10e3cf0b11bbdbee79c156208",
    libelle: "Recommandé : le plus fidèle sur une voix chantée (1,5 Go)",
  },
  small: {
    nom: "small",
    fichier: "ggml-small.bin",
    octets: 487_601_967,
    sha256: "1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b",
    libelle: "Plus léger, moins précis sur le chant (490 Mo)",
  },
};

export function adresseDuModele(modele: ModeleWhisper): string {
  return `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${modele.fichier}`;
}

export type Progression = (recus: number, total: number) => void;
export type ResultatDuTelechargement = { ok: true; chemin: string } | { ok: false; raison: string };

/** Sert aussi au modèle d'alignement du karaoké (karaoke-alignement/), qui passe son `adresse`. */
export async function telechargerUnModele(
  modele: ModeleWhisper | (ModeleATelecharger & { adresse: string }),
  surProgression: Progression = () => {},
  options: { dossier?: string; recuperer?: typeof fetch; adresse?: string } = {},
): Promise<ResultatDuTelechargement> {
  const dossier = options.dossier ?? dossierDesModeles();
  const chemin = join(dossier, modele.fichier);
  const partiel = `${chemin}.part`;
  mkdirSync(dossier, { recursive: true });
  let reponse: Response;
  try {
    const adresse = options.adresse ?? ("adresse" in modele ? modele.adresse : adresseDuModele(modele));
    reponse = await (options.recuperer ?? fetch)(adresse);
  } catch {
    return { ok: false, raison: "Téléchargement impossible : vérifie ta connexion." };
  }
  if (!reponse.ok || !reponse.body) return { ok: false, raison: `Le dépôt des modèles a répondu ${reponse.status}.` };

  const empreinte = createHash("sha256");
  const sortie = createWriteStream(partiel);
  // Disque plein, dossier interdit : sans cet écouteur, l'erreur d'écriture plantait
  // le serveur et l'attente de « drain » ne finissait jamais (verrou posé jusqu'au
  // redémarrage, relecture du 18/10/2026). Elle fait maintenant échouer chaque attente.
  const ecritureRatee = new Promise<never>((_, echec) => sortie.once("error", echec));
  ecritureRatee.catch(() => {});
  let recus = 0;
  try {
    const lecteur = reponse.body.getReader();
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      empreinte.update(value);
      recus += value.byteLength;
      if (!sortie.write(value)) await Promise.race([new Promise<void>((suite) => sortie.once("drain", () => suite())), ecritureRatee]);
      surProgression(recus, modele.octets);
    }
    const fin = new Promise<void>((suite, echec) => sortie.end((erreur?: Error | null) => (erreur ? echec(erreur) : suite())));
    await Promise.race([fin, ecritureRatee]);
  } catch (erreur) {
    sortie.destroy();
    rmSync(partiel, { force: true });
    const disquePlein = (erreur as NodeJS.ErrnoException | undefined)?.code === "ENOSPC";
    return { ok: false, raison: disquePlein ? "Plus assez de place sur le disque : libère de l'espace, puis relance." : "Téléchargement interrompu : relance-le." };
  }

  if (recus !== modele.octets || empreinte.digest("hex") !== modele.sha256) {
    rmSync(partiel, { force: true });
    return { ok: false, raison: "Le fichier reçu ne correspond pas au modèle officiel (taille ou empreinte) : refusé." };
  }
  renameSync(partiel, chemin);
  return { ok: true, chemin };
}

/**
 * Le modèle est-il là, ENTIER ? Il n'arrive qu'après vérification quand l'app le
 * télécharge ; la taille écarte en plus un fichier copié à la main, tronqué ou
 * d'une autre version, qui s'afficherait « Installé » sans jamais servir.
 */
export function modelePresent(modele: ModeleATelecharger, dossier: string = dossierDesModeles()): boolean {
  const chemin = join(dossier, modele.fichier);
  return existsSync(chemin) && statSync(chemin).size === modele.octets;
}
