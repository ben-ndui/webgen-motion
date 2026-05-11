import type { MotionCategory } from "@/lib/motion-categories";

/**
 * iPhone frame — 9:16 portrait container with Dynamic Island,
 * status bar, home indicator. Ported as-is from the React compose
 * page : the 9:16 video lives inside the inner screen, decorations
 * are pure CSS for resolution independence.
 */
export function IPhoneFrame({
  cat,
  tabTitle,
  children,
}: {
  cat: MotionCategory;
  tabTitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        height: "94%",
        aspectRatio: "9 / 16",
        backgroundColor: "#0B0B0F",
        borderRadius: 56,
        padding: 12,
        boxShadow:
          "0 80px 160px rgba(0,0,0,0.55), 0 40px 80px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 50,
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      >
        {children}

        {/* Dynamic Island */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 110,
            height: 34,
            borderRadius: 9999,
            backgroundColor: "#000",
            zIndex: 4,
          }}
        />

        {/* Status bar */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 22,
            right: 22,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#fff",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 14,
            fontWeight: 600,
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <span>9:41</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
              <rect x="0" y="7" width="3" height="4" rx="0.5" />
              <rect x="4.5" y="5" width="3" height="6" rx="0.5" />
              <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" />
              <rect x="13.5" y="0" width="3" height="11" rx="0.5" opacity="0.5" />
            </svg>
            <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
              <path d="M7.5 11l-2-2.5a3 3 0 014 0L7.5 11z" />
              <path d="M2 5.5a8 8 0 0111 0l-1.5 1.8a5.5 5.5 0 00-8 0L2 5.5z" />
              <path
                d="M0 3.2a11 11 0 0115 0l-1.5 1.6a8.5 8.5 0 00-12 0L0 3.2z"
                opacity="0.85"
              />
            </svg>
            <svg width="26" height="11" viewBox="0 0 26 11" fill="none">
              <rect
                x="0"
                y="0"
                width="22"
                height="11"
                rx="2.5"
                stroke="currentColor"
                strokeOpacity="0.5"
                strokeWidth="1"
              />
              <rect x="2" y="2" width="14" height="7" rx="1" fill="currentColor" />
              <rect
                x="23"
                y="3.5"
                width="2"
                height="4"
                rx="1"
                fill="currentColor"
                opacity="0.5"
              />
            </svg>
          </span>
        </div>

        {/* Home indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 134,
            height: 5,
            borderRadius: 9999,
            backgroundColor: "rgba(255,255,255,0.85)",
            zIndex: 5,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Cat-tinted accent dot */}
      <div
        style={{
          position: "absolute",
          bottom: -16,
          right: 32,
          width: 8,
          height: 8,
          borderRadius: 9999,
          backgroundColor: cat.accent,
          boxShadow: `0 0 16px ${cat.accent}aa`,
        }}
        title={tabTitle}
      />
    </div>
  );
}
