import type { MotionCategory } from "@/lib/motion-categories";

/**
 * Mac browser chrome — ported from `src/app/compose/[id]/page.tsx`.
 * Stateless presentational shell : title bar (traffic lights + URL
 * pill + tab indicator) + content area. The content area is filled
 * by whatever children we pass (intro card, section video, outro
 * card).
 */
export function MacChrome({
  url,
  tabTitle,
  cat,
  children,
}: {
  url: string;
  tabTitle: string;
  cat: MotionCategory;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 1640,
        aspectRatio: "16 / 9",
        backgroundColor: "#1a1a1f",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow:
          "0 60px 140px rgba(0,0,0,0.55), 0 30px 60px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          paddingLeft: 16,
          paddingRight: 16,
          gap: 14,
          background:
            "linear-gradient(180deg, #2a2a32 0%, #1f1f25 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: 8 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <span
              key={c}
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                backgroundColor: c,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)",
              }}
            />
          ))}
        </div>

        {/* URL pill */}
        <div
          style={{
            flex: 1,
            height: 26,
            maxWidth: 540,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: 8,
            color: "rgba(255,255,255,0.78)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            fontWeight: 500,
            paddingLeft: 12,
            paddingRight: 12,
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="2"
            style={{ marginRight: 6 }}
          >
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          {url}
        </div>

        {/* Tab indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingLeft: 8,
            paddingRight: 6,
            color: "rgba(255,255,255,0.55)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 12,
            fontWeight: 500,
            maxWidth: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={tabTitle}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: cat.accent,
            }}
          />
          {tabTitle}
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          width: "100%",
          height: "calc(100% - 44px)",
          backgroundColor: "#000",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
