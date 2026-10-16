import { PRIX_STUDIO } from "../offre-studio";

/**
 * Source unique des informations légales GEN MOTION.
 *
 * Édité par : NDUI Amadou Be-Ngally, entrepreneur individuel, nom commercial Smooth & Design.
 * SIREN 904 264 223, immatriculé au RNE (activité libérale : pas de RCS).
 * Pas de SIRET affiché : l'établissement de Nice est fermé et celui de
 * Vallauris n'a pas encore le sien (transfert du 15/09/2026). Le SIREN suffit.
 *
 * Toute modification d'identité publisher / hébergeur / sous-traitants
 * passe par CE fichier — les pages /mentions-legales /confidentialite
 * /cgu /cgv /about importent depuis ici, garantit consistance.
 */

export const LEGAL = {
  brand: {
    product: "GEN MOTION",
    studio: "Smooth & Design",
    tagline: "Motion Studio local-first — capture, mix, compose.",
  },

  publisher: {
    legalName: "NDUI Amadou Be-Ngally",
    tradeName: "Smooth & Design",
    legalForm: "Entrepreneur individuel",
    siren: "904 264 223",
    ape: "6201Z — Programmation informatique",
    registre: "Immatriculé au Registre national des entreprises (RNE)",
    vatStatus: "TVA non applicable, article 293 B du CGI",
    address: {
      street: "9 impasse Allègre",
      postalCode: "06220",
      city: "Vallauris",
      country: "France",
    },
    publicationDirector: "Amadou Be-Ngally NDUI",
    contactEmail: "contact@smoothandesign.fr",
  },

  site: {
    domain: "genmotion.app",
    url: "https://genmotion.app",
  },

  /** Le produit GEN MOTION est local-first : la majorité du traitement
   *  des données (captures, voix off, compositions) tourne sur la
   *  machine de l'utilisateur, sans qu'aucune donnée ne transite par
   *  nos serveurs. Le seul service hébergé est la vitrine genmotion.app
   *  + le checkout Stripe. */
  hosting: {
    web: {
      name: "Vercel Inc.",
      address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
      url: "https://vercel.com",
    },
  },

  subprocessors: [
    {
      name: "Vercel Inc.",
      purpose: "Hébergement de la vitrine web (genmotion.app) et journalisation technique des requêtes (IP, user-agent, status code)",
      address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
      transfer: "Hors UE — Data Processing Addendum + Clauses Contractuelles Types (CCT)",
      url: "https://vercel.com/legal/privacy-policy",
    },
    {
      name: "Stripe Payments Europe Ltd.",
      purpose: "Encaissement des paiements Studio Edition (Stripe Checkout hosted, données carte ne transitent jamais par nos serveurs)",
      address: "1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irlande",
      transfer: "UE (Irlande) + transferts hors UE pour usage Stripe global sous CCT",
      url: "https://stripe.com/fr/privacy",
    },
    {
      name: "Anthropic PBC",
      purpose: "Service Claude API utilisé optionnellement par l'utilisateur depuis son app desktop pour générer des tours via l'Agent IA (BYOK — la clé API est celle de l'utilisateur, aucune relation directe entre Smooth & Design et Anthropic concernant les données utilisateurs)",
      address: "548 Market St #95168, San Francisco, CA 94104, États-Unis",
      transfer: "Hors UE — bring-your-own-key, l'utilisateur est responsable du traitement",
      url: "https://www.anthropic.com/legal/privacy",
    },
    {
      name: "ElevenLabs Inc.",
      purpose: "Service de synthèse vocale TTS utilisé optionnellement par l'utilisateur depuis son app desktop (BYOK — clé API utilisateur, aucune relation directe entre Smooth & Design et ElevenLabs concernant les données utilisateurs)",
      address: "169 Madison Ave, STE 2079, New York, NY 10016, États-Unis",
      transfer: "Hors UE — bring-your-own-key, l'utilisateur est responsable du traitement",
      url: "https://elevenlabs.io/privacy",
    },
    {
      name: "PostHog, Inc.",
      purpose: "Mesure d'audience du site vitrine (parcours, pages vues, clics) et signal d'activation anonyme de l'app desktop (identifiant aléatoire, jamais de contenu ni d'email)",
      address: "2261 Market Street #4008, San Francisco, CA 94114, États-Unis",
      transfer: "Hébergement Union européenne (région EU Cloud)",
      url: "https://posthog.com/privacy",
    },
  ],

  data: {
    retentionMonths: 12,
    cnilUrl: "https://www.cnil.fr",
  },

  // Pas de clause attribuant un tribunal : elle ne vaut qu'entre commerçants,
  // et Smooth & Design est une activité libérale.
  jurisdiction: {
    law: "droit français",
    court: "tribunaux compétents selon les règles de droit commun",
  },

  product: {
    license: "FSL-1.1-MIT (source disponible, chaque version passe sous licence MIT deux ans après sa publication)",
    repo: "https://github.com/ben-ndui/webgen-motion",
    editions: {
      community: {
        price: "Gratuit",
        scope: "Capture E2E web et mobile, voix off, montage sur la musique avec les quatre styles (Sober, Energetic, Cinematic, Glitch), cadres 2D, formats 16:9 et 9:16",
      },
      studio: {
        price: `${PRIX_STUDIO.mensuel} € par mois, ${PRIX_STUDIO.annuel} € par an, ou ${PRIX_STUDIO.aVie} € en une fois (licence à vie)`,
        scope: "Toutes les fonctionnalités Community, plus le film de marque depuis l'adresse d'un site, la série générée par IA (les générations restent payées par l'utilisateur au fournisseur, avec ses propres clés), les cadres 3D iPhone et MacBook, et l'export du montage (vidéo produit, film, série) vers DaVinci Resolve ; les fonctionnalités Studio ajoutées par les mises à jour sont incluses",
      },
      enterprise: {
        price: "Sur devis",
        scope: "Toutes les features Studio + white-label, API headless, SSO",
      },
    },
  },

  lastUpdated: "16/10/2026",
} as const;

export type LegalConfig = typeof LEGAL;
