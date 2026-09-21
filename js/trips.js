/* The trip library: switch, create, rename, duplicate, favourite, delete. */
(function (TT) {
  "use strict";

  const trips = TT.trips = {};
  const store = TT.store;

  let modal = null;
  let listEl = null;
  let onChanged = function () {};

  trips.mount = function (handler) {
    onChanged = handler;
    modal = document.getElementById("tripsModal");
    listEl = document.getElementById("tripList");

    document.getElementById("tripsBtn").addEventListener("click", trips.open);
    document.getElementById("tripsClose").addEventListener("click", trips.close);
    document.getElementById("tripNew").addEventListener("click", function () {
      store.addTrip(promptName(TT.t("trip.newName"), ""));
      onChanged();
      trips.render();
    });
    modal.addEventListener("click", function (e) { if (e.target === modal) trips.close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) trips.close();
    });
  };

  function promptName(title, current) {
    const name = window.prompt(title, current);
    return name == null ? "" : name;
  }

  trips.open = function () {
    modal.classList.remove("hidden");
    trips.render();
  };
  trips.close = function () { modal.classList.add("hidden"); };

  /** The button in the header always shows which trip is open. */
  trips.paintButton = function () {
    const btn = document.getElementById("tripsBtn");
    const t = store.trip();
    btn.querySelector(".trip-name").textContent = t.name;
    btn.title = TT.t("trip.switch");
    const star = btn.querySelector(".trip-star");
    star.classList.toggle("hidden", !t.favorite);
  };

  function rangeLabel(t) {
    const r = store.tripRange(t);
    if (!r) return TT.t("trip.noDates");
    if (r.from === r.to) return TT.shortDate(r.from);
    return TT.shortDate(r.from) + " – " + TT.shortDate(r.to);
  }

  trips.render = function () {
    listEl.innerHTML = "";
    const activeId = store.state.activeTripId;

    store.tripsSorted().forEach(function (t) {
      const row = TT.el("li", "trip-row" + (t.id === activeId ? " active" : ""));

      const fav = TT.el("button", "trip-fav" + (t.favorite ? " on" : ""));
      fav.type = "button";
      fav.innerHTML = TT.PRI_ICON[t.favorite ? "must" : "normal"];
      fav.title = TT.t(t.favorite ? "trip.unfavorite" : "trip.favorite");
      fav.setAttribute("aria-pressed", String(t.favorite));
      fav.addEventListener("click", function (e) {
        e.stopPropagation();
        store.toggleFavorite(t.id);
        trips.paintButton();
        trips.render();
      });

      const open = TT.el("button", "trip-open");
      open.type = "button";
      const counts = store.tripCounts(t);
      open.appendChild(TT.el("span", "trip-title", t.name));
      open.appendChild(TT.el("span", "trip-meta",
        rangeLabel(t) + " · " + TT.t("trip.counts", { days: counts.days, done: counts.done, total: counts.total })));
      open.addEventListener("click", function () {
        store.setActiveTrip(t.id);
        trips.paintButton();
        onChanged();
        trips.close();
      });

      const tools = TT.el("div", "trip-tools");

      const rename = TT.el("button", "text-btn", TT.t("trip.rename"));
      rename.type = "button";
      rename.addEventListener("click", function (e) {
        e.stopPropagation();
        const name = promptName(TT.t("trip.renameTitle"), t.name);
        if (!name) return;
        store.renameTrip(t.id, name);
        trips.paintButton();
        trips.render();
      });

      const dupe = TT.el("button", "text-btn", TT.t("trip.duplicate"));
      dupe.type = "button";
      dupe.addEventListener("click", function (e) {
        e.stopPropagation();
        store.duplicateTrip(t.id);
        trips.paintButton();
        onChanged();
        trips.render();
      });

      const del = TT.el("button", "icon-btn", "×");
      del.type = "button";
      del.title = TT.t("trip.delete");
      del.setAttribute("aria-label", TT.t("trip.delete"));
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!confirm(TT.t("trip.deleteConfirm", { name: t.name }))) return;
        store.deleteTrip(t.id);
        trips.paintButton();
        onChanged();
        trips.render();
      });

      tools.append(rename, dupe, del);
      row.append(fav, open, tools);
      listEl.appendChild(row);
    });
  };
})(window.TT);
