import BarreFlottante, { type OngletDeLaBarre } from "./barre-flottante";

// Icônes au trait du hub (1.7) : elles portent l'onglet, aucune n'est décorative.
const Videos = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4" /></svg>;
const Reglages = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8M4.6 9a1.6 1.6 0 0 0-.3-1.8" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>;
const Console = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m7.5 9.5 3 2.5-3 2.5M13 15h3.5" /></svg>;
const Aide = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.9" /><path d="M12 17.2h.01" /></svg>;

export type PageDuStudio = "videos" | "reglages" | "aide";

/** L'onglet de la console IA, là où la page en a une. */
export type OngletConsole = { action: () => void; enfonce: boolean; pastille: boolean; titre: string };

type Props = { actif: PageDuStudio; ongletConsole?: OngletConsole };

/** Les destinations du studio, la page ouverte en surbrillance ; la console IA en quatrième onglet. */
export default function NavigationDuStudio({ actif, ongletConsole }: Props) {
  const onglets: OngletDeLaBarre[] = [
    { cle: "videos", libelle: "Mes vidéos", icone: <Videos />, href: "/dashboard", actif: actif === "videos" },
    { cle: "reglages", libelle: "Réglages", icone: <Reglages />, href: "/setup", actif: actif === "reglages" },
    { cle: "aide", libelle: "Aide", icone: <Aide />, href: "/help", actif: actif === "aide" },
  ];
  if (ongletConsole) onglets.push({ cle: "console", libelle: "Console", icone: <Console />, ...ongletConsole });
  return <BarreFlottante libelle="Navigation du studio" onglets={onglets} />;
}
