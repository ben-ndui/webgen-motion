import type { ResumeDuFilm } from "@/lib/film-etat";

const ROLES_DES_COULEURS: { cle: keyof NonNullable<ResumeDuFilm["marque"]>["couleurs"]; libelle: string }[] = [
  { cle: "encre", libelle: "Encre" },
  { cle: "clair", libelle: "Clair" },
  { cle: "accent", libelle: "Accent" },
  { cle: "accentSurClair", libelle: "Accent / clair" },
  { cle: "accentSurSombre", libelle: "Accent / encre" },
  { cle: "bulleRecue", libelle: "Bulle reçue" },
];

const DIRECTIONS = { marque: "Marque", editorial: "Éditorial", nocturne: "Nocturne" } as const;

type LogoDeLaMarque = NonNullable<ResumeDuFilm["marque"]>["logo"];

function descriptionDuLogo(logo: LogoDeLaMarque): string {
  if (logo.type === "motSymbole") return `mot-symbole « ${logo.texte} »`;
  if (logo.type === "glyphe") return `glyphe + « ${logo.logotype} »`;
  return `image · ${logo.fichier}`;
}

function Ligne({ cle, valeur }: { cle: string; valeur: string }) {
  return (
    <div className="sum-row">
      <span className="k">{cle}</span>
      <span className="v">{valeur}</span>
    </div>
  );
}

/** Ce que dit la fiche : direction, marque, musique, langues. */
export default function FilmResume({ resume }: { resume: ResumeDuFilm }) {
  const { marque, musique } = resume;
  return (
    <section className="side-card" aria-labelledby="film-resume-titre" data-wm-id="film.fiche">
      <h2 id="film-resume-titre" className="side-title">
        Fiche
      </h2>
      {resume.exemple && (
        <p className="film-warning">
          Fiche encore marquée « exemple: true » : le rendu est refusé tant qu&apos;elle n&apos;est pas remplie.
        </p>
      )}
      {resume.direction && <Ligne cle="Direction" valeur={DIRECTIONS[resume.direction]} />}
      {marque && <Ligne cle="Police" valeur={marque.police} />}
      {marque && <Ligne cle="Logo" valeur={descriptionDuLogo(marque.logo)} />}
      {musique && <Ligne cle="Musique" valeur={musique.titre} />}
      {musique && <Ligne cle="Tempo" valeur={`${musique.tempo} BPM`} />}
      <Ligne cle="Langues" valeur={resume.langues.map((langue) => langue.toUpperCase()).join(" · ") || "aucune"} />
      {marque && <Ligne cle="Contact" valeur={marque.contact || "aucun"} />}
      {marque && (
        <ul className="film-swatches" aria-label="Couleurs de la marque">
          {ROLES_DES_COULEURS.map(({ cle, libelle }) => (
            <li key={cle} title={`${libelle} ${marque.couleurs[cle]}`}>
              <span className="film-swatch" style={{ background: marque.couleurs[cle] }} aria-hidden />
              <span>{libelle}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
