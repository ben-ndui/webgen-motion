import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { resolveEdition } from "@/lib/edition";
import LicenseForm from "./_components/license-form";

/**
 * Page /setup/license — Sprint 9 Davinci-style licensing.
 *
 * Server component qui lit l'edition résolue à chaque navigation
 * (pas de cache HTTP), affiche l'état + delegue les actions
 * install/remove au client component LicenseForm.
 */
export const dynamic = "force-dynamic";

export default async function LicensePage() {
  const resolution = resolveEdition();
  const editionLabel = {
    community: "Community",
    studio: "Studio",
    enterprise: "Enterprise",
  }[resolution.edition];
  const sourceLabel = {
    env: "Variable d'environnement",
    license: "Fichier .license",
    config: "Config par défaut",
    default: "Community (par défaut)",
  }[resolution.source];

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-950">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-14">
            <Link href="/dashboard" className="font-semibold text-sm tracking-tight">
              GEN MOTION
              <span className="hidden sm:inline ml-2 text-zinc-400 font-normal">
                — Settings · License
              </span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-950 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-16 sm:pt-20 pb-12">
          <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-6">
            License · {sourceLabel}
          </p>
          <h1 className="text-4xl sm:text-5xl font-medium tracking-[-0.02em] mb-3">
            <span className="text-zinc-400">Edition active :</span>{" "}
            {editionLabel}
          </h1>
          {resolution.license ? (
            <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4 text-sm max-w-2xl">
              <Info label="Issued to" value={resolution.license.email} />
              <Info
                label="Issued at"
                value={new Date(resolution.license.issuedAt).toLocaleString("fr-FR")}
              />
              <Info
                label="Expires"
                value={
                  resolution.license.expiresAt === null
                    ? "Perpetual (jamais)"
                    : new Date(resolution.license.expiresAt).toLocaleString("fr-FR")
                }
              />
              <Info
                label="Features whitelist"
                value={
                  resolution.license.features?.join(", ") ??
                  "Toutes les features de l'edition"
                }
              />
              {resolution.license.note && (
                <Info label="Note" value={resolution.license.note} colSpan={2} />
              )}
            </dl>
          ) : resolution.licenseError ? (
            <p className="mt-6 text-sm text-rose-700 bg-rose-50 border border-rose-200 px-4 py-3 max-w-2xl">
              ⚠ Un fichier `.license` est présent mais invalide :{" "}
              <code className="font-mono">{resolution.licenseError}</code>.
              Réinstalle avec un fichier valide ou contacte le support.
            </p>
          ) : resolution.source === "env" ? (
            <p className="mt-6 text-sm text-zinc-600 max-w-2xl">
              Edition forcée via la variable d&apos;environnement{" "}
              <code className="font-mono text-zinc-950">WEBGEN_MOTION_EDITION</code>.
              Une license installée ici ne sera pas prise en compte tant
              que cette var est définie.
            </p>
          ) : (
            <p className="mt-6 text-sm text-zinc-600 max-w-2xl">
              Aucune license installée. Tu utilises la Community Edition.{" "}
              Pour débloquer Studio (frames 3D, presets Cinematic/Glitch,
              multi-format export, music library…) installe une license
              ci-dessous.
            </p>
          )}
        </div>
      </section>

      {/* Form */}
      <section>
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-12 sm:py-16">
          <LicenseForm
            currentEdition={resolution.edition}
            hasLicense={resolution.source === "license"}
            envOverride={resolution.source === "env"}
          />
        </div>
      </section>
    </div>
  );
}

function Info({
  label,
  value,
  colSpan,
}: {
  label: string;
  value: string;
  colSpan?: number;
}) {
  return (
    <div className={colSpan === 2 ? "sm:col-span-2" : undefined}>
      <dt className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-1">
        {label}
      </dt>
      <dd className="text-sm text-zinc-900">{value}</dd>
    </div>
  );
}
