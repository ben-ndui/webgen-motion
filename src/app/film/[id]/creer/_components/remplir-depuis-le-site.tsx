"use client";

import { useEffect, useRef, useState } from "react";

import type { Destination } from "./remplissage/a-faire-apres";
import CarteReduite from "./remplissage/carte-reduite";
import FenetreDuRemplissage from "./remplissage/fenetre-du-remplissage";
import HorsDuFlux from "./remplissage/hors-du-flux";
import { useRemplissage } from "./use-remplissage";

type Props = {
  id: string;
  adresseAuDepart?: string;
  // Le bloc ne se montre qu'à l'étape 1 ; la fenêtre et la carte du coin, partout.
  blocVisible?: boolean;
  avantDeLancer: () => Promise<boolean>;
  recharger: () => Promise<void>;
  // Pendant le remplissage, le formulaire est gelé : le serveur réécrit la fiche.
  onOccupe: (occupe: boolean) => void;
  onAller?: (destination: Destination) => void;
};

type Affichage = "fenetre" | "carte" | "aucun";

/**
 * « Remplir depuis ton site » : une adresse, et GEN MOTION capture le site,
 * lit la marque et propose les textes. Le suivi s'ouvre en fenêtre (étapes,
 * captures en direct, récap) et se réduit dans le coin. Lancé tout seul si
 * l'adresse a été donnée à la création du film.
 */
export default function RemplirDepuisLeSite({ id, adresseAuDepart, blocVisible = true, avantDeLancer, recharger, onOccupe, onAller }: Props) {
  const [adresse, setAdresse] = useState(adresseAuDepart ?? "");
  const [remplacerCaptures, setRemplacerCaptures] = useState(false);
  const [affichage, setAffichage] = useState<Affichage>("aucun");
  const { etat, lancer, arreter } = useRemplissage(id, recharger);
  const dejaLance = useRef(false);

  async function demarrer(url: string) {
    if (!(await avantDeLancer())) return;
    setAffichage("fenetre");
    onOccupe(true);
    try {
      await lancer(url, remplacerCaptures);
    } finally {
      onOccupe(false);
    }
  }

  function aller(destination: Destination) {
    setAffichage("aucun");
    onAller?.(destination);
    window.scrollTo({ top: 0 });
  }

  useEffect(() => {
    if (!adresseAuDepart || dejaLance.current) return;
    dejaLance.current = true;
    // L'adresse quitte la barre : recharger la page ne relancera pas le remplissage.
    window.history.replaceState(null, "", window.location.pathname);
    void demarrer(adresseAuDepart);
    // Lancement unique au montage, avec l'adresse de la création.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adresseAuDepart]);

  const enCours = etat.type === "en-cours";
  const site = adresse.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "") || "ton site";
  return (
    <>
      <section className="bloc remplir" aria-labelledby="remplir-titre" data-wm-id="film.remplir" hidden={!blocVisible}>
        <h3 id="remplir-titre" className="bloc-titre">Remplir depuis ton site</h3>
        <p className="champ-aide">
          GEN MOTION ouvre ton site, le filme au téléphone et sur ordinateur, lit tes couleurs et ton logo, et propose
          tes textes. Ce que tu as déjà écrit n&apos;est jamais remplacé.
        </p>
        <form className="remplir-ligne" onSubmit={(e) => { e.preventDefault(); void demarrer(adresse); }}>
          <input className="champ-saisie" value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="monsite.fr" aria-label="Adresse de ton site" disabled={enCours} />
          {enCours ? (
            <button type="button" className="film-btn film-btn-ghost" onClick={() => setAffichage("fenetre")}>Voir le suivi</button>
          ) : (
            <button type="submit" className="film-btn" disabled={!adresse.trim()}>Remplir</button>
          )}
        </form>
        <label className="case-a-cocher">
          <input type="checkbox" checked={remplacerCaptures} disabled={enCours} onChange={(e) => setRemplacerCaptures(e.target.checked)} />
          Remplacer aussi mes captures actuelles par des vidéos filmées (sinon, seules les cases vides ou remplies par GEN MOTION passent en vidéo)
        </label>
        {etat.type === "fait" && (
          <p className="remplir-fin" role="status">
            <b>C&apos;est rempli.</b> {etat.resume.captures} captures, {etat.resume.textesProposes} textes proposés.{" "}
            <button type="button" className="lien" onClick={() => setAffichage("fenetre")}>Revoir le récap</button>
          </p>
        )}
        {etat.type === "erreur" && (
          // La fenêtre ouverte annonce déjà l'erreur : une seule annonce, pas deux.
          <p className="depot-erreur" role={affichage === "aucun" ? "alert" : undefined}>
            {etat.message}{" "}
            <button type="button" className="lien" onClick={() => setAffichage("fenetre")}>Voir où ça s&apos;est arrêté</button>
          </p>
        )}
      </section>

      <HorsDuFlux>
        {etat.type !== "repos" && affichage === "fenetre" && (
          <FenetreDuRemplissage
            id={id}
            site={site}
            etat={etat}
            reduire={() => setAffichage("carte")}
            fermer={() => setAffichage("aucun")}
            arreter={arreter}
            reessayer={() => void demarrer(adresse)}
            onAller={aller}
          />
        )}
        {etat.type !== "repos" && affichage === "carte" && (
          <CarteReduite id={id} etat={etat} agrandir={() => setAffichage("fenetre")} fermer={() => setAffichage("aucun")} />
        )}
      </HorsDuFlux>
    </>
  );
}
