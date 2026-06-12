"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { SectionInfo } from "./sections";

const SLASH_COMMANDS = [
  { cmd: "/capture", desc: "relance la capture du tour" },
  { cmd: "/vo", desc: "régénère la voix off" },
  { cmd: "/compose", desc: "compose le final.mp4" },
  { cmd: "/undo", desc: "annule la dernière prise" },
];

const LINE_H = 20;
const MAX_LINES = 5;

type Token = { kind: "slash" | "scope"; text: string; start: number };

/** Token `/cmd` ou `@scope` en cours de frappe au caret
 *  (en début de mot uniquement). */
function tokenAtCaret(value: string, sel: number): Token | null {
  const up = value.slice(0, sel);
  const slash = up.match(/(?:^|\s)(\/[a-z]*)$/i);
  if (slash) return { kind: "slash", text: slash[1], start: up.length - slash[1].length };
  const scope = up.match(/(?:^|\s)(@[a-z0-9]*)$/i);
  if (scope) return { kind: "scope", text: scope[1], start: up.length - scope[1].length };
  return null;
}

/**
 * Z4 — le composer. Chevron ❯ accent, caret block overlay clignotant
 * (caret natif masqué, mesuré par un mirror), palette slash, scope
 * picker `@Sn`, chip de scope supprimable d'un Backspace, historique
 * ↑ sur composer vide, auto-grow ≤ 5 lignes.
 */
export default function Composer({
  value,
  onValueChange,
  scope,
  onScopeChange,
  sections,
  durationOf,
  disabled,
  placeholder,
  onSend,
  history,
  taRef,
  onApplyLatest,
  onDiscardLatest,
  paletteHints,
}: {
  value: string;
  onValueChange: (v: string) => void;
  scope?: number;
  onScopeChange: (o: number | undefined) => void;
  sections: SectionInfo[];
  durationOf: (ordinal: number) => string;
  disabled: boolean;
  placeholder?: string;
  /** `textOverride` : envoi direct d'une commande slash acceptée
   *  depuis la palette (« s'envoie telle quelle »). */
  onSend: (textOverride?: string) => void;
  history: string[];
  taRef: RefObject<HTMLTextAreaElement | null>;
  onApplyLatest: () => boolean;
  onDiscardLatest: () => boolean;
  paletteHints?: never;
}) {
  void paletteHints;
  const [sel, setSel] = useState(0);
  const [focused, setFocused] = useState(false);
  const [closedToken, setClosedToken] = useState<string | null>(null);
  const [hl, setHl] = useState(0);
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const mirrorMarker = useRef<HTMLSpanElement | null>(null);
  const [caretPos, setCaretPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  /** Replace le caret après une insertion programmatique (palette,
   *  historique) — après le commit React, via rAF. */
  const setCaretTo = (pos: number) => {
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.setSelectionRange(pos, pos);
      setSel(pos);
    });
  };

  const token = useMemo(
    () => (disabled ? null : tokenAtCaret(value, sel)),
    [value, sel, disabled],
  );

  const items = useMemo(() => {
    if (!token) return [];
    if (token.kind === "slash") {
      const q = token.text.toLowerCase();
      return SLASH_COMMANDS.filter((c) => c.cmd.startsWith(q)).map((c) => ({
        key: c.cmd,
        cmd: c.cmd,
        desc: c.desc,
        dur: "",
        ordinal: -1,
      }));
    }
    const q = token.text.slice(1).toLowerCase(); // après le @
    return sections
      .filter(
        (s) =>
          q === "" ||
          `s${s.ordinal + 1}`.startsWith(q) ||
          s.title.toLowerCase().includes(q),
      )
      .map((s) => ({
        key: `@S${s.ordinal + 1}`,
        cmd: `@S${s.ordinal + 1}`,
        desc: s.title,
        dur: durationOf(s.ordinal),
        ordinal: s.ordinal,
      }));
  }, [token, sections, durationOf]);

  const paletteOpen = !!token && token.text !== closedToken && items.length > 0;

  // reset surlignage + réouverture quand le token change — ajustement
  // d'état pendant le rendu (pattern React « adjusting state »)
  const [prevToken, setPrevToken] = useState<string | null>(null);
  const tokenText = token?.text ?? null;
  if (tokenText !== prevToken) {
    setPrevToken(tokenText);
    setHl(0);
    if (closedToken !== null && closedToken !== tokenText) setClosedToken(null);
  }

  // auto-grow ≤ 5 lignes
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, LINE_H * MAX_LINES)}px`;
  }, [value, taRef]);

  // le focus réel peut se perdre sans event blur quand le textarea
  // passe disabled (streaming) — resynchronise sur un frame
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() =>
      setFocused(document.activeElement === taRef.current),
    );
    return () => cancelAnimationFrame(id);
  }, [disabled, taRef]);

  // position du caret block — mesurée sur le mirror
  useLayoutEffect(() => {
    const ta = taRef.current;
    const marker = mirrorMarker.current;
    if (!ta || !marker) return;
    setCaretPos({
      left: marker.offsetLeft,
      top: marker.offsetTop - ta.scrollTop + 3,
    });
  }, [value, sel, taRef]);

  const syncSel = () => {
    const ta = taRef.current;
    if (ta) setSel(ta.selectionStart ?? 0);
  };

  const accept = (idx: number) => {
    if (!token || !items[idx]) return;
    const item = items[idx];
    if (token.kind === "slash") {
      const next = value.slice(0, token.start) + item.cmd + " " + value.slice(sel);
      onValueChange(next);
      setCaretTo(token.start + item.cmd.length + 1);
    } else {
      const next = value.slice(0, token.start) + value.slice(sel);
      onValueChange(next);
      onScopeChange(item.ordinal);
      setCaretTo(token.start);
    }
    setClosedToken(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;

    if (mod && e.key === "Enter") {
      if (onApplyLatest()) e.preventDefault();
      return;
    }
    if (mod && e.key === "Backspace") {
      if (onDiscardLatest()) e.preventDefault();
      return;
    }

    if (paletteOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHl((h) => (h + 1) % items.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHl((h) => (h - 1 + items.length) % items.length);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        accept(hl);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (token?.kind === "slash" && items[hl]) {
          // la commande slash sélectionnée s'envoie telle quelle
          const next = value.slice(0, token.start) + items[hl].cmd + " " + value.slice(sel);
          onValueChange(next);
          onSend(next);
        } else {
          accept(hl);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setClosedToken(token?.text ?? null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
      setHistIdx(null);
      return;
    }
    if (e.key === "ArrowUp" && (value === "" || histIdx !== null) && history.length > 0) {
      e.preventDefault();
      const next = histIdx === null ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      onValueChange(history[next]);
      setCaretTo(history[next].length);
      return;
    }
    if (e.key === "ArrowDown" && histIdx !== null) {
      e.preventDefault();
      const next = histIdx + 1;
      if (next >= history.length) {
        setHistIdx(null);
        onValueChange("");
      } else {
        setHistIdx(next);
        onValueChange(history[next]);
        setCaretTo(history[next].length);
      }
      return;
    }
    if (
      e.key === "Backspace" &&
      scope !== undefined &&
      taRef.current?.selectionStart === 0 &&
      taRef.current?.selectionEnd === 0
    ) {
      // le chip de scope se supprime comme un seul caractère
      e.preventDefault();
      onScopeChange(undefined);
      return;
    }
    if (e.key === "Escape") {
      if (value !== "") {
        e.preventDefault();
        e.stopPropagation();
        onValueChange("");
        setHistIdx(null);
      } else {
        taRef.current?.blur();
      }
    }
  };

  return (
    <div className={"con-composer" + (disabled ? " disabled" : "")}>
      {paletteOpen && (
        <div className="con-palette" role="listbox" data-wm-id="console.palette">
          {items.map((it, i) => (
            <button
              key={it.key}
              type="button"
              className={i === hl ? "active" : ""}
              role="option"
              aria-selected={i === hl}
              onMouseEnter={() => setHl(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                accept(i);
              }}
              data-wm-id={token?.kind === "slash" ? "console.palette.cmd" : "console.palette.scope"}
            >
              <span className="cp-cmd">{it.cmd}</span>
              <span className="cp-desc">{it.desc}</span>
              {it.dur && <span className="cp-dur">{it.dur}</span>}
              {i === hl && <span className="cp-dur" aria-hidden>▸</span>}
            </button>
          ))}
        </div>
      )}

      <div className="composer-row">
        <span className="take-chev" aria-hidden>❯</span>
        {scope !== undefined && (
          <button
            type="button"
            className="take-scope"
            style={{ border: "1px solid var(--accent-line)", background: "var(--accent-soft)" }}
            title={`${sections[scope]?.title ?? ""} — cliquer pour retirer le scope`}
            onClick={() => onScopeChange(undefined)}
            data-wm-id="console.composer.scope"
          >
            @S{scope + 1}
          </button>
        )}
        <div className="composer-ta-wrap">
          <textarea
            ref={taRef}
            className="composer-ta"
            rows={1}
            value={value}
            placeholder={placeholder ?? "Décris ce que tu veux…"}
            disabled={disabled}
            spellCheck={false}
            onChange={(e) => {
              onValueChange(e.target.value);
              setHistIdx(null);
              setSel(e.target.selectionStart ?? 0);
            }}
            onSelect={syncSel}
            onKeyUp={syncSel}
            onClick={syncSel}
            onScroll={syncSel}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={onKeyDown}
            data-wm-id="console.composer"
            aria-label="Composer de la console"
          />
          {/* mirror invisible — mesure la position du caret block */}
          <div className="composer-mirror" aria-hidden>
            {value.slice(0, sel)}
            <span ref={mirrorMarker} />
          </div>
          {focused && !disabled && (
            <span
              className="composer-caret"
              style={{ left: caretPos.left, top: caretPos.top }}
              aria-hidden
            />
          )}
        </div>
      </div>

      <div className="composer-hints">
        {paletteOpen ? (
          <span>↹ compléter · ↵ envoyer · esc fermer</span>
        ) : (
          <span>/ commandes · @ sections · ↹ compléter</span>
        )}
      </div>
    </div>
  );
}
