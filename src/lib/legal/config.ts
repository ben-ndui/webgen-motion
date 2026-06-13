/**
 * Source unique des informations légales GEN MOTION.
 *
 * Édité par : NDUI Amadou Be-Ngally — Entrepreneur individuel — nom commercial SMOOTH & DESIGN
 * Extrait INPI : SIREN 904 264 223 — SIRET (siège) 904 264 223 000 10
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
    siret: "904 264 223 000 10",
    ape: "6201Z — Programmation informatique",
    rneRegisteredAt: "11/10/2021",
    vatStatus: "TVA non applicable, article 293 B du CGI",
    address: {
      street: "1 rue Joseph Gazan",
      postalCode: "06000",
      city: "Nice",
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

  jurisdiction: {
    law: "droit français",
    court: "tribunaux compétents de Nice",
  },

  product: {
    license: "Open-core MIT",
    repo: "https://github.com/ben-ndui/webgen-motion",
    editions: {
      community: {
        price: "Gratuit",
        scope: "Capture E2E, voix off, compose Sober & Energetic, frames 2D, formats 16:9 + 9:16",
      },
      studio: {
        price: "49 USD (paiement unique, perpétuel)",
        scope: "Toutes les features Community + frames 3D iPhone/MacBook, presets Cinematic & Glitch, multi-format export, music library, watermark removal",
      },
      enterprise: {
        price: "Sur devis",
        scope: "Toutes les features Studio + white-label, API headless, SSO",
      },
    },
  },

  lastUpdated: "17/05/2026",
} as const;

export type LegalConfig = typeof LEGAL;
