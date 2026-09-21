/* The trip itself: shape, persistence, and the ordering rules.
 *
 * Ordering rule that the whole app leans on: a trip can't run Dec 25 -> Dec 4,
 * so the dates are fixed slots on the timeline and `state.days` is always held
 * in ascending date order. Reordering days therefore doesn't move dates around,
 * it moves each day's *plans* into the date slot at its new position.
 */
(function (TT) {
  "use strict";

  const KEY = "timeline-planner-v1";

  const Store = TT.store = {
    state: null,

    newPlan: function (text, time, priority) {
      return {
        id: TT.uid(), text: text || "", time: time || "",
        done: false, priority: priority || "normal"
      };
    },

    /** First visit: today and tomorrow, two blank slots each. */
    defaultState: function () {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        updatedAt: 0,
        settings: { dateFormat: "dmy", lang: "en" },
        days: [today, tomorrow].map(function (d) {
          return { id: TT.uid(), date: TT.toISO(d), plans: [Store.newPlan(), Store.newPlan()] };
        })
      };
    },

    normalize: function (obj) {
      if (!obj || !Array.isArray(obj.days)) return null;
      const saved = obj.settings || {};
      const fmt = saved.dateFormat === "mdy" ? "mdy" : "dmy";   // DD/MM is the default
      const lang = saved.lang === "vi" ? "vi" : "en";
      const data = {
        updatedAt: Number(obj.updatedAt) || 0,
        settings: { dateFormat: fmt, lang: lang },
        days: obj.days.map(function (d) {
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
        })
      };
      // older saves didn't keep days in timeline order
      data.days.sort(Store.byDate);
      return data;
    },

    byDate: function (a, b) {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    },

    // while viewing a shared link nothing is written to this browser's storage
    ephemeral: false,

    load: function () {
      try { return Store.normalize(JSON.parse(localStorage.getItem(KEY))); }
      catch (e) { return null; }
    },
    save: function () {
      Store.state.updatedAt = Date.now();
      if (Store.ephemeral) return;
      try { localStorage.setItem(KEY, JSON.stringify(Store.state)); }
      catch (e) { console.error(e); }
    },

    init: function () {
      Store.state = Store.load() || Store.defaultState();
      return Store.state;
    },
    replace: function (data) { Store.state = data; Store.save(); },

    // ---------- ordering ----------
    sortedDays: function () { return Store.state.days.slice().sort(Store.byDate); },
    reindex: function () { Store.state.days = Store.sortedDays(); },

    dayOf: function (id) {
      return Store.state.days.filter(function (d) { return d.id === id; })[0];
    },

    /** Move days into `order`, handing each the date slot at its new position.
     *  Returns true when something actually changed. */
    applyDayOrder: function (order) {
      if (order.length !== Store.state.days.length) return false;
      const slots = Store.sortedDays().map(function (d) { return d.date; });
      const changed = order.some(function (d, i) { return d.date !== slots[i]; });
      order.forEach(function (d, i) { d.date = slots[i]; });
      Store.state.days = order;
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

    /** Timeline-wide counterpart to a day's "sort by time": day sections back in
     *  date order, and every day's plans back in time order. */
    sortWholeTimeline: function () {
      const before = JSON.stringify(Store.state.days.map(function (d) {
        return [d.date].concat(d.plans.map(function (p) { return p.id; }));
      }));
      Store.reindex();
      Store.state.days.forEach(Store.sortDayByTime);
      const after = JSON.stringify(Store.state.days.map(function (d) {
        return [d.date].concat(d.plans.map(function (p) { return p.id; }));
      }));
      return before !== after;
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
    }
  };
})(window.TT);
