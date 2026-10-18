export function Field({
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
        <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">{label}</label>
        {hint && <span className="text-[10px] text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Pill({
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
      type="button"
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
