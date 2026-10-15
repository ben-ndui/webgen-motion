/**
 * Lit une réponse NDJSON (une ligne JSON par événement) jusqu'au bout, et
 * passe chaque événement à `surEvenement`. Partagé par « Remplir depuis le
 * site » et « Tes écrans ».
 */
export type EvenementDuFlux = { type: string; [cle: string]: unknown };

export async function lireLeFlux(reponse: Response, surEvenement: (evenement: EvenementDuFlux) => void): Promise<void> {
  if (!reponse.body) return;
  const lecteur = reponse.body.getReader();
  const decodeur = new TextDecoder();
  let reste = "";
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    reste += decodeur.decode(value, { stream: true });
    const lignes = reste.split("\n");
    reste = lignes.pop() ?? "";
    for (const ligne of lignes) {
      if (ligne.trim()) surEvenement(JSON.parse(ligne) as EvenementDuFlux);
    }
  }
}
