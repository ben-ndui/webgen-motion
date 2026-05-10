// Shared page header — eyebrow (mono uppercase kicker) + h1 + optional
// description + optional actions slot on the right. Mirrors the WebGen
// `/admin/social/[accountId]/` pattern.

interface Props {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: Props) {
  return (
    <header className="flex items-start justify-between gap-4 flex-wrap mb-2">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-slate-600 mb-2">
          {eyebrow}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-1">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
