/* Rendering: the legend, the timeline, each day node and each plan row.
 *
 * The timeline is a single horizontal line running left to right. Each day is
 * a node on it: the date sits above the line, a dot marks the day, and the
 * plans hang below. The dot is also the day's drag handle.
 */
(function (TT) {
  "use strict";

  const view = TT.view = {};
  const store = TT.store;

  view.timelineEl = null;
  view.readOnly = false;
  let fabWrap = null;
  let fabPanel = null;
  let fabBtn = null;
  let legendEl = null;

  view.mount = function () {
    view.timelineEl = document.getElementById("timeline");
    fabWrap = document.getElementById("fabWrap");
    fabPanel = document.getElementById("fabPanel");
    fabBtn = document.getElementById("addDayFab");
    legendEl = document.getElementById("legend");

    fabBtn.addEventListener("click", function () {
      if (fabPanel.classList.contains("hidden")) openAddDay(); else closeAddDay();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !fabPanel.classList.contains("hidden")) closeAddDay();
    });
  };

  // ---------- legend ----------
  function renderLegend() {
    legendEl.innerHTML = "";
    ["must", "optional", "normal"].forEach(function (key) {
      const li = TT.el("li");
      const ic = TT.el("span", "lg-" + key);
      ic.innerHTML = TT.PRI_ICON[key];
      const blurb = TT.priMeta(key).blurb;
      li.append(ic, document.createTextNode(blurb));
      li.title = blurb;
      legendEl.appendChild(li);
    });
  }

  // ---------- timeline ----------
  view.render = function () {
    store.reindex();
    renderLegend();
    view.timelineEl.innerHTML = "";

    if (store.view() === "calendar") {
      view.timelineEl.classList.add("as-calendar");
      document.getElementById("boardHint").textContent = "";
      TT.calendar.render(view.timelineEl, function (dayId) {
        store.setView("timeline");
        store.save();
        TT.app.refresh();
        const el = document.querySelector('[data-day-id="' + dayId + '"]');
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      });
      fabWrap.classList.toggle("hidden", view.readOnly);
      fabBtn.querySelector(".fab-label").textContent = TT.t("btn.addDay");
      return;
    }

    view.timelineEl.classList.remove("as-calendar");
    document.getElementById("boardHint").textContent =
      store.days().length > 1 && !view.readOnly ? TT.t("board.hint") : "";

    if (store.days().length === 0) {
      const empty = TT.el("div", "timeline-empty");
      empty.appendChild(TT.el("strong", null, TT.t("empty.title")));
      empty.appendChild(document.createTextNode(TT.t("empty.body")));
      view.timelineEl.appendChild(empty);
    } else {
      store.days().forEach(function (day) { view.timelineEl.appendChild(renderDay(day)); });
      // a flexible tail so the axis runs to the edge of the viewport when the
      // trip is too short to fill it; it collapses to nothing once days overflow
      const tail = TT.el("div", "day-tail");
      tail.appendChild(TT.el("div", "node-head"));
      tail.appendChild(TT.el("div", "node-axis"));
      view.timelineEl.appendChild(tail);
    }

    fabWrap.classList.toggle("hidden", view.readOnly);
    fabBtn.querySelector(".fab-label").textContent = TT.t("btn.addDay");
    requestAnimationFrame(TT.fitAll);
  };

  function dayChips(day) {
    const out = [];
    const doneCount = day.plans.filter(function (p) { return p.done; }).length;
    if (day.plans.length) {
      const allDone = doneCount === day.plans.length;
      const progress = TT.el("span", "chip" + (allDone ? " on" : ""));
      if (allDone) progress.innerHTML = TT.ICON.check;
      progress.appendChild(document.createTextNode(
        TT.t("day.doneCount", { done: doneCount, total: day.plans.length })));
      out.push(progress);
    }
    const mustLeft = day.plans.filter(function (p) { return p.priority === "must" && !p.done; }).length;
    if (mustLeft) {
      const must = TT.el("span", "chip must");
      must.innerHTML = TT.PRI_ICON.must;
      must.appendChild(document.createTextNode(TT.t("day.mustCount", { n: mustLeft })));
      must.title = TT.t("day.mustCount.title", { n: mustLeft });
      out.push(must);
    }
    return out;
  }

  /** Repaint just one day's chips, so a flag click doesn't blow away focus. */
  function refreshDayChips(fromEl) {
    const dayEl = fromEl.closest(".day");
    if (!dayEl) return;
    const day = store.dayOf(dayEl.dataset.dayId);
    if (!day) return;
    const chips = dayEl.querySelector(".day-chips");
    chips.innerHTML = "";
    dayChips(day).forEach(function (c) { chips.appendChild(c); });
  }

  function renderDay(day) {
    const row = TT.el("div", "day");
    row.dataset.dayId = day.id;
    const doneCount = day.plans.filter(function (p) { return p.done; }).length;
    if (day.plans.length && doneCount === day.plans.length) row.classList.add("all-done");

    // ----- above the line: the date, then its chips -----
    const head = TT.el("div", "node-head");
    const dateBtn = TT.el("button", "date-btn");
    dateBtn.type = "button";
    dateBtn.title = TT.t("day.changeDate");
    dateBtn.disabled = view.readOnly;
    dateBtn.textContent = day.date ? TT.lineDate(day.date) : TT.t("day.setDate");
    head.appendChild(dateBtn);

    if (!view.readOnly) {
      dateBtn.addEventListener("click", function () {
        const field = TT.DateField({
          value: day.date,
          onCommit: function (iso) {
            if (iso !== day.date) {
              const clash = store.days().some(function (x) { return x.id !== day.id && x.date === iso; });
              if (clash) { TT.toast(TT.t("date.taken", { date: TT.shortDate(iso) }), true); view.render(); return; }
              day.date = iso;
              store.save();
            }
            view.render();
          },
          onCancel: view.render
        });
        dateBtn.replaceWith(field.root);
        field.focus();
      });
    }

    const chips = TT.el("div", "day-chips");
    dayChips(day).forEach(function (c) { chips.appendChild(c); });
    head.appendChild(chips);
    row.appendChild(head);

    // ----- the line itself, with the day's dot on it -----
    const axis = TT.el("div", "node-axis");
    if (view.readOnly) {
      axis.appendChild(TT.el("span", "dot"));
    } else {
      const dot = TT.el("button", "dot-handle");
      dot.type = "button";
      dot.title = TT.t("day.dragDot");
      dot.setAttribute("aria-label", TT.t("day.move"));
      dot.appendChild(TT.el("span", "dot"));
      dot.addEventListener("pointerdown", function (e) { TT.dnd.start(e, row, "day"); });
      dot.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          TT.dnd.moveDayByKey(day.id, e.key === "ArrowLeft" ? -1 : 1);
        }
      });
      axis.appendChild(dot);
    }
    row.appendChild(axis);

    // ----- below the line: tools, plans, add -----
    const content = TT.el("div", "day-content");

    const tools = TT.el("div", "day-tools");
    if (!view.readOnly) {
      if (day.plans.length > 1) {
        const sortBtn = TT.el("button", "text-btn", TT.t("btn.sortByTime"));
        sortBtn.type = "button";
        sortBtn.title = TT.t("btn.sortByTime.title");
        sortBtn.addEventListener("click", function () {
          store.sortDayByTime(day);
          store.save();
          view.render();
        });
        tools.appendChild(sortBtn);
      }
      const delDay = TT.el("button", "icon-btn", "×");
      delDay.type = "button";
      delDay.title = TT.t("day.remove");
      delDay.setAttribute("aria-label", TT.t("day.remove"));
      delDay.addEventListener("click", function () {
        if (day.plans.some(function (p) { return p.text; }) && !confirm(TT.t("confirm.removeDay"))) return;
        // the date leaves the trip with the day; the remaining days keep their own dates
        store.trip().days = store.days().filter(function (x) { return x.id !== day.id; });
        store.save();
        view.render();
      });
      tools.appendChild(delDay);
    }
    content.appendChild(tools);

    const list = TT.el("div", "plans" + (day.plans.length ? "" : " is-empty"));
    list.dataset.dayId = day.id;
    list.dataset.empty = TT.t("plans.empty");
    list.dataset.emptyDrag = TT.t("plans.dropHere");
    day.plans.forEach(function (plan) { list.appendChild(renderPlan(plan)); });
    content.appendChild(list);

    if (!view.readOnly) {
      const addBtn = TT.el("button", "add-plan-btn", TT.t("btn.addPlan"));
      addBtn.type = "button";
      addBtn.addEventListener("click", function () {
        const p = store.newPlan();
        day.plans.push(p);
        store.save();
        view.render();
        const input = document.querySelector('[data-plan-id="' + p.id + '"] .plan-text');
        if (input) input.focus();
      });
      content.appendChild(addBtn);
    }

    row.appendChild(content);
    return row;
  }

  function renderPlan(plan) {
    const row = TT.el("div", "plan-row" + (plan.done ? " done" : "") + " pri-" + plan.priority);
    row.dataset.planId = plan.id;

    if (!view.readOnly) {
      const handle = TT.el("button", "grip");
      handle.type = "button";
      handle.title = TT.t("plan.move.title");
      handle.setAttribute("aria-label", TT.t("plan.move"));
      handle.innerHTML = TT.ICON.grip;
      handle.addEventListener("pointerdown", function (e) { TT.dnd.start(e, row, "plan"); });
      handle.addEventListener("keydown", function (e) {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          TT.dnd.movePlanByKey(plan.id, e.key === "ArrowUp" ? -1 : 1);
        }
      });
      row.appendChild(handle);
    } else {
      row.appendChild(TT.el("span", "grip-spacer"));
    }

    const checkCell = TT.el("span", "check-cell");
    const check = TT.el("input", "check");
    check.type = "checkbox";
    check.checked = plan.done;
    check.disabled = view.readOnly;
    check.setAttribute("aria-label", TT.t("plan.markDone"));
    check.addEventListener("change", function () {
      plan.done = check.checked;
      store.save();
      view.render();
    });
    checkCell.appendChild(check);

    const timeCell = TT.el("span", "time-cell");
    const timeChip = TT.el("span", "chip time-chip" + (plan.time ? "" : " is-blank"));
    timeChip.innerHTML = TT.ICON.clock;
    const time = TT.el("input", "time");
    time.type = "time";
    time.value = plan.time || "";
    time.disabled = view.readOnly;
    time.setAttribute("aria-label", TT.t("plan.time"));
    time.addEventListener("change", function () {
      plan.time = time.value;
      timeChip.classList.toggle("is-blank", !time.value);
      store.save();
    });
    timeChip.appendChild(time);
    timeCell.appendChild(timeChip);

    const flag = TT.el("button", "flag-btn");
    flag.type = "button";
    flag.disabled = view.readOnly;
    function paintFlag() {
      const meta = TT.priMeta(plan.priority);
      flag.innerHTML = TT.PRI_ICON[plan.priority];
      flag.title = meta.hint;
      flag.setAttribute("aria-label", meta.aria);
    }
    paintFlag();
    flag.addEventListener("click", function () {
      const next = (TT.PRIORITIES.indexOf(plan.priority) + 1) % TT.PRIORITIES.length;
      plan.priority = TT.PRIORITIES[next];
      row.classList.remove("pri-normal", "pri-must", "pri-optional");
      row.classList.add("pri-" + plan.priority);
      paintFlag();
      store.save();
      refreshDayChips(row);
    });

    const textCell = TT.el("span", "text-cell");
    const text = TT.el("textarea", "plan-text");
    text.rows = 1;
    text.placeholder = view.readOnly ? "" : TT.t("plan.placeholder");
    text.value = plan.text || "";
    text.readOnly = view.readOnly;
    text.addEventListener("input", function () {
      plan.text = text.value;     // newlines welcome: one plan can hold a short list
      TT.fit(text);
      store.save();
    });
    text.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); text.blur(); }
    });
    textCell.appendChild(text);

    row.append(checkCell, timeCell, flag, textCell);

    if (!view.readOnly) {
      const remove = TT.el("button", "icon-btn remove-plan", "×");
      remove.type = "button";
      remove.title = TT.t("plan.remove");
      remove.setAttribute("aria-label", TT.t("plan.remove"));
      remove.addEventListener("click", function () {
        store.days().forEach(function (d) {
          d.plans = d.plans.filter(function (p) { return p.id !== plan.id; });
        });
        store.save();
        view.render();
      });
      row.appendChild(remove);
    } else {
      row.appendChild(TT.el("span", "x-spacer"));
    }

    return row;
  }

  // ---------- the floating "add day" button ----------
  function closeAddDay() {
    fabPanel.classList.add("hidden");
    fabPanel.innerHTML = "";
    fabBtn.setAttribute("aria-expanded", "false");
  }

  function openAddDay() {
    fabPanel.innerHTML = "";
    fabPanel.classList.remove("hidden");
    fabBtn.setAttribute("aria-expanded", "true");

    // default to the day after the last one on the timeline
    let suggested = "";
    const days = store.sortedDays();
    if (days.length && days[days.length - 1].date) {
      const last = TT.parseLocalDate(days[days.length - 1].date);
      last.setDate(last.getDate() + 1);
      suggested = TT.toISO(last);
    } else {
      suggested = TT.toISO(new Date());
    }

    function addDay(iso) {
      if (store.days().some(function (d) { return d.date === iso; })) {
        TT.toast(TT.t("date.taken", { date: TT.shortDate(iso) }), true);
        return;
      }
      store.days().push(store.newDay(iso));
      store.save();
      closeAddDay();
      view.render();
      const added = document.querySelector('[data-day-id]:last-of-type');
      if (added) added.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }

    const field = TT.DateField({
      value: suggested,
      commitOnBlur: false,
      onCommit: addDay,
      onCancel: closeAddDay
    });

    const ok = TT.el("button", "confirm-btn", TT.t("btn.add"));
    ok.type = "button";
    ok.addEventListener("click", function () {
      const iso = field.getISO();
      if (!iso) { TT.toast(TT.t("date.needFull", { fmt: field.placeholder }), true); field.focus(); return; }
      addDay(iso);
    });

    const cancel = TT.el("button", "cancel-btn", TT.t("btn.cancel"));
    cancel.type = "button";
    cancel.addEventListener("click", closeAddDay);

    const formRow = TT.el("div", "add-day-form");
    formRow.append(field.root, ok, cancel);
    fabPanel.appendChild(formRow);
    field.focus();
  }
})(window.TT);
