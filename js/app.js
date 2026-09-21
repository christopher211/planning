/* Boot and header wiring. */
(function (TT) {
  "use strict";

  const app = TT.app = {};
  const store = TT.store;

  const fmtToggle = document.getElementById("fmtToggle");

  app.syncFormatToggle = function () {
    const current = store.dateFormat();
    fmtToggle.querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.fmt === current));
    });
  };

  function init() {
    store.init();
    TT.view.mount();
    app.syncFormatToggle();
    TT.view.render();
  }

  // ---------- date entry format ----------
  fmtToggle.addEventListener("click", function (e) {
    const btn = e.target.closest("button[data-fmt]");
    if (!btn || btn.dataset.fmt === store.dateFormat()) return;
    store.setDateFormat(btn.dataset.fmt);
    app.syncFormatToggle();
    TT.view.render();   // any open date field picks up the new mask
    TT.toast("Dates are now typed as " + (btn.dataset.fmt === "mdy" ? "MM/DD/YYYY" : "DD/MM/YYYY") + ".");
  });

  // ---------- sort the whole timeline ----------
  document.getElementById("sortDateBtn").addEventListener("click", function () {
    const changed = store.sortWholeTimeline();
    store.save();
    TT.view.render();
    TT.toast(changed
      ? "Days back in date order, each day's plans back in time order."
      : "Already in date and time order.");
  });

  // ---------- clear ----------
  document.getElementById("resetBtn").addEventListener("click", function () {
    if (!confirm("Clear the whole timeline? This can't be undone.")) return;
    store.state.days = [];
    store.save();
    TT.view.render();
  });

  // ---------- PDF in / out ----------
  const fileInput = document.getElementById("fileInput");
  document.getElementById("openBtn").addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () {
    if (fileInput.files[0]) TT.pdf.importPdf(fileInput.files[0]);
    fileInput.value = "";
  });

  const exportBtn = document.getElementById("exportBtn");
  exportBtn.addEventListener("click", function () { TT.pdf.exportPdf(exportBtn); });

  // drop a PDF anywhere on the page
  let dragDepth = 0;
  function hasFiles(e) {
    return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, "Files") >= 0;
  }
  window.addEventListener("dragenter", function (e) {
    if (!hasFiles(e)) return;
    e.preventDefault(); dragDepth++;
    document.body.classList.add("file-over");
  });
  window.addEventListener("dragover", function (e) { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener("dragleave", function (e) {
    if (!hasFiles(e)) return;
    if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove("file-over"); }
  });
  window.addEventListener("drop", function (e) {
    if (!hasFiles(e)) return;
    e.preventDefault(); dragDepth = 0;
    document.body.classList.remove("file-over");
    const f = e.dataTransfer.files[0];
    if (f) TT.pdf.importPdf(f);
  });

  // ---------- misc ----------
  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(TT.fitAll, 120);
  });

  init();
})(window.TT);
