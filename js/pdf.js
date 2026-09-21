/* PDF out, and back in again.
 *
 * The export carries the timeline's own JSON in the PDF metadata, so a file
 * saved here can be reopened here and keep editing.
 */
(function (TT) {
  "use strict";

  const pdf = TT.pdf = {};
  const PDF_MARK = "TRIPTIMELINE";
  const store = TT.store;

  // ---------- JSON <-> text that survives inside a PDF ----------
  function encodeData(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function decodeData(b64) {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, function (c) { return c.charCodeAt(0); });
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  // ---------- the printable document ----------
  function buildExportNode() {
    const doc = TT.el("div", "export-doc");
    doc.appendChild(TT.el("h1", null, store.trip().name || TT.t("export.title")));
    doc.appendChild(TT.el("p", "export-sub", TT.t("export.on", {
      date: new Date().toLocaleDateString(TT.locale(), { year: "numeric", month: "long", day: "numeric" })
    })));

    const days = store.sortedDays();
    const anyFlagged = days.some(function (d) {
      return d.plans.some(function (p) { return p.priority !== "normal"; });
    });
    if (anyFlagged) {
      doc.appendChild(TT.el("p", "export-legend", TT.t("export.legend")));
    }
    if (!days.length) doc.appendChild(TT.el("p", "export-none", TT.t("export.noDays")));

    days.forEach(function (day) {
      const block = TT.el("div", "export-day");
      const h2 = TT.el("h2", null, TT.longDate(day.date));
      const plans = day.plans.filter(function (p) { return (p.text || "").trim() || p.time; });
      if (plans.length) {
        h2.appendChild(TT.el("span", null,
          plans.filter(function (p) { return p.done; }).length + "/" + plans.length + " done"));
      }
      block.appendChild(h2);
      if (!plans.length) block.appendChild(TT.el("div", "export-none", TT.t("export.noPlans")));

      plans.forEach(function (p) {
        const r = TT.el("div", "export-plan" + (p.done ? " on" : "") +
          (p.priority === "optional" ? " optional" : ""));
        r.append(
          TT.el("span", "export-box" + (p.done ? " on" : "")),
          TT.el("span", "export-time", TT.formatTime(p.time) || "—"),
          TT.el("span", "export-text", p.text || "")   // CSS keeps newlines via pre-wrap
        );
        if (p.priority === "must") r.appendChild(TT.el("span", "export-tag must", TT.t("export.tag.must")));
        else if (p.priority === "optional") r.appendChild(TT.el("span", "export-tag optional", TT.t("export.tag.optional")));
        block.appendChild(r);
      });
      doc.appendChild(block);
    });
    return doc;
  }

  pdf.buildExportNode = buildExportNode;

  function printFallback() {
    const printView = document.getElementById("printView");
    printView.innerHTML = "";
    printView.appendChild(buildExportNode());
    window.print();
  }

  pdf.exportPdf = function (btn) {
    if (typeof window.html2pdf !== "function") { printFallback(); return Promise.resolve(); }
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = TT.t("btn.exporting");
    return window.html2pdf().set({
      margin: [12, 12, 12, 12],
      filename: "trip-timeline-" + new Date().toISOString().slice(0, 10) + ".pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], avoid: ".export-day" }
    }).from(buildExportNode()).toPdf().get("pdf").then(function (doc) {
      doc.setProperties({
        title: "Trip Timeline",
        subject: PDF_MARK + ":" + encodeData({
          v: 3, updatedAt: store.state.updatedAt, settings: store.state.settings,
          name: store.trip().name, days: store.trip().days
        }) + ":END",
        creator: "Trip Timeline"
      });
    }).save().catch(function (e) {
      console.error(e);
      printFallback();
    }).then(function () {
      btn.disabled = false;
      btn.textContent = label;
    });
  };

  // ---------- reading one back ----------
  pdf.importPdf = function (file) {
    return file.arrayBuffer().then(function (ab) {
      const buf = new Uint8Array(ab);
      let text = "";
      const CH = 0x8000;
      for (let i = 0; i < buf.length; i += CH) {
        text += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
      }
      const m = text.match(new RegExp(PDF_MARK + ":([A-Za-z0-9+/=]+):END"));
      if (!m) {
        TT.toast(TT.t("pdf.none"), true);
        return;
      }
      const raw = decodeData(m[1]);
      const days = store.normalizeDays(raw.days || (raw.trips && raw.trips[0] && raw.trips[0].days));
      if (!days || !days.length) throw new Error("bad data");

      // imports land as a new trip rather than overwriting whatever is open
      const name = raw.name || file.name.replace(/\.pdf$/i, "");
      store.addTripWithDays(name, days);
      TT.app.refresh();
      const n = days.reduce(function (a, d) { return a + d.plans.length; }, 0);
      TT.toast(TT.t("pdf.opened", { days: days.length, plans: n }));
    }).catch(function (e) {
      console.error(e);
      TT.toast(TT.t("pdf.bad"), true);
    });
  };
})(window.TT);
