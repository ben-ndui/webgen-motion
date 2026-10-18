"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Globe, Monitor, Smartphone, Sparkles } from "lucide-react";

import { Field, Pill } from "./champ";
import MobileToolsBanner, { type MobileToolsStatus } from "./mobile-tools-banner";
import { makeStarterTour, type Platform, slugify } from "./starter-tour";

/**
 * Nouveau tour — page pleine (plus un popup : porte orpheline de 3 boutons
 * « Nouveau » dans le dashboard, corrigée le 18/10/2026). Supporte le web
 * (URL cible éditable) ET le mobile natif (iOS/Android).
 */
export default function FormulaireNouveauTour() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [platform, setPlatform] = useState<Platform>("web");
  const [format, setFormat] = useState<"16:9" | "9:16">("16:9");
  const [baseUrl, setBaseUrl] = useState("https://");
  const [appId, setAppId] = useState("");
  const [tools, setTools] = useState<MobileToolsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  const isMobile = platform === "ios" || platform === "android";

  useEffect(() => {
    if (!idTouched) setId(slugify(name));
  }, [name, idTouched]);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isMobile || tools) return;
    fetch("/api/motion/mobile/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setTools(s))
      .catch(() => {});
  }, [isMobile, tools]);

  function pickPlatform(p: Platform) {
    setPlatform(p);
    if (p !== "web") setFormat("9:16"); // natif = portrait
  }

  const handleSubmit = async () => {
    if (busy) return;
    if (!name.trim()) return setError("Donne un nom au tour.");
    if (!id || !/^[\w-]+$/.test(id)) {
      return setError("L'id doit être un slug : lettres / chiffres / tirets (ex: mon-projet).");
    }
    if (platform === "web" && !/^https?:\/\/.+\..+/.test(baseUrl.trim())) {
      return setError("Donne l'URL de ton app (ex: https://mon-app.com).");
    }
    if (isMobile && !appId.trim()) {
      return setError(platform === "ios" ? "Renseigne le bundle id iOS (ex: com.entreprise.app)." : "Renseigne le package Android (ex: com.entreprise.app).");
    }
    setBusy(true);
    setError(null);
    try {
      const head = await fetch(`/api/motion/tour/${encodeURIComponent(id)}`);
      if (head.ok) {
        setError(`Un tour "${id}" existe déjà.`);
        setBusy(false);
        return;
      }
      const tour = makeStarterTour({ id, name: name.trim(), platform, format, baseUrl: baseUrl.trim(), appId: appId.trim() });
      const res = await fetch(`/api/motion/tour/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tour }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        setBusy(false);
        return;
      }
      router.push(`/tour/${encodeURIComponent(id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setBusy(false);
    }
  };

  const ready = platform === "ios" ? tools?.platforms.ios : platform === "android" ? tools?.platforms.android : true;

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line">
        <nav className="max-w-xl mx-auto px-6 py-5 flex items-center gap-3 text-sm" aria-label="Fil d'Ariane">
          <Link href="/dashboard" className="text-muted hover:text-ink transition">← Mes vidéos</Link>
          <span className="text-faint">/</span>
          <span className="font-semibold">Nouveau tour</span>
        </nav>
      </header>

      <main data-wm-id="nouveau.tour.page" className="max-w-xl mx-auto px-6 py-12 space-y-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">Nouveau</p>
          <h1 className="text-3xl font-semibold tracking-tight">Créer un tour</h1>
        </div>

        <Field label="Plateforme">
          <div className="flex items-center gap-2">
            <Pill active={platform === "web"} onClick={() => pickPlatform("web")} label="Web" Icon={Globe} />
            <Pill active={platform === "ios"} onClick={() => pickPlatform("ios")} label="iOS" Icon={Smartphone} />
            <Pill active={platform === "android"} onClick={() => pickPlatform("android")} label="Android" Icon={Smartphone} />
          </div>
        </Field>

        <Field label="Nom">
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mon projet · Landing"
            className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </Field>

        <Field label="Id" hint="Auto-généré — édite si besoin">
          <input
            value={id}
            onChange={(e) => {
              setIdTouched(true);
              setId(slugify(e.target.value));
            }}
            placeholder="mon-projet-landing"
            className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </Field>

        {platform === "web" ? (
          <>
            <Field label="URL de ton app" hint="le site à filmer">
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://mon-app.com"
                className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </Field>
            <Field label="Format">
              <div className="flex items-center gap-2">
                <Pill active={format === "16:9"} onClick={() => setFormat("16:9")} label="Desktop · 16:9" Icon={Monitor} />
                <Pill active={format === "9:16"} onClick={() => setFormat("9:16")} label="Mobile · 9:16" Icon={Smartphone} />
              </div>
            </Field>
          </>
        ) : (
          <>
            <Field label={platform === "ios" ? "Bundle id iOS" : "Package Android"} hint="l'app à filmer">
              <input
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="com.entreprise.app"
                className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </Field>
            <MobileToolsBanner platform={platform} tools={tools} />
          </>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-rose-900">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Link href="/dashboard" className="px-4 py-2 rounded-full text-sm text-ink-soft hover:bg-surface-2 transition-colors">
            Annuler
          </Link>
          <button
            onClick={handleSubmit}
            disabled={busy}
            data-wm-id="nouveau.tour.submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Sparkles className={`w-3.5 h-3.5 ${busy ? "animate-pulse" : ""}`} />
            {busy ? "Création…" : "Créer le tour"}
          </button>
        </div>

        <p className="text-[11px] text-muted leading-relaxed">
          {isMobile && !ready ? (
            <>
              Outils mobiles incomplets — tu peux créer le tour, mais la capture échouera tant que les outils ne sont pas prêts.{" "}
              <a href="/help#mobile" className="underline">Voir l&apos;aide mobile</a>.
            </>
          ) : (
            <>Le fichier <code className="font-mono">tours/{id || "<id>"}.json</code> sera créé. Tu édites les steps depuis le tab Script.</>
          )}
        </p>
      </main>
    </div>
  );
}
