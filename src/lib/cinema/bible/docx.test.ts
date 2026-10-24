import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { extraireLeTexteDuDocx } from "./docx";

/** Un .docx minimal valide : un seul paragraphe de texte. */
async function construireUnDocx(texte: string): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
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

describe("extraireLeTexteDuDocx", () => {
  it("extrait le texte d'un document Word valide", async () => {
    const lecture = await extraireLeTexteDuDocx(await construireUnDocx("Henrik revient a Monaco, vraie bible de test."));
    expect(lecture.ok).toBe(true);
    if (!lecture.ok) return;
    expect(lecture.texte).toContain("Henrik revient a Monaco");
    expect(lecture.tronque).toBe(false);
  });

  it("refuse un fichier qui n'est pas un zip", async () => {
    const lecture = await extraireLeTexteDuDocx(new TextEncoder().encode("ceci n'est pas un docx"));
    expect(lecture).toEqual({ ok: false, raison: "Le fichier déposé n'est pas un document Word (.docx)." });
  });

  it("refuse un zip qui n'est pas un document Word valide", async () => {
    const zip = new JSZip();
    zip.file("rien-a-voir.txt", "un zip quelconque, pas un docx");
    const octets = await zip.generateAsync({ type: "uint8array" });
    const lecture = await extraireLeTexteDuDocx(octets);
    expect(lecture).toEqual({ ok: false, raison: "Ce fichier n'est pas un document Word valide : il ne peut pas être lu." });
  });

  it("refuse un document sans texte exploitable", async () => {
    const lecture = await extraireLeTexteDuDocx(await construireUnDocx(""));
    expect(lecture.ok).toBe(false);
    if (lecture.ok) return;
    expect(lecture.raison).toBe("Ce document ne contient pas de texte exploitable.");
  });

  it("tronque un texte trop long, et le signale", async () => {
    const long = "Un paragraphe de bible bien rempli. ".repeat(2000);
    const lecture = await extraireLeTexteDuDocx(await construireUnDocx(long));
    expect(lecture.ok).toBe(true);
    if (!lecture.ok) return;
    expect(lecture.tronque).toBe(true);
    expect(lecture.texte.length).toBeLessThanOrEqual(50_000);
    expect(lecture.longueurOriginale).toBeGreaterThan(50_000);
  });
});
