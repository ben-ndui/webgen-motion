import type { ResumeDuFilm } from "@/lib/film-etat";

const ROLES_DES_COULEURS: { cle: keyof NonNullable<ResumeDuFilm["marque"]>["couleurs"]; libelle: string }[] = [
  { cle: "encre", libelle: "Encre" },
  { cle: "clair", libelle: "Clair" },
  { cle: "accent", libelle: "Accent" },
  { cle: "accentSurClair", libelle: "Accent / clair" },
  { cle: "accentSurSombre", libelle: "Accent / encre" },
  { cle: "bulleRecue", libelle: "Bulle reçue" },
];

const FORMAT = { long: "16:9", court: "9:16" } as const;

type LogoDeLaMarque = NonNullable<ResumeDuFilm["marque"]>["logo"];

function descriptionDuLogo(logo: LogoDeLaMarque): string {
  if (logo.type === "motSymbole") return `mot-symbole « ${logo.texte} »`;
  if (logo.type === "glyphe") return `glyphe + « ${logo.logotype} »`;
  return `image · ${logo.fichier}`;
}

/** Ce que dit la fiche : marque, musique, langues, déclinaisons. */
export default function FilmResume({ resume }: { resume: ResumeDuFilm }) {
  const { marque, musique } = resume;
  return (
    <section className="film-block" aria-labelledby="film-resume-titre">
      <h2 id="film-resume-titre" className="film-h2">
        Fiche
      </h2>
      {resume.exemple && (
        <p className="film-warning">
          Fiche encore marquée « exemple: true » : le rendu est refusé tant qu'elle n'est pas remplie.
        </p>
      )}
      <dl className="film-dl">
        {marque && (
          <>
            <dt>Police</dt>
            <dd>{marque.police}</dd>
            <dt>Logo</dt>
            <dd>{descriptionDuLogo(marque.logo)}</dd>
            <dt>Contact</dt>
            <dd>{marque.contact || "aucun"}</dd>
          </>
        )}
        {musique && (
          <>
            <dt>Musique</dt>
            <dd>
              {musique.titre} · {musique.tempo} BPM
            </dd>
          </>
        )}
        <dt>Langues</dt>
        <dd>{resume.langues.map((langue) => langue.toUpperCase()).join(" · ") || "aucune"}</dd>
        <dt>Déclinaisons</dt>
        <dd>
          {resume.declinaisons.length === 0
            ? "aucune"
            : resume.declinaisons
                .map((declinaison) => `${declinaison.nom} (${FORMAT[declinaison.version]})`)
                .join(" · ")}
        </dd>
      </dl>
      {marque && (
        <ul className="film-swatches" aria-label="Couleurs de la marque">
          {ROLES_DES_COULEURS.map(({ cle, libelle }) => (
            <li key={cle}>
              <span className="film-swatch" style={{ background: marque.couleurs[cle] }} aria-hidden />
              <span>
                {libelle} <code>{marque.couleurs[cle]}</code>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
