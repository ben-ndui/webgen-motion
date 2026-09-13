import { afterEach, describe, expect, it, vi } from "vitest";

import { envoyerEmail } from "./envoyer-email";
import { decouperExpediteur, type MessageEmail } from "./email-fournisseurs";

const CLES = {
  cleResend: "re_factice",
  mailjetPublique: "mj_pub_factice",
  mailjetPrivee: "mj_priv_factice",
};

const MESSAGE: MessageEmail = {
  de: "SAYA NATURE <noreply@exemple.fr>",
  a: "cliente@exemple.fr",
  sujet: "Votre commande",
  texte: "Merci pour votre commande.",
};

const MAILJET_OK = { corps: JSON.stringify({ Messages: [{ Status: "success" }] }) };

interface Reponse {
  ok?: boolean;
  status?: number;
  corps?: string;
}

/** Remplace fetch par une file de réponses, et note les appels. */
function simulerFetch(reponses: Array<Reponse | (() => never)>) {
  const appels: Array<{ url: string; body: string }> = [];
  vi.stubGlobal("fetch", async (url: string, options: { body: string }) => {
    appels.push({ url, body: options.body });
    const suivante = reponses.shift();
    if (typeof suivante === "function") return suivante();
    return {
      ok: suivante?.ok !== false,
      status: suivante?.status ?? 200,
      text: async () => suivante?.corps ?? "",
    };
  });
  return appels;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("decouperExpediteur", () => {
  it("sépare le nom de l'adresse", () => {
    expect(decouperExpediteur("SAYA <noreply@exemple.fr>")).toEqual({
      email: "noreply@exemple.fr",
      nom: "SAYA",
    });
  });

  it("accepte une adresse seule", () => {
    expect(decouperExpediteur("noreply@exemple.fr")).toEqual({
      email: "noreply@exemple.fr",
    });
  });
});

describe("envoyerEmail", () => {
  it("sans EMAIL_FOURNISSEUR, le primaire est Mailjet", async () => {
    // Bascule du 13/09/2026. Le défaut vit dans le dépôt pour qu'un
    // déploiement depuis n'importe où donne le même fournisseur.
    const appels = simulerFetch([MAILJET_OK]);
    const resultat = await envoyerEmail(MESSAGE, CLES);

    expect(resultat.envoye).toBe(true);
    expect(resultat.fournisseur).toBe("mailjet");
    expect(appels).toHaveLength(1);
    expect(appels[0].url).toContain("mailjet.com");
  });

  it("EMAIL_FOURNISSEUR=resend permet le retour en arrière", async () => {
    const appels = simulerFetch([{ corps: "{}" }]);
    const resultat = await envoyerEmail(MESSAGE, {
      ...CLES,
      fournisseurPrimaire: "resend",
    });

    expect(resultat.fournisseur).toBe("resend");
    expect(appels[0].url).toContain("resend.com");
  });

  it("un 200 de Mailjet avec un message en ERREUR n'est pas un succès", async () => {
    // Mailjet rend un statut par message : juger sur le seul code HTTP ferait
    // passer une panne d'expéditeur pour un envoi réussi. C'est exactement ce
    // qui s'est produit le 13/09/2026 (expéditeur Inactive, message jeté).
    const appels = simulerFetch([
      {
        corps: JSON.stringify({
          Messages: [
            { Status: "error", Errors: [{ ErrorMessage: "sender not validated" }] },
          ],
        }),
      },
      { ok: false, status: 401, corps: "unauthorized" },
    ]);
    const resultat = await envoyerEmail(MESSAGE, CLES);

    expect(resultat.envoye).toBe(false);
    expect(appels).toHaveLength(2);
    expect(resultat.echecs[0]).toContain("sender not validated");
  });

  it("bascule sur Resend quand Mailjet échoue", async () => {
    const appels = simulerFetch([
      { ok: false, status: 500, corps: "boom" },
      { corps: JSON.stringify({ id: "abc" }) },
    ]);
    const resultat = await envoyerEmail(MESSAGE, CLES);

    expect(resultat.envoye).toBe(true);
    expect(resultat.fournisseur).toBe("resend");
    expect(appels[1].url).toContain("resend.com");
  });

  it("une exception réseau n'empêche pas le secours", async () => {
    simulerFetch([
      () => {
        throw new Error("ECONNRESET");
      },
      { corps: JSON.stringify({ id: "abc" }) },
    ]);
    const resultat = await envoyerEmail(MESSAGE, CLES);

    expect(resultat.envoye).toBe(true);
    expect(resultat.fournisseur).toBe("resend");
  });

  it("rend l'échec des DEUX fournisseurs, jamais avalé", async () => {
    simulerFetch([
      { ok: false, status: 403, corps: "domain not verified" },
      { ok: false, status: 403, corps: "domain not found" },
    ]);
    const resultat = await envoyerEmail(MESSAGE, CLES);

    expect(resultat.envoye).toBe(false);
    expect(resultat.fournisseur).toBeNull();
    expect(resultat.echecs).toHaveLength(2);
  });

  it("sans aucune clé, le dit au lieu d'appeler dans le vide", async () => {
    const appels = simulerFetch([]);
    const resultat = await envoyerEmail(MESSAGE, {});

    expect(resultat.envoye).toBe(false);
    expect(appels).toHaveLength(0);
    expect(resultat.echecs[0]).toContain("Aucun fournisseur");
  });

  it("saute le fournisseur sans clé et tente quand même l'autre", async () => {
    const appels = simulerFetch([{ corps: JSON.stringify({ id: "abc" }) }]);
    const resultat = await envoyerEmail(MESSAGE, { cleResend: "re_factice" });

    expect(resultat.fournisseur).toBe("resend");
    expect(appels).toHaveLength(1);
  });

  it("traduit la pièce jointe dans le format de chaque fournisseur", async () => {
    const avecPiece: MessageEmail = {
      ...MESSAGE,
      piecesJointes: [
        { nom: "licence.txt", type: "text/plain", base64: "TGljZW5jZQ==" },
      ],
    };

    const appelsMailjet = simulerFetch([MAILJET_OK]);
    await envoyerEmail(avecPiece, CLES);
    expect(JSON.parse(appelsMailjet[0].body).Messages[0].Attachments).toEqual([
      { Filename: "licence.txt", ContentType: "text/plain", Base64Content: "TGljZW5jZQ==" },
    ]);

    const appelsResend = simulerFetch([{ corps: "{}" }]);
    await envoyerEmail(avecPiece, { ...CLES, fournisseurPrimaire: "resend" });
    expect(JSON.parse(appelsResend[0].body).attachments).toEqual([
      { filename: "licence.txt", content: "TGljZW5jZQ==" },
    ]);
  });

  it("ne laisse jamais fuiter une clé dans le détail d'un échec", async () => {
    simulerFetch([
      { ok: false, status: 401, corps: "bad key" },
      { ok: false, status: 401, corps: "bad key" },
    ]);
    const resultat = await envoyerEmail(MESSAGE, CLES);

    const tout = resultat.echecs.join(" ");
    expect(tout).not.toContain("re_factice");
    expect(tout).not.toContain("mj_priv_factice");
  });
});
