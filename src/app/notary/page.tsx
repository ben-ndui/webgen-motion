"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

/**
 * Apple Notary Service dashboard. Lists submission history with
 * status badges, auto-refreshes every 30 s when anything is In
 * Progress (no point hammering the API when everything's settled).
 *
 * For Invalid submissions, click a row to expand and fetch the
 * detailed log (per-binary "not signed / no timestamp / hardened
 * runtime missing" issues).
 *
 * Style : matches the smoothandesign.fr landing DA — black/white
 * editorial, numbered sections, no decorative icons (only functional
 * Refresh). The animations are subtle — pulse on In Progress, smooth
 * expand for log details, hover lift on rows, skeleton during load.
 *
 * Auth : the API route reads APPLE_ID + APPLE_PASSWORD + APPLE_TEAM_ID
 * from process.env. Set them in .env.local (dev) or pass through the
 * Tauri shell env (packaged).
 */

interface Submission {
  id: string;
  name: string;
  status: "In Progress" | "Accepted" | "Invalid" | "Rejected" | string;
  createdDate: string;
}

interface HistoryResponse {
  history: Submission[];
}

interface LogIssue {
  severity: string;
  code?: string | null;
  path?: string;
  message?: string;
  docUrl?: string;
  architecture?: string;
}

interface LogResponse {
  status?: string;
  statusSummary?: string;
  statusCode?: number;
  issues?: LogIssue[];
}

export default function NotaryPage() {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logCache, setLogCache] = useState<
    Record<string, LogResponse | { error: string }>
  >({});
  const [loadingLog, setLoadingLog] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [fetching, setFetching] = useState(false);

  const fetchHistory = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/motion/notary/history", {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erreur inconnue");
        setSubmissions(null);
        return;
      }
      setError(null);
      setSubmissions((json as HistoryResponse).history ?? []);
      setLastFetched(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      // small delay so the spinning indicator is visible even when
      // the fetch is sub-100 ms — feels less janky.
      setTimeout(() => setFetching(false), 250);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!submissions) return;
    const hasInProgress = submissions.some((s) => s.status === "In Progress");
    if (!hasInProgress) return;
    const id = setInterval(fetchHistory, 30_000);
    return () => clearInterval(id);
  }, [submissions, fetchHistory]);

  const fetchLog = useCallback(
    async (subId: string) => {
      if (logCache[subId]) return;
      setLoadingLog(subId);
      try {
        const res = await fetch(`/api/motion/notary/log/${subId}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          setLogCache((c) => ({
            ...c,
            [subId]: { error: json.error ?? "Erreur" },
          }));
        } else {
          setLogCache((c) => ({ ...c, [subId]: json as LogResponse }));
        }
      } catch (e) {
        setLogCache((c) => ({
          ...c,
          [subId]: { error: (e as Error).message },
        }));
      } finally {
        setLoadingLog(null);
      }
    },
    [logCache],
  );

  const handleExpand = (sub: Submission) => {
    if (expanded === sub.id) {
      setExpanded(null);
      return;
    }
    setExpanded(sub.id);
    if (sub.status === "Invalid" || sub.status === "Rejected") {
      fetchLog(sub.id);
    }
  };

  const stats = useMemo(() => {
    if (!submissions) return null;
    return {
      total: submissions.length,
      inProgress: submissions.filter((s) => s.status === "In Progress").length,
      accepted: submissions.filter((s) => s.status === "Accepted").length,
      invalid: submissions.filter(
        (s) => s.status === "Invalid" || s.status === "Rejected",
      ).length,
    };
  }, [submissions]);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/dashboard"
              className="text-muted hover:text-ink transition"
            >
              ← Tours
            </Link>
            <span className="text-faint">/</span>
            <span className="font-semibold">Notary</span>
          </div>
          <div className="text-xs text-muted flex items-center gap-3">
            {lastFetched && (
              <span>
                Mis à jour à {lastFetched.toLocaleTimeString("fr-FR")}
              </span>
            )}
            <button
              data-wm-id="notary.refresh"
              onClick={fetchHistory}
              disabled={fetching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line-strong hover:bg-bg-sunken transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`}
                strokeWidth={2}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main data-wm-id="notary.page" className="max-w-5xl mx-auto px-6 py-12">
        {/* Editorial header — matches landing DA */}
        <div className="mb-12 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-7">
            <div className="text-xs uppercase tracking-[0.2em] text-faint mb-3">
              01 — Apple Notary Service
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              Soumissions
              <br />
              <span className="text-faint">notarization.</span>
            </h1>
          </div>
          <div className="col-span-12 md:col-span-5">
            <p className="text-sm text-muted leading-relaxed">
              Statut en temps réel des soumissions Apple. Auto-refresh 30 s
              tant qu'une soumission est <em>In Progress</em>. Click une ligne
              Invalid pour voir le log détaillé Apple (per-binary issues).
            </p>
          </div>
        </div>

        {/* Stats — editorial four-number row */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-4 gap-px bg-surface-2 border border-line rounded-xl overflow-hidden mb-10"
          >
            <StatCell label="Total" value={stats.total} />
            <StatCell
              label="In Progress"
              value={stats.inProgress}
              accent="amber"
              pulse={stats.inProgress > 0}
            />
            <StatCell label="Accepted" value={stats.accepted} accent="emerald" />
            <StatCell label="Invalid" value={stats.invalid} accent="red" />
          </motion.div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm mb-6">
            <strong>Erreur :</strong> {error}
          </div>
        )}

        {submissions === null && !error && <SkeletonTable />}

        {submissions !== null && submissions.length === 0 && (
          <div className="text-center py-16 text-muted text-sm">
            Aucune soumission.
          </div>
        )}

        {submissions && submissions.length > 0 && (
          <div className="border border-line rounded-xl overflow-hidden">
            <div className="bg-bg-sunken px-5 py-3 border-b border-line text-xs uppercase tracking-wide text-muted grid grid-cols-12 gap-4">
              <div className="col-span-6 font-medium">Soumission</div>
              <div className="col-span-3 font-medium">Date</div>
              <div className="col-span-3 font-medium">Statut</div>
            </div>
            <div>
              {submissions.map((sub, idx) => (
                <SubmissionRow
                  key={sub.id}
                  sub={sub}
                  idx={idx}
                  expanded={expanded === sub.id}
                  onClick={() => handleExpand(sub)}
                  log={logCache[sub.id]}
                  loading={loadingLog === sub.id}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCell({
  label,
  value,
  accent,
  pulse,
}: {
  label: string;
  value: number;
  accent?: "amber" | "emerald" | "red";
  pulse?: boolean;
}) {
  const colour =
    accent === "amber"
      ? "text-amber-600"
      : accent === "emerald"
        ? "text-emerald-600"
        : accent === "red"
          ? "text-red-600"
          : "text-ink";
  return (
    <div className="bg-surface px-5 py-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted mb-1">
        {pulse && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
        )}
        {label}
      </div>
      <motion.div
        key={value}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`text-3xl font-semibold tracking-tight tabular-nums ${colour}`}
      >
        {value}
      </motion.div>
    </div>
  );
}

function SubmissionRow({
  sub,
  idx,
  expanded,
  onClick,
  log,
  loading,
}: {
  sub: Submission;
  idx: number;
  expanded: boolean;
  onClick: () => void;
  log?: LogResponse | { error: string };
  loading: boolean;
}) {
  const created = new Date(sub.createdDate);
  const age = ageLabel(created);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: idx * 0.04 }}
      className={`border-b border-line last:border-b-0 ${
        expanded ? "bg-bg-sunken/60" : ""
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left px-5 py-4 grid grid-cols-12 gap-4 items-center hover:bg-bg-sunken transition group"
      >
        <div className="col-span-6 min-w-0">
          <div className="font-medium truncate">{sub.name}</div>
          <div className="text-xs text-faint font-mono mt-0.5 truncate">
            {sub.id}
          </div>
        </div>
        <div className="col-span-3 text-sm text-muted">
          <div>{created.toLocaleString("fr-FR")}</div>
          <div className="text-xs text-faint mt-0.5">{age}</div>
        </div>
        <div className="col-span-3">
          <StatusBadge status={sub.status} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1">
              {sub.status === "Accepted" && (
                <p className="text-sm text-emerald-700">
                  ✓ Soumission validée. Tu peux maintenant{" "}
                  <code className="bg-surface px-1.5 py-0.5 rounded border border-line text-xs">
                    xcrun stapler staple
                  </code>{" "}
                  ton .app pour embarquer le ticket de notarisation (l'app
                  pourra alors s'ouvrir hors-ligne sans warning Gatekeeper).
                </p>
              )}
              {sub.status === "In Progress" && (
                <p className="text-sm text-amber-700">
                  ⏳ Apple traite ta soumission. Le délai habituel est &lt;
                  15 min mais peut grimper à plusieurs heures en pic de queue.
                </p>
              )}
              {(sub.status === "Invalid" || sub.status === "Rejected") && (
                <InvalidDetails log={log} loading={loading} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "In Progress") {
    return (
      <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border bg-amber-50 text-amber-800 border-amber-200">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
        </span>
        {status}
      </span>
    );
  }
  const variants: Record<string, string> = {
    Accepted: "bg-emerald-50 text-emerald-800 border-emerald-200",
    Invalid: "bg-red-50 text-red-800 border-red-200",
    Rejected: "bg-red-50 text-red-800 border-red-200",
  };
  const cls = variants[status] ?? "bg-bg-sunken text-ink-soft border-line";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${cls}`}
    >
      {status}
    </span>
  );
}

function InvalidDetails({
  log,
  loading,
}: {
  log?: LogResponse | { error: string };
  loading: boolean;
}) {
  if (loading)
    return <p className="text-sm text-muted">Chargement du log…</p>;
  if (!log) return <p className="text-sm text-muted">Click pour charger.</p>;
  if ("error" in log)
    return <p className="text-sm text-red-700">Erreur : {log.error}</p>;
  const issues = log.issues ?? [];
  if (issues.length === 0)
    return <p className="text-sm text-muted">Aucun détail d'erreur.</p>;
  return (
    <div>
      <p className="text-sm text-red-700 mb-3">
        <strong>{log.statusSummary ?? "Soumission invalide"}</strong>
        <span className="text-muted"> · {issues.length} issue(s)</span>
      </p>
      <div className="max-h-96 overflow-y-auto bg-surface border border-line rounded-md">
        <table className="w-full text-xs">
          <tbody>
            {issues.slice(0, 50).map((issue, i) => (
              <tr key={i} className="border-t border-line first:border-0">
                <td className="px-3 py-2 font-mono text-muted break-all max-w-md">
                  {issue.path?.replace(/^.*\.zip\//, "")}
                </td>
                <td className="px-3 py-2 text-red-700">{issue.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {issues.length > 50 && (
          <p className="px-3 py-2 text-xs text-muted border-t border-line">
            … {issues.length - 50} de plus (tronqué).
          </p>
        )}
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <div className="bg-bg-sunken px-5 py-3 border-b border-line grid grid-cols-12 gap-4">
        <div className="col-span-6 h-3 bg-surface-2 rounded animate-pulse" />
        <div className="col-span-3 h-3 bg-surface-2 rounded animate-pulse" />
        <div className="col-span-3 h-3 bg-surface-2 rounded animate-pulse" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="px-5 py-4 grid grid-cols-12 gap-4 border-b border-line last:border-b-0"
        >
          <div className="col-span-6 space-y-2">
            <div className="h-4 w-3/5 bg-surface-2 rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-surface-2 rounded animate-pulse" />
          </div>
          <div className="col-span-3 space-y-2">
            <div className="h-4 w-3/4 bg-surface-2 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-surface-2 rounded animate-pulse" />
          </div>
          <div className="col-span-3">
            <div className="h-6 w-24 bg-surface-2 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ageLabel(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  return `il y a ${days} j`;
}
