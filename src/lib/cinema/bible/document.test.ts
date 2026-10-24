import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { extraireLeTexteDuDocument } from "./document";

function construireUnPdf(texte: string): Uint8Array {
  const objets: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3: "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>",
    4: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  };
  const flux = `BT /F1 24 Tf 72 712 Td (${texte}) Tj ET`;
  objets[5] = `<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`;
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${objets[i]}\nendobj\n`;
  }
  const debutXref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, "latin1"));
}

async function construireUnDocx(texte: string): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.folder("word")?.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>${texte}</w:t></w:r></w:p></w:body>
</w:document>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}

describe("extraireLeTexteDuDocument", () => {
  it("reconnaît un PDF par sa signature et route vers l'extracteur PDF", async () => {
    const lecture = await extraireLeTexteDuDocument(construireUnPdf("Bible redigee au format PDF"));
    expect(lecture.ok).toBe(true);
    if (lecture.ok) expect(lecture.texte).toContain("Bible redigee au format PDF");
  });

  it("reconnaît un .docx par sa signature et route vers l'extracteur Word", async () => {
    const lecture = await extraireLeTexteDuDocument(await construireUnDocx("Bible au format Word"));
    expect(lecture.ok).toBe(true);
    if (lecture.ok) expect(lecture.texte).toContain("Bible au format Word");
  });

  it("refuse un format qui n'est ni l'un ni l'autre", async () => {
    const lecture = await extraireLeTexteDuDocument(new TextEncoder().encode("juste du texte brut"));
    expect(lecture).toEqual({ ok: false, raison: "Format non reconnu : dépose un PDF ou un document Word (.docx)." });
  });
});
