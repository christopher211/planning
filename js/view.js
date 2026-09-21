/* Rendering: the legend, the timeline, each day section and each plan row. */
(function (TT) {
  "use strict";

  const view = TT.view = {};
  const store = TT.store;

  view.timelineEl = null;
  let addDayArea = null;
  let legendEl = null;

  view.mount = function () {
    view.timelineEl = document.getElementById("timeline");
    addDayArea = document.getElementById("addDayArea");
    legendEl = document.getElementById("legend");
    renderLegend();
  };

  // ---------- legend ----------
  function renderLegend() {
    legendEl.innerHTML = "";
    ["must", "optional", "normal"].forEach(function (key) {
      const li = TT.el("li");
      const ic = TT.el("span", "lg-" + key);
      ic.innerHTML = TT.PRI_ICON[key];
      li.append(ic, document.createTextNode(TT.PRI_META[key].blurb));
      li.title = TT.PRI_META[key].blurb;
      legendEl.appendChild(li);
    });
  }

  // ---------- timeline ----------
  view.render = function () {
    store.reindex();
    view.timelineEl.innerHTML = "";
    if (store.state.days.length === 0) {
      const empty = TT.el("div", "timeline-empty");
      empty.appendChild(TT.el("strong", null, "No days yet"));
      empty.appendChild(document.createTextNode("Add your first day below to start planning."));
      view.timelineEl.appendChild(empty);
    } else {
      store.state.days.forEach(function (day) { view.timelineEl.appendChild(renderDay(day)); });
    }
    renderAddDay();
    requestAnimationFrame(TT.fitAll);
  };

  function dayChips(day) {
    const out = [];
    const doneCount = day.plans.filter(function (p) { return p.done; }).length;
    if (day.plans.length) {
      const allDone = doneCount === day.plans.length;
      const progress = TT.el("span", "chip" + (allDone ? " on" : ""));
      if (allDone) progress.innerHTML = TT.ICON.check;
      progress.appendChild(document.createTextNode(doneCount + "/" + day.plans.length + " done"));
      out.push(progress);
    }
    const mustLeft = day.plans.filter(function (p) { return p.priority === "must" && !p.done; }).length;
    if (mustLeft) {
      const must = TT.el("span", "chip must");
      must.innerHTML = TT.PRI_ICON.must;
      must.appendChild(document.createTextNode(mustLeft + " must"));
      must.title = mustLeft + " must-do plan" + (mustLeft > 1 ? "s" : "") + " still open";
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
    const main = dayEl.querySelector(".day-main");
    main.querySelectorAll(".chip").forEach(function (c) { c.remove(); });
    dayChips(day).forEach(function (c) { main.appendChild(c); });
  }

  function renderDay(day) {
    const row = TT.el("div", "day");
    row.dataset.dayId = day.id;
    const doneCount = day.plans.filter(function (p) { return p.done; }).length;
    if (day.plans.length && doneCount === day.plans.length) row.classList.add("all-done");

    const rail = TT.el("div", "rail");
    rail.appendChild(TT.el("span", "dot"));
    row.appendChild(rail);

    const content = TT.el("div", "day-content");
    const head = TT.el("div", "day-head");

    const grip = TT.el("button", "grip day-grip");
    grip.type = "button";
    grip.title = "Drag to move this day (or use ↑ ↓ keys). Dates stay in trip order.";
    grip.setAttribute("aria-label", "Move day");
    grip.innerHTML = TT.ICON.grip;
    grip.addEventListener("pointerdown", function (e) { TT.dnd.start(e, row, "day"); });
    grip.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        TT.dnd.moveDayByKey(day.id, e.key === "ArrowUp" ? -1 : 1);
      }
    });
    head.appendChild(grip);

    const main = TT.el("div", "day-main");
    const dateBtn = TT.el("button", "date-btn");
    dateBtn.type = "button";
    dateBtn.title = "Click to type a new date";
    if (day.date) {
      const d = TT.parseLocalDate(day.date);
      dateBtn.appendChild(document.createTextNode(
        d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })));
      dateBtn.appendChild(TT.el("span", "year", String(d.getFullYear())));
    } else {
      dateBtn.textContent = "Set a date";
    }
    main.appendChild(dateBtn);

    dateBtn.addEventListener("click", function () {
      const field = TT.DateField({
        value: day.date,
        onCommit: function (iso) {
          if (iso !== day.date) {
            const clash = store.state.days.some(function (x) { return x.id !== day.id && x.date === iso; });
            if (clash) { TT.toast(TT.shortDate(iso) + " is already on the timeline.", true); view.render(); return; }
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

    dayChips(day).forEach(function (c) { main.appendChild(c); });
    head.appendChild(main);

    const tools = TT.el("div", "day-tools");
    if (day.plans.length > 1) {
      const sortBtn = TT.el("button", "text-btn", "sort by time");
      sortBtn.type = "button";
      sortBtn.title = "Order this day's plans by their time";
      sortBtn.addEventListener("click", function () {
        store.sortDayByTime(day);
        store.save();
        view.render();
      });
      tools.appendChild(sortBtn);
    }
    const delDay = TT.el("button", "icon-btn", "×");
    delDay.type = "button";
    delDay.title = "Remove day";
    delDay.setAttribute("aria-label", "Remove day");
    delDay.addEventListener("click", function () {
      if (day.plans.some(function (p) { return p.text; }) && !confirm("Remove this day and its plans?")) return;
      // the date leaves the trip with the day; the remaining days keep their own dates
      store.state.days = store.state.days.filter(function (x) { return x.id !== day.id; });
      store.save();
      view.render();
    });
    tools.appendChild(delDay);
    head.appendChild(tools);
    content.appendChild(head);

    const list = TT.el("div", "plans" + (day.plans.length ? "" : " is-empty"));
    list.dataset.dayId = day.id;
    day.plans.forEach(function (plan) { list.appendChild(renderPlan(plan)); });
    content.appendChild(list);

    const addBtn = TT.el("button", "add-plan-btn", "+ add plan");
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

    row.appendChild(content);
    return row;
  }

  function renderPlan(plan) {
    const row = TT.el("div", "plan-row" + (plan.done ? " done" : "") + " pri-" + plan.priority);
    row.dataset.planId = plan.id;

    const handle = TT.el("button", "grip");
    handle.type = "button";
    handle.title = "Drag to move (or use ↑ ↓ keys)";
    handle.setAttribute("aria-label", "Move plan");
    handle.innerHTML = TT.ICON.grip;
    handle.addEventListener("pointerdown", function (e) { TT.dnd.start(e, row, "plan"); });
    handle.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        TT.dnd.movePlanByKey(plan.id, e.key === "ArrowUp" ? -1 : 1);
      }
    });

    const checkCell = TT.el("span", "check-cell");
    const check = TT.el("input", "check");
    check.type = "checkbox";
    check.checked = plan.done;
    check.setAttribute("aria-label", "Mark as done");
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
    time.setAttribute("aria-label", "Time");
    time.addEventListener("change", function () {
      plan.time = time.value;
      timeChip.classList.toggle("is-blank", !time.value);
      store.save();
    });
    timeChip.appendChild(time);
    timeCell.appendChild(timeChip);

    const flag = TT.el("button", "flag-btn");
    flag.type = "button";
    function paintFlag() {
      flag.innerHTML = TT.PRI_ICON[plan.priority];
      flag.title = TT.PRI_META[plan.priority].hint;
      flag.setAttribute("aria-label", TT.PRI_META[plan.priority].aria);
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
    text.placeholder = "What's the plan?";
    text.value = plan.text || "";
    text.addEventListener("input", function () {
      plan.text = text.value;     // newlines welcome: one plan can hold a short list
      TT.fit(text);
      store.save();
    });
    text.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); text.blur(); }
    });
    textCell.appendChild(text);

    const remove = TT.el("button", "icon-btn remove-plan", "×");
    remove.type = "button";
    remove.title = "Remove plan";
    remove.setAttribute("aria-label", "Remove plan");
    remove.addEventListener("click", function () {
      store.state.days.forEach(function (d) {
        d.plans = d.plans.filter(function (p) { return p.id !== plan.id; });
      });
      store.save();
      view.render();
    });

    row.append(handle, checkCell, timeCell, flag, textCell, remove);
    return row;
  }

  // ---------- add a day ----------
  function renderAddDay() {
    addDayArea.innerHTML = "";
    const btn = TT.el("button", "add-day-btn", "+ Add day");
    btn.type = "button";
    btn.addEventListener("click", function () {
      addDayArea.innerHTML = "";
      const form = TT.el("div", "add-day-form");

      // default to the day after the last one on the timeline
      let suggested = "";
      const days = store.sortedDays();
      if (days.length && days[days.length - 1].date) {
        const last = TT.parseLocalDate(days[days.length - 1].date);
        last.setDate(last.getDate() + 1);
        suggested = TT.toISO(last);
      }

      function addDay(iso) {
        if (store.state.days.some(function (d) { return d.date === iso; })) {
          TT.toast(TT.shortDate(iso) + " is already on the timeline.", true);
          return;
        }
        store.state.days.push({ id: TT.uid(), date: iso, plans: [store.newPlan()] });
        store.save();
        view.render();
      }

      const field = TT.DateField({
        value: suggested,
        commitOnBlur: false,
        onCommit: addDay,
        onCancel: view.render
      });

      const ok = TT.el("button", "confirm-btn", "Add");
      ok.type = "button";
      ok.addEventListener("click", function () {
        const iso = field.getISO();
        if (!iso) { TT.toast("Enter a full date as " + field.placeholder + ".", true); field.focus(); return; }
        addDay(iso);
      });

      const cancel = TT.el("button", "cancel-btn", "Cancel");
      cancel.type = "button";
      cancel.addEventListener("click", view.render);

      form.append(field.root, ok, cancel);
      addDayArea.appendChild(form);
      field.focus();
    });
    addDayArea.appendChild(btn);
  }
})(window.TT);
