/* Boot, header wiring, language, and shared-link mode. */
(function (TT) {
  "use strict";

  const app = TT.app = {};
  const store = TT.store;

  const fmtToggle = document.getElementById("fmtToggle");
  const langToggle = document.getElementById("langToggle");
  const banner = document.getElementById("banner");

  // ---------- static labels ----------
  function paintChrome() {
    document.documentElement.lang = TT.lang();
    document.getElementById("title1").textContent = TT.t("title.1");
    document.getElementById("title2").textContent = TT.t("title.2");
    document.getElementById("tagline").textContent = TT.t("tagline");
    document.getElementById("shareBtn").textContent = TT.t("btn.share");
    document.getElementById("openBtn").textContent = TT.t("btn.openPdf");
    document.getElementById("resetBtn").textContent = TT.t("btn.clearAll");
    document.getElementById("exportBtn").textContent = TT.t("btn.exportPdf");

    const sortBtn = document.getElementById("sortDateBtn");
    sortBtn.textContent = TT.t("btn.sortByDate");
    sortBtn.title = TT.t("btn.sortByDate.title");

    fmtToggle.setAttribute("aria-label", TT.t("fmt.label"));
    langToggle.setAttribute("aria-label", TT.t("lang.label"));

    document.getElementById("shareTitle").textContent = TT.t("share.title");
    document.getElementById("shareBody").textContent = TT.t("share.body");
    document.getElementById("shareModeView").textContent = TT.t("share.mode.view");
    document.getElementById("shareModeEdit").textContent = TT.t("share.mode.edit");
    document.getElementById("shareNote").textContent = TT.t("share.note");
    document.getElementById("shareCopy").textContent = TT.t("share.copy");
    document.getElementById("shareClose").textContent = TT.t("btn.close");

    document.getElementById("bannerSave").textContent = TT.t("banner.save");
    document.getElementById("bannerLeave").textContent = TT.t("banner.leave");

    app.syncToggles();
  }
  app.paintChrome = paintChrome;

  app.syncToggles = function () {
    const fmt = store.dateFormat();
    fmtToggle.querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.fmt === fmt));
    });
    const lang = store.lang();
    langToggle.querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    });
  };
  // kept for pdf.js, which re-syncs after an import
  app.syncFormatToggle = app.syncToggles;

  function redraw() { paintChrome(); TT.view.render(); }

  // ---------- shared links ----------
  let sharedMode = null;

  function enterShared(data) {
    sharedMode = data.mode;
    store.ephemeral = true;
    delete data.mode;
    store.state = data;

    TT.view.readOnly = sharedMode === "view";
    document.body.classList.toggle("read-only", TT.view.readOnly);
    banner.classList.remove("hidden");
    document.getElementById("bannerText").textContent =
      TT.t(sharedMode === "view" ? "banner.view" : "banner.edit");
    redraw();
  }

  function leaveShared(keep) {
    if (keep) {
      store.ephemeral = false;
      store.save();
      TT.toast(TT.t("banner.saved"));
    } else {
      store.ephemeral = false;
      store.state = store.load() || store.defaultState();
    }
    sharedMode = null;
    TT.view.readOnly = false;
    document.body.classList.remove("read-only");
    banner.classList.add("hidden");
    TT.share.clearFragment();
    redraw();
  }

  document.getElementById("bannerSave").addEventListener("click", function () { leaveShared(true); });
  document.getElementById("bannerLeave").addEventListener("click", function () { leaveShared(false); });

  // ---------- share sheet ----------
  const shareModal = document.getElementById("shareModal");
  const shareLink = document.getElementById("shareLink");

  function refreshShareLink() {
    const mode = shareModal.querySelector('input[name="shareMode"]:checked').value;
    shareLink.value = "…";
    TT.share.buildLink(mode).then(function (url) {
      shareLink.value = url;
      if (url.length > 16000) TT.toast(TT.t("share.tooLong", { n: url.length }), true);
    });
  }

  document.getElementById("shareBtn").addEventListener("click", function () {
    shareModal.classList.remove("hidden");
    refreshShareLink();
  });
  shareModal.querySelectorAll('input[name="shareMode"]').forEach(function (r) {
    r.addEventListener("change", refreshShareLink);
  });
  document.getElementById("shareCopy").addEventListener("click", function () {
    TT.share.copy(shareLink.value)
      .then(function () { TT.toast(TT.t("share.copied")); })
      .catch(function () { shareLink.select(); TT.toast(TT.t("share.copyFailed"), true); });
  });
  function closeShare() { shareModal.classList.add("hidden"); }
  document.getElementById("shareClose").addEventListener("click", closeShare);
  shareModal.addEventListener("click", function (e) { if (e.target === shareModal) closeShare(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !shareModal.classList.contains("hidden")) closeShare();
  });

  // ---------- toggles ----------
  fmtToggle.addEventListener("click", function (e) {
    const btn = e.target.closest("button[data-fmt]");
    if (!btn || btn.dataset.fmt === store.dateFormat()) return;
    store.setDateFormat(btn.dataset.fmt);
    app.syncToggles();
    TT.view.render();
    TT.toast(TT.t("date.fmtChanged", { fmt: btn.dataset.fmt === "mdy" ? "MM/DD/YYYY" : "DD/MM/YYYY" }));
  });

  langToggle.addEventListener("click", function (e) {
    const btn = e.target.closest("button[data-lang]");
    if (!btn || btn.dataset.lang === store.lang()) return;
    store.setLang(btn.dataset.lang);
    redraw();
  });

  // ---------- timeline-wide sort ----------
  document.getElementById("sortDateBtn").addEventListener("click", function () {
    const changed = store.sortWholeTimeline();
    store.save();
    TT.view.render();
    TT.toast(TT.t(changed ? "toast.sorted" : "toast.alreadySorted"));
  });

  // ---------- clear ----------
  document.getElementById("resetBtn").addEventListener("click", function () {
    if (!confirm(TT.t("confirm.clearAll"))) return;
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

  // ---------- go ----------
  store.init();
  TT.view.mount();
  redraw();

  TT.share.readFragment().then(function (data) {
    if (data) enterShared(data);
    else if (location.hash) TT.toast(TT.t("share.badLink"), true);
  });
})(window.TT);
