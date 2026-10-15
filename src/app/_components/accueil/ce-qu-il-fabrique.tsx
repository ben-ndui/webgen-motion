import ScenarioDeLaSerie from "./scenario-de-la-serie";
import VideoDeVitrine from "./video-de-vitrine";

/**
 * Les trois choses que GEN MOTION fabrique, chacune avec sa preuve réelle :
 * le film S&D en vertical, l'épisode que Claude a écrit pour S&D, et le
 * pitch de GEN MOTION fait par lui-même.
 */
export default function CeQuIlFabrique() {
  return (
    <section className="section accueil-fabrique" id="fabrique" data-screen-label="Ce qu'il fabrique" data-wm-id="landing.fabrique">
      <div className="wrap">
        <h2 className="accueil-titre reveal">Trois vidéos, une seule app.</h2>
        <div className="accueil-usages">
          <article className="accueil-usage reveal d1" data-wm-id="landing.fabrique.film">
            <div className="accueil-usage-preuve accueil-telephone">
              <VideoDeVitrine src="/films/smooth-and-design-9x16.mp4" poster="/films/smooth-and-design-9x16.jpg" titre="Le film de Smooth & Design en vertical" />
            </div>
            <h3>Le film de ta marque</h3>
            <p>
              Depuis l&apos;adresse de ton site : tes vrais écrans filmés, ton logo, tes couleurs, ta musique, des textes proposés que tu relis.
              Prêt pour ton site et pour les réseaux.
            </p>
          </article>

          <article className="accueil-usage reveal d2" data-wm-id="landing.fabrique.serie">
            <div className="accueil-usage-preuve">
              <ScenarioDeLaSerie />
            </div>
            <h3>
              La série de ta marque <span className="accueil-badge">Studio</span>
            </h3>
            <p>
              Des épisodes courts générés par IA, avec des personnages qui gardent le même visage d&apos;un plan à l&apos;autre et parlent
              français. Claude écrit l&apos;épisode et t&apos;aide plan par plan (une réplique, les dialogues d&apos;une scène, la suite), puis
              chaque plan se génère chez Google, environ 1&nbsp;$ les 8 secondes, prix affiché avant chaque clic.
            </p>
          </article>

          <article className="accueil-usage reveal d3" data-wm-id="landing.fabrique.release">
            <div className="accueil-usage-preuve">
              <VideoDeVitrine src="/demo.mp4" poster="/demo-poster.jpg" titre="Le pitch de GEN MOTION, fait par GEN MOTION" />
            </div>
            <h3>La vidéo de ton produit</h3>
            <p>
              Pour les équipes produit : GEN&nbsp;MOTION rejoue ton site ou ton app, pose la voix off, monte sur la musique et refait la vidéo à
              chaque nouvelle version. Ce pitch a été fait par GEN&nbsp;MOTION lui-même.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
