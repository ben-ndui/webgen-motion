import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import UpdateChecker from "./_components/update-checker";
import DesktopTokenBridge from "./_components/desktop-token-bridge";
import LicenseRefreshChecker from "./_components/license-refresh-checker";
import PostHogProvider from "./_components/posthog-provider";
import CookieConsent from "./_components/cookie-consent";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL("https://genmotion.app"),
  title: "GEN MOTION — Vidéos produit as code, régénérées à chaque release",
  description:
    "GEN MOTION rejoue ton produit (web ou app native), pose la voix off, monte sur la musique — et le refait à l'identique après chaque release. Local-first · Fair-code FSL · Studio à vie ou en abonnement.",
  // Quand SEO prêt à pousser, retirer noindex et set canonical/og :
  robots: "noindex, nofollow",
  openGraph: {
    title: "GEN MOTION — Vidéos produit as code",
    description: "Tes vidéos produit, écrites comme du code. Régénérées à chaque release. En local, sans abonnement.",
    url: "https://genmotion.app",
    siteName: "GEN MOTION",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Token de session desktop (injecté par le shell Tauri via
            WEBGEN_DESKTOP_TOKEN). Vide sur le web/dev → couche token
            désactivée. Lu par DesktopTokenBridge pour signer les
            requêtes /api/motion. */}
        <meta
          name="webgen-desktop-token"
          content={process.env.WEBGEN_DESKTOP_TOKEN ?? ""}
        />
        {/* Pre-paint theme set to avoid FOUC. Runs before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-ink">
        {children}
        <PostHogProvider />
        <CookieConsent />
        <LicenseRefreshChecker />
        <UpdateChecker />
        <DesktopTokenBridge />
      </body>
    </html>
  );
}
