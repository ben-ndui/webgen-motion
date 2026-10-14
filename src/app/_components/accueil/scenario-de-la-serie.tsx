/**
 * L'épisode que Claude a VRAIMENT écrit pour Smooth & Design, à partir de
 * smoothandesign.fr (remplissage du 15/10/2026, film « smooth-and-design »).
 * Affiché comme un scénario, pas comme une vidéo : ses plans n'ont pas
 * encore été générés, et on ne montre rien qu'on n'a pas fait.
 */
const DECOR = "Un studio lumineux face à la Méditerranée, murs blancs, mobilier noir.";
const PLANS: { image: string; replique?: string }[] = [
  { image: "Léa, développeuse, à son bureau face à l'écran, le soleil entre." },
  { image: "Gros plan de profil, concentrée.", replique: "Vos idées deviennent réalité en quelques semaines." },
  { image: "Elle se recule et montre l'écran, un sourire.", replique: "On construit des produits qui performent, pas juste des sites." },
  { image: "Debout à la fenêtre, à contre-jour, face à l'horizon." },
];

export default function ScenarioDeLaSerie() {
  return (
    <div className="accueil-scenario" aria-label="Scénario d'un épisode écrit par Claude">
      <p className="accueil-scenario-tete">
        <b>Épisode 1 · On code vos idées</b>
        <span>Écrit par Claude pour Smooth &amp; Design, depuis son site (4 des 6 plans)</span>
      </p>
      <p className="accueil-scenario-decor">{DECOR}</p>
      <ol>
        {PLANS.map((plan) => (
          <li key={plan.image}>
            <span>{plan.image}</span>
            {plan.replique && <q>{plan.replique}</q>}
          </li>
        ))}
      </ol>
    </div>
  );
}
