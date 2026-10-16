/* eslint-disable @next/next/no-img-element -- captures locales servies par l'API du film */
type Props = { id: string; numeros: number[]; enCours: boolean };

/** L'adresse d'une capture prise pendant le remplissage. */
export function adresseDUnApercu(id: string, numero: number): string {
  return `/api/motion/film/${encodeURIComponent(id)}/remplir/apercu?n=${numero}`;
}

/**
 * Les captures du site, qui apparaissent au moment où GEN MOTION les prend.
 * Avant la première : des cases qui attendent, pour qu'on comprenne ce qui arrive.
 */
export default function ApercusEnDirect({ id, numeros, enCours }: Props) {
  if (numeros.length === 0 && !enCours) return null;
  const attente = enCours ? Math.max(0, 3 - numeros.length) : 0;
  return (
    <div className="remplissage-apercus" aria-label={`${numeros.length} capture${numeros.length > 1 ? "s" : ""} de ton site`} role="img">
      {numeros.map((numero) => (
        <img key={numero} src={adresseDUnApercu(id, numero)} alt="" className="remplissage-apercu" />
      ))}
      {Array.from({ length: attente }, (_, i) => (
        <span key={`attente-${i}`} className="remplissage-apercu remplissage-apercu-attente" aria-hidden />
      ))}
    </div>
  );
}
