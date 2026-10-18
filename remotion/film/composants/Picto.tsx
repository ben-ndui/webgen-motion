import type { ReactNode } from "react";

import type { Picto as NomDePicto } from "../pictos";

type Couleurs = {
  // Le corps de l'objet (clair sur fond sombre).
  corps: string;
  // Les traits dessinés sur le corps (encre).
  trait: string;
  // Un seul détail en accent par pictogramme : l'œil y va.
  accent: string;
};

type Props = Couleurs & { nom: NomDePicto; taille: number };

/**
 * Les pictogrammes des formats (explainer, conte), dessinés ici, dans une boîte de 100 × 100 :
 * des formes simples, pleines, lisibles en petit. Aucun logo ni emoji de
 * marque tierce (le modèle d'origine utilisait celui de Hugging Face).
 */
export function Picto({ nom, taille, corps, trait, accent }: Props) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 100 100" aria-hidden>
      {DESSINS[nom]({ corps, trait, accent })}
    </svg>
  );
}

const DESSINS: Record<NomDePicto, (c: Couleurs) => ReactNode> = {
  robot: ({ corps, trait, accent }) => (
    <>
      <line x1={50} y1={8} x2={50} y2={22} stroke={corps} strokeWidth={4} strokeLinecap="round" />
      <circle cx={50} cy={8} r={5} fill={accent} />
      <rect x={18} y={22} width={64} height={46} rx={14} fill={corps} />
      <rect x={28} y={34} width={44} height={18} rx={9} fill={trait} />
      <circle cx={40} cy={43} r={4} fill={accent} />
      <circle cx={60} cy={43} r={4} fill={accent} />
      <rect x={30} y={72} width={40} height={22} rx={8} fill={corps} />
    </>
  ),
  document: ({ corps, trait, accent }) => (
    <>
      <path d="M22 6 H62 L80 24 V94 H22 Z" fill={corps} />
      <path d="M62 6 V24 H80" fill={accent} />
      <rect x={32} y={40} width={38} height={5} rx={2.5} fill={trait} />
      <rect x={32} y={54} width={38} height={5} rx={2.5} fill={trait} />
      <rect x={32} y={68} width={24} height={5} rx={2.5} fill={trait} />
    </>
  ),
  formulaire: ({ corps, trait, accent }) => (
    <>
      <rect x={16} y={6} width={68} height={88} rx={8} fill={corps} />
      <rect x={26} y={18} width={30} height={5} rx={2.5} fill={trait} />
      <rect x={26} y={30} width={48} height={12} rx={3} fill="none" stroke={trait} strokeWidth={3} />
      <rect x={26} y={50} width={48} height={12} rx={3} fill="none" stroke={trait} strokeWidth={3} />
      <rect x={26} y={72} width={48} height={12} rx={6} fill={accent} />
    </>
  ),
  cadenas: ({ corps, trait, accent }) => (
    <>
      <path d="M32 44 V30 a18 18 0 0 1 36 0 V44" fill="none" stroke={corps} strokeWidth={8} />
      <rect x={20} y={42} width={60} height={50} rx={10} fill={corps} />
      <circle cx={50} cy={62} r={7} fill={accent} />
      <rect x={47} y={64} width={6} height={14} rx={3} fill={trait} />
    </>
  ),
  loupe: ({ corps, trait, accent }) => (
    <>
      <line x1={62} y1={62} x2={88} y2={88} stroke={corps} strokeWidth={12} strokeLinecap="round" />
      <circle cx={42} cy={42} r={30} fill={corps} />
      <circle cx={42} cy={42} r={20} fill={trait} />
      <circle cx={35} cy={35} r={6} fill={accent} />
    </>
  ),
  personne: ({ corps, accent }) => (
    <>
      <circle cx={50} cy={28} r={18} fill={corps} />
      <path d="M16 92 a34 34 0 0 1 68 0 Z" fill={corps} />
      <circle cx={50} cy={68} r={5} fill={accent} />
    </>
  ),
  serveur: ({ corps, trait, accent }) => (
    <>
      {[10, 40, 70].map((y) => (
        <g key={y}>
          <rect x={14} y={y} width={72} height={24} rx={6} fill={corps} />
          <rect x={24} y={y + 10} width={30} height={4} rx={2} fill={trait} />
          <circle cx={74} cy={y + 12} r={4} fill={y === 40 ? accent : trait} />
        </g>
      ))}
    </>
  ),
  ecran: ({ corps, trait, accent }) => (
    <>
      <rect x={8} y={14} width={84} height={56} rx={8} fill={corps} />
      <rect x={16} y={22} width={68} height={40} rx={3} fill={trait} />
      <rect x={24} y={30} width={34} height={6} rx={3} fill={accent} />
      <rect x={24} y={42} width={48} height={4} rx={2} fill={corps} />
      <rect x={40} y={70} width={20} height={12} fill={corps} />
      <rect x={28} y={82} width={44} height={6} rx={3} fill={corps} />
    </>
  ),
  horloge: ({ corps, trait, accent }) => (
    <>
      <circle cx={50} cy={50} r={42} fill={corps} />
      <line x1={50} y1={50} x2={50} y2={24} stroke={trait} strokeWidth={6} strokeLinecap="round" />
      <line x1={50} y1={50} x2={70} y2={60} stroke={accent} strokeWidth={6} strokeLinecap="round" />
      <circle cx={50} cy={50} r={5} fill={trait} />
    </>
  ),
  coche: ({ corps, accent }) => (
    <>
      <circle cx={50} cy={50} r={42} fill={accent} />
      <path d="M30 51 L44 65 L71 36" fill="none" stroke={corps} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};
