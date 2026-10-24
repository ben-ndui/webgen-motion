import Link from "next/link";
import ChoixDuProfil from "./_components/choix-du-profil";

/**
 * Réglages · Interface : le profil du dashboard. « Complet » pour un usage
 * normal, « Série » pour une install dédiée à une cliente qui ne fait que
 * des séries IA (ex. Brigitte / SAYA) — allège le dashboard et le menu
 * « + Nouveau » à l'essentiel pour elle.
 */
export default function ReglageInterface() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line">
        <nav className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3 text-sm" aria-label="Fil d'Ariane">
          <Link href="/dashboard" className="text-muted hover:text-ink transition">← Mes vidéos</Link>
          <span className="text-faint">/</span>
          <Link href="/setup" className="text-muted hover:text-ink transition">Réglages</Link>
          <span className="text-faint">/</span>
          <span className="font-semibold">Interface</span>
        </nav>
      </header>

      <main data-wm-id="setup.interface.page" className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Interface</h1>
          <p className="mt-3 text-sm text-muted leading-relaxed max-w-xl">
            Change ce que montre ce dashboard. Utile pour une install dédiée à une cliente qui n&apos;a besoin que d&apos;une
            partie de GEN MOTION : elle ne voit que ce qui la concerne, sans se perdre dans le reste.
          </p>
        </div>

        <ChoixDuProfil />
      </main>
    </div>
  );
}
