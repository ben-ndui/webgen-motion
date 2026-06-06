"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cgu", label: "CGU" },
  { href: "/cgv", label: "CGV" },
];

/** Sticky TOC for the legal pages — highlights the current route. */
export default function LegalNav() {
  const path = usePathname();
  return (
    <nav className="legal-nav" data-wm-id="legal.nav" aria-label="Documents légaux">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={path === l.href ? "active" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
