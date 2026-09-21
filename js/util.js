/* Shared helpers, icons and the toast. Everything hangs off one global so the
   page can be opened straight from disk (file://) without a module server. */
window.TT = window.TT || {};

(function (TT) {
  "use strict";

  TT.uid = function () {
    return crypto.randomUUID ? crypto.randomUUID()
      : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  };

  TT.el = function (tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  // ---------- icons ----------
  TT.ICON = {
    grip: '<svg viewBox="0 0 10 16"><circle cx="2" cy="2" r="1.6"/><circle cx="8" cy="2" r="1.6"/><circle cx="2" cy="8" r="1.6"/><circle cx="8" cy="8" r="1.6"/><circle cx="2" cy="14" r="1.6"/><circle cx="8" cy="14" r="1.6"/></svg>',
    clock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 4.6V8l2.3 1.6"/></svg>',
    check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.4l3.4 3.3L13 4.8"/></svg>',
    calendar: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3.2" width="12" height="11" rx="2"/><path d="M2 6.6h12M5.4 1.8v2.6M10.6 1.8v2.6"/></svg>'
  };

  // priority flags, in the order the flag button cycles through them
  TT.PRIORITIES = ["normal", "must", "optional"];
  TT.priMeta = function (key) {
    return {
      blurb: TT.t("pri." + key + ".blurb"),
      hint: TT.t("pri." + key + ".hint"),
      aria: TT.t("pri." + key + ".aria")
    };
  };

  TT.PRI_ICON = {
    normal:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M8 1.9l1.85 3.75 4.15.6-3 2.93.71 4.13L8 11.35l-3.71 1.96.71-4.13-3-2.93 4.15-.6z"/></svg>',
    must:     '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.9l1.85 3.75 4.15.6-3 2.93.71 4.13L8 11.35l-3.71 1.96.71-4.13-3-2.93 4.15-.6z"/></svg>',
    optional: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="8" r="6" stroke-dasharray="2.6 2.6"/><path d="M5.4 8h5.2"/></svg>'
  };

  // ---------- dates ----------
  TT.parseLocalDate = function (iso) {
    const parts = iso.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };
  TT.toISO = function (d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  };
  TT.daysInMonth = function (year, month /* 1-12 */) {
    return new Date(year, month, 0).getDate();
  };
  TT.shortDate = function (iso) {
    if (!iso) return TT.t("export.noDate");
    return TT.parseLocalDate(iso).toLocaleDateString(TT.locale(), { month: "short", day: "numeric" });
  };
  TT.longDate = function (iso) {
    if (!iso) return TT.t("export.noDate");
    return TT.parseLocalDate(iso).toLocaleDateString(TT.locale(), { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };
  TT.headingDate = function (iso) {
    return TT.parseLocalDate(iso).toLocaleDateString(TT.locale(), { weekday: "short", month: "short", day: "numeric" });
  };
  TT.formatTime = function (t) {
    if (!t) return "";
    const parts = t.split(":").map(Number);
    // Vietnamese reads 24h; en-US keeps am/pm
    return new Date(2000, 0, 1, parts[0], parts[1])
      .toLocaleTimeString(TT.locale(), { hour: "2-digit", minute: "2-digit", hour12: TT.lang() === "en" });
  };

  // ---------- auto-growing textareas ----------
  TT.fit = function (ta) { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; };
  TT.fitAll = function () { document.querySelectorAll(".plan-text").forEach(TT.fit); };

  // ---------- toast ----------
  let toastTimer;
  TT.toast = function (msg, isError) {
    document.querySelectorAll(".toast").forEach(function (t) { t.remove(); });
    const t = TT.el("div", "toast" + (isError ? " error" : ""), msg);
    t.setAttribute("role", "status");
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, isError ? 6000 : 3500);
  };
})(window.TT);
