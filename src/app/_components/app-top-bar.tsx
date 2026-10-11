import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight, Film, HelpCircle } from "lucide-react";

import ThemeToggle from "./theme-toggle";

export type MailleDuFil = { libelle: string; href?: string; titre?: string };

type Props = {
  // Le fil d'Ariane après « GEN MOTION » ; le dernier maillon est la page courante.
  fil: MailleDuFil[];
  // Contenu de la pastille mono à droite du fil (format, nombre d'étapes…).
  meta?: ReactNode;
  // Actions propres à la page, avant Aide / Retour / thème.
  actions?: ReactNode;
  retour?: string;
};

const LIEN_DISCRET =
  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted hover:text-ink hover:bg-surface-2 rounded-md transition-colors";

/**
 * La barre du haut des pages de travail (éditeur de tour, film de marque) :
 * logo, fil d'Ariane, pastille d'informations, actions. Collante, et suit le
 * thème clair / sombre par les tokens.
 */
export default function AppTopBar({ fil, meta, actions, retour = "/dashboard" }: Props) {
  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-line">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="shrink-0 flex items-center gap-2 group">
              <span className="w-7 h-7 rounded-md bg-ink text-bg grid place-items-center">
                <Film className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
              <span className="hidden sm:inline font-semibold text-sm tracking-tight text-ink">GEN MOTION</span>
            </Link>
            {fil.map((maille, index) => {
              const courante = index === fil.length - 1;
              return (
                // Sur un écran étroit, seule la page courante reste dans le fil.
                <span key={maille.libelle} className={courante ? "flex items-center gap-3 min-w-0" : "hidden md:flex items-center gap-3"}>
                  <ChevronRight className="w-3.5 h-3.5 text-faint shrink-0" />
                  {maille.href && !courante ? (
                    <Link href={maille.href} className="text-sm text-muted font-medium hover:text-ink transition-colors">
                      {maille.libelle}
                    </Link>
                  ) : (
                    <span className="text-sm text-ink font-medium truncate" title={maille.titre}>
                      {maille.libelle}
                    </span>
                  )}
                </span>
              );
            })}
            {meta && (
              <span className="hidden md:inline-flex items-center gap-2 ml-1 px-2.5 py-1 rounded-full border border-line bg-surface-2 font-mono text-[11px] text-muted">
                {meta}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {actions}
            <Link href="/help" className={LIEN_DISCRET} aria-label="Aide">
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aide</span>
            </Link>
            <Link href={retour} className={LIEN_DISCRET} aria-label="Retour">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Retour</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

/** Le point qui sépare deux informations dans la pastille `meta`. */
export function PointDeMeta() {
  return <span className="w-1 h-1 rounded-full bg-line-strong" />;
}
