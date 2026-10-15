"use client";

import type { GroupeDEcrans } from "@/lib/site/choix-des-pages";
import ChoixAvecClaude from "./choix-avec-claude";
import { useEcransAvecClaude } from "./use-ecrans-avec-claude";

type Props = {
  id: string;
  groupe: GroupeDEcrans;
  cases: string[];
  adresse: string | null;
  avantDeFilmer: () => Promise<boolean>;
  apresLeFilmage: () => Promise<void>;
};

/** L'aide de Claude pour UN groupe de cases (chaque groupe a sa proposition). */
export default function AideDuGroupe({ id, groupe, cases, adresse, avantDeFilmer, apresLeFilmage }: Props) {
  const aide = useEcransAvecClaude({ id, avantDeFilmer, apresLeFilmage }, groupe);
  return (
    <ChoixAvecClaude
      cases={cases}
      adresse={adresse}
      etat={aide.etat}
      proposer={(url) => void aide.proposer(url)}
      changerLaPage={aide.changerLaPage}
      autre={aide.autre}
      garder={(url) => void aide.garder(url)}
      refuser={aide.refuser}
    />
  );
}
