/* GEN MOTION — shared theme toggle (Download / Setup / About / Legal) */
(function () {
  var root = document.documentElement, K = "gm-theme";
  function set(t) { root.setAttribute("data-theme", t); try { localStorage.setItem(K, t); } catch (e) {} }
  set(localStorage.getItem(K) || "light");
  window.gmToggleTheme = function () { set(root.getAttribute("data-theme") === "dark" ? "light" : "dark"); };
})();
