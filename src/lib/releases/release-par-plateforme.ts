/**
 * Quelle release GitHub sert quelle plateforme. Module pur.
 *
 * Une release peut ne porter que certains fichiers : la 0.7.0 n'avait que
 * le DMG Apple Silicon (la CI multi-plateforme était bloquée). En prenant
 * toujours la « Latest », les boutons Windows / Linux / Mac Intel du site
 * auraient renvoyé une erreur, et les apps 0.6.0 Windows auraient annoncé
 * une mise à jour impossible à installer (16/10/2026). Ici, chaque
 * plateforme reçoit la release publiée la plus récente qui a SON fichier.
 */
export type FichierDeRelease = { name: string; browser_download_url: string; size: number };
export type ReleaseGitHub = {
  tag_name: string;
  html_url: string;
  published_at: string;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  assets: FichierDeRelease[];
};

export const MOTIFS_PAR_PLATEFORME: Record<string, RegExp[]> = {
  "macos-arm64": [/aarch64.*\.dmg$/i, /arm64.*\.dmg$/i],
  "macos-intel": [/x86_64.*\.dmg$/i, /x64.*\.dmg$/i],
  macos: [/aarch64.*\.dmg$/i, /arm64.*\.dmg$/i, /x86_64.*\.dmg$/i, /\.dmg$/i],
  windows: [/\.msi$/i, /setup.*\.exe$/i, /\.exe$/i],
  "linux-appimage": [/\.AppImage$/i],
  "linux-deb": [/\.deb$/i],
  linux: [/\.AppImage$/i, /\.deb$/i],
};

export function estUnePlateforme(valeur: unknown): valeur is string {
  return typeof valeur === "string" && valeur in MOTIFS_PAR_PLATEFORME;
}

/** Le fichier de cette release pour cette plateforme, dans l'ordre de préférence des motifs. */
export function fichierPour(release: ReleaseGitHub, plateforme: string): FichierDeRelease | null {
  for (const motif of MOTIFS_PAR_PLATEFORME[plateforme] ?? []) {
    const fichier = release.assets.find((a) => motif.test(a.name));
    if (fichier) return fichier;
  }
  return null;
}

/**
 * La release publiée la plus récente qui a un fichier pour la plateforme
 * (les brouillons et préversions ne comptent pas). Sans plateforme : la
 * plus récente publiée.
 */
export function releasePour(releases: ReleaseGitHub[], plateforme?: string): ReleaseGitHub | null {
  const publiees = releases
    .filter((r) => !r.draft && !r.prerelease)
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  if (!plateforme) return publiees[0] ?? null;
  return publiees.find((r) => fichierPour(r, plateforme) !== null) ?? null;
}

/**
 * La plateforme d'une app déjà installée qui ne sait pas la donner (les
 * 0.6.0 interrogent sans paramètre) : lue dans l'agent du navigateur. Un Mac
 * ne dit pas sa puce (« Intel Mac OS X » partout) : « macos » prend le DMG
 * le plus récent, quel qu'il soit.
 */
export function plateformeDeLAgent(agent: string | null): string | undefined {
  if (!agent) return undefined;
  if (/windows/i.test(agent)) return "windows";
  if (/android/i.test(agent)) return undefined;
  if (/linux/i.test(agent)) return "linux";
  if (/macintosh|mac os x/i.test(agent)) return "macos";
  return undefined;
}
