/* GEN MOTION — Tweaks island.
   Mounts the Tweaks panel and applies values to the live page via
   document attributes / CSS custom properties. The landing itself is
   plain HTML/CSS — this only nudges tokens. */
const { useEffect } = React;

/* refined-blue family — vary hue only, keep L/C constant for harmony */
const ACCENTS = [
  { id: "refined", label: "Refined",  hue: 257, swatch: "oklch(55% 0.205 257)" },
  { id: "azure",   label: "Azure",    hue: 245, swatch: "oklch(55% 0.205 245)" },
  { id: "deep",    label: "Deep",     hue: 270, swatch: "oklch(55% 0.205 270)" },
  { id: "cyan",    label: "Signal",   hue: 232, swatch: "oklch(55% 0.205 232)" },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "heroDir": "statement",
  "accent": "refined",
  "dark": false,
  "motion": 60,
  "specStrip": true
}/*EDITMODE-END*/;

function AccentSwatches({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {ACCENTS.map((a) => (
        <button
          key={a.id}
          title={a.label}
          onClick={() => onChange(a.id)}
          style={{
            flex: 1, height: 34, borderRadius: 9, cursor: "pointer",
            background: a.swatch,
            border: value === a.id ? "2px solid var(--tw-fg, #111)" : "2px solid transparent",
            boxShadow: value === a.id ? "0 0 0 2px #fff inset" : "none",
            outline: "1px solid rgba(0,0,0,.08)",
          }}
        />
      ))}
    </div>
  );
}

function TweaksApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const root = document.documentElement;

  /* hero direction */
  useEffect(() => {
    root.setAttribute("data-hero", t.heroDir === "motion" ? "b" : "a");
  }, [t.heroDir]);

  /* accent hue */
  useEffect(() => {
    const a = ACCENTS.find((x) => x.id === t.accent) || ACCENTS[0];
    root.style.setProperty("--accent-h", String(a.hue));
  }, [t.accent]);

  /* motion intensity */
  useEffect(() => {
    root.style.setProperty("--motion", (t.motion / 100).toFixed(2));
  }, [t.motion]);

  /* spec strip */
  useEffect(() => {
    document.querySelectorAll("[data-wm-id='landing.hero.specs']").forEach((el) => {
      el.style.display = t.specStrip ? "" : "none";
    });
  }, [t.specStrip]);

  /* dark — two-way sync with the in-nav toggle */
  useEffect(() => {
    const want = t.dark ? "dark" : "light";
    if (root.getAttribute("data-theme") !== want) {
      root.setAttribute("data-theme", want);
      try { localStorage.setItem("gm-theme", want); } catch (e) {}
    }
  }, [t.dark]);
  useEffect(() => {
    const obs = new MutationObserver(() => {
      const isDark = root.getAttribute("data-theme") === "dark";
      if (isDark !== t.dark) setTweak("dark", isDark);
    });
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [t.dark]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Hero direction" />
      <TweakRadio
        label="Layout"
        value={t.heroDir}
        options={[
          { value: "statement", label: "Statement" },
          { value: "motion", label: "Product motion" },
        ]}
        onChange={(v) => setTweak("heroDir", v)}
      />
      <TweakToggle label="Spec strip" value={t.specStrip} onChange={(v) => setTweak("specStrip", v)} />

      <TweakSection label="Accent (refined blue)" />
      <AccentSwatches value={t.accent} onChange={(v) => setTweak("accent", v)} />

      <TweakSection label="Theme & motion" />
      <TweakToggle label="Dark mode" value={t.dark} onChange={(v) => setTweak("dark", v)} />
      <TweakSlider label="Motion" value={t.motion} min={0} max={100} step={10} unit="%"
                   onChange={(v) => setTweak("motion", v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("tweaks-root")).render(<TweaksApp />);
