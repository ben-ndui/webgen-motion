import { describe, expect, it } from "vitest";

import { extraireLeTexteDuPdf } from "./pdf";

/**
 * Construit un PDF minimal valide (N pages, un flux de contenu par page) avec
 * des offsets xref calculés, pour ne pas dépendre d'un fichier .pdf versionné.
 */
function construireUnPdf({ pages = 1, fluxParPage = () => "" }: { pages?: number; fluxParPage?: (page: number) => string } = {}): Uint8Array {
  const objets: Record<number, string> = {};
  const idPages = 2;
  const idPremierePage = 3;
  const idFont = idPremierePage + pages;
  const idPremierFlux = idFont + 1;
  const idsPages = Array.from({ length: pages }, (_, i) => idPremierePage + i);

  objets[1] = `<< /Type /Catalog /Pages ${idPages} 0 R >>`;
  objets[idPages] = `<< /Type /Pages /Kids [${idsPages.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages} >>`;
  for (let i = 0; i < pages; i++) {
    const idFlux = idPremierFlux + i;
    objets[idPremierePage + i] = `<< /Type /Page /Parent ${idPages} 0 R /Resources << /Font << /F1 ${idFont} 0 R >> >> /MediaBox [0 0 612 792] /Contents ${idFlux} 0 R >>`;
  }
  objets[idFont] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  for (let i = 0; i < pages; i++) {
    const flux = fluxParPage(i);
    objets[idPremierFlux + i] = `<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`;
  }

  const idMax = idPremierFlux + pages - 1;
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i <= idMax; i++) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${objets[i]}\nendobj\n`;
  }
  const debutXref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${idMax + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= idMax; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${idMax + 1} /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, "latin1"));
}

/** Un seul `Tj` : suffit pour une page de test avec une ligne de texte. */
const uneLigne = (texte: string) => () => `BT /F1 10 Tf 72 712 Td (${texte}) Tj ET`;

describe("extraireLeTexteDuPdf", () => {
  it("extrait le texte d'un PDF valide", async () => {
    const lecture = await extraireLeTexteDuPdf(construireUnPdf({ fluxParPage: uneLigne("Henrik revient a Monaco") }));
    expect(lecture.ok).toBe(true);
    if (!lecture.ok) return;
    expect(lecture.texte).toContain("Henrik revient a Monaco");
    expect(lecture.tronque).toBe(false);
  });

  it("refuse un fichier qui n'est pas un PDF", async () => {
    const lecture = await extraireLeTexteDuPdf(new TextEncoder().encode("ceci n'est pas un PDF"));
    expect(lecture).toEqual({ ok: false, raison: "Le fichier déposé n'est pas un PDF." });
  });

  it("refuse un PDF sans texte exploitable", async () => {
    const lecture = await extraireLeTexteDuPdf(construireUnPdf({ fluxParPage: () => "" }));
    expect(lecture.ok).toBe(false);
    if (lecture.ok) return;
    expect(lecture.raison).toContain("images scannées");
  });

  it("refuse un PDF à la structure abîmée", async () => {
    const lecture = await extraireLeTexteDuPdf(new TextEncoder().encode("%PDF-1.4\nceci n'est pas une structure PDF valide, juste du texte"));
    expect(lecture.ok).toBe(false);
    if (lecture.ok) return;
    expect(lecture.raison).toBe("Ce fichier PDF est abîmé ou mal formé : il ne peut pas être lu.");
  });

  it("refuse un PDF avec trop de pages, avant même de lire son texte", async () => {
    const lecture = await extraireLeTexteDuPdf(construireUnPdf({ pages: 501, fluxParPage: uneLigne("x") }));
    expect(lecture).toEqual({ ok: false, raison: "Ce PDF a trop de pages (501) : limite 500." });
  });

  it("tronque un texte trop long, et le signale (jamais en silence)", async () => {
    // Une seule page, beaucoup de lignes de texte : largement de quoi dépasser
    // la limite de 50 000 caractères de l'import de bible.
    const ligneDeTest = (n: number) => `Ligne ${String(n).padStart(4, "0")} contenu de test abcdefghij`;
    const multiLignes = () =>
      Array.from({ length: 1400 }, (_, i) => `BT /F1 10 Tf 72 ${790 - (i % 60) * 10} Td (${ligneDeTest(i)}) Tj ET`).join("\n");

    const lecture = await extraireLeTexteDuPdf(construireUnPdf({ fluxParPage: multiLignes }));
    expect(lecture.ok).toBe(true);
    if (!lecture.ok) return;
    expect(lecture.tronque).toBe(true);
    expect(lecture.longueurOriginale).toBeGreaterThan(50_000);
    expect(lecture.texte.length).toBeLessThanOrEqual(50_000);
    // Coupée à une fin de ligne (pas de paragraphe ici, que des lignes simples), pas en plein mot.
    expect(lecture.texte.endsWith("abcdefghij")).toBe(true);
  });
});
