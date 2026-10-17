import { AbsoluteFill, Img, staticFile } from "remotion";

type Props = {
  texte: string;
  // Chemin dans public/ du logo du studio (cinema/fin/logo.png|jpg), facultatif.
  logo?: string;
};

/**
 * Le carton de fin d'une série autonome : le logo du studio et une ligne de
 * texte, blanc sur noir. Rien de la marque du film : la série n'en a pas
 * forcément une.
 */
export function CartonDeFin({ texte, logo }: Props) {
  return (
    <AbsoluteFill style={{ background: "#000", color: "#fff", alignItems: "center", justifyContent: "center", gap: 64, padding: 120 }}>
      {logo && <Img src={staticFile(logo)} style={{ maxWidth: 560, maxHeight: 560, objectFit: "contain" }} />}
      {texte.trim() !== "" && <p style={{ margin: 0, fontSize: 64, lineHeight: 1.25, textAlign: "center", fontWeight: 500 }}>{texte}</p>}
    </AbsoluteFill>
  );
}
