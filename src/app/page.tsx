import Link from "next/link";
import { Sparkles, ArrowUpRight, Smartphone, Monitor } from "lucide-react";
import { getAllTours } from "@/lib/tour-loader";
import { getCategory } from "@/lib/motion-categories";

/**
 * Hub. Server component — reads tours from disk at request time so
 * adding/editing a tour JSON file Just Works without restart.
 */
export default function HubPage() {
  const tours = getAllTours();
  const totalSec = tours.reduce((acc, t) => acc + t.estimatedSec, 0);

  return (
    <main className="min-h-screen px-6 py-16 md:px-10 md:py-24 max-w-6xl mx-auto w-full">
      {/* Hero */}
      <header className="mb-16 md:mb-24 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-2">
          <span className="inline-block w-6 h-px bg-current" />
          Smooth &amp; Design · WebGen ecosystem
        </p>
        <h1 className="font-display text-5xl md:text-7xl font-light leading-[0.95] mb-6">
          Le Motion Studio
          <br />
          <span className="italic font-light text-muted-foreground">
            qui filme le réel.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
          Génère des vidéos motion design à partir de ton site ou de ton app.
          E2E filmé · voice-over IA · bg music · iPhone / Mac chrome ·{" "}
          <span className="font-mono text-sm">local-first</span>.
        </p>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-px mb-16 bg-border rounded-xl overflow-hidden border border-border">
        <Stat label="Tours" value={String(tours.length)} mono />
        <Stat label="Durée totale" value={`${totalSec}s`} mono />
        <Stat label="Prêt à filmer" value="100%" mono accent />
      </div>

      {/* Tours grid */}
      <section className="mb-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-display text-2xl md:text-3xl">Tours</h2>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {tours.length === 0
              ? "vide · drop a JSON in tours/"
              : `${tours.length} dans tours/`}
          </p>
        </div>

        {tours.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tours.map((t) => {
              const firstSection = t.steps.find(
                (s): s is Extract<typeof s, { type: "section" }> =>
                  s.type === "section",
              );
              const cat = getCategory(firstSection?.categoryId);
              const isPortrait = t.format === "9:16";
              return (
                <Link
                  key={t.id}
                  href={`/tour/${t.id}`}
                  className="group relative p-6 rounded-xl bg-card border border-border hover:border-foreground/20 transition-colors flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
                      {isPortrait ? (
                        <Smartphone className="w-3 h-3" />
                      ) : (
                        <Monitor className="w-3 h-3" />
                      )}
                      {t.format ?? "16:9"}
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>

                  <div>
                    {cat && (
                      <p
                        className="font-mono text-[10px] uppercase tracking-[0.2em] mb-2"
                        style={{ color: cat.accent }}
                      >
                        {cat.label}
                      </p>
                    )}
                    <h3 className="font-display text-xl md:text-2xl leading-tight mb-2">
                      {t.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-3 mt-auto border-t border-border text-xs font-mono text-muted-foreground">
                    <span>{t.steps.length} steps</span>
                    <span>·</span>
                    <span>~{t.estimatedSec}s</span>
                    {t.baseUrl && (
                      <>
                        <span>·</span>
                        <span className="truncate">
                          {t.baseUrl.replace(/^https?:\/\//, "")}
                        </span>
                      </>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <footer className="pt-12 border-t border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
        <p>
          <span className="text-foreground">webgen-motion</span> · Smooth &amp;
          Design · v0.1
        </p>
        <a
          href="https://github.com/ben-ndui/webgen-motion"
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground transition-colors flex items-center gap-1"
        >
          GitHub <ArrowUpRight className="w-3 h-3" />
        </a>
      </footer>
    </main>
  );
}

function Stat({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="bg-card p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
        {label}
      </p>
      <p
        className={`text-3xl md:text-4xl ${
          mono ? "font-mono" : "font-display"
        } ${accent ? "text-[var(--brand-1)]" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border p-16 flex flex-col items-center justify-center gap-3 text-center">
      <Sparkles className="w-8 h-8 text-muted-foreground" />
      <p className="font-display text-xl">Aucun tour défini</p>
      <p className="font-mono text-xs text-muted-foreground max-w-md">
        Crée un fichier{" "}
        <code className="text-foreground">tours/&lt;id&gt;.json</code> à la
        racine du projet. Schéma : voir{" "}
        <code className="text-foreground">src/lib/types/tour.ts</code>.
      </p>
    </div>
  );
}
