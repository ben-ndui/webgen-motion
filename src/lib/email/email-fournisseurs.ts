/**
 * Les deux fournisseurs d'envoi, derrière un contrat commun.
 *
 * Chacun traduit le même message normalisé dans son propre format et rend un
 * `Tentative` — jamais une exception. L'orchestrateur (`envoyer-email.ts`)
 * décide de la bascule.
 */

const POINT_RESEND = "https://api.resend.com/emails";
const POINT_MAILJET = "https://api.mailjet.com/v3.1/send";

export interface PieceJointe {
  nom: string;
  /** Type MIME. Défaut : application/octet-stream. */
  type?: string;
  /** Contenu déjà encodé en base64. */
  base64: string;
}

export interface MessageEmail {
  /** « Nom <adresse> » ou adresse seule. */
  de: string;
  a: string | string[];
  sujet: string;
  html?: string;
  texte?: string;
  repondreA?: string;
  piecesJointes?: PieceJointe[];
}

export interface Tentative {
  ok: boolean;
  detail: string;
}

/**
 * Découpe « Nom <adresse@domaine> ». Resend accepte la forme complète, Mailjet
 * veut le nom et l'adresse dans deux champs distincts.
 */
export function decouperExpediteur(
  expediteur: string,
): { email: string; nom?: string } {
  const forme = /^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/.exec(expediteur ?? "");
  if (!forme) return { email: (expediteur ?? "").trim() };
  return { email: forme[2], nom: forme[1] || undefined };
}

function enListe(valeur: string | string[]): string[] {
  return Array.isArray(valeur) ? valeur : [valeur];
}

export async function envoyerViaResend(
  message: MessageEmail,
  cle: string,
): Promise<Tentative> {
  const corps: Record<string, unknown> = {
    from: message.de,
    to: enListe(message.a),
    subject: message.sujet,
  };
  if (message.html) corps.html = message.html;
  if (message.texte) corps.text = message.texte;
  if (message.repondreA) corps.reply_to = message.repondreA;
  if (message.piecesJointes) {
    corps.attachments = message.piecesJointes.map((piece) => ({
      filename: piece.nom,
      content: piece.base64,
    }));
  }

  const reponse = await fetch(POINT_RESEND, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cle}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(corps),
  });
  const texte = await reponse.text().catch(() => "");
  if (!reponse.ok) {
    return {
      ok: false,
      detail: `Resend ${reponse.status}: ${texte.slice(0, 200)}`,
    };
  }
  return { ok: true, detail: "Resend" };
}

/**
 * Envoi via Mailjet (Send API v3.1).
 *
 * ⚠️ Mailjet rend un statut PAR MESSAGE : la réponse peut être un 200 alors que
 * le message est en erreur (expéditeur non validé, par exemple). Juger sur
 * `Messages[0].Status`, jamais sur le seul code HTTP — sinon une panne
 * d'expéditeur passe pour un envoi réussi.
 */
export async function envoyerViaMailjet(
  message: MessageEmail,
  cles: { publique: string; privee: string },
): Promise<Tentative> {
  const de = decouperExpediteur(message.de);
  const envoi: Record<string, unknown> = {
    From: de.nom ? { Email: de.email, Name: de.nom } : { Email: de.email },
    To: enListe(message.a).map((adresse) => ({ Email: adresse })),
    Subject: message.sujet,
  };
  if (message.html) envoi.HTMLPart = message.html;
  if (message.texte) envoi.TextPart = message.texte;
  if (message.repondreA) {
    envoi.ReplyTo = { Email: decouperExpediteur(message.repondreA).email };
  }
  if (message.piecesJointes) {
    envoi.Attachments = message.piecesJointes.map((piece) => ({
      Filename: piece.nom,
      ContentType: piece.type || "application/octet-stream",
      Base64Content: piece.base64,
    }));
  }

  const identifiants = Buffer.from(
    `${cles.publique}:${cles.privee}`,
  ).toString("base64");
  const reponse = await fetch(POINT_MAILJET, {
    method: "POST",
    headers: {
      Authorization: `Basic ${identifiants}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Messages: [envoi] }),
  });
  const texte = await reponse.text().catch(() => "");
  if (!reponse.ok) {
    return {
      ok: false,
      detail: `Mailjet ${reponse.status}: ${texte.slice(0, 200)}`,
    };
  }

  let resultat: { Messages?: Array<Record<string, unknown>> };
  try {
    resultat = JSON.parse(texte);
  } catch {
    return {
      ok: false,
      detail: `Mailjet: réponse illisible (${texte.slice(0, 120)})`,
    };
  }
  const premier = resultat?.Messages?.[0];
  if (!premier || premier.Status !== "success") {
    const erreurs = (premier?.Errors ?? []) as Array<{ ErrorMessage?: string }>;
    const motif =
      erreurs.map((e) => e.ErrorMessage).filter(Boolean).join(" · ") ||
      (premier?.Status as string) ||
      "statut absent";
    return { ok: false, detail: `Mailjet: ${motif}` };
  }
  return { ok: true, detail: "Mailjet" };
}
