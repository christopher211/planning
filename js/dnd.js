/* Dragging, for both plan rows and whole day columns.
 *
 * The board lays days out left to right, so placement is two-dimensional:
 * which column the pointer is over (by x), then which slot inside it (by y).
 * Day columns reorder purely by x.
 *
 * Scrolling is nested — a horizontal board holding vertically scrolling
 * columns — so autoScroll nudges the board sideways and whichever plan list
 * is under the pointer downwards, each only when the pointer is near that
 * element's own edge.
 *
 * Rows pushed out of the way animate with FLIP: measure where the neighbours
 * are, move the node, then play them from their old position back to the new
 * one. Measuring the *rendered* rect (transforms included) means an
 * interrupted animation retargets smoothly instead of snapping.
 */
(function (TT) {
  "use strict";

  const dnd = TT.dnd = {};
  let drag = null;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EDGE = 90;       // how close to an edge before it scrolls
  const SPEED = 6;

  // ---------- FLIP ----------
  function readRects(nodes) {
    const m = new Map();
    nodes.forEach(function (n) {
      const b = n.getBoundingClientRect();
      m.set(n, { top: b.top, left: b.left });
    });
    return m;
  }

  function playRects(m) {
    if (reduceMotion) return;
    const moved = [];
    m.forEach(function (old, n) {
      const b = n.getBoundingClientRect();
      const dy = old.top - b.top;
      const dx = old.left - b.left;
      if (!dx && !dy) return;
      n.classList.remove("flip-move");
      n.style.transform = "translate(" + dx + "px," + dy + "px)";
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

  const board = function () { return TT.view.timelineEl; };
  const columns = function () {
    return Array.prototype.slice.call(board().children)
      .filter(function (n) { return n.classList.contains("day"); });
  };

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
    Object.assign(ghost.style, {
      width: rect.width + "px",
      height: kind === "day" ? Math.min(rect.height, 420) + "px" : "auto",
      left: rect.left + "px", top: rect.top + "px"
    });
    document.body.appendChild(ghost);

    rowEl.classList.add("drag-placeholder");
    document.body.classList.add("dragging");

    let hint = null;
    if (kind === "day") {
      hint = TT.el("div", "drop-hint", TT.t("drag.dayHint"));
      document.body.appendChild(hint);
    }

    drag = {
      kind: kind, rowEl: rowEl, ghost: ghost, hint: hint,
      offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top,
      x: e.clientX, y: e.clientY, raf: 0
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    autoScroll();
  };

  function onMove(e) {
    if (!drag) return;
    e.preventDefault();
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.ghost.style.left = (e.clientX - drag.offsetX) + "px";
    drag.ghost.style.top = (e.clientY - drag.offsetY) + "px";
    placeAt(e.clientX, e.clientY);
  }

  function placeAt(x, y) {
    if (!drag) return;
    return drag.kind === "day" ? placeDayAt(x) : placePlanAt(x, y);
  }

  /** Which plan list is under the pointer, ignoring the ghost. */
  function listUnder(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const list = el.closest(".plans");
    if (list) return list;
    const col = el.closest(".day");
    return col ? col.querySelector(".plans") : null;
  }

  function placePlanAt(x, y) {
    let list = listUnder(x, y);
    if (!list) {
      // past the end of a column, or over its header: fall back to nearest column by x
      const cols = columns();
      let best = null, bestDist = Infinity;
      for (let i = 0; i < cols.length; i++) {
        const b = cols[i].getBoundingClientRect();
        const dist = x < b.left ? b.left - x : x > b.right ? x - b.right : 0;
        if (dist < bestDist) { bestDist = dist; best = cols[i]; }
      }
      if (!best || bestDist > 120) return;
      list = best.querySelector(".plans");
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
    const neighbours = Array.prototype.slice.call(board().querySelectorAll(".plan-row"))
      .filter(function (r) { return r !== drag.rowEl; });
    const rects = readRects(neighbours);

    if (before) list.insertBefore(drag.rowEl, before); else list.appendChild(drag.rowEl);
    [oldList, list].forEach(function (l) { l.classList.toggle("is-empty", !l.querySelector(".plan-row")); });
    playRects(rects);
  }

  function placeDayAt(x) {
    const others = columns().filter(function (d) { return d !== drag.rowEl; });
    let before = null;
    for (let i = 0; i < others.length; i++) {
      const b = others[i].getBoundingClientRect();
      if (x < b.left + b.width / 2) { before = others[i]; break; }
    }
    if (drag.rowEl.nextElementSibling === before) return;

    const rects = readRects(others);
    if (before) board().insertBefore(drag.rowEl, before); else board().appendChild(drag.rowEl);
    playRects(rects);
  }

  /** Board scrolls sideways; the hovered column scrolls down. */
  function autoScroll() {
    if (!drag) return;
    const b = board();
    const rect = b.getBoundingClientRect();

    let dx = 0;
    if (drag.x < rect.left + EDGE) dx = -Math.ceil((rect.left + EDGE - drag.x) / SPEED);
    else if (drag.x > rect.right - EDGE) dx = Math.ceil((drag.x - (rect.right - EDGE)) / SPEED);
    if (dx) b.scrollLeft += dx;

    if (drag.kind === "plan") {
      const list = listUnder(drag.x, drag.y);
      if (list && list.scrollHeight > list.clientHeight) {
        const lb = list.getBoundingClientRect();
        let dy = 0;
        if (drag.y < lb.top + 40) dy = -Math.ceil((lb.top + 40 - drag.y) / SPEED);
        else if (drag.y > lb.bottom - 40) dy = Math.ceil((drag.y - (lb.bottom - 40)) / SPEED);
        if (dy) list.scrollTop += dy;
      }
    } else if (b.classList.contains("as-calendar")) {
      const cb = b.getBoundingClientRect();
      let dy = 0;
      if (drag.y < cb.top + EDGE) dy = -Math.ceil((cb.top + EDGE - drag.y) / SPEED);
      else if (drag.y > cb.bottom - EDGE) dy = Math.ceil((drag.y - (cb.bottom - EDGE)) / SPEED);
      if (dy) b.scrollTop += dy;
    }

    if (dx) placeAt(drag.x, drag.y);
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
    clearFlip(board());
    drag = null;

    const store = TT.store;
    if (kind === "day") {
      const order = columns()
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
    if (h) { h.focus(); scrollColumnIntoView(h); }
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
    if (g) { g.focus(); scrollColumnIntoView(g); }
  };

  function scrollColumnIntoView(el) {
    const col = el.closest(".day");
    if (col) col.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }
  dnd.scrollColumnIntoView = scrollColumnIntoView;
})(window.TT);
