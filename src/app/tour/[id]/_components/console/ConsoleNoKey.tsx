"use client";

import Link from "next/link";

/**
 * État BYOK sans clé (2.8) — anatomie .cap-empty : icône carrée,
 * corps max 42ch, CTA primaire vers /setup/agent. Le composer reste
 * affiché mais désactivé (rendu par le dock) — la promesse de
 * l'interface reste visible. Statique, à dessein.
 */
export default function ConsoleNoKey() {
  return (
    <div className="con-nokey">
      <div className="ck-icon" aria-hidden>
        <span>❯_</span>
      </div>
      <h3>La console pilote Claude avec ta clé.</h3>
      <p>
        GEN MOTION est BYOK : ta clé Anthropic reste sur ta machine, dans
        ta config locale. Aucun proxy, aucun compte.
      </p>
      <Link href="/setup/agent" className="ck-cta" data-wm-id="console.nokey.setup">
        Configurer l&apos;agent
      </Link>
      <span className="ck-path">config.json · ~/.webgen-motion</span>
    </div>
  );
}
