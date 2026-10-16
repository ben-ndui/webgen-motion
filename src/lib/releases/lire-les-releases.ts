import type { ReleaseGitHub } from "./release-par-plateforme";

const DEPOT = "ben-ndui/webgen-motion";

/**
 * Les releases du dépôt, de la plus récente à la plus ancienne (API GitHub,
 * gardée 5 min par le cache de Next : un pic de téléchargements ne la
 * sollicite pas à chaque clic). SERVEUR SEULEMENT.
 */
export async function lireLesReleases(agent: string): Promise<{ ok: true; releases: ReleaseGitHub[] } | { ok: false; statut: number; raison: string }> {
  const reponse = await fetch(`https://api.github.com/repos/${DEPOT}/releases?per_page=20`, {
    headers: { accept: "application/vnd.github+json", "user-agent": agent },
    next: { revalidate: 300 },
  });
  if (!reponse.ok) return { ok: false, statut: reponse.status, raison: `GitHub API ${reponse.status}` };
  return { ok: true, releases: (await reponse.json()) as ReleaseGitHub[] };
}
