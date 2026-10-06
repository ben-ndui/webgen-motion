import { spawnSync } from "node:child_process";

/**
 * Descendants d'un process (enfants, petits-enfants…), pour une annulation
 * qui ne laisse rien derrière elle. Pourquoi : le navigateur que Remotion
 * lance ne vit pas dans le groupe de process du runner ; tuer le groupe le
 * laissait orphelin (constaté le 06/10/2026 : deux Chrome headless restés
 * actifs après deux annulations). On relève l'arbre AU MOMENT d'annuler,
 * tant que les liens parent-enfant existent encore.
 */

/** Lit la sortie de `ps -A -o pid=,ppid=` : une ligne « pid ppid » par process. */
export function lireTableDesProcess(sortie: string): Map<number, number[]> {
  const enfants = new Map<number, number[]>();
  for (const ligne of sortie.split("\n")) {
    const [pid, ppid] = ligne.trim().split(/\s+/).map(Number);
    if (!Number.isInteger(pid) || !Number.isInteger(ppid)) continue;
    enfants.set(ppid, [...(enfants.get(ppid) ?? []), pid]);
  }
  return enfants;
}

/** Tous les descendants de `racine` dans la table, sans la racine. */
export function descendantsDans(table: Map<number, number[]>, racine: number): number[] {
  const trouves: number[] = [];
  const aVisiter = [...(table.get(racine) ?? [])];
  while (aVisiter.length > 0) {
    const pid = aVisiter.pop() as number;
    if (trouves.includes(pid)) continue;
    trouves.push(pid);
    aVisiter.push(...(table.get(pid) ?? []));
  }
  return trouves;
}

/** Descendants réels de `pid` (macOS, Linux). Vide si `ps` échoue ou sous Windows. */
export function descendantsDe(pid: number): number[] {
  if (process.platform === "win32") return [];
  const ps = spawnSync("ps", ["-A", "-o", "pid=,ppid="], { encoding: "utf-8" });
  if (ps.status !== 0) return [];
  return descendantsDans(lireTableDesProcess(ps.stdout), pid);
}
