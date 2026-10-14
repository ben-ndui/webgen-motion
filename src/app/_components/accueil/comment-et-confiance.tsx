/**
 * Comment ça marche (trois étapes, sans jargon), puis ce que la personne
 * garde en main : ses fichiers, ses coûts, et qui fabrique l'outil.
 */
const ETAPES = [
  { titre: "Colle ton site", texte: "GEN MOTION l'ouvre, le filme écran par écran et repère ta marque (logo, couleurs, police), que tu ajustes si besoin." },
  { titre: "Relis", texte: "Claude propose les textes du film et un premier épisode de série. Tu gardes, tu changes, tu écris." },
  { titre: "Rends et publie", texte: "Le film sort en 16:9 et en 9:16, en français et en anglais, prêt pour ton site et tes réseaux." },
];

const GARANTIES = [
  {
    titre: "Tes fichiers restent chez toi.",
    texte: "L'app tourne sur ton ordinateur. Tes vidéos, tes captures et tes textes ne passent jamais par nos serveurs : l'IA est appelée avec tes propres clés.",
  },
  {
    titre: "Le prix avant le clic.",
    texte: "Un plan de série ou un portrait (chez Google) affiche son prix avant que tu lances. Les textes écrits par Claude coûtent quelques centimes, sur ta clé.",
  },
  {
    titre: "Fait par une agence.",
    texte: "Smooth & Design, studio web et mobile sur la Côte d'Azur. On s'en sert pour nos propres clients.",
  },
];

export function CommentCaMarche() {
  return (
    <section className="section accueil-comment" id="comment" data-screen-label="Comment" data-wm-id="landing.comment">
      <div className="wrap">
        <h2 className="accueil-titre reveal">Trois étapes, une adresse pour commencer.</h2>
        <ol className="accueil-etapes">
          {ETAPES.map((etape, index) => (
            <li key={etape.titre} className={`reveal d${index + 1}`}>
              <span className="accueil-etape-numero">{index + 1}</span>
              <h3>{etape.titre}</h3>
              <p>{etape.texte}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Confiance() {
  return (
    <section className="section accueil-confiance" id="confiance" data-screen-label="Confiance" data-wm-id="landing.confiance">
      <div className="wrap accueil-garanties">
        {GARANTIES.map((garantie, index) => (
          <div key={garantie.titre} className={`reveal d${index + 1}`}>
            <h3>{garantie.titre}</h3>
            <p>{garantie.texte}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
