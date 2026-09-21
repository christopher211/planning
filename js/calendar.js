/* Month-grid view of the active trip, editable in place.
 *
 * Every cell is a real editor: tick a plan off, retype its time or text,
 * cycle its flag, delete it, add another. An empty cell offers to start a day
 * on that date, so the grid creates days as well as showing them.
 *
 * Edits are written straight into the store and only the touched cell is
 * repainted, so typing never loses focus to a full re-render.
 */
(function (TT) {
  "use strict";

  const cal = TT.calendar = {};
  const store = TT.store;
  let onPick = function () {};

  /** Every month between the trip's first and last dated day. */
  function monthsSpanned(days) {
    const dated = days.filter(function (d) { return d.date; });
    if (!dated.length) {
      const now = new Date();
      return [new Date(now.getFullYear(), now.getMonth(), 1)];
    }
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

  function save() { store.save(); }

  /** Repaint one cell in place; used after any edit that changes its shape. */
  function repaint(cell) {
    const iso = cell.dataset.iso;
    const fresh = buildCell(iso);
    cell.replaceWith(fresh);
    return fresh;
  }

  function dayFor(iso) {
    return store.days().filter(function (d) { return d.date === iso; })[0] || null;
  }

  function planRow(plan, day, cell) {
    const li = TT.el("li", "cal-plan pri-" + plan.priority + (plan.done ? " done" : ""));

    const check = TT.el("input", "check cal-check");
    check.type = "checkbox";
    check.checked = plan.done;
    check.disabled = TT.view.readOnly;
    check.setAttribute("aria-label", TT.t("plan.markDone"));
    check.addEventListener("change", function () {
      plan.done = check.checked;
      save();
      repaint(cell);
    });

    const time = TT.el("input", "cal-time");
    time.type = "time";
    time.value = plan.time || "";
    time.disabled = TT.view.readOnly;
    time.setAttribute("aria-label", TT.t("plan.time"));
    time.addEventListener("change", function () { plan.time = time.value; save(); });

    const flag = TT.el("button", "cal-flag");
    flag.type = "button";
    flag.disabled = TT.view.readOnly;
    flag.innerHTML = TT.PRI_ICON[plan.priority];
    flag.title = TT.priMeta(plan.priority).hint;
    flag.setAttribute("aria-label", TT.priMeta(plan.priority).aria);
    flag.addEventListener("click", function () {
      const next = (TT.PRIORITIES.indexOf(plan.priority) + 1) % TT.PRIORITIES.length;
      plan.priority = TT.PRIORITIES[next];
      save();
      repaint(cell);
    });

    const text = TT.el("textarea", "cal-text");
    text.rows = 1;
    text.value = plan.text || "";
    text.readOnly = TT.view.readOnly;
    text.placeholder = TT.view.readOnly ? "" : TT.t("plan.placeholder");
    text.addEventListener("input", function () {
      plan.text = text.value;
      TT.fit(text);
      save();
    });
    text.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); text.blur(); }
    });

    const del = TT.el("button", "cal-del", "×");
    del.type = "button";
    del.title = TT.t("plan.remove");
    del.setAttribute("aria-label", TT.t("plan.remove"));
    del.addEventListener("click", function () {
      day.plans = day.plans.filter(function (p) { return p.id !== plan.id; });
      save();
      repaint(cell);
    });

    li.append(check, time, flag, text);
    if (!TT.view.readOnly) li.appendChild(del);
    return li;
  }

  function buildCell(iso) {
    const day = dayFor(iso);
    const dayNum = Number(iso.slice(8, 10));
    const cell = TT.el("div", "cal-cell" + (day ? " on" : " empty"));
    cell.dataset.iso = iso;
    if (iso === TT.toISO(new Date())) cell.classList.add("today");

    const head = TT.el("div", "cal-head");
    head.appendChild(TT.el("span", "cal-num", String(dayNum)));

    if (day && !TT.view.readOnly) {
      const tools = TT.el("span", "cal-tools");

      const openBtn = TT.el("button", "cal-mini", "↗");
      openBtn.type = "button";
      openBtn.title = TT.t("cal.openInTimeline");
      openBtn.setAttribute("aria-label", openBtn.title);
      openBtn.addEventListener("click", function () { onPick(day.id); });

      const delDay = TT.el("button", "cal-mini danger", "×");
      delDay.type = "button";
      delDay.title = TT.t("day.remove");
      delDay.setAttribute("aria-label", delDay.title);
      delDay.addEventListener("click", function () {
        if (day.plans.some(function (p) { return p.text; }) && !confirm(TT.t("confirm.removeDay"))) return;
        store.trip().days = store.days().filter(function (x) { return x.id !== day.id; });
        save();
        repaint(cell);
      });

      tools.append(openBtn, delDay);
      head.appendChild(tools);
    }
    cell.appendChild(head);

    if (day) {
      const real = day.plans;
      const done = real.filter(function (p) { return p.done; }).length;
      if (real.length && done === real.length) cell.classList.add("all-done");

      const list = TT.el("ul", "cal-plans");
      real.forEach(function (p) { list.appendChild(planRow(p, day, cell)); });
      cell.appendChild(list);
    }

    if (!TT.view.readOnly) {
      const add = TT.el("button", "cal-add", day ? TT.t("btn.addPlan") : TT.t("cal.startDay"));
      add.type = "button";
      add.addEventListener("click", function () {
        let target = dayFor(iso);
        if (!target) {
          target = store.newDay(iso, 1);
          store.days().push(target);
        } else {
          target.plans.push(store.newPlan());
        }
        save();
        store.reindex();
        const fresh = repaint(cell);
        const areas = fresh.querySelectorAll(".cal-text");
        if (areas.length) areas[areas.length - 1].focus();
      });
      cell.appendChild(add);
    }
    return cell;
  }

  cal.render = function (root, onPickDay) {
    onPick = onPickDay;
    root.innerHTML = "";
    const days = store.sortedDays();
    const months = monthsSpanned(days);
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

      for (let i = 0; i < lead; i++) {
        const pad = TT.el("div", "cal-cell");
        pad.style.visibility = "hidden";
        grid.appendChild(pad);
      }
      for (let dayNum = 1; dayNum <= total; dayNum++) {
        grid.appendChild(buildCell(TT.toISO(new Date(m.getFullYear(), m.getMonth(), dayNum))));
      }

      block.appendChild(grid);
      root.appendChild(block);
    });

    requestAnimationFrame(function () {
      root.querySelectorAll(".cal-text").forEach(TT.fit);
    });
  };
})(window.TT);
