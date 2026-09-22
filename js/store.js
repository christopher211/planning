/* The data: a library of trips, each a list of days.
 *
 * Ordering rule the whole app leans on: a trip can't run Dec 25 -> Dec 4, so
 * dates are fixed slots on the timeline and a trip's days are always held in
 * ascending date order. Reordering days doesn't move dates around, it moves
 * each day's *plans* into the date slot at its new position.
 */
(function (TT) {
  "use strict";

  const KEY = "timeline-planner-v1";

  const Store = TT.store = {
    state: null,

    // ---------- factories ----------
    newPlan: function (text, time, priority) {
      return {
        id: TT.uid(), text: text || "", time: time || "",
        done: false, priority: priority || "normal"
      };
    },

    newDay: function (iso, planCount) {
      const plans = [];
      const n = planCount == null ? 2 : planCount;
      for (let i = 0; i < n; i++) plans.push(Store.newPlan());
      return { id: TT.uid(), date: iso, plans: plans };
    },

    /** A fresh trip opens on today and tomorrow with blank slots. */
    newTrip: function (name) {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const now = Date.now();
      return {
        id: TT.uid(),
        name: name || TT.t("trip.untitled"),
        favorite: false,
        createdAt: now,
        updatedAt: now,
        days: [today, tomorrow].map(function (d) { return Store.newDay(TT.toISO(d)); })
      };
    },

    defaultState: function () {
      const trip = Store.newTrip();
      return {
        v: 2, updatedAt: 0,
        settings: { dateFormat: "dmy", lang: "en", view: "timeline" },
        activeTripId: trip.id,
        trips: [trip]
      };
    },

    // ---------- shape ----------
    normalizeDays: function (days) {
      return (days || []).map(function (d) {
        return {
          id: d.id || TT.uid(),
          date: d.date || "",
          plans: (d.plans || []).map(function (p) {
            return {
              id: p.id || TT.uid(),
              text: p.text || "",
              time: p.time || "",
              done: !!p.done,
              priority: TT.PRIORITIES.indexOf(p.priority) >= 0 ? p.priority : "normal"
            };
          })
        };
      }).sort(Store.byDate);
    },

    normalizeTrip: function (t, fallbackName) {
      const now = Date.now();
      return {
        id: t.id || TT.uid(),
        name: (t.name || fallbackName || "").trim() || TT.t("trip.untitled"),
        favorite: !!t.favorite,
        createdAt: Number(t.createdAt) || now,
        updatedAt: Number(t.updatedAt) || now,
        days: Store.normalizeDays(t.days)
      };
    },

    /** Accepts both the current shape and the older single-trip one. */
    normalize: function (obj) {
      if (!obj) return null;
      const saved = obj.settings || {};
      const settings = {
        dateFormat: saved.dateFormat === "mdy" ? "mdy" : "dmy",   // DD/MM is the default
        lang: saved.lang === "vi" ? "vi" : "en",
        view: saved.view === "calendar" ? "calendar" : "timeline"
      };

      let trips;
      if (Array.isArray(obj.trips)) {
        trips = obj.trips.map(function (t) { return Store.normalizeTrip(t); });
      } else if (Array.isArray(obj.days)) {
        trips = [Store.normalizeTrip({ days: obj.days, updatedAt: obj.updatedAt }, obj.name)];
      } else {
        return null;
      }
      if (!trips.length) trips = [Store.newTrip()];

      const active = trips.some(function (t) { return t.id === obj.activeTripId; })
        ? obj.activeTripId : trips[0].id;

      return {
        v: 2,
        updatedAt: Number(obj.updatedAt) || 0,
        settings: settings,
        activeTripId: active,
        trips: trips
      };
    },

    byDate: function (a, b) {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    },

    // ---------- persistence ----------
    ephemeral: false,   // true while viewing a shared link

    load: function () {
      try { return Store.normalize(JSON.parse(localStorage.getItem(KEY))); }
      catch (e) { return null; }
    },
    save: function () {
      const now = Date.now();
      Store.state.updatedAt = now;
      const t = Store.trip();
      if (t) t.updatedAt = now;
      if (Store.ephemeral) return;
      try { localStorage.setItem(KEY, JSON.stringify(Store.state)); }
      catch (e) { console.error(e); }
    },

    init: function () {
      Store.state = Store.load() || Store.defaultState();
      return Store.state;
    },
    replace: function (data) { Store.state = data; Store.save(); },

    // ---------- trips ----------
    trip: function () {
      const id = Store.state.activeTripId;
      return Store.state.trips.filter(function (t) { return t.id === id; })[0] || Store.state.trips[0];
    },
    days: function () { return Store.trip().days; },

    /** Favourites first, then most recently touched. */
    tripsSorted: function () {
      return Store.state.trips.slice().sort(function (a, b) {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
    },

    setActiveTrip: function (id) {
      if (!Store.state.trips.some(function (t) { return t.id === id; })) return;
      Store.state.activeTripId = id;
      Store.save();
    },

    addTrip: function (name) {
      const t = Store.newTrip(name);
      Store.state.trips.push(t);
      Store.state.activeTripId = t.id;
      Store.save();
      return t;
    },

    /** Adopts a ready-made day list, e.g. from a PDF or a shared link. */
    addTripWithDays: function (name, days) {
      const t = Store.normalizeTrip({ name: name, days: days });
      Store.state.trips.push(t);
      Store.state.activeTripId = t.id;
      Store.save();
      return t;
    },

    renameTrip: function (id, name) {
      const t = Store.state.trips.filter(function (x) { return x.id === id; })[0];
      if (!t) return;
      t.name = (name || "").trim() || TT.t("trip.untitled");
      Store.save();
    },

    duplicateTrip: function (id) {
      const t = Store.state.trips.filter(function (x) { return x.id === id; })[0];
      if (!t) return null;
      const copy = Store.normalizeTrip({
        name: TT.t("trip.copyOf", { name: t.name }),
        days: JSON.parse(JSON.stringify(t.days))
      });
      // fresh ids so the two trips never share a row
      copy.days.forEach(function (d) {
        d.id = TT.uid();
        d.plans.forEach(function (p) { p.id = TT.uid(); });
      });
      Store.state.trips.push(copy);
      Store.state.activeTripId = copy.id;
      Store.save();
      return copy;
    },

    deleteTrip: function (id) {
      Store.state.trips = Store.state.trips.filter(function (t) { return t.id !== id; });
      if (!Store.state.trips.length) Store.state.trips.push(Store.newTrip());
      if (!Store.state.trips.some(function (t) { return t.id === Store.state.activeTripId; })) {
        Store.state.activeTripId = Store.tripsSorted()[0].id;
      }
      Store.save();
    },

    toggleFavorite: function (id) {
      const t = Store.state.trips.filter(function (x) { return x.id === id; })[0];
      if (!t) return;
      t.favorite = !t.favorite;
      Store.save();
    },

    /** First and last dated day, for the trip list and the calendar. */
    tripRange: function (t) {
      const dated = t.days.filter(function (d) { return d.date; }).sort(Store.byDate);
      if (!dated.length) return null;
      return { from: dated[0].date, to: dated[dated.length - 1].date };
    },
    tripCounts: function (t) {
      let total = 0, done = 0;
      t.days.forEach(function (d) {
        d.plans.forEach(function (p) {
          if (!(p.text || "").trim() && !p.time) return;
          total++;
          if (p.done) done++;
        });
      });
      return { total: total, done: done, days: t.days.length };
    },

    // ---------- ordering, within the active trip ----------
    sortedDays: function () { return Store.days().slice().sort(Store.byDate); },
    reindex: function () { Store.trip().days = Store.sortedDays(); },

    dayOf: function (id) {
      return Store.days().filter(function (d) { return d.id === id; })[0];
    },

    /** Move days into `order`, handing each the date slot at its new position. */
    applyDayOrder: function (order) {
      const days = Store.days();
      if (order.length !== days.length) return false;
      const slots = Store.sortedDays().map(function (d) { return d.date; });
      const changed = order.some(function (d, i) { return d.date !== slots[i]; });
      order.forEach(function (d, i) { d.date = slots[i]; });
      Store.trip().days = order;
      return changed;
    },

    byTime: function (a, b) {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    },

    sortDayByTime: function (day) {
      const timed = day.plans.filter(function (p) { return p.time; }).sort(Store.byTime);
      const untimed = day.plans.filter(function (p) { return !p.time; });
      day.plans = timed.concat(untimed);
    },

    /** Timeline-wide counterpart to a day's "sort by time". */
    sortWholeTimeline: function () {
      const snap = function () {
        return JSON.stringify(Store.days().map(function (d) {
          return [d.date].concat(d.plans.map(function (p) { return p.id; }));
        }));
      };
      const before = snap();
      Store.reindex();
      Store.days().forEach(Store.sortDayByTime);
      return before !== snap();
    },

    // ---------- settings ----------
    dateFormat: function () { return Store.state.settings.dateFormat; },
    setDateFormat: function (fmt) {
      Store.state.settings.dateFormat = fmt === "mdy" ? "mdy" : "dmy";
      Store.save();
    },
    lang: function () { return Store.state.settings.lang; },
    setLang: function (lang) {
      Store.state.settings.lang = lang === "vi" ? "vi" : "en";
      Store.save();
    },
    view: function () { return Store.state.settings.view; },
    setView: function (v) {
      Store.state.settings.view = v === "calendar" ? "calendar" : "timeline";
      Store.save();
    }
  };
})(window.TT);
