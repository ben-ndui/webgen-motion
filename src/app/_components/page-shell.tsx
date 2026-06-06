import Link from "next/link";
import "../pages.css";
import ThemeToggle from "./theme-toggle";

/**
 * Shared chrome for the secondary marketing/static pages (Download,
 * About, Legal, …) — handoff pages.css nav + footer, scoped under
 * .gm-page so the bespoke class names stay isolated. Token-driven →
 * light/dark for free.
 */
export default function PageShell({
  active,
  children,
}: {
  active?: "produit" | "about" | "download";
  children: React.ReactNode;
}) {
  const link = (href: string, label: string, key?: string) => (
    <Link className={"nav-link" + (active && key === active ? " active" : "")} href={href}>
      {label}
    </Link>
  );
  return (
    <div className="gm-page">
      <nav className="pnav" data-wm-id="page.nav">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">GEN&nbsp;MOTION</span>
        </Link>
        <div className="nav-links">
          {link("/", "Produit", "produit")}
          {link("/#editions", "Éditions")}
          {link("/about", "À propos", "about")}
          {link("/download", "Télécharger", "download")}
        </div>
        <div className="nav-tools">
          <ThemeToggle />
          <Link className="btn btn-primary" href="/download">Télécharger</Link>
        </div>
      </nav>

      {children}

      <footer className="pfooter" data-wm-id="page.footer">
        <div className="wrap">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden />
            <span className="brand-name">GEN&nbsp;MOTION</span>
          </Link>
          <div className="foot-links">
            <Link href="/about">À propos</Link>
            <Link href="/help">Doc</Link>
            <Link href="/mentions-legales">Mentions</Link>
            <Link href="/confidentialite">Confidentialité</Link>
            <Link href="/cgu">CGU</Link>
            <Link href="/cgv">CGV</Link>
            <a href="https://github.com/ben-ndui/webgen-motion">GitHub</a>
          </div>
          <span className="foot-meta">genmotion.app · Smooth &amp; Design · Nice</span>
        </div>
      </footer>
    </div>
  );
}
