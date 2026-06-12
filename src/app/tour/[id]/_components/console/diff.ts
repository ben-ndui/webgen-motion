/**
 * Director's Console — application / rollback pur d'un TourDiff.
 *
 * La console ne touche jamais le tour directement : elle passe par
 * `applyTourDiff` (pure) puis par le même `onChange(tour)` que le tab
 * Script — une seule source de vérité.
 *
 * Invariants :
 * - `applyTourDiff` applique les ops DANS L'ORDRE de la liste.
 * - `revertTourDiff` applique l'inverse de chaque op en ORDRE INVERSE
 *   (dernier op annulé en premier) — garantit le rollback exact même
 *   quand plusieurs ops touchent des index voisins.
 * - Aucune mutation des objets d'entrée (tour cloné en surface,
 *   `steps` recopié à chaque op).
 */
import type { TourEntry } from "@/lib/types/tour";
import type { DiffOp, TourDiff } from "./types";

function applyOp(tour: TourEntry, op: DiffOp): TourEntry {
  switch (op.op) {
    case "insert-step": {
      const steps = [...tour.steps];
      steps.splice(op.at, 0, op.step);
      return { ...tour, steps };
    }
    case "remove-step": {
      const steps = [...tour.steps];
      steps.splice(op.at, 1);
      return { ...tour, steps };
    }
    case "replace-step": {
      const steps = [...tour.steps];
      steps[op.at] = op.after;
      return { ...tour, steps };
    }
    case "set-field":
      return { ...tour, [op.field]: op.after } as TourEntry;
  }
}

/** Inverse d'une op atomique — insert↔remove, before↔after. */
function invertOp(op: DiffOp): DiffOp {
  switch (op.op) {
    case "insert-step":
      return { op: "remove-step", at: op.at, removed: op.step };
    case "remove-step":
      return { op: "insert-step", at: op.at, step: op.removed };
    case "replace-step":
      return { op: "replace-step", at: op.at, before: op.after, after: op.before };
    case "set-field":
      return { op: "set-field", field: op.field, before: op.after, after: op.before };
  }
}

/** Application pure d'un diff — ops dans l'ordre. */
export function applyTourDiff(tour: TourEntry, diff: TourDiff): TourEntry {
  return diff.ops.reduce((acc, op) => applyOp(acc, op), tour);
}

/** Rollback pur d'un diff — inverse de chaque op, en ordre inverse. */
export function revertTourDiff(tour: TourEntry, diff: TourDiff): TourEntry {
  return [...diff.ops]
    .reverse()
    .reduce((acc, op) => applyOp(acc, invertOp(op)), tour);
}
