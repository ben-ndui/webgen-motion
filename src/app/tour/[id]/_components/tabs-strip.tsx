"use client";

import type { LucideIcon } from "lucide-react";

/**
 * Pill tabs strip — backdrop-blurred container, lucide-icon + label,
 * optional badge in the top-right corner of the tab. Matches the
 * WebGen create-tab pattern.
 */

export interface TabDef<TKey extends string> {
  id: TKey;
  label: string;
  icon: LucideIcon;
  /** Optional badge — number shown as a pill, "•" as a dot, undefined to hide. */
  badge?: number | "•" | null;
}

interface Props<TKey extends string> {
  tabs: ReadonlyArray<TabDef<TKey>>;
  activeTab: TKey;
  onChange: (next: TKey) => void;
}

export default function TabsStrip<TKey extends string>({
  tabs,
  activeTab,
  onChange,
}: Props<TKey>) {
  return (
    <div className="flex justify-center overflow-x-auto overscroll-contain snap-x-soft">
      <div
        role="tablist"
        className="inline-flex items-center gap-0.5 p-1 rounded-full bg-white/70 backdrop-blur-2xl ring-1 ring-zinc-900/5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.15)]"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              data-tab={tab.id}
              onClick={() => onChange(tab.id)}
              className={`relative inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 ${
                isActive
                  ? "bg-zinc-900 text-white shadow-[0_2px_4px_rgba(0,0,0,0.08)]"
                  : "text-zinc-700 hover:text-zinc-900"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== null && tab.badge !== undefined && (
                <span
                  className={`ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[9px] font-mono ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
