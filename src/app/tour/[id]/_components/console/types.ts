/**
 * Director's Console — contrat de données UI (§5 de la maquette
 * docs/design/DESIGN-CHAT-IA-MAQUETTE.md). Transport réel (route Next →
 * src/lib/llm-providers/) en phase 3 derrière un mock.
 *
 * Conventions arbitrées :
 * - `scopeSection` / `touchedSections` sont des index ORDINAUX de
 *   section (0-based : S1 = 0), cohérents avec `@Sn` et la timeline Z2.
 * - Les `at` des DiffOp sont des index dans `tour.steps`.
 */
import type { TourEntry, TourStep } from "@/lib/types/tour";

/** Préfixes mono du flux de log (gutter 5ch). */
export type LogPrefix =
  | "plan" | "note"
  | "step+" | "step-" | "step~"
  | "vo~"
  | "run" | "cut" | "trim"
  | "err";

/** Opération atomique sur le tour — applicable ET inversible
 *  (le rollback du lien « défaire » inverse la liste). */
export type DiffOp =
  | { op: "insert-step"; at: number; step: TourStep }
  | { op: "remove-step"; at: number; removed: TourStep }
  | { op: "replace-step"; at: number; before: TourStep; after: TourStep }
  | { op: "set-field"; field: keyof TourEntry; before: unknown; after: unknown };

export interface TourDiff {
  ops: DiffOp[];
  /** Δ durée estimée en secondes (peut être négatif). */
  deltaSec: number;
  /** Index des steps `section` touchés — pilote les `*` de la timeline. */
  touchedSections: number[];
}

/** Carte de step rendue dans une proposition (fantôme/solide). */
export interface StepDiffCard {
  /** Quel op de TourDiff cette carte matérialise. */
  opIndex: number;
  /** Lignes +/− affichées dans la carte. */
  lines: { sign: "+" | "-" | " "; text: string }[];
}

/** Action proposée par l'agent en mode hub — JAMAIS exécutée sans
 *  clic de confirmation (« Créer le tour » / « Ouvrir »). */
export type HubAction =
  | { type: "open-tour"; tourId: string; title: string }
  | { type: "create-tour"; tour: TourEntry };

export type TakeBlock =
  | { kind: "text"; text: string }                          // une ligne, Sans
  | { kind: "plan"; lines: { prefix: LogPrefix; text: string }[] }
  | { kind: "step-diff"; diff: TourDiff; cards: StepDiffCard[];
      state: "proposed" | "applied" | "reverted" | "discarded" }
  | { kind: "vo-diff"; stepIndex: number; before: string; after: string;
      state: "proposed" | "applied" | "reverted" | "discarded" }
  | { kind: "run-log"; job: "capture" | "vo" | "compose";
      lines: { prefix: LogPrefix; text: string }[];
      progress?: { pct: number; label: string };
      state: "proposed" | "running" | "done" | "failed" | "cancelled" }
  | { kind: "hub-action"; action: HubAction;
      state: "proposed" | "done" | "discarded" }
  | { kind: "error"; code: "network" | "rate-limit" | "provider" | "no-key";
      message: string; retryInSec?: number };

export type TakeStatus =
  | "streaming" | "proposed" | "applied"
  | "discarded" | "cancelled" | "error" | "done";

export interface Take {
  id: string;
  /** Numéro affiché (#04) — stable, jamais recyclé. */
  n: number;
  prompt: string;
  /** Index du step `section` scopé via @Sn, s'il y a lieu. */
  scopeSection?: number;
  /** ISO — affiché HH:MM. */
  at: string;
  status: TakeStatus;
  blocks: TakeBlock[];
  /** Version du tour après apply (estampille `appliqué · vN`). */
  appliedVersion?: number;
}

/** Événements streamés (NDJSON ligne par ligne, pattern consumeNdjson). */
export type TakeEvent =
  | { type: "log"; prefix: LogPrefix; text: string }
  | { type: "block"; block: TakeBlock }
  | { type: "progress"; pct: number; label: string }
  | { type: "done"; status: Exclude<TakeStatus, "streaming"> };

export interface TakeRequest {
  /** "editor" (défaut) : la console pilote UN tour ouvert.
   *  "hub" : la console du dashboard — pas de tour requis, l'agent
   *  crée / liste / ouvre des tours (blocs hub-action). */
  mode?: "editor" | "hub";
  /** Requis en mode editor, absent en mode hub. */
  tour?: TourEntry;
  /** Historique (prises anciennes possiblement pré-compactées). */
  takes: Take[];
  prompt: string;
  scopeSection?: number;
  /** Contexte pipeline pour la narration (manifest, edit-plan…). */
  pipeline?: {
    hasCapture: boolean;
    hasVoiceover: boolean;
    hasFinal: boolean;
    editPlanSummary?: string[];
  };
}

/** Job pipeline exécutable depuis un bloc run-log. */
export type RunJob = "capture" | "vo" | "compose";

/** Réglages du run, fournis par le contexte hôte (l'éditeur les tient
 *  dans ses tabs : format de capture, musique et volumes du compose).
 *  Absents (hub / fenêtre séparée) → defaults du tour JSON. */
export interface RunParams {
  formatOverride?: "16:9" | "9:16";
  bgMusicId?: string;
  bgMusicVolume?: number;
  voiceoverVolume?: number;
}

/** Transport mockable — l'implémentation réelle vit derrière
 *  /api/motion/console et src/lib/llm-providers/. Le mock de phase 3
 *  rejoue des scénarios scriptés avec les mêmes événements. */
export interface ChatTransport {
  send(
    req: TakeRequest,
    handlers: { onEvent: (evt: TakeEvent) => void; signal: AbortSignal },
  ): Promise<void>;
  /** État de configuration BYOK — pilote l'empty state 2.8. */
  probe(): Promise<{ configured: boolean; provider?: string; model?: string }>;
  /** Exécute un run pipeline confirmé (« Lancer ») en streamant des
   *  TakeEvent dans le run-log. Réel : routes capture / vo / compose ;
   *  mock : simulateRun. Absent → la session retombe sur la simulation. */
  run?(
    job: RunJob,
    req: { tour: TourEntry; params?: RunParams },
    handlers: { onEvent: (evt: TakeEvent) => void; signal: AbortSignal },
  ): Promise<void>;
}
