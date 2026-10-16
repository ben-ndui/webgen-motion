import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { plageDemandee, reponseVideo } from "./servir-une-video";

describe("plageDemandee", () => {
  it("sert tout sans en-tête, ou quand l'en-tête est illisible ou multiple", () => {
    expect(plageDemandee(null, 100)).toBeNull();
    expect(plageDemandee("octets=0-9", 100)).toBeNull();
    expect(plageDemandee("bytes=0-9,20-29", 100)).toBeNull();
    expect(plageDemandee("bytes=-", 100)).toBeNull();
  });

  it("lit une plage fermée, ouverte, et un suffixe", () => {
    expect(plageDemandee("bytes=10-19", 100)).toEqual({ debut: 10, fin: 19 });
    expect(plageDemandee("bytes=90-", 100)).toEqual({ debut: 90, fin: 99 });
    expect(plageDemandee("bytes=-5", 100)).toEqual({ debut: 95, fin: 99 });
  });

  it("borne la fin au fichier, et un suffixe plus long que le fichier le sert en entier", () => {
    expect(plageDemandee("bytes=50-5000", 100)).toEqual({ debut: 50, fin: 99 });
    expect(plageDemandee("bytes=-500", 100)).toEqual({ debut: 0, fin: 99 });
  });

  it("refuse ce qui tombe hors du fichier", () => {
    expect(plageDemandee("bytes=100-", 100)).toBe("hors-limites");
    expect(plageDemandee("bytes=20-10", 100)).toBe("hors-limites");
    expect(plageDemandee("bytes=-0", 100)).toBe("hors-limites");
    expect(plageDemandee("bytes=0-", 0)).toBe("hors-limites");
  });
});

describe("reponseVideo", () => {
  const dossier = mkdtempSync(join(tmpdir(), "servir-video-"));
  const chemin = join(dossier, "film.mp4");
  writeFileSync(chemin, Buffer.from("0123456789abcdefghij"));
  const demande = (range?: string) => new Request("http://localhost/x", { headers: range ? { range } : {} });

  it("sert le fichier entier en annonçant qu'on peut demander des morceaux", async () => {
    const reponse = reponseVideo(demande(), chemin);
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get("accept-ranges")).toBe("bytes");
    expect(reponse.headers.get("content-length")).toBe("20");
    expect(await reponse.text()).toBe("0123456789abcdefghij");
  });

  it("sert UNIQUEMENT le morceau demandé, en 206", async () => {
    const reponse = reponseVideo(demande("bytes=10-14"), chemin);
    expect(reponse.status).toBe(206);
    expect(reponse.headers.get("content-range")).toBe("bytes 10-14/20");
    expect(reponse.headers.get("content-length")).toBe("5");
    expect(await reponse.text()).toBe("abcde");
  });

  it("répond 416 avec la taille réelle quand la plage sort du fichier", () => {
    const reponse = reponseVideo(demande("bytes=50-"), chemin);
    expect(reponse.status).toBe(416);
    expect(reponse.headers.get("content-range")).toBe("bytes */20");
  });
});
