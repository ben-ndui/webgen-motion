import { pageDuReglage } from "@/lib/reglages/etat-des-reglages";

/**
 * Un message d'erreur qui parle des Réglages (« Aucune clé Claude :
 * ajoute-la dans les Réglages ») mène d'un clic à la page qui règle
 * exactement ce qui manque.
 */
export default function MessageAvecReglage({ message }: { message: string }) {
  if (!message.includes("Réglages")) return <>{message}</>;
  return (
    <>
      {message} <a href={pageDuReglage(message)}>Ouvrir les Réglages</a>
    </>
  );
}
