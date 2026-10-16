"use client";

import "../console.css";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { MockTransport } from "../tour/[id]/_components/console/mock-transport";
import { RealTransport } from "../tour/[id]/_components/console/real-transport";
import { useConsoleSession } from "../tour/[id]/_components/console/useConsoleSession";
import ConsoleSurface from "../tour/[id]/_components/console/ConsoleSurface";
import ConsoleFlottante from "./console-du-hub/console-flottante";
import FeuilleDeLaConsole from "./console-du-hub/feuille-de-la-console";
import { CLE_DES_PRISES } from "./console-du-hub/reglages-de-la-console";
import { useActionsDuHub } from "./console-du-hub/use-actions-du-hub";
import { useConsoleFlottante } from "./console-du-hub/use-console-flottante";
import { useFenetreDetachee } from "./console-du-hub/use-fenetre-detachee";
import { useHauteurDeLaFeuille } from "./console-du-hub/use-hauteur-de-la-feuille";
import { useModeDeLaConsole } from "./console-du-hub/use-mode-de-la-console";
import NavigationDuStudio, { type OngletConsole, type PageDuStudio } from "./navigation-du-studio";

/**
 * Le bas de l'écran du studio : la barre de navigation OU la console IA,
 * jamais les deux l'une sur l'autre. L'onglet « Console » de la barre (ou
 * ⌘J) ouvre la console en feuille flottante à la place de la barre ; la
 * fermer (✕, Échap) ramène la barre. La console peut aussi flotter dans la
 * page ou vivre dans une fenêtre séparée : la barre revient alors.
 *
 * La conversation (prises, saisie) est la même quel que soit l'endroit où
 * la console s'affiche ; la fenêtre séparée tient la sienne.
 */
export default function HubConsole({ actif }: { actif: PageDuStudio }) {
  // La console a besoin de la saisie pour s'ouvrir, la saisie vient de la session
  // qui a besoin de la console : une référence casse la boucle.
  const focaliser = useRef<() => void>(() => {});
  const etat = useModeDeLaConsole(useCallback(() => focaliser.current(), []));
  const { mode, changerDeMode } = etat;

  const transport = useMemo(() => {
    const factice = typeof window !== "undefined" && window.localStorage.getItem("motion-console-mock") === "1";
    return factice ? new MockTransport() : new RealTransport();
  }, []);
  const session = useConsoleSession({
    transport,
    mode: "hub",
    hubActions: useActionsDuHub(),
    persistKey: CLE_DES_PRISES,
    onActivity: etat.noterUneActivite,
  });
  useEffect(() => {
    focaliser.current = session.focusComposer;
  }, [session.focusComposer]);

  const fenetre = useFenetreDetachee({ mode, changerDeMode, signaler: etat.signaler });
  const feuille = useHauteurDeLaFeuille();
  const flottante = useConsoleFlottante();
  const fermer = () => changerDeMode("fermee");

  const communs = {
    surface: (
      <section className="gm-console embed" aria-label="Conversation avec la console">
        <ConsoleSurface session={session} />
      </section>
    ),
    enDirect: session.streaming,
    avis: etat.avis,
    compact: session.forceCompact,
    basculerCompact: () => session.setForceCompact((v) => !v),
    ouvrirLaFenetre: fenetre.ouvrirLaFenetre,
    fermer,
  };

  if (mode === "feuille") {
    return <FeuilleDeLaConsole {...communs} {...feuille} rendreFlottante={() => changerDeMode("flottante")} />;
  }

  const actionDeLOnglet = { fermee: etat.ouvrir, flottante: fermer, fenetre: fenetre.recupererLaFenetre }[mode];
  const onglet: OngletConsole = {
    action: actionDeLOnglet,
    enfonce: mode !== "fermee",
    pastille: session.streaming || etat.nonLu,
    titre: mode === "fenetre" ? "Console détachée : la ramener au premier plan" : "Console IA (⌘J)",
  };
  return (
    <>
      {mode === "flottante" && (
        <ConsoleFlottante
          {...communs}
          cadre={flottante.cadreVisible()}
          deplacement={flottante.deplacement}
          deplacer={flottante.deplacer}
          redimensionner={flottante.redimensionner}
          ramenerEnBas={() => changerDeMode("feuille")}
        />
      )}
      <NavigationDuStudio actif={actif} ongletConsole={onglet} />
    </>
  );
}
