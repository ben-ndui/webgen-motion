import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "../_components/page-shell";

export const metadata: Metadata = {
  title: "À propos — GEN MOTION",
  description:
    "GEN MOTION — Motion Studio local-first par Smooth & Design. Local-first, open-core MIT, frame-accurate.",
};

const PRINCIPLES = [
  {
    num: "01",
    title: "Local-first",
    body: "Capture, voix off, rendu : tout s'exécute en local. Aucune interface n'est envoyée vers un serveur, aucun rendu n'attend une file d'attente cloud.",
  },
  {
    num: "02",
    title: "Open-core · MIT",
    body: "Le cœur du pipeline est open-source sous licence MIT. Vous pouvez l'auditer, le forker et le builder vous-même. Studio finance le développement à long terme.",
  },
  {
    num: "03",
    title: "Frame-accurate",
    body: "Remotion et FFmpeg garantissent un rendu déterministe au pixel et à la frame. Le même tour produit exactement le même MP4, à chaque export.",
  },
];

const ENTERPRISE = [
  "White-label complet (marque, splash, exports)",
  "API headless pour CI/CD & pipelines",
  "SSO & provisioning SCIM",
  "Voix off auto-hébergée (Voicebox managé)",
  "SLA & support prioritaire",
  "Onboarding & templates dédiés",
];

export default function About() {
  return (
    <PageShell active="about">
      <main className="wrap wrap-narrow">
        <section className="about-hero" data-wm-id="about.hero">
          <span className="kicker">À propos · Smooth &amp; Design · Nice</span>
          <h1>Le motion design produit, sans le cloud.</h1>
          <p className="about-lead">
            GEN MOTION est né d&apos;une frustration simple : créer une démo vidéo propre
            demandait un montage long, des outils en ligne et vos données envoyées ailleurs.
            On a construit l&apos;inverse — un Motion Studio qui capture votre interface,
            clone votre voix et compose un clip final, entièrement sur votre machine.
          </p>
        </section>

        <section className="about-grid" data-wm-id="about.principles">
          {PRINCIPLES.map((p) => (
            <article className="about-card" key={p.num}>
              <span className="num">{p.num}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </article>
          ))}
        </section>

        <section className="ent-band" id="enterprise" data-wm-id="about.enterprise">
          <span className="kicker nr">Enterprise</span>
          <h2 style={{ marginTop: 12 }}>Pour les équipes qui veulent plus.</h2>
          <p style={{ color: "var(--muted)", marginTop: 10, maxWidth: "56ch" }}>
            Au-delà de Studio, nous accompagnons les entreprises avec des intégrations
            sur mesure et un support dédié. On construit avec vous.
          </p>
          <ul className="ent-feats">
            {ENTERPRISE.map((f) => (
              <li key={f}><span className="c">✓</span> {f}</li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            <a className="btn btn-ink" href="mailto:contact@smoothandesign.fr">Contacter l&apos;équipe</a>
            <Link className="btn btn-ghost" href="/download">Voir les éditions</Link>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
