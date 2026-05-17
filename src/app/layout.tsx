import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import UpdateChecker from "./_components/update-checker";

export const metadata: Metadata = {
  metadataBase: new URL("https://genmotion.app"),
  title: "GEN MOTION · Smooth & Design",
  description:
    "Capture n'importe quel site web, mixe la voix off clonée, compose un clip motion design final.mp4. Local-first. Open-core MIT · Community gratuit · Studio Edition $49.",
  // Quand SEO prêt à pousser, retirer noindex et set canonical/og :
  robots: "noindex, nofollow",
  openGraph: {
    title: "GEN MOTION — Motion Studio local-first",
    description: "On capture votre site. Vous obtenez un clip motion. Sur votre machine, sans cloud.",
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
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <UpdateChecker />
      </body>
    </html>
  );
}
