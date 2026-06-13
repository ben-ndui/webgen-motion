"use client";

import { useState } from "react";

/**
 * Opt-out de la télémétrie d'activation anonyme (cf. src/lib/telemetry.ts).
 *
 * Sous-section de la done-step — même langage visuel que le reste du
 * wizard (noir & blanc strict, labels mono uppercase, cards rounded-xl).
 * Switch accessible (role="switch" + aria-checked). Mise à jour optimiste
 * avec rollback si le PUT échoue.
 */
export default function WizardTelemetryToggle({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !enabled;
    setEnabled(next); // optimiste
    setSaving(true);
    try {
      const res = await fetch("/api/motion/config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ telemetry: { enabled: next } }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setEnabled(!next); // rollback
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      data-wm-id="setup.done.telemetry"
      className="rounded-xl border border-line bg-surface p-4"
    >
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-3">
        Confidentialité
      </p>

      <div className="flex items-start justify-between gap-4">
        <label
          htmlFor="telemetry-switch"
          className="text-sm font-medium text-ink cursor-pointer select-none"
        >
          Aider à améliorer GEN MOTION
        </label>

        <button
          id="telemetry-switch"
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={saving}
          onClick={toggle}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            enabled ? "bg-ink" : "bg-line-strong"
          }`}
        >
          <span className="sr-only">
            {enabled ? "Désactiver la télémétrie" : "Activer la télémétrie"}
          </span>
          <span
            aria-hidden="true"
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-bg shadow-sm transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <p className="mt-2 text-xs text-muted leading-relaxed">
        Un signal anonyme unique à ta première vidéo composée — id aléatoire,
        aucune donnée perso, aucun contenu. Désactivable ici à tout moment.{" "}
        <a
          href="/confidentialite"
          className="text-faint underline underline-offset-2 hover:text-muted transition-colors"
        >
          En savoir plus
        </a>
      </p>
    </div>
  );
}
