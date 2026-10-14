import LandingPrimaryCta from "../landing-primary-cta";
import VideoDeVitrine from "./video-de-vitrine";

/**
 * Le haut de l'accueil : ce qu'on obtient, en une phrase, et la preuve qui
 * joue à côté (le film de Smooth & Design, fait par GEN MOTION à partir de
 * son propre site). Une seule action principale : télécharger.
 */
export default function AccueilHero() {
  return (
    <section className="section hero accueil-hero" id="hero" data-screen-label="Accueil" data-wm-id="landing.hero">
      <div className="wrap accueil-hero-grille">
        <div className="accueil-hero-texte">
          <h1 className="hero-title reveal d1">
            Ton site devient un film.
            <span className="l2"> Ta marque, une série.</span>
          </h1>
          <p className="hero-sub reveal d2">
            Colle l&apos;adresse de ton site. GEN&nbsp;MOTION le filme, te propose les textes, monte sur ta musique et te rend un film prêt à
            publier, en 16:9 et en 9:16. <b>Tout se passe sur ton ordinateur.</b>
          </p>
          <div className="hero-cta reveal d3">
            <LandingPrimaryCta className="btn btn-primary btn-lg" data-wm-id="landing.hero.cta-download" />
            <a className="btn btn-ghost btn-lg" href="#prix">
              Voir les prix
            </a>
          </div>
        </div>
        <figure className="accueil-hero-film reveal d2" data-wm-id="landing.hero.film">
          <VideoDeVitrine
            src="/films/smooth-and-design-16x9.mp4"
            poster="/films/smooth-and-design-16x9.jpg"
            titre="Le film de marque de Smooth & Design"
          />
          <figcaption>
            Le film de Smooth &amp; Design, fait par GEN&nbsp;MOTION à partir de <b>smoothandesign.fr</b>.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
