"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";

/**
 * <UpdateChecker /> — Sprint 12 popup update.
 *
 * Tourne UNIQUEMENT dans l'app desktop (Tauri) ou en dev local. Skip
 * silencieusement quand le hostname matche les domaines hosting
 * (genmotion.app, *.vercel.app) — les visiteurs du site marketing
 * n'ont pas une app "installée" donc pas de check à faire.
 *
 * Flow :
 *  1. Au mount, après 2s delay (laisse l'app se charger), fetch
 *     https://genmotion.app/api/version
 *  2. Compare semver `latest` à `NEXT_PUBLIC_APP_VERSION` injecté
 *     au build depuis package.json
 *  3. Si nouvelle version + pas déjà dismissed via localStorage →
 *     affiche un floating card bottom-right avec :
 *     - current → latest
 *     - notes excerpt
 *     - bouton "Mettre à jour" (open GitHub release dans browser)
 *     - bouton "Plus tard" (dismiss + persist localStorage key)
 *
 * Dismiss persistence : `webgen-motion:dismissed-update-version` =
 * la version dismissed. Re-show seulement si une release encore
 * plus récente arrive. Pas de "demain", pas de "dans 1 semaine" —
 * MVP simple, on raffine plus tard.
 */

const CURRENT = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
const REMOTE = "https://genmotion.app/api/version";
const DISMISS_KEY = "webgen-motion:dismissed-update-version";
const HOSTED_DOMAINS = ["genmotion.app", "www.genmotion.app"];

interface VersionInfo {
  latest: string;
  releaseUrl: string;
  downloadUrl: string;
  notes: string;
  publishedAt: string;
}

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.split(".").map((p) => parseInt(p, 10) || 0);
  const [la, lb, lc] = parse(latest);
  const [ca, cb, cc] = parse(current);
  if (la !== ca) return la > ca;
  if (lb !== cb) return lb > cb;
  return lc > cc;
}

function isHostedDomain(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (HOSTED_DOMAINS.includes(host)) return true;
  if (host.endsWith(".vercel.app")) return true;
  return false;
}

export default function UpdateChecker() {
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isHostedDomain()) return; // skip sur le site marketing
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(REMOTE, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as VersionInfo & { error?: string };
        if (data.error || !data.latest) return;
        if (!isNewer(data.latest, CURRENT)) return;

        const dismissed = localStorage.getItem(DISMISS_KEY);
        if (dismissed === data.latest) return;
        setInfo(data);
      } catch {
        // silent — pas de réseau / GitHub down / etc.
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    if (info) {
      try {
        localStorage.setItem(DISMISS_KEY, info.latest);
      } catch {
        // localStorage indispo (private mode) — best effort
      }
    }
    setHidden(true);
  }

  if (!info || hidden) return null;

  const publishedDate = new Date(info.publishedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-surface border border-line-strong shadow-xl"
      role="dialog"
      aria-label="Mise à jour disponible"
      data-wm-id="update-checker.card"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted">
              Mise à jour disponible
            </span>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-faint hover:text-ink-soft transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-ink font-medium mb-1">
          GEN MOTION v{info.latest} est dispo
        </p>
        <p className="text-xs text-muted mb-3 font-mono">
          Tu as v{CURRENT} · publiée le {publishedDate}
        </p>

        {info.notes && (
          <p className="text-xs text-muted leading-relaxed mb-4 line-clamp-3 whitespace-pre-line">
            {info.notes.split("\n").slice(0, 4).join("\n").slice(0, 240)}
          </p>
        )}

        <div className="flex items-center gap-2">
          <a
            href={info.releaseUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-ink text-bg text-xs font-medium hover:opacity-90 transition-colors"
            onClick={dismiss}
          >
            Voir la release
            <ArrowUpRight className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="px-3 py-2 text-xs text-muted hover:text-ink transition-colors"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
