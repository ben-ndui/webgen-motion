import BarreFlottante from "./barre-flottante";

// Icônes au trait du hub (1.7) : elles portent l'onglet, aucune n'est décorative.
const Videos = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4" /></svg>;
const Reglages = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8M4.6 9a1.6 1.6 0 0 0-.3-1.8" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>;
const Aide = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.9" /><path d="M12 17.2h.01" /></svg>;

export type PageDuStudio = "videos" | "reglages" | "aide";

/** Les trois destinations du studio, la page ouverte en surbrillance. */
export default function NavigationDuStudio({ actif }: { actif: PageDuStudio }) {
  return (
    <BarreFlottante
      libelle="Navigation du studio"
      onglets={[
        { cle: "videos", libelle: "Mes vidéos", icone: <Videos />, href: "/dashboard", actif: actif === "videos" },
        { cle: "reglages", libelle: "Réglages", icone: <Reglages />, href: "/setup", actif: actif === "reglages" },
        { cle: "aide", libelle: "Aide", icone: <Aide />, href: "/help", actif: actif === "aide" },
      ]}
    />
  );
}
