import type { Metadata } from "next";
import BuyButton from "../_components/buy-button";
import SmartDownloadButton from "../_components/smart-download-button";
import PageShell from "../_components/page-shell";

export const metadata: Metadata = {
  title: "Télécharger — GEN MOTION",
  description:
    "Installez GEN MOTION sur votre Mac. Motion Studio 100% local, Community gratuit, Studio $49.",
};

const SPECS = [
  {
    h: "Configuration requise",
    items: [
      ["·", "macOS 13 Ventura ou supérieur"],
      ["·", "Apple Silicon ou Intel 64-bit"],
      ["·", "8 Go de RAM (16 recommandé)"],
      ["·", "FFmpeg embarqué · Chromium installé au 1er lancement"],
    ],
  },
  {
    h: "Dans la boîte",
    items: [
      ["✓", "Pipeline capture · voix off · compose"],
      ["✓", "Agent IA (BYOK Claude)"],
      ["✓", "Presets Sober & Energetic"],
      ["✓", "Export MP4 16:9 & 9:16"],
    ],
  },
  {
    h: "Sécurité",
    items: [
      ["✓", ".dmg notarisé Apple"],
      ["✓", "Source-available · FSL"],
      ["✓", "100% local · aucun cloud"],
      ["✓", "Zéro télémétrie"],
    ],
  },
] as const;

export default function Download() {
  return (
    <PageShell active="download">
      <main className="wrap">
        <section className="dl" data-wm-id="download.hero">
          <div className="dl-grid">
            <div>
              <span className="kicker">Téléchargement · local-first · 2026</span>
              <h1 className="dl-title">Installez GEN MOTION sur votre machine.</h1>
              <p className="dl-sub">
                Le Motion Studio tourne 100% en local. Aucun compte requis pour la version Community.
              </p>
              <div className="dl-actions">
                <div className="dl-primary-row" data-wm-id="download.cta-primary">
                  <SmartDownloadButton variant="primary" showHint={false} />
                  <span className="mono" style={{ fontSize: "var(--t-xs)", color: "var(--faint)", whiteSpace: "nowrap" }}>
                    · .dmg notarisé
                  </span>
                </div>
                <div className="dl-alt">
                  <a href="https://github.com/ben-ndui/webgen-motion/releases">Toutes les versions</a>
                  <a href="/help">Notes de version</a>
                  <a href="https://github.com/ben-ndui/webgen-motion">Build depuis la source</a>
                </div>
              </div>
              <div className="platforms" data-wm-id="download.platforms">
                <span className="plat">macOS <span className="pst ok">Disponible</span></span>
                <span className="plat">Windows <span className="pst soon">Bientôt</span></span>
                <span className="plat">Linux <span className="pst soon">Bientôt</span></span>
              </div>
            </div>
            <div className="dl-shot" data-wm-id="download.shot">
              <div className="dl-shot-bar"><i /><i /><i /></div>
              <div className="dl-shot-body"><span className="dl-shot-note">capture de l&apos;app · 1280×960</span></div>
            </div>
          </div>
        </section>

        <section className="dl-specs" data-wm-id="download.specs">
          {SPECS.map((s) => (
            <div className="dl-spec" key={s.h}>
              <h4>{s.h}</h4>
              <ul>
                {s.items.map(([c, label]) => (
                  <li key={label}><span className="c">{c}</span> {label}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="studio-band" data-wm-id="download.studio">
          <div>
            <span className="kicker nr">Studio Edition</span>
            <h3 style={{ marginTop: 10 }}>Débloquez les outils pro.</h3>
            <p>
              Frames 3D iPhone &amp; MacBook, presets Cinematic &amp; Glitch, export multi-format,
              music library managée, watermark removal. Paiement unique, mises à jour à vie.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-end" }}>
            <div className="studio-price">$49 <small>une fois</small></div>
            <BuyButton variant="secondary" />
          </div>
        </section>
      </main>
    </PageShell>
  );
}
