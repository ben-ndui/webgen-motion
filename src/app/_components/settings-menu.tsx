"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Box,
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Mic,
  Settings as SettingsIcon,
  ShieldCheck,
} from "lucide-react";

/**
 * Dropdown Settings dans le header — Sprint 7 phase 3.
 *
 * Centralise tous les points de config qui étaient éparpillés
 * (4 liens dans le header devenait dense). Au menu :
 *  - Voix off (/setup) — wizard ElevenLabs / Voicebox
 *  - Agent IA (/setup/agent) — clé Anthropic
 *  - Models 3D (/setup/models) — drop GLB Sketchfab
 *  - Notary (/notary) — soumissions Apple
 *
 * Future-friendly : on ajoute juste un item ici quand on ship une
 * nouvelle surface de config (license key, multi-projet, etc.).
 */
export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative" data-wm-id="dashboard.settings-menu">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-wm-id="dashboard.settings-trigger"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <SettingsIcon className="w-3.5 h-3.5" />
        Settings
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-72 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-50"
          data-wm-id="dashboard.settings-dropdown"
        >
          {/* Config produits */}
          <SectionHeader label="Config" />
          <MenuLink
            href="/setup"
            icon={<Mic className="w-3.5 h-3.5" />}
            label="Voix off"
            hint="ElevenLabs / Voicebox"
            onClick={() => setOpen(false)}
          />
          <MenuLink
            href="/setup/agent"
            icon={<Bot className="w-3.5 h-3.5" />}
            label="Agent IA"
            hint="Clé Anthropic / OpenAI"
            onClick={() => setOpen(false)}
          />
          <MenuLink
            href="/setup/models"
            icon={<Box className="w-3.5 h-3.5" />}
            label="Models 3D"
            hint="Drop GLB Sketchfab"
            badge="Studio"
            onClick={() => setOpen(false)}
          />

          <div className="border-t border-slate-100" />

          {/* Outils */}
          <SectionHeader label="Outils" />
          <MenuLink
            href="/notary"
            icon={<ShieldCheck className="w-3.5 h-3.5" />}
            label="Notary"
            hint="Soumissions Apple"
            onClick={() => setOpen(false)}
          />
          <MenuLink
            href="/help"
            icon={<HelpCircle className="w-3.5 h-3.5" />}
            label="Aide"
            hint="Docs intégrées · FAQ"
            onClick={() => setOpen(false)}
          />

          <div className="border-t border-slate-100" />

          {/* External */}
          <MenuLink
            href="https://github.com/ben-ndui/webgen-motion"
            external
            icon={<ExternalLink className="w-3.5 h-3.5" />}
            label="GitHub"
            hint="ben-ndui/webgen-motion"
            onClick={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 pt-2 pb-1 text-[9px] font-mono uppercase tracking-[0.18em] text-slate-400">
      {label}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  label,
  hint,
  badge,
  external,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  badge?: string;
  external?: boolean;
  onClick?: () => void;
}) {
  const className =
    "flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors";
  const body = (
    <>
      <span className="text-slate-500 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{label}</span>
          {badge && (
            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              {badge}
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>
      </div>
    </>
  );
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        role="menuitem"
        onClick={onClick}
        className={className}
      >
        {body}
      </a>
    );
  }
  return (
    <Link href={href} role="menuitem" onClick={onClick} className={className}>
      {body}
    </Link>
  );
}
