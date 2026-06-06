/* GEN MOTION — landing interactions (vanilla, robust) */
(function () {
  const root = document.documentElement;

  /* ---- theme: persist + system default ---- */
  const THEME_KEY = "gm-theme";
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    localStorage.setItem(THEME_KEY, t);
    document.querySelectorAll("[data-theme-state]").forEach((el) => (el.dataset.themeState = t));
  }
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved || "light");
  window.gmToggleTheme = function () {
    applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  };

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* enable hidden-base only when JS is present (keeps no-JS visible) */
  root.classList.add("reveal-ready");

  ready(function () {
    const nav = document.querySelector(".nav");
    const sections = Array.from(document.querySelectorAll(".section"));
    const dots = Array.from(document.querySelectorAll(".progress button"));

    /* nav border on scroll */
    function onScroll() {
      if (!nav) return;
      nav.classList.toggle("scrolled", window.scrollY > 12);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* scroll reveal — root:null (viewport) is far more reliable than a
       scroll-container root across engines. Plus a failsafe so content
       can never stay hidden. */
    const reveals = Array.from(document.querySelectorAll(".reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { root: null, threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
    // reveal anything already on screen at first paint
    requestAnimationFrame(() => {
      const vh = window.innerHeight;
      reveals.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) el.classList.add("in");
      });
    });
    // failsafe: never leave content invisible
    setTimeout(() => reveals.forEach((el) => el.classList.add("in")), 1600);

    /* progress dots — active section + click to jump */
    const secIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = sections.indexOf(e.target);
            dots.forEach((d, di) => d.classList.toggle("active", di === i));
          }
        });
      },
      { root: null, threshold: 0.5 }
    );
    sections.forEach((s) => secIO.observe(s));
    dots.forEach((d, i) => {
      d.addEventListener("click", () => {
        const s = sections[i];
        if (s) window.scrollTo({ top: s.offsetTop, behavior: "smooth" });
      });
    });

    /* nav anchor links → smooth scroll */
    document.querySelectorAll('[data-jump]').forEach((a) => {
      a.addEventListener("click", (ev) => {
        const sel = a.getAttribute("data-jump");
        const target = document.querySelector(sel);
        if (target) {
          ev.preventDefault();
          window.scrollTo({ top: target.offsetTop, behavior: "smooth" });
        }
      });
    });

    /* live REC % ticker on hero scan (purely cosmetic) */
    const scans = document.querySelectorAll(".scan");
    if (scans.length) {
      let pct = 0;
      setInterval(() => {
        pct = (pct + 7) % 100;
        scans.forEach((s) => s.setAttribute("data-pct", String(pct).padStart(2, "0") + "%"));
      }, 420);
    }
  });
})();
