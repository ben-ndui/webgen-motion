"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  SegmentedControl,
  StatusDot,
  Tabs,
} from "@/components/ui";
import ThemeToggle from "../_components/theme-toggle";

/**
 * Living design-system reference (handoff surface #8). Renders the token
 * scales + the UI primitives in one place so the token→Tailwind contract
 * is visually verifiable in light and dark. Internal page (layout is
 * noindex). Mirrors design_handoff_genmotion/GEN MOTION Design System.html.
 */

const COLORS: Array<[token: string, role: string]> = [
  ["--bg", "Fond"],
  ["--bg-sunken", "Fond creux"],
  ["--surface", "Surface"],
  ["--surface-2", "Surface 2"],
  ["--ink", "Encre"],
  ["--ink-soft", "Encre douce"],
  ["--muted", "Texte secondaire"],
  ["--faint", "Texte tertiaire"],
  ["--line", "Ligne"],
  ["--line-soft", "Ligne douce"],
  ["--line-strong", "Ligne forte"],
  ["--accent", "Accent"],
  ["--accent-hover", "Accent hover"],
  ["--accent-soft", "Accent soft"],
  ["--accent-line", "Accent ligne"],
  ["--accent-ink", "Texte sur accent"],
];

const TYPE: Array<[token: string, cls: string, label: string]> = [
  ["--t-display", "text-display", "Display"],
  ["--t-3xl", "text-3xl", "Titre 3xl"],
  ["--t-2xl", "text-2xl", "Titre 2xl"],
  ["--t-xl", "text-xl", "Titre xl"],
  ["--t-lg", "text-lg", "Large"],
  ["--t-base", "text-base", "Corps"],
  ["--t-sm", "text-sm", "Small"],
  ["--t-xs", "text-xs", "XS"],
  ["--t-mono", "text-[length:var(--t-mono)] font-mono", "Mono"],
];

const SPACING = ["--s-1", "--s-2", "--s-3", "--s-4", "--s-5", "--s-6", "--s-7", "--s-8", "--s-9", "--s-10", "--s-11"];
const RADII: Array<[token: string, cls: string]> = [
  ["--r-sm", "rounded-sm"],
  ["--r-md", "rounded-md"],
  ["--r-lg", "rounded-lg"],
  ["--r-xl", "rounded-xl"],
  ["--r-2xl", "rounded-2xl"],
];
const SHADOWS: Array<[token: string, cls: string]> = [
  ["--shadow-xs", "shadow-xs"],
  ["--shadow-sm", "shadow-sm"],
  ["--shadow-md", "shadow-md"],
  ["--shadow-pop", "shadow-pop"],
];

function useResolvedVars(tokens: string[]) {
  const [vals, setVals] = useState<Record<string, string>>({});
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const t of tokens) out[t] = cs.getPropertyValue(t).trim();
    setVals(out);
  }, [tokens]);
  return vals;
}

function Section({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-16">
      <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-faint flex items-center gap-2">
        <span className="inline-block h-px w-6 bg-line-strong" />
        {kicker}
      </div>
      <h2 className="text-2xl mt-3 mb-6">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  const colorVals = useResolvedVars(COLORS.map((c) => c[0]));
  const [seg, setSeg] = useState("16:9");
  const [tab, setTab] = useState("script");

  return (
    <main className="min-h-dvh bg-bg text-ink" data-wm-id="ds.page">
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur border-b border-line">
        <div className="max-w-[1240px] mx-auto px-6 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-7 w-7 rounded-md bg-ink" aria-hidden />
            <span className="font-semibold tracking-tight">GEN MOTION</span>
            <span className="text-muted text-sm">· Design System</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto px-6 pb-24">
        <div className="pt-16">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-faint">Design System · V1</div>
          <h1 className="text-display tracking-[-0.045em] mt-3 max-w-[18ch]">Tokens &amp; composants.</h1>
          <p className="text-muted text-sm mt-4 max-w-[56ch]">
            Noir &amp; blanc strict, un accent bleu raffiné, Geist. Bascule le thème en haut à droite — chaque token se re-thème. Contrat token → Tailwind.
          </p>
        </div>

        {/* COULEURS */}
        <Section kicker="Couleurs" title="Palette">
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
            {COLORS.map(([token, role]) => (
              <div key={token} className="border border-line rounded-md overflow-hidden bg-surface">
                <div className="h-[70px] border-b border-line" style={{ background: `var(${token})` }} />
                <div className="px-3 py-[9px]">
                  <div className="font-mono text-[11px] text-ink font-medium">{token}</div>
                  <div className="font-mono text-[10px] text-faint mt-0.5">{role}</div>
                  <div className="font-mono text-[10px] text-faint mt-0.5 break-all">{colorVals[token] || "…"}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* TYPO */}
        <Section kicker="Typographie" title="Échelle Geist">
          <div className="border-t border-line-soft">
            {TYPE.map(([token, cls, label]) => (
              <div key={token} className="grid [grid-template-columns:120px_1fr_auto] gap-6 items-baseline py-3.5 border-b border-line-soft">
                <span className="font-mono text-[11px] text-accent">{token}</span>
                <span className={`${cls} text-ink truncate`}>{label} — Aa Bb Cc 123</span>
                <span className="font-mono text-[11px] text-faint whitespace-nowrap">{cls}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* SPACING */}
        <Section kicker="Spacing" title="Base 4px">
          <div className="flex flex-col gap-0.5">
            {SPACING.map((token) => (
              <div key={token} className="flex items-center gap-4 py-[7px]">
                <span className="font-mono text-[11px] text-muted w-16">{token}</span>
                <span className="h-4 bg-accent rounded-[3px]" style={{ width: `var(${token})` }} />
              </div>
            ))}
          </div>
        </Section>

        {/* RADIUS + SHADOW */}
        <Section kicker="Radius & ombres" title="Boîtes">
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
            {RADII.map(([token, cls]) => (
              <div key={token} className="flex flex-col items-center gap-3">
                <div className={`w-full h-[78px] bg-surface border border-line ${cls}`} />
                <span className="font-mono text-[11px] text-muted">{token}</span>
              </div>
            ))}
            {SHADOWS.map(([token, cls]) => (
              <div key={token} className="flex flex-col items-center gap-3">
                <div className={`w-full h-[78px] bg-surface rounded-lg ${cls}`} />
                <span className="font-mono text-[11px] text-muted">{token}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* COMPOSANTS */}
        <Section kicker="Composants" title="Briques">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card pad>
              <h4 className="font-mono text-xs uppercase tracking-[0.06em] text-faint mb-4">Boutons</h4>
              <div className="flex flex-wrap gap-2.5 items-center">
                <Button>Composer</Button>
                <Button variant="ink">Acheter · $49</Button>
                <Button variant="ghost">Aperçu</Button>
                <Button variant="soft">Annuler</Button>
                <Button size="lg">Large</Button>
              </div>
            </Card>

            <Card pad>
              <h4 className="font-mono text-xs uppercase tracking-[0.06em] text-faint mb-4">Badges &amp; statuts</h4>
              <div className="flex flex-wrap gap-2.5 items-center">
                <Badge>Branding</Badge>
                <Badge tone="acc">Studio</Badge>
                <Badge tone="ink">3D Beta</Badge>
                <StatusDot status="draft">Brouillon</StatusDot>
                <StatusDot status="ready">Prêt</StatusDot>
                <StatusDot status="rendered">Rendu</StatusDot>
              </div>
            </Card>

            <Card pad>
              <h4 className="font-mono text-xs uppercase tracking-[0.06em] text-faint mb-4">Segmented</h4>
              <SegmentedControl
                aria-label="Format"
                options={[
                  { value: "all", label: "Tous" },
                  { value: "16:9", label: "16:9" },
                  { value: "9:16", label: "9:16" },
                ]}
                value={seg}
                onValueChange={setSeg}
              />
            </Card>

            <Card pad>
              <h4 className="font-mono text-xs uppercase tracking-[0.06em] text-faint mb-4">Champ</h4>
              <Field label="Nom du tour">
                {(id) => <Input id={id} defaultValue="GEN MOTION · Pitch officiel" />}
              </Field>
            </Card>

            <Card pad className="md:col-span-2">
              <h4 className="font-mono text-xs uppercase tracking-[0.06em] text-faint mb-4">Tabs</h4>
              <Tabs
                value={tab}
                onValueChange={setTab}
                tabs={[
                  { value: "script", label: "Script", number: "01", badge: 7 },
                  { value: "capture", label: "Capture", number: "02", badge: "4/5" },
                  { value: "audio", label: "Audio", number: "03" },
                  { value: "voice", label: "Voix off", number: "04" },
                  { value: "compose", label: "Compose", number: "05" },
                ]}
              />
            </Card>
          </div>
        </Section>
      </div>
    </main>
  );
}
