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
 * ("mailjet" ou "resend"). En son absence, Mailjet est primaire depuis la
 * bascule du 13/09/2026 ; Resend reste le secours.
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

  // Bascule du 13/09/2026 : Mailjet est devenu le primaire, Resend le secours.
  //
  // Le défaut vit ICI, dans le dépôt, et pas seulement dans une variable
  // d'environnement : le même mécanisme vaut côté Cloud Functions, où `.env*`
  // est ignoré par git et se perdrait au déploiement suivant.
  //
  // Retour en arrière : poser EMAIL_FOURNISSEUR=resend, ou rendre son ancienne
  // valeur à cette ligne. Dans les deux cas Mailjet reste le secours.
  const primaire = config.fournisseurPrimaire === "resend"
    ? "resend"
    : "mailjet";
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
