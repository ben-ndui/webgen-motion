import Link from "next/link";

type Props = { coche: boolean; changer: (coche: boolean) => void };

/**
 * La Studio Edition se vend aux professionnels (CGV du 16/10/2026) : cette
 * case précède tout paiement, et le serveur refuse une commande sans elle.
 */
export default function CaseAchatProfessionnel({ coche, changer }: Props) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-ink-soft leading-relaxed cursor-pointer" data-wm-id="buy.achat-professionnel">
      <input type="checkbox" checked={coche} onChange={(e) => changer(e.target.checked)} className="mt-1 h-4 w-4 flex-none accent-[var(--accent)]" />
      <span>
        J&apos;achète pour mon activité professionnelle (entreprise, indépendant, micro-entrepreneur) et
        j&apos;accepte les{" "}
        <Link href="/cgv" className="text-ink underline underline-offset-4" target="_blank">
          conditions générales de vente
        </Link>
        .
      </span>
    </label>
  );
}
