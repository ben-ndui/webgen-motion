/* GEN MOTION — Editor tab panels. Loaded before editor-app.jsx. */
const { useState: useStateT, useEffect: useEffectT, useRef: useRefT } = React;

const EI = {
  check:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m5 12 4.5 4.5L19 7"/></svg>,
  warn:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 8v5M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>,
  plus:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  x:      (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
  cam:    (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>,
  phone:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></svg>,
  laptop: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M2 19h20"/></svg>,
  square: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="14" rx="1.5"/></svg>,
};

const WAVE = (n, seed) => Array.from({ length: n }, (_, i) => 18 + Math.abs(Math.sin((i + seed) * 1.7)) * 78);

/* =================== SCRIPT =================== */
const SCRIPT_STEPS = [
  { id:1, type:"section", t:"Hero",            sel:".hero",        vo:"GEN MOTION capture n'importe quelle interface web — directement sur votre machine.", dur:"0:08" },
  { id:2, type:"scroll",  t:"→ Features",      sel:"scroll 60%",   vo:"On descend vers les fonctionnalités clés.", dur:"0:05" },
  { id:3, type:"overlay", t:"Texte « Local-first »", sel:"top-left", vo:"Tout reste en local. Aucun cloud, aucun vendor lock-in.", dur:"0:06" },
  { id:4, type:"click",   t:"Bouton « Capturer »", sel:"[data-cta]", vo:"Un clic lance la capture, section par section.", dur:"0:04" },
  { id:5, type:"section", t:"Pipeline",        sel:"#pipeline",    vo:"Trois étapes : capture, voix off, compose.", dur:"0:10" },
  { id:6, type:"wait",    t:"Pause",           sel:"1.5 s",        vo:"", dur:"0:02" },
  { id:7, type:"section", t:"Pricing",         sel:"#editions",    vo:"Community gratuit. Studio pour aller plus loin.", dur:"0:09" },
];
const TYPE_LABEL = { section:"Section", overlay:"Overlay", click:"Click", wait:"Wait", scroll:"Scroll" };

const STEP_DEFAULTS = {
  section: { t:"Nouvelle section", sel:"#section",   dur:"0:06" },
  overlay: { t:"Texte overlay",    sel:"center",     dur:"0:04" },
  click:   { t:"Clic élément",     sel:"[selector]", dur:"0:03" },
  wait:    { t:"Pause",            sel:"1.0 s",      dur:"0:01" },
  scroll:  { t:"Scroll",           sel:"scroll 50%", dur:"0:03" },
};
function ScriptTab() {
  const [steps, setSteps] = useStateT(SCRIPT_STEPS);
  const [sel, setSel] = useStateT(1);
  const [nextId, setNextId] = useStateT(100);
  const [addOpen, setAddOpen] = useStateT(false);
  const [drag, setDrag] = useStateT(null);
  const [over, setOver] = useStateT(null);
  const total = steps.reduce((a, s) => a + (+s.dur.split(":")[0]) * 60 + (+s.dur.split(":")[1]), 0);
  const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const remove = (id) => setSteps((s) => s.filter((x) => x.id !== id));
  const move = (from, to) => setSteps((s) => { const a=[...s]; const [m]=a.splice(from,1); a.splice(to,0,m); return a; });
  const addStep = (type) => {
    const d = STEP_DEFAULTS[type];
    setSteps((s) => [...s, { id: nextId, type, t: d.t, sel: d.sel, vo: "", dur: d.dur }]);
    setSel(nextId); setNextId((n) => n + 1); setAddOpen(false);
  };
  return (
    <div className="panel">
      <div className="panel-head">
        <div><span className="kicker">Onglet 01</span><h2 className="panel-title">Script</h2>
          <p className="panel-sub">Décrivez le tour étape par étape. Glissez le grip pour réordonner. Chaque step devient une section capturée ; la voix off se cale au mot près.</p></div>
        <button className="btn btn-soft btn-sm" onClick={() => {}}><EI.cam /> Aperçu du storyboard</button>
      </div>
      <div className="two-col">
        <div className="steps" data-wm-id="editor.script.steps">
          {steps.map((s, i) => (
            <div key={s.id}
              className={"step" + (sel === s.id ? " sel" : "") + (drag === i ? " dragging" : "") + (over === i && drag !== i ? " dragover" : "")}
              data-wm-id="editor.script.step" onClick={() => setSel(s.id)}
              draggable
              onDragStart={(e)=>{ if (e.target.closest(".vo, textarea, .step-x")) { e.preventDefault(); return; } setDrag(i); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e)=>{ e.preventDefault(); if (over !== i) setOver(i); }}
              onDrop={(e)=>{ e.preventDefault(); if (drag !== null && drag !== i) move(drag, i); setDrag(null); setOver(null); }}
              onDragEnd={()=>{ setDrag(null); setOver(null); }}>
              <div className="step-grip" title="Glisser pour réordonner"><i></i><i></i><i></i></div>
              <span className={"type-badge type-" + s.type}>{TYPE_LABEL[s.type]}</span>
              <div className="step-main">
                <div className="step-target">{s.t} <span className="mono">{s.sel}</span></div>
                {s.type !== "wait" ? (
                  <div className="vo-row">
                    <span className="vo-tag">VO</span>
                    <textarea className="vo" defaultValue={s.vo} placeholder="Texte de la voix off pour cette étape…" rows={1} onClick={(e)=>e.stopPropagation()} />
                  </div>
                ) : <div className="vo-tag" style={{paddingLeft:2}}>PAUSE · AUCUNE VOIX</div>}
              </div>
              <div className="step-right">
                <span className="step-dur">{s.dur}</span>
                <button className="step-x" aria-label="Supprimer" onClick={(e)=>{e.stopPropagation();remove(s.id);}}><EI.x /></button>
              </div>
            </div>
          ))}
          <div className="add-wrap">
            <button className="add-step" onClick={()=>setAddOpen((o)=>!o)}><EI.plus /> Ajouter une étape</button>
            {addOpen && (
              <div className="add-menu" data-wm-id="editor.script.addmenu">
                {Object.keys(TYPE_LABEL).map((type)=>(
                  <button key={type} onClick={()=>addStep(type)}>
                    <span className={"type-badge type-"+type}>{TYPE_LABEL[type]}</span>
                    <span className="am-d">{STEP_DEFAULTS[type].t}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <aside className="side-card" data-wm-id="editor.script.summary">
          <h4>Résumé</h4>
          <div className="sum-row"><span className="k">Étapes</span><span className="v">{steps.length}</span></div>
          <div className="sum-row"><span className="k">Durée estimée</span><span className="v">{fmt(total)}</span></div>
          <div className="sum-row"><span className="k">Sections à capturer</span><span className="v">{steps.filter(s=>s.type==="section").length}</span></div>
          <div className="sum-row"><span className="k">Mots de VO</span><span className="v">~{steps.reduce((a,s)=>a+s.vo.split(" ").filter(Boolean).length,0)}</span></div>
          <div className="type-legend">
            {Object.keys(TYPE_LABEL).map((t)=>(<span key={t} className={"type-badge type-"+t}>{TYPE_LABEL[t]}</span>))}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* =================== CAPTURE =================== */
const CAPTURES = [
  { name:"Hero",     dur:"0:08", status:"ok",    label:"OK" },
  { name:"Features", dur:"0:05", status:"ok",    label:"OK" },
  { name:"Pipeline", dur:"0:10", status:"ok",    label:"OK" },
  { name:"Pricing",  dur:"0:09", status:"stale", label:"À recapturer" },
  { name:"CTA",      dur:"—",    status:"empty", label:"Non capturé" },
];
const PHASE_NAMES = [
  "Lancement du navigateur headless",
  "Navigation vers la section",
  "Scroll & hover scriptés",
  "Enregistrement (Puppeteer)",
  "Encodage MP4 (FFmpeg)",
];
const CAP_LABEL = { ok:"OK", stale:"À recapturer", empty:"Non capturé", capturing:"Capture…" };

function CaptureTab() {
  const [secs, setSecs] = useStateT(CAPTURES.map((c) => ({ name:c.name, dur:c.dur, status:c.status })));
  const [target, setTarget] = useStateT("Pricing");
  const [running, setRunning] = useStateT(true);
  const [phase, setPhase] = useStateT(0);
  const [prog, setProg] = useStateT(0);
  const [frame, setFrame] = useStateT(0);

  useEffectT(() => {
    if (!running) return;
    const id = setInterval(() => {
      setProg((p) => {
        const np = p + 5;
        if (np >= 100) {
          setPhase((ph) => {
            if (ph >= PHASE_NAMES.length - 1) {
              setRunning(false);
              setSecs((s) => s.map((x) => x.name === target ? { ...x, status:"ok", dur: x.dur === "—" ? "0:06" : x.dur } : x));
              return ph;
            }
            return ph + 1;
          });
          return 0;
        }
        return np;
      });
      setFrame((f) => Math.min(300, f + 8));
    }, 110);
    return () => clearInterval(id);
  }, [running, target]);

  const start = (name) => {
    setSecs((s) => s.map((x) => x.name === name ? { ...x, status:"capturing" } : x));
    setTarget(name); setPhase(0); setProg(0); setFrame(0); setRunning(true);
  };
  const done = !running;

  return (
    <div className="panel">
      <div className="panel-head">
        <div><span className="kicker">Onglet 02</span><h2 className="panel-title">Capture</h2>
          <p className="panel-sub">Puppeteer film chaque section sur votre machine. Relancez une capture quand le script change.</p></div>
        <button className="btn btn-primary" onClick={() => start(target)} disabled={running}><EI.cam /> {running ? "Capture en cours…" : "Capturer les sections"}</button>
      </div>
      <div className="two-col">
        <div>
          <div className="cap-grid" data-wm-id="editor.capture.grid">
            {secs.map((c) => (
              <div key={c.name} className={"cap-card" + (c.status === "capturing" ? " cap-on" : "")} data-wm-id="editor.capture.card">
                <div className="cap-thumb">
                  <span className="cap-badge">{c.name}</span>
                  <span className={"cap-status " + c.status}></span>
                  {c.status === "capturing" && <span className="cap-rec">● REC</span>}
                  <div className="mini-frame"></div>
                </div>
                <div className="cap-body">
                  <div><div className="cap-name">{c.name}</div><div className="cap-meta">{c.dur} · {CAP_LABEL[c.status]}</div></div>
                  {c.status !== "capturing" && <span className="cap-recap" onClick={() => start(c.name)}>{c.status === "empty" ? "Capturer" : "Recapturer"}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <aside className="phase-panel" data-wm-id="editor.capture.stream">
          <div className="phase-head">
            <span className="pt">{done ? <span className="pt-done"><EI.check/></span> : <span className="live-dot"></span>}{done ? "Capture terminée" : "Capture en cours"}</span>
            <span className="mono" style={{fontSize:11,opacity:.7}}>{target}</span>
          </div>
          <div className="phase-list">
            {PHASE_NAMES.map((name, i) => {
              const st = i < phase ? "done" : (i === phase ? (running ? "active" : "done") : "pending");
              return (
                <div key={i} className={"phase " + st}>
                  <span className="pi">{st === "done" ? <EI.check/> : st === "active" ? <span className="spinner"></span> : <span style={{width:6,height:6,borderRadius:9,background:"currentColor",opacity:.5}}></span>}</span>
                  <span>{name}</span>
                  <span style={{fontSize:10,opacity:.7}}>{st === "done" ? "✓" : st === "active" ? prog + "%" : ""}</span>
                </div>
              );
            })}
          </div>
          <div className="phase-prog"><i style={{width:(running ? prog : 100) + "%"}}></i></div>
          <div className="phase-log">{done ? "✓ " + target.toLowerCase() + ".mp4 encodé · 300/300 frames" : "frame " + frame + "/300 · 1280×800 · 30fps · ffmpeg -c:v libx264"}</div>
        </aside>
      </div>
    </div>
  );
}

/* =================== AUDIO =================== */
const TRACKS = [
  { id:1, name:"Lo-fi Pulse", mood:"Calme · 90 BPM", dur:"1:42" },
  { id:2, name:"Ascent",      mood:"Inspirant · 120 BPM", dur:"2:10" },
  { id:3, name:"Neon Drive",  mood:"Énergique · 128 BPM", dur:"1:55" },
  { id:4, name:"Paper Trail", mood:"Doux · 84 BPM", dur:"2:30" },
];
function AudioTab() {
  const [sel, setSel] = useStateT(1);
  const [music, setMusic] = useStateT(24);
  const [voice, setVoice] = useStateT(92);
  const [duck, setDuck] = useStateT(12);
  return (
    <div className="panel">
      <div className="panel-head">
        <div><span className="kicker">Onglet 03</span><h2 className="panel-title">Audio</h2>
          <p className="panel-sub">Choisissez une piste musicale et équilibrez les volumes. Le ducking baisse la musique sous la voix.</p></div>
      </div>
      <div className="two-col">
        <div data-wm-id="editor.audio.library">
          <div className="kicker" style={{marginBottom:12}}>Bibliothèque musique</div>
          {TRACKS.map((t) => (
            <div key={t.id} className={"track"+(sel===t.id?" sel":"")} data-wm-id="editor.audio.track" onClick={()=>setSel(t.id)}>
              <span className="track-play"></span>
              <div className="track-info"><div className="tt">{t.name}</div><div className="tm">{t.mood}</div></div>
              <div className="wave-mini">{WAVE(28, t.id).map((h,i)=><i key={i} style={{height:h+"%"}}></i>)}</div>
              <span className="track-dur">{t.dur}</span>
            </div>
          ))}
        </div>
        <aside className="side-card vol-card" data-wm-id="editor.audio.mix">
          <h4>Mixage</h4>
          <div className="vol-row"><div className="vh"><span className="vl">Volume musique</span><span className="vv">{music}%</span></div><input type="range" min="0" max="100" value={music} onChange={(e)=>setMusic(+e.target.value)} /></div>
          <div className="vol-row"><div className="vh"><span className="vl">Volume voix off</span><span className="vv">{voice}%</span></div><input type="range" min="0" max="100" value={voice} onChange={(e)=>setVoice(+e.target.value)} /></div>
          <div className="vol-row"><div className="vh"><span className="vl">Ducking auto</span><span className="vv">−{duck} dB</span></div><input type="range" min="0" max="24" value={duck} onChange={(e)=>setDuck(+e.target.value)} /></div>
        </aside>
      </div>
    </div>
  );
}

/* =================== VOIX OFF =================== */
const VOICES = {
  elevenlabs: [
    { id:"adam", name:"Adam (clone)", meta:"Votre voix · char-level align", tag:"Clone" },
    { id:"rachel", name:"Rachel", meta:"Stock · narratif chaleureux", tag:"Stock" },
    { id:"antoni", name:"Antoni", meta:"Stock · posé", tag:"Stock" },
  ],
  voicebox: [
    { id:"local-fr", name:"Voicebox FR", meta:"Local · aucune connexion", tag:"Local" },
    { id:"local-en", name:"Voicebox EN", meta:"Local · aucune connexion", tag:"Local" },
  ],
};
function VoiceTab() {
  const [backend, setBackend] = useStateT("elevenlabs");
  const [vsel, setVsel] = useStateT("adam");
  const [stab, setStab] = useStateT(45);
  const [sim, setSim] = useStateT(80);
  const [style, setStyle] = useStateT(30);
  const list = VOICES[backend];
  return (
    <div className="panel">
      <div className="panel-head">
        <div><span className="kicker">Onglet 04</span><h2 className="panel-title">Voix off</h2>
          <p className="panel-sub">Mode narratif continu. ElevenLabs clone votre voix, ou Voicebox tourne 100% en local.</p></div>
      </div>
      <div className="seg-lg" data-wm-id="editor.voice.backend" style={{marginBottom:20}}>
        {[["elevenlabs","ElevenLabs"],["voicebox","Voicebox · local"]].map(([k,l])=>(
          <button key={k} className={backend===k?"active":""} onClick={()=>{setBackend(k);setVsel(VOICES[k][0].id);}}><span className="led"></span>{l}</button>
        ))}
      </div>
      <div className="two-col">
        <div className="voice-list" data-wm-id="editor.voice.list">
          {list.map((v)=>(
            <div key={v.id} className={"voice"+(vsel===v.id?" sel":"")} onClick={()=>setVsel(v.id)}>
              <span className="voice-av">{v.name[0]}</span>
              <div className="voice-meta"><div className="vn">{v.name}</div><div className="vd">{v.meta}</div></div>
              <span className="vtag">{v.tag}</span>
            </div>
          ))}
          <div className="audio-player" data-wm-id="editor.voice.preview" style={{marginTop:6}}>
            <button className="ap-play" aria-label="Écouter"></button>
            <div className="ap-wave">{WAVE(48, 3).map((h,i)=><i key={i} className={i<20?"on":""} style={{height:h+"%"}}></i>)}</div>
            <span className="ap-time">0:12 / 0:51</span>
          </div>
        </div>
        <aside className="side-card vol-card" data-wm-id="editor.voice.params">
          <h4>Paramètres</h4>
          <div className="vol-row"><div className="vh"><span className="vl">Stabilité</span><span className="vv">{stab}</span></div><input type="range" min="0" max="100" value={stab} onChange={(e)=>setStab(+e.target.value)} /></div>
          <div className="vol-row"><div className="vh"><span className="vl">Similarité</span><span className="vv">{sim}</span></div><input type="range" min="0" max="100" value={sim} onChange={(e)=>setSim(+e.target.value)} /></div>
          <div className="vol-row"><div className="vh"><span className="vl">Style</span><span className="vv">{style}</span></div><input type="range" min="0" max="100" value={style} onChange={(e)=>setStyle(+e.target.value)} /></div>
          <button className="btn btn-soft btn-block" style={{marginTop:4}}>Régénérer la voix off</button>
        </aside>
      </div>
    </div>
  );
}

/* =================== COMPOSE =================== */
const PRESETS = [
  { id:"sober", name:"Sober", cls:"pp-sober" },
  { id:"energetic", name:"Energetic", cls:"pp-energetic" },
  { id:"cinematic", name:"Cinematic", cls:"pp-cinematic", studio:true },
  { id:"glitch", name:"Glitch", cls:"pp-glitch", studio:true },
];
const DEVICES = [
  { id:"2d", name:"Frame 2D", sub:"Léger", ic:"square" },
  { id:"iphone", name:"iPhone 3D", sub:"Studio", ic:"phone" },
  { id:"macbook", name:"MacBook 3D", sub:"Studio", ic:"laptop" },
];
const READY = [
  { ok:true, l:"Script", s:"7 étapes" },
  { ok:false, l:"Captures", s:"1 à recapturer" },
  { ok:true, l:"Voix off", s:"0:51 générée" },
  { ok:true, l:"Audio", s:"Lo-fi Pulse" },
];
const SCENES = [
  { label:"Section · Hero",     bars:["55%","88%","ac","72%"] },
  { label:"Section · Pipeline", bars:["40%","ac","80%","60%"] },
  { label:"Overlay · Voix off", bars:["70%","52%","88%","ac"] },
  { label:"Section · Pricing",  bars:["ac","64%","48%","80%"] },
];
function FinalPlayer() {
  const DUR = 100;
  const [t, setT] = useStateT(34);
  const [playing, setPlaying] = useStateT(false);
  const trackRef = useRefT(null);
  useEffectT(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT((p) => { if (p >= DUR) { setPlaying(false); return 0; } return Math.min(DUR, p + 1); });
    }, 60);
    return () => clearInterval(id);
  }, [playing]);
  const pct = (t / DUR) * 100;
  const scene = SCENES[Math.min(SCENES.length - 1, Math.floor(t / (DUR / SCENES.length)))];
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(Math.floor(s % 60)).padStart(2,"0")}`;
  const seek = (e) => { const r = trackRef.current.getBoundingClientRect(); setT(Math.max(0, Math.min(DUR, ((e.clientX - r.left) / r.width) * DUR))); };
  return (
    <div className="player" data-wm-id="editor.compose.player">
      <div className="player-stage" style={{cursor:"pointer"}} onClick={() => setPlaying((p) => !p)}>
        <div className="player-frame">
          <div className="pf-bar"><i></i><i></i><i></i></div>
          <div className="pf-body">
            {scene.bars.map((w, i) => w === "ac"
              ? <div key={i} className="b ac"></div>
              : <div key={i} className={"b" + (i === 0 ? " lg" : "")} style={{width:w}}></div>)}
          </div>
        </div>
        {!playing && <div className="player-play"></div>}
        <div className="player-scene">{scene.label}</div>
      </div>
      <div className="player-ctrl">
        <span className={"pp" + (playing ? " on" : "")} onClick={(e) => { e.stopPropagation(); setPlaying((p) => !p); }}></span>
        <div className="player-track" ref={trackRef} onClick={seek}><i style={{width:pct + "%"}}></i></div>
        <span className="player-time">{fmt(t)} / 01:40</span>
      </div>
    </div>
  );
}
function ComposeTab() {
  const [preset, setPreset] = useStateT("sober");
  const [device, setDevice] = useStateT("macbook");
  return (
    <div className="panel">
      <div className="panel-head">
        <div><span className="kicker">Onglet 05</span><h2 className="panel-title">Compose</h2>
          <p className="panel-sub">Remotion assemble le clip final. Choisissez un preset visuel et un device frame, puis exportez le MP4.</p></div>
      </div>
      <div className="two-col">
        <div>
          <div className="kicker" style={{marginBottom:12}}>Preset visuel</div>
          <div className="presets" data-wm-id="editor.compose.presets">
            {PRESETS.map((p)=>(
              <button key={p.id} className={"preset"+(preset===p.id?" sel":"")} onClick={()=>setPreset(p.id)}>
                <div className={"preset-prev "+p.cls}><div className="chip-frame"></div></div>
                <div className="preset-foot"><span className="pn">{p.name}</span>{p.studio && <span className="lock">Studio</span>}</div>
              </button>
            ))}
          </div>

          <div className="kicker" style={{margin:"22px 0 12px"}}>Device frame</div>
          <div className="device-seg" data-wm-id="editor.compose.device">
            {DEVICES.map((d)=>{ const Ic = EI[d.ic]; return (
              <button key={d.id} className={"dev-opt"+(device===d.id?" sel":"")} onClick={()=>setDevice(d.id)}>
                <span className="di"><Ic /></span><span className="dn">{d.name}</span><span className="ds">{d.sub}</span>
              </button> ); })}
          </div>

          <div className="kicker" style={{margin:"22px 0 12px"}}>Rendu final</div>
          <FinalPlayer />
          <div className="export-bar" data-wm-id="editor.compose.export">
            <span className="export-meta"><b>final.mp4</b> · 1080p · 16:9 · H.264 · ~24 MB</span>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-ghost btn-sm">Export multi-format</button>
              <button className="btn btn-primary">Exporter le MP4</button>
            </div>
          </div>
        </div>
        <aside className="side-card" data-wm-id="editor.compose.readiness">
          <h4>Prêt à composer ?</h4>
          <div className="readiness">
            {READY.map((r)=>(
              <div key={r.l} className={"rcheck "+(r.ok?"ok":"warn")}>
                <span className="ri">{r.ok?<EI.check/>:<EI.warn/>}</span>
                <span className="rl">{r.l}</span><span className="rs">{r.s}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-ink btn-block" style={{marginTop:16}}>Composer maintenant</button>
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { ScriptTab, CaptureTab, AudioTab, VoiceTab, ComposeTab });
