/* GEN MOTION — Editor shell (header + animated tabs + content + tweaks) */
const { useState, useEffect, useLayoutEffect, useRef } = React;

const AI = {
  back:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m15 18-6-6 6-6"/></svg>,
  moon:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>,
  sun:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  play:  (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 5v14l11-7z"/></svg>,
  eye:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>,
};

const TABS = [
  { key:"script",   num:"01", label:"Script",   badge:"7",   get Comp(){ return window.ScriptTab; } },
  { key:"capture",  num:"02", label:"Capture",  badge:"4/5", get Comp(){ return window.CaptureTab; } },
  { key:"audio",    num:"03", label:"Audio",    badge:null,  get Comp(){ return window.AudioTab; } },
  { key:"voice",    num:"04", label:"Voix off", badge:null,  get Comp(){ return window.VoiceTab; } },
  { key:"compose",  num:"05", label:"Compose",  badge:null,  get Comp(){ return window.ComposeTab; } },
];

const ED_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "refined",
  "dark": false,
  "density": "comfy",
  "liveAnim": true
}/*EDITMODE-END*/;
const ACCENTS = [
  { id:"refined", hue:257, swatch:"oklch(55% 0.205 257)" },
  { id:"azure",   hue:245, swatch:"oklch(55% 0.205 245)" },
  { id:"deep",    hue:270, swatch:"oklch(55% 0.205 270)" },
  { id:"cyan",    hue:232, swatch:"oklch(55% 0.205 232)" },
];
function AccentSwatches({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:8 }}>
      {ACCENTS.map((a)=>(
        <button key={a.id} onClick={()=>onChange(a.id)} title={a.id}
          style={{ flex:1, height:32, borderRadius:9, cursor:"pointer", background:a.swatch,
            border: value===a.id ? "2px solid var(--ink)":"2px solid transparent",
            boxShadow: value===a.id ? "0 0 0 2px var(--surface) inset":"none",
            outline:"1px solid rgba(120,120,120,.25)" }} />
      ))}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(ED_DEFAULTS);
  const [active, setActive] = useState("script");
  const [name, setName] = useState("Onboarding SaaS — Hero → Dashboard");
  const stripRef = useRef(null);
  const tabRefs = useRef({});
  const [ind, setInd] = useState({ left: 0, width: 0 });
  const root = document.documentElement;

  useEffect(() => { const a = ACCENTS.find((x)=>x.id===t.accent)||ACCENTS[0]; root.style.setProperty("--accent-h", String(a.hue)); }, [t.accent]);
  useEffect(() => { root.setAttribute("data-theme", t.dark ? "dark" : "light"); }, [t.dark]);
  useEffect(() => { root.setAttribute("data-density", t.density === "compact" ? "compact" : "comfy"); }, [t.density]);
  useEffect(() => { if (t.liveAnim) root.removeAttribute("data-static"); else root.setAttribute("data-static",""); }, [t.liveAnim]);

  useLayoutEffect(() => {
    const el = tabRefs.current[active];
    if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active, t.density]);

  const cur = TABS.find((x) => x.key === active);

  return (
    <div className="ed">
      {/* HEADER */}
      <header className="ed-header" data-wm-id="editor.header">
        <div className="crumb">
          <a href="GEN MOTION Hub.html"><AI.back /> Tours</a>
          <span className="sl">/</span>
        </div>
        <input className="tname" value={name} onChange={(e)=>setName(e.target.value)} spellCheck={false} data-wm-id="editor.name" />
        <span className="meta-pill"><span>16:9</span><span className="sep"></span><span>1:40</span><span className="sep"></span><span>7 étapes</span></span>
        <div className="hspace"></div>
        <span className="saved"><span className="d"></span>Enregistré</span>
        <button className="btn btn-ghost" data-wm-id="editor.preview"><AI.eye /> Aperçu</button>
        <button className="btn btn-primary" data-wm-id="editor.compose-cta" onClick={()=>setActive("compose")}><AI.play /> Composer</button>
        <button className="icon-btn theme-toggle" aria-label="Thème" onClick={()=>setTweak("dark", !t.dark)}>
          <span className="icon-moon"><AI.moon /></span><span className="icon-sun"><AI.sun /></span>
        </button>
      </header>

      {/* TAB STRIP */}
      <nav className="tabstrip" ref={stripRef} data-wm-id="editor.tabs">
        {TABS.map((tab)=>(
          <button key={tab.key} ref={(el)=>tabRefs.current[tab.key]=el}
            className={"tab"+(active===tab.key?" active":"")} onClick={()=>setActive(tab.key)} data-wm-id={"editor.tab."+tab.key}>
            <span className="tnum">{tab.num}</span>{tab.label}
            {tab.badge && <span className="badge">{tab.badge}</span>}
          </button>
        ))}
        <span className="tab-ind" style={{ left: ind.left, width: ind.width }}></span>
      </nav>

      {/* CONTENT */}
      <div className="content" data-wm-id="editor.content">
        {/* key forces remount → entrance animation per tab */}
        <div key={active}>{React.createElement(cur.Comp, { motion: 60 })}</div>
      </div>

      {/* TWEAKS */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Accent (bleu raffiné)" />
        <AccentSwatches value={t.accent} onChange={(v)=>setTweak("accent", v)} />
        <TweakSection label="Éditeur" />
        <TweakToggle label="Mode sombre" value={t.dark} onChange={(v)=>setTweak("dark", v)} />
        <TweakRadio label="Densité" value={t.density}
          options={[{value:"comfy",label:"Confort"},{value:"compact",label:"Compact"}]}
          onChange={(v)=>setTweak("density", v)} />
        <TweakToggle label="Animations live" value={t.liveAnim} onChange={(v)=>setTweak("liveAnim", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
