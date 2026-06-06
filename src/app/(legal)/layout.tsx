import PageShell from "../_components/page-shell";
import LegalNav from "./legal-nav";

/**
 * Legal pages layout — handoff `.legal` two-col (sticky TOC + body),
 * wrapped in the shared PageShell. Each route renders its document in
 * the legal-body; `.legal-sec` provides the token-themed spacing.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell>
      <main className="wrap">
        <div className="legal" data-wm-id="legal.page">
          <LegalNav />
          <div className="legal-body legal-sec">{children}</div>
        </div>
      </main>
    </PageShell>
  );
}
