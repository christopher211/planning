/* Month-grid view of the active trip.
 *
 * A second way to read the same data — nothing here owns state. Cells that
 * belong to the trip list their plans; clicking one drops back into the
 * timeline at that day.
 */
(function (TT) {
  "use strict";

  const cal = TT.calendar = {};

  function monthKey(d) { return d.getFullYear() + "-" + d.getMonth(); }

  /** Every month between the trip's first and last dated day. */
  function monthsSpanned(days) {
    const dated = days.filter(function (d) { return d.date; });
    if (!dated.length) return [];
    const first = TT.parseLocalDate(dated[0].date);
    const last = TT.parseLocalDate(dated[dated.length - 1].date);
    const out = [];
    const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    const end = new Date(last.getFullYear(), last.getMonth(), 1);
    while (cursor <= end && out.length < 36) {
      out.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }

  function weekdayNames() {
    // Monday-first, which matches both en-GB habit and Vietnamese calendars
    const out = [];
    const base = new Date(2024, 0, 1);   // a Monday
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push(d.toLocaleDateString(TT.locale(), { weekday: "short" }));
    }
    return out;
  }

  cal.render = function (root, onPickDay) {
    root.innerHTML = "";
    const days = TT.store.sortedDays();
    const byDate = {};
    days.forEach(function (d) { if (d.date) byDate[d.date] = d; });

    const months = monthsSpanned(days);
    if (!months.length) {
      const empty = TT.el("div", "timeline-empty");
      empty.appendChild(TT.el("strong", null, TT.t("empty.title")));
      empty.appendChild(document.createTextNode(TT.t("empty.body")));
      root.appendChild(empty);
      return;
    }

    const todayIso = TT.toISO(new Date());
    const names = weekdayNames();

    months.forEach(function (m) {
      const block = TT.el("section", "cal-month");
      block.appendChild(TT.el("h2", "cal-title",
        m.toLocaleDateString(TT.locale(), { month: "long", year: "numeric" })));

      const grid = TT.el("div", "cal-grid");
      names.forEach(function (n) { grid.appendChild(TT.el("div", "cal-dow", n)); });

      const first = new Date(m.getFullYear(), m.getMonth(), 1);
      const lead = (first.getDay() + 6) % 7;            // shift Sunday=0 to Monday-first
      const total = TT.daysInMonth(m.getFullYear(), m.getMonth() + 1);

      for (let i = 0; i < lead; i++) grid.appendChild(TT.el("div", "cal-cell empty"));

      for (let dayNum = 1; dayNum <= total; dayNum++) {
        const iso = TT.toISO(new Date(m.getFullYear(), m.getMonth(), dayNum));
        const day = byDate[iso];
        const cell = TT.el(day ? "button" : "div", "cal-cell" + (day ? " on" : ""));
        if (day) cell.type = "button";
        if (iso === todayIso) cell.classList.add("today");

        const head = TT.el("div", "cal-num", String(dayNum));
        cell.appendChild(head);

        if (day) {
          const real = day.plans.filter(function (p) { return (p.text || "").trim() || p.time; });
          const doneCount = real.filter(function (p) { return p.done; }).length;
          if (real.length && doneCount === real.length) cell.classList.add("all-done");

          const list = TT.el("ul", "cal-plans");
          real.slice(0, 3).forEach(function (p) {
            const li = TT.el("li", "cal-plan pri-" + p.priority + (p.done ? " done" : ""));
            if (p.time) li.appendChild(TT.el("span", "cal-time", p.time));
            const label = (p.text || "").split("\n")[0] || TT.t("plan.placeholder");
            li.appendChild(TT.el("span", "cal-text", label));
            list.appendChild(li);
          });
          cell.appendChild(list);
          if (real.length > 3) {
            cell.appendChild(TT.el("div", "cal-more", TT.t("cal.more", { n: real.length - 3 })));
          }
          if (!real.length) cell.appendChild(TT.el("div", "cal-more", TT.t("plans.empty")));

          cell.title = TT.longDate(iso);
          cell.addEventListener("click", function () { onPickDay(day.id); });
        }
        grid.appendChild(cell);
      }

      block.appendChild(grid);
      root.appendChild(block);
    });
  };
})(window.TT);
