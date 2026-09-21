/* Dragging, for both plan rows and whole day sections.
 *
 * The rows that get pushed out of the way animate with FLIP: measure where the
 * neighbours are, move the node, then play them from their old position back to
 * the new one. Measuring the *rendered* rect (transforms included) means an
 * interrupted animation retargets smoothly instead of snapping.
 */
(function (TT) {
  "use strict";

  const dnd = TT.dnd = {};
  let drag = null;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- FLIP ----------
  function readRects(nodes) {
    const m = new Map();
    nodes.forEach(function (n) { m.set(n, n.getBoundingClientRect().top); });
    return m;
  }

  function playRects(m) {
    if (reduceMotion) return;
    const moved = [];
    m.forEach(function (oldTop, n) {
      const dy = oldTop - n.getBoundingClientRect().top;
      if (!dy) return;
      n.classList.remove("flip-move");
      n.style.transform = "translateY(" + dy + "px)";
      moved.push(n);
    });
    if (!moved.length) return;
    void moved[0].offsetHeight;             // flush the pre-transition position
    requestAnimationFrame(function () {
      moved.forEach(function (n) {
        n.classList.add("flip-move");
        n.style.transform = "";
      });
    });
  }

  function clearFlip(root) {
    root.querySelectorAll(".flip-move").forEach(function (n) {
      n.classList.remove("flip-move");
      n.style.transform = "";
    });
  }

  // ---------- drag lifecycle ----------
  /** @param kind "plan" | "day" */
  dnd.start = function (e, rowEl, kind) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();

    const rect = rowEl.getBoundingClientRect();
    const ghost = rowEl.cloneNode(true);
    // cloned fields don't carry typed values, copy them across
    const src = rowEl.querySelectorAll("input, textarea");
    const dst = ghost.querySelectorAll("input, textarea");
    src.forEach(function (f, i) {
      if (!dst[i]) return;
      if (f.type === "checkbox") dst[i].checked = f.checked; else dst[i].value = f.value;
    });
    ghost.classList.add("drag-ghost");
    ghost.classList.remove("flip-move");
    ghost.style.transform = "";
    if (kind === "day") ghost.classList.add("day-ghost");
    Object.assign(ghost.style, { width: rect.width + "px", left: rect.left + "px", top: rect.top + "px" });
    document.body.appendChild(ghost);

    rowEl.classList.add("drag-placeholder");
    document.body.classList.add("dragging");

    let hint = null;
    if (kind === "day") {
      hint = TT.el("div", "drop-hint", "Dates stay in order — this day's plans move into the slot you drop it on");
      document.body.appendChild(hint);
    }

    drag = { kind: kind, rowEl: rowEl, ghost: ghost, hint: hint, offsetY: e.clientY - rect.top, y: e.clientY, raf: 0 };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    autoScroll();
  };

  function onMove(e) {
    if (!drag) return;
    e.preventDefault();
    drag.y = e.clientY;
    drag.ghost.style.top = (e.clientY - drag.offsetY) + "px";
    placeAt(e.clientY);
  }

  function placeAt(y) {
    if (!drag) return;
    return drag.kind === "day" ? placeDayAt(y) : placePlanAt(y);
  }

  function placePlanAt(y) {
    const timelineEl = TT.view.timelineEl;
    const tRect = timelineEl.getBoundingClientRect();
    const x = tRect.left + Math.min(tRect.width / 2, 200);
    const target = document.elementFromPoint(x, y);
    if (!target) return;

    let list = target.closest(".plans");
    if (!list) {
      const day = target.closest(".day");
      if (day) list = day.querySelector(".plans");
    }
    if (!list) return;

    const rows = Array.prototype.slice.call(list.querySelectorAll(".plan-row"))
      .filter(function (r) { return r !== drag.rowEl; });
    let before = null;
    for (let i = 0; i < rows.length; i++) {
      const b = rows[i].getBoundingClientRect();
      if (y < b.top + b.height / 2) { before = rows[i]; break; }
    }
    if (drag.rowEl.parentNode === list && drag.rowEl.nextElementSibling === before) return;

    const oldList = drag.rowEl.parentNode;
    const neighbours = Array.prototype.slice.call(timelineEl.querySelectorAll(".plan-row"))
      .filter(function (r) { return r !== drag.rowEl; });
    const rects = readRects(neighbours);

    if (before) list.insertBefore(drag.rowEl, before); else list.appendChild(drag.rowEl);
    [oldList, list].forEach(function (l) { l.classList.toggle("is-empty", !l.querySelector(".plan-row")); });
    playRects(rects);
  }

  function placeDayAt(y) {
    const timelineEl = TT.view.timelineEl;
    const others = Array.prototype.slice.call(timelineEl.children)
      .filter(function (d) { return d.classList.contains("day") && d !== drag.rowEl; });
    let before = null;
    for (let i = 0; i < others.length; i++) {
      const b = others[i].getBoundingClientRect();
      if (y < b.top + b.height / 2) { before = others[i]; break; }
    }
    if (drag.rowEl.nextElementSibling === before) return;

    const rects = readRects(others);
    if (before) timelineEl.insertBefore(drag.rowEl, before); else timelineEl.appendChild(drag.rowEl);
    playRects(rects);
  }

  function autoScroll() {
    if (!drag) return;
    const edge = 80, h = window.innerHeight;
    let dy = 0;
    if (drag.y < edge) dy = -Math.ceil((edge - drag.y) / 5);
    else if (drag.y > h - edge) dy = Math.ceil((drag.y - (h - edge)) / 5);
    if (dy) { window.scrollBy(0, dy); placeAt(drag.y); }
    drag.raf = requestAnimationFrame(autoScroll);
  }

  function end() {
    if (!drag) return;
    const kind = drag.kind;
    const movedId = drag.rowEl.dataset.dayId;

    cancelAnimationFrame(drag.raf);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    drag.ghost.remove();
    if (drag.hint) drag.hint.remove();
    drag.rowEl.classList.remove("drag-placeholder");
    document.body.classList.remove("dragging");
    clearFlip(TT.view.timelineEl);
    drag = null;

    const store = TT.store;
    if (kind === "day") {
      const order = Array.prototype.slice.call(TT.view.timelineEl.children)
        .filter(function (n) { return n.classList.contains("day"); })
        .map(function (n) { return store.dayOf(n.dataset.dayId); })
        .filter(Boolean);
      const moved = store.dayOf(movedId);
      const changed = store.applyDayOrder(order);
      store.save();
      TT.view.render();
      if (changed && moved) {
        TT.toast(TT.t("toast.movedTo", { date: TT.shortDate(moved.date) }));
      }
      return;
    }

    const all = new Map();
    store.days().forEach(function (d) {
      d.plans.forEach(function (p) { all.set(p.id, p); });
    });
    document.querySelectorAll(".plans").forEach(function (list) {
      const day = store.dayOf(list.dataset.dayId);
      if (!day) return;
      day.plans = Array.prototype.slice.call(list.querySelectorAll(".plan-row"))
        .map(function (r) { return all.get(r.dataset.planId); })
        .filter(Boolean);
    });
    store.save();
    TT.view.render();
  }

  // ---------- keyboard equivalents ----------
  dnd.movePlanByKey = function (planId, dir) {
    const days = TT.store.days();
    let di = -1;
    for (let i = 0; i < days.length; i++) {
      if (days[i].plans.some(function (p) { return p.id === planId; })) { di = i; break; }
    }
    if (di < 0) return;

    const day = days[di];
    const pi = day.plans.findIndex(function (p) { return p.id === planId; });
    const plan = day.plans.splice(pi, 1)[0];
    if (dir < 0) {
      if (pi > 0) day.plans.splice(pi - 1, 0, plan);
      else if (days[di - 1]) days[di - 1].plans.push(plan);
      else day.plans.splice(pi, 0, plan);
    } else {
      if (pi < day.plans.length) day.plans.splice(pi + 1, 0, plan);
      else if (days[di + 1]) days[di + 1].plans.unshift(plan);
      else day.plans.splice(pi, 0, plan);
    }
    TT.store.save();
    TT.view.render();
    const h = document.querySelector('[data-plan-id="' + planId + '"] .grip');
    if (h) h.focus();
  };

  dnd.moveDayByKey = function (dayId, dir) {
    const store = TT.store;
    const order = store.sortedDays();
    const i = order.findIndex(function (d) { return d.id === dayId; });
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;

    order.splice(j, 0, order.splice(i, 1)[0]);
    const changed = store.applyDayOrder(order);
    store.save();
    TT.view.render();

    const moved = store.dayOf(dayId);
    if (changed && moved) TT.toast(TT.t("toast.movedToShort", { date: TT.shortDate(moved.date) }));
    const g = document.querySelector('[data-day-id="' + dayId + '"] .day-grip');
    if (g) g.focus();
  };
})(window.TT);
