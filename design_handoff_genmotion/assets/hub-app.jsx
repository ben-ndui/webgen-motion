/* GEN MOTION — Hub / Dashboard (interactive prototype) */
const { useState, useEffect, useRef, useMemo } = React;

/* ----------------------------- icons (load-bearing only) ----------------------------- */
const I = {
  plus:    (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  caret:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 9 6 6 6-6"/></svg>,
  search:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>,
  film:    (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/></svg>,
  music:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>,
  gear:    (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.2A1.6 1.6 0 0 0 6.6 19a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 2 12.6 1.6 1.6 0 0 0 .9 11H1a2 2 0 0 1 0-4h.2A1.6 1.6 0 0 0 3 5.4l.4-.2"/></svg>,
  sliders: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>,
  moon:    (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>,
  sun:     (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  kebab:   (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>,
  scaffold:(p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  spark:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></svg>,
  newtour: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="5" width="14" height="14" rx="2"/><path d="m22 8-6 4 6 4V8Z"/></svg>,
};

/* ----------------------------- data ----------------------------- */
const TOURS = [
  { id: 1,  name: "Onboarding SaaS — Hero → Dashboard", fmt: "16:9", steps: 12, dur: "1:40", cat: "Produit",   status: "ready",    edit: "il y a 2 h" },
  { id: 2,  name: "App mobile — Teaser de lancement",    fmt: "9:16", steps: 8,  dur: "0:45", cat: "Social",    status: "draft",    edit: "il y a 5 h" },
  { id: 3,  name: "Feature Tour — Facturation",          fmt: "16:9", steps: 9,  dur: "1:12", cat: "Produit",   status: "rendered", edit: "hier" },
  { id: 4,  name: "Changelog v2.4",                      fmt: "16:9", steps: 6,  dur: "0:52", cat: "Release",   status: "ready",    edit: "hier" },
  { id: 5,  name: "Portfolio — Walkthrough",             fmt: "9:16", steps: 7,  dur: "0:38", cat: "Perso",     status: "draft",    edit: "il y a 2 j" },
  { id: 6,  name: "API Docs — Quickstart",               fmt: "16:9", steps: 14, dur: "2:05", cat: "Docs",      status: "ready",    edit: "il y a 3 j" },
  { id: 7,  name: "Pricing — Highlight reel",            fmt: "9:16", steps: 5,  dur: "0:30", cat: "Marketing", status: "rendered", edit: "il y a 3 j" },
  { id: 8,  name: "Dashboard — Deep dive",               fmt: "16:9", steps: 18, dur: "2:48", cat: "Produit",   status: "draft",    edit: "il y a 4 j" },
  { id: 9,  name: "Intégration Slack",                   fmt: "16:9", steps: 7,  dur: "0:58", cat: "Docs",      status: "ready",    edit: "il y a 5 j" },
  { id: 10, name: "Story — Nouveautés de la semaine",    fmt: "9:16", steps: 6,  dur: "0:34", cat: "Social",    status: "rendered", edit: "il y a 6 j" },
  { id: 11, name: "Comparatif vs concurrent",            fmt: "16:9", steps: 10, dur: "1:25", cat: "Marketing", status: "draft",    edit: "la semaine dernière" },
  { id: 12, name: "Tuto — Export vidéo frame-accurate",  fmt: "16:9", steps: 8,  dur: "1:05", cat: "Docs",      status: "ready",    edit: "la semaine dernière" },
];
const STATUS_LABEL = { draft: "Brouillon", ready: "Prêt", rendered: "Rendu" };
const SORTS = { recent: "Récents", name: "Nom A→Z", dur: "Durée", steps: "Étapes" };

/* ----------------------------- thumbnail ----------------------------- */
function Thumb({ tour, style }) {
  const skel = style === "minimal";
  const Mac = (
    <div className="device mac">
      <div className="dev-bar"><i></i><i></i><i></i></div>
      <div className="dev-body">
        <div className="b lg"></div>
        <div className="b w1"></div>
        {!skel && <div className="dev-accent"></div>}
        <div className="b w3"></div>
        <div className="b w2"></div>
      </div>
    </div>
  );
  const Phone = (
    <div className="device phone">
      <div className="dev-body">
        <div className="b lg"></div>
        <div className="b w1"></div>
        <div className="b w2"></div>
        {!skel && <div className="dev-accent"></div>}
        <div className="b w3"></div>
      </div>
    </div>
  );
  return (
    <div className="thumb" data-wm-id="hub.card.thumb">
      <div className="thumb-tl">
        <span className="fbadge">{tour.fmt}</span>
      </div>
      <div className="thumb-br"><span className="dur">{tour.dur}</span></div>
      {tour.fmt === "9:16" ? Phone : Mac}
      <div className="thumb-play"><span></span></div>
    </div>
  );
}

/* ----------------------------- tour card ----------------------------- */
function TourCard({ tour, showMeta, thumbStyle }) {
  const open = () => { window.location.href = "GEN MOTION Editor.html"; };
  return (
    <article className="tcard" data-wm-id="hub.card" tabIndex={0} onClick={open}
      onKeyDown={(e)=>{ if(e.key==="Enter") open(); }}>
      <Thumb tour={tour} style={thumbStyle} />
      <div className="tbody">
        <div className="tbody-top">
          <h3 className="tname">{tour.name}</h3>
          <button className="kebab" aria-label="Plus d'actions" onClick={(e) => e.stopPropagation()}>
            <I.kebab />
          </button>
        </div>
        {showMeta && (
          <div className="tmeta">
            <span className="tcat">{tour.cat}</span>
            <span>{tour.steps} étapes</span>
            <span className="sep"></span>
            <span>{tour.dur}</span>
            <span className="sep"></span>
            <span>{tour.fmt}</span>
          </div>
        )}
        <div className="tfoot">
          <span className={"status " + tour.status}>
            <span className="sdot"></span>{STATUS_LABEL[tour.status]}
          </span>
          <span className="tedit">{tour.edit}</span>
        </div>
      </div>
    </article>
  );
}

/* ----------------------------- create menu ----------------------------- */
function CreateButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="create" ref={ref} data-wm-id="hub.action.create">
      <button className="btn btn-primary" data-wm-id="hub.action.new" onClick={() => { window.location.href = "GEN MOTION Editor.html"; }}><I.plus /> Nouveau tour</button>
      <button className="create-caret" aria-label="Plus d'options de création" onClick={() => setOpen((o) => !o)}>
        <I.caret />
      </button>
      <div className={"menu" + (open ? " open" : "")}>
        <div className="menu-item" data-wm-id="hub.action.new" onClick={() => { window.location.href = "GEN MOTION Editor.html"; }}>
          <span className="mi-ic"><I.newtour /></span>
          <span><span className="mi-t">Nouveau tour</span><span className="mi-d">Partir d'une page blanche, étape par étape.</span></span>
        </div>
        <div className="menu-item" data-wm-id="hub.action.scaffold" onClick={() => { window.location.href = "GEN MOTION Editor.html"; }}>
          <span className="mi-ic"><I.scaffold /></span>
          <span><span className="mi-t">Scaffold projet</span><span className="mi-d">Générer la structure depuis une URL ou un repo.</span></span>
        </div>
        <div className="menu-item" data-wm-id="hub.action.generate" onClick={() => { window.location.href = "GEN MOTION Editor.html"; }}>
          <span className="mi-ic"><I.spark /></span>
          <span><span className="mi-t">Générer avec IA</span><span className="mi-d">Décrivez le tour — l'agent écrit le script.</span></span>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- main app ----------------------------- */
const HUB_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "refined",
  "dark": false,
  "density": "comfy",
  "thumbStyle": "device",
  "showMeta": true
}/*EDITMODE-END*/;
const ACCENTS = [
  { id: "refined", hue: 257, swatch: "oklch(55% 0.205 257)" },
  { id: "azure",   hue: 245, swatch: "oklch(55% 0.205 245)" },
  { id: "deep",    hue: 270, swatch: "oklch(55% 0.205 270)" },
  { id: "cyan",    hue: 232, swatch: "oklch(55% 0.205 232)" },
];

function AccentSwatches({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {ACCENTS.map((a) => (
        <button key={a.id} onClick={() => onChange(a.id)} title={a.id}
          style={{ flex: 1, height: 32, borderRadius: 9, cursor: "pointer", background: a.swatch,
            border: value === a.id ? "2px solid var(--ink)" : "2px solid transparent",
            boxShadow: value === a.id ? "0 0 0 2px var(--surface) inset" : "none",
            outline: "1px solid rgba(120,120,120,.25)" }} />
      ))}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(HUB_DEFAULTS);
  const [fmt, setFmt] = useState("all");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const root = document.documentElement;

  useEffect(() => {
    const a = ACCENTS.find((x) => x.id === t.accent) || ACCENTS[0];
    root.style.setProperty("--accent-h", String(a.hue));
  }, [t.accent]);
  useEffect(() => { root.setAttribute("data-theme", t.dark ? "dark" : "light"); }, [t.dark]);
  useEffect(() => { root.setAttribute("data-density", t.density === "compact" ? "compact" : "comfy"); }, [t.density]);

  const cats = useMemo(() => Array.from(new Set(TOURS.map((x) => x.cat))), []);
  const list = useMemo(() => {
    let r = TOURS.filter((x) =>
      (fmt === "all" || x.fmt === fmt) &&
      (cat === "all" || x.cat === cat) &&
      (q.trim() === "" || x.name.toLowerCase().includes(q.toLowerCase()) || x.cat.toLowerCase().includes(q.toLowerCase()))
    );
    const toSec = (d) => d.split(":").reduce((a, b) => a * 60 + +b, 0);
    if (sort === "name") r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "dur") r = [...r].sort((a, b) => toSec(b.dur) - toSec(a.dur));
    if (sort === "steps") r = [...r].sort((a, b) => b.steps - a.steps);
    return r;
  }, [fmt, cat, q, sort]);

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar" data-wm-id="hub.sidebar">
        <div className="brand"><span className="brand-mark"></span><span className="brand-name">GEN&nbsp;MOTION</span></div>
        <div className="side-new"><CreateButton /></div>
        <nav className="nav" data-wm-id="hub.nav">
          <div className="nav-item active"><I.film /> Tours <span className="count">{TOURS.length}</span></div>
          <div className="nav-item"><I.music /> Bibliothèque audio</div>
          <div className="nav-item"><I.gear /> Réglages</div>
        </nav>
        <div className="side-foot">
          <div className="license" data-wm-id="hub.license">
            <span className="license-badge">S</span>
            <span className="license-meta"><b>Studio Edition</b><span>Licence perpétuelle · à jour</span></span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main" data-wm-id="hub.main">
        <header className="topbar" data-wm-id="hub.topbar">
          <h1 className="page-title">Tours <span className="n">{list.length}</span></h1>
          <div className="topbar-spacer"></div>
          <label className="search" data-wm-id="hub.search">
            <I.search />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un tour…" />
            <kbd>/</kbd>
          </label>
          <button className="icon-btn theme-toggle" aria-label="Thème" onClick={() => setTweak("dark", !t.dark)} data-wm-id="hub.theme">
            <span className="icon-moon"><I.moon /></span><span className="icon-sun"><I.sun /></span>
          </button>
        </header>

        {/* FILTERS */}
        <div className="toolbar" data-wm-id="hub.filters">
          <div className="segmented" role="tablist" aria-label="Format">
            {["all", "16:9", "9:16"].map((f) => (
              <button key={f} className={"seg" + (fmt === f ? " active" : "")} onClick={() => setFmt(f)}>
                {f === "all" ? "Tous" : f}
              </button>
            ))}
          </div>
          <button className={"chip" + (cat === "all" ? " active" : "")} onClick={() => setCat("all")}>Toutes catégories</button>
          {cats.map((c) => (
            <button key={c} className={"chip" + (cat === c ? " active" : "")} onClick={() => setCat(c)}>
              <span className="dot"></span>{c}
            </button>
          ))}
          <div className="toolbar-spacer"></div>
          <button className="select" onClick={() => {
            const keys = Object.keys(SORTS); setSort(keys[(keys.indexOf(sort) + 1) % keys.length]);
          }} data-wm-id="hub.sort">
            Trier&nbsp;: {SORTS[sort]} <I.caret />
          </button>
        </div>

        {/* GRID */}
        <div className="grid-wrap">
          <div className="grid" data-wm-id="hub.grid">
            {list.length === 0 ? (
              <div className="empty">
                <span className="ec"><I.search /></span>
                <h3>Aucun tour ne correspond</h3>
                <p>Ajustez les filtres ou la recherche — ou lancez un nouveau tour pour commencer.</p>
              </div>
            ) : (
              list.map((tour) => (
                <TourCard key={tour.id} tour={tour} showMeta={t.showMeta} thumbStyle={t.thumbStyle} />
              ))
            )}
          </div>
        </div>
      </main>

      {/* TWEAKS */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Accent (bleu raffiné)" />
        <AccentSwatches value={t.accent} onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Affichage" />
        <TweakToggle label="Mode sombre" value={t.dark} onChange={(v) => setTweak("dark", v)} />
        <TweakRadio label="Densité" value={t.density}
          options={[{ value: "comfy", label: "Confort" }, { value: "compact", label: "Compact" }]}
          onChange={(v) => setTweak("density", v)} />
        <TweakRadio label="Vignette" value={t.thumbStyle}
          options={[{ value: "device", label: "Device" }, { value: "minimal", label: "Épuré" }]}
          onChange={(v) => setTweak("thumbStyle", v)} />
        <TweakToggle label="Méta sur les cartes" value={t.showMeta} onChange={(v) => setTweak("showMeta", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
