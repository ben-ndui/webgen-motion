import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Informations légales relatives au site genmotion.app et à l'éditeur Smooth & Design.",
};

export default function MentionsLegales() {
  const p = LEGAL.publisher;
  const h = LEGAL.hosting.web;
  return (
    <>
      <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-faint mb-3">
        Document légal · maj {LEGAL.lastUpdated}
      </p>
      <h1>Mentions légales</h1>

      <h2>Éditeur du site</h2>
      <p>
        Le site <strong>{LEGAL.site.url}</strong> est édité par :
      </p>
      <ul>
        <li><strong>{p.legalName}</strong> — exploitant sous le nom commercial <strong>{p.tradeName}</strong></li>
        <li>Forme juridique : {p.legalForm}</li>
        <li>SIREN : <code>{p.siren}</code> — SIRET (siège) : <code>{p.siret}</code></li>
        <li>Code APE : {p.ape}</li>
        <li>Immatriculé au RNE depuis le {p.rneRegisteredAt}</li>
        <li>Régime fiscal : {p.vatStatus}</li>
        <li>Siège : {p.address.street}, {p.address.postalCode} {p.address.city}, {p.address.country}</li>
        <li>Contact : <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a></li>
      </ul>

      <h2>Directeur de la publication</h2>
      <p>{p.publicationDirector}</p>

      <h2>Hébergeur</h2>
      <p>
        <strong>{h.name}</strong><br />
        {h.address}<br />
        <a href={h.url} target="_blank" rel="noreferrer">{h.url}</a>
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le logiciel <strong>GEN MOTION</strong>, la marque{" "}
        <strong>GEN MOTION</strong> et le nom commercial{" "}
        <strong>Smooth &amp; Design</strong> sont propriété de {p.legalName}.
        Toute utilisation à des fins commerciales sans autorisation expresse
        est interdite. Le logiciel est distribué sous licence{" "}
        <strong>{LEGAL.product.license}</strong>.
      </p>

      <h2>Crédits</h2>
      <p>
        Conception, développement et hébergement : {p.tradeName} · Nice. Stack
        technique open source — Next.js, Remotion, Puppeteer, FFmpeg, Tailwind,
        Stripe, Vercel.
      </p>

      <h2>Droit applicable et juridiction</h2>
      <p>
        Le présent site est régi par le {LEGAL.jurisdiction.law}. En cas de
        litige, compétence est attribuée aux {LEGAL.jurisdiction.court}.
      </p>
    </>
  );
}
