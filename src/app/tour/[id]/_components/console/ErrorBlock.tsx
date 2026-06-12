"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TakeBlock } from "./types";

type ErrBlock = Extract<TakeBlock, { kind: "error" }>;

/**
 * Bloc erreur LLM — une ligne de log, pas une bannière qui crie.
 * Trois familles : network (offline), rate-limit (countdown live dans
 * le bouton, activé à 0), provider (pointe /setup/agent). La frappe
 * n'est jamais perdue : `copier le prompt` + ↑ rappelle la prise.
 */
export default function ErrorBlock({
  block,
  prompt,
  onRetry,
}: {
  block: ErrBlock;
  prompt: string;
  onRetry: () => void;
}) {
  const [left, setLeft] = useState(block.retryInSec ?? 0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!block.retryInSec) return;
    const iv = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(iv);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [block.retryInSec]);

  const hint =
    block.code === "network"
      ? "hors-ligne — vérifie ta connexion"
      : block.code === "rate-limit"
        ? `nouvel essai possible dans ${left}s`
        : block.code === "provider"
          ? "clé ou modèle indisponible"
          : "clé API manquante";

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="take-err">
        <div className="err-line">
          <span className="err-p">err</span>
          <span>{block.message}</span>
        </div>
        <div className="err-line">
          <span className="err-p" aria-hidden>
            {" "}
          </span>
          <span>{hint}</span>
        </div>
      </div>
      <div className="take-actions">
        {block.code === "provider" || block.code === "no-key" ? (
          <Link href="/setup/agent" className="con-link" data-wm-id="console.error.setup">
            configurer l&apos;agent
          </Link>
        ) : null}
        <button type="button" className="con-link" onClick={copyPrompt} data-wm-id="console.error.copy">
          {copied ? "copié" : "copier le prompt"}
        </button>
        <button
          type="button"
          className="con-btn ghost"
          disabled={left > 0}
          onClick={onRetry}
          data-wm-id="console.error.retry"
        >
          {left > 0 ? `Réessayer (${left}s)` : "Réessayer"}
        </button>
      </div>
    </div>
  );
}
