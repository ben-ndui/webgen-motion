"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Globe,
  Monitor,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import type { TourEntry } from "@/lib/types/tour";

type Platform = "web" | "ios" | "android";

interface MobileToolsStatus {
  platforms: { ios: boolean; android: boolean };
  maestro: { present: boolean };
  adb: { present: boolean };
  simctl: { present: boolean };
}

/**
 * "Nouveau tour" — modal de création. Supporte le **web** (URL cible
 * éditable) ET le **mobile natif** (iOS/Android : appId + détection des
 * outils Maestro/adb/simctl pour guider l'utilisateur).
 */
export default function NewTourButton({
  trigger,
}: {
  trigger?: (open: () => void) => React.ReactNode;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    if (open) {
      setError(null);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open]);

  // Détecte les outils mobiles quand on passe sur iOS/Android.
  useEffect(() => {
    if (!open || !isMobile || tools) return;
    fetch("/api/motion/mobile/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setTools(s))
      .catch(() => {});
  }, [open, isMobile, tools]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function pickPlatform(p: Platform) {
    setPlatform(p);
    if (p !== "web") setFormat("9:16"); // natif = portrait
  }

  const reset = () => {
    setName("");
    setId("");
    setIdTouched(false);
    setPlatform("web");
    setFormat("16:9");
    setBaseUrl("https://");
    setAppId("");
    setError(null);
    setBusy(false);
  };

  const handleSubmit = async () => {
    if (busy) return;
    if (!name.trim()) return setError("Donne un nom au tour.");
    if (!id || !/^[\w-]+$/.test(id)) {
      return setError(
        "L'id doit être un slug : lettres / chiffres / tirets (ex: mon-projet).",
      );
    }
    if (platform === "web" && !/^https?:\/\/.+\..+/.test(baseUrl.trim())) {
      return setError("Donne l'URL de ton app (ex: https://mon-app.com).");
    }
    if (isMobile && !appId.trim()) {
      return setError(
        platform === "ios"
          ? "Renseigne le bundle id iOS (ex: com.entreprise.app)."
          : "Renseigne le package Android (ex: com.entreprise.app).",
      );
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
      const tour = makeStarterTour({
        id,
        name: name.trim(),
        platform,
        format,
        baseUrl: baseUrl.trim(),
        appId: appId.trim(),
      });
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
      reset();
      setOpen(false);
      router.push(`/tour/${encodeURIComponent(id)}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setBusy(false);
    }
  };

  const ready =
    platform === "ios"
      ? tools?.platforms.ios
      : platform === "android"
        ? tools?.platforms.android
        : true;

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <button
          data-wm-id="dashboard.new-tour-button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Nouveau tour
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-surface rounded-2xl shadow-2xl border border-line w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-wm-id="dashboard.new-tour.modal"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">
                  Nouveau
                </p>
                <h2 className="text-lg font-semibold text-ink">Créer un tour</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-faint hover:text-ink-soft"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Plateforme">
                <div className="flex items-center gap-2">
                  <Pill
                    active={platform === "web"}
                    onClick={() => pickPlatform("web")}
                    label="Web"
                    Icon={Globe}
                  />
                  <Pill
                    active={platform === "ios"}
                    onClick={() => pickPlatform("ios")}
                    label="iOS"
                    Icon={Smartphone}
                  />
                  <Pill
                    active={platform === "android"}
                    onClick={() => pickPlatform("android")}
                    label="Android"
                    Icon={Smartphone}
                  />
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
                      <Pill
                        active={format === "16:9"}
                        onClick={() => setFormat("16:9")}
                        label="Desktop · 16:9"
                        Icon={Monitor}
                      />
                      <Pill
                        active={format === "9:16"}
                        onClick={() => setFormat("9:16")}
                        label="Mobile · 9:16"
                        Icon={Smartphone}
                      />
                    </div>
                  </Field>
                </>
              ) : (
                <>
                  <Field
                    label={platform === "ios" ? "Bundle id iOS" : "Package Android"}
                    hint="l'app à filmer"
                  >
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
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-rose-900">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="px-4 py-2 rounded-full text-sm text-ink-soft hover:bg-surface-2 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={busy}
                data-wm-id="dashboard.new-tour.submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Sparkles className={`w-3.5 h-3.5 ${busy ? "animate-pulse" : ""}`} />
                {busy ? "Création…" : "Créer le tour"}
              </button>
            </div>

            <p className="text-[11px] text-muted leading-relaxed">
              {isMobile && !ready ? (
                <>
                  Outils mobiles incomplets — tu peux créer le tour, mais la
                  capture échouera tant que les outils ne sont pas prêts.{" "}
                  <a href="/help#mobile" className="underline">
                    Voir l&apos;aide mobile
                  </a>
                  .
                </>
              ) : (
                <>
                  Le fichier{" "}
                  <code className="font-mono">tours/{id || "<id>"}.json</code> sera
                  créé. Tu édites les steps depuis le tab Script.
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function MobileToolsBanner({
  platform,
  tools,
}: {
  platform: "ios" | "android";
  tools: MobileToolsStatus | null;
}) {
  if (!tools) {
    return (
      <p className="text-[11px] text-faint">Détection des outils mobiles…</p>
    );
  }
  const ready = platform === "ios" ? tools.platforms.ios : tools.platforms.android;
  const missing: string[] = [];
  if (!tools.maestro.present) missing.push("Maestro");
  if (platform === "ios" && !tools.simctl.present) missing.push("Xcode/Simulateur");
  if (platform === "android" && !tools.adb.present) missing.push("adb");

  if (ready) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <Check className="w-3.5 h-3.5 text-emerald-600" />
        <p className="text-xs text-emerald-900">Outils {platform} détectés.</p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-amber-900">
        Manquant : <strong>{missing.join(" · ")}</strong>.{" "}
        <a href="/help#mobile" className="underline">
          comment installer
        </a>
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
          {label}
        </label>
        {hint && <span className="text-[10px] text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
        active ? "bg-ink text-bg" : "bg-surface-2 text-ink-soft hover:opacity-80"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function makeStarterTour(opts: {
  id: string;
  name: string;
  platform: Platform;
  format: "16:9" | "9:16";
  baseUrl: string;
  appId: string;
}): TourEntry {
  const { id, name, platform, format, baseUrl, appId } = opts;

  if (platform === "ios" || platform === "android") {
    return {
      id,
      name,
      description: "Tour mobile — édite les steps depuis le tab Script.",
      estimatedSec: 20,
      platform,
      appId,
      startPath: "/",
      format: "9:16",
      brand: { displayName: name, domain: appId, tagline: "by Smooth & Design" },
      steps: [
        { type: "launchApp", appId },
        { type: "section", categoryId: "branding", title: name, subtitle: "Première section", dwellMs: 2500 },
        { type: "wait", dwellMs: 2000 },
        { type: "overlay", text: "Édite ce tour dans le tab Script", position: "center", dwellMs: 3500 },
      ],
    } as TourEntry;
  }

  return {
    id,
    name,
    description: "Nouveau tour — édite les steps depuis le tab Script.",
    estimatedSec: 20,
    platform: "web",
    startPath: "/",
    baseUrl,
    format,
    brand: {
      displayName: name,
      domain: safeHost(baseUrl),
      tagline: "by Smooth & Design",
    },
    steps: [
      { type: "section", categoryId: "branding", title: name, subtitle: "Première section", dwellMs: 2500 },
      { type: "wait", dwellMs: 2000 },
      { type: "overlay", text: "Démarre par éditer ce tour dans le tab Script", position: "center", dwellMs: 3500 },
    ],
  };
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "localhost";
  }
}
