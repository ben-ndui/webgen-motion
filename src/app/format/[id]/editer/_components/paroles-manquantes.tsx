import type { MotEtireLisible } from "@/lib/formats/karaoke-paroles";

/**
 * Après un calage par alignement : les mots qui s'étirent sur du chant que le
 * texte n'écrit pas (vocalise, refrain oublié). Le passage qui suit chacun de
 * ces mots est mal calé tant que les paroles manquantes ne sont pas ajoutées.
 */
export default function ParolesManquantes({ etires }: { etires: MotEtireLisible[] }) {
  if (etires.length === 0) return null;
  return (
    <div className="depot-erreur" role="alert" data-wm-id="format.karaoke.paroles-manquantes">
      <p>Il manque sans doute des paroles dans ton texte : {etires.length === 1 ? "ce mot s'étire" : "ces mots s'étirent"} sur du chant que tu n&apos;as pas écrit.</p>
      <ul>
        {etires.map((etire, i) => (
          <li key={i}>Juste après « {etire.mot} », dans « {etire.ligne} »</li>
        ))}
      </ul>
      <p>Ajoute ce qui est chanté là (même « ooh »), puis recale.</p>
    </div>
  );
}
