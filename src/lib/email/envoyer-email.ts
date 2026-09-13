/**
 * Envoi d'e-mail avec deux fournisseurs : un primaire et un secours.
 *
 * ## Pourquoi deux
 *
 * Le compte Resend est payant. Une facture impayée rétrograde le compte vers
 * l'offre gratuite, qui n'autorise que trois domaines : les envois des domaines
 * en trop sont refusés. Mailjet (offre gratuite, 6 000 envois par mois) prend
 * le relais sans redéploiement.
 *
 * Le primaire se choisit par la variable d'environnement EMAIL_FOURNISSEUR
 * ("mailjet" ou "resend"). En son absence, Resend reste primaire : poser ce
 * module ne change rien tant que la bascule n'est pas demandée.
 *
 * Jumeau TypeScript de `taxiboat/functions/envoi_email.js`. Les deux doivent
 * évoluer ensemble — même contrat, mêmes garde-fous.
 */

import {
  envoyerViaMailjet,
  envoyerViaResend,
  type MessageEmail,
  type Tentative,
} from "./email-fournisseurs";

export type { MessageEmail, PieceJointe } from "./email-fournisseurs";

export interface ConfigEmail {
  fournisseurPrimaire?: string;
  cleResend?: string;
  mailjetPublique?: string;
  mailjetPrivee?: string;
}

export interface ResultatEnvoi {
  envoye: boolean;
  fournisseur: "mailjet" | "resend" | null;
  echecs: string[];
}

/**
 * Envoie un message, en basculant sur le second fournisseur si le premier
 * échoue. Ne lève jamais : l'appelant décide quoi faire d'un échec — une
 * confirmation de commande se contente d'un journal, un code de connexion doit
 * prévenir l'utilisateur.
 */
export async function envoyerEmail(
  message: MessageEmail,
  config: ConfigEmail,
): Promise<ResultatEnvoi> {
  const tentatives: Array<{
    nom: "mailjet" | "resend";
    envoyer: () => Promise<Tentative>;
  }> = [];

  const ajouter = (nom: "mailjet" | "resend") => {
    if (nom === "mailjet" && config.mailjetPublique && config.mailjetPrivee) {
      tentatives.push({
        nom,
        envoyer: () =>
          envoyerViaMailjet(message, {
            publique: config.mailjetPublique as string,
            privee: config.mailjetPrivee as string,
          }),
      });
    }
    if (nom === "resend" && config.cleResend) {
      tentatives.push({
        nom,
        envoyer: () => envoyerViaResend(message, config.cleResend as string),
      });
    }
  };

  // Défaut volontaire : le fournisseur HISTORIQUE. Poser ce module ne change
  // donc rien tant que EMAIL_FOURNISSEUR n'a pas été posé à "mailjet" — la
  // bascule est une décision explicite, jamais un effet de bord.
  const primaire = config.fournisseurPrimaire === "mailjet"
    ? "mailjet"
    : "resend";
  ajouter(primaire);
  ajouter(primaire === "mailjet" ? "resend" : "mailjet");

  if (tentatives.length === 0) {
    return {
      envoye: false,
      fournisseur: null,
      echecs: ["Aucun fournisseur configuré (clés absentes)"],
    };
  }

  const echecs: string[] = [];
  for (const tentative of tentatives) {
    let resultat: Tentative;
    try {
      resultat = await tentative.envoyer();
    } catch (e) {
      resultat = {
        ok: false,
        detail: `${tentative.nom}: ${(e as Error).message}`,
      };
    }
    if (resultat.ok) {
      return { envoye: true, fournisseur: tentative.nom, echecs };
    }
    echecs.push(resultat.detail);
  }
  return { envoye: false, fournisseur: null, echecs };
}

/** Lit la configuration depuis l'environnement du processus. */
export function configEmailDepuisEnv(): ConfigEmail {
  return {
    fournisseurPrimaire: process.env.EMAIL_FOURNISSEUR,
    cleResend: process.env.RESEND_API_KEY,
    mailjetPublique: process.env.MJ_APIKEY_PUBLIC,
    mailjetPrivee: process.env.MJ_APIKEY_PRIVATE,
  };
}
