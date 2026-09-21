/* Sharing by link.
 *
 * There is no server here — the site is static files on GitHub Pages — so a
 * share link carries the trip *inside itself*, in the URL fragment. The
 * fragment is the one part of a URL browsers never send to a server, so the
 * trip stays between whoever holds the link.
 *
 * Because the link IS the data, its length is the data's length, and the only
 * real lever is making the payload smaller. Two things do most of that work:
 *
 *   1. Row ids are dropped. They are random UUIDs, so deflate can't compress
 *      them at all and they dominated the old links (a 30-day trip went from
 *      7106 characters to 478 once they left). They only matter for DOM
 *      identity at runtime, so they're regenerated on the way back in.
 *   2. Everything is packed positionally — dates as YYYYMMDD integers, times
 *      as minutes past midnight, priority as an index — with trailing
 *      defaults trimmed, then deflated.
 *
 * What that buys and what it doesn't:
 *   - it works with zero infrastructure, and nothing is uploaded anywhere
 *   - a link is a snapshot: later edits don't reach people who already have it
 *   - "view only" is a mode the page honours, not a lock. The data is in the
 *     link, so anyone determined can read it. Real per-person permissions need
 *     accounts and a server.
 */
(function (TT) {
  "use strict";

  const share = TT.share = {};

  // ---------- base64url ----------
  function toB64Url(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function fromB64Url(s) {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
    return Uint8Array.from(bin, function (c) { return c.charCodeAt(0); });
  }

  // ---------- compact packing ----------
  function packDate(iso) {
    if (!iso) return 0;
    return Number(iso.slice(0, 4) + iso.slice(5, 7) + iso.slice(8, 10));
  }
  function unpackDate(n) {
    if (!n) return "";
    const s = String(n);
    return s.slice(0, 4) + "-" + s.slice(4, 6) + "-" + s.slice(6, 8);
  }
  function packTime(t) {
    if (!t) return -1;
    const parts = t.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  function unpackTime(n) {
    if (n == null || n < 0) return "";
    return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
  }

  /** [text, time, priority, done] with trailing defaults trimmed off. */
  function packPlan(p) {
    const row = [p.text || "", packTime(p.time), TT.PRIORITIES.indexOf(p.priority), p.done ? 1 : 0];
    while (row.length > 1) {
      const last = row[row.length - 1];
      const isDefault = (row.length === 4 && last === 0) ||
                        (row.length === 3 && last === 0) ||
                        (row.length === 2 && last === -1);
      if (!isDefault) break;
      row.pop();
    }
    return row;
  }
  function unpackPlan(row) {
    const pri = TT.PRIORITIES[row[2] || 0] || "normal";
    const p = TT.store.newPlan(row[0] || "", unpackTime(row[1]), pri);
    p.done = !!row[3];
    return p;
  }

  /** [date, collapsed, plans[]] — collapsed trimmed when false and no plans. */
  function packDay(d) {
    const row = [packDate(d.date), d.collapsed ? 1 : 0, d.plans.map(packPlan)];
    if (!row[2].length && !row[1]) row.length = 1;
    return row;
  }
  function unpackDay(row) {
    return {
      id: TT.uid(),
      date: unpackDate(row[0]),
      collapsed: !!row[1],
      plans: (row[2] || []).map(unpackPlan)
    };
  }

  /** @param mode "view" | "edit" */
  share.buildLink = function (mode) {
    const state = TT.store.state;
    const trip = TT.store.trip();
    const payload = [
      2,                                          // format version
      mode === "edit" ? 1 : 0,
      state.settings.lang === "vi" ? 1 : 0,
      state.settings.dateFormat === "mdy" ? 1 : 0,
      trip.name || "",
      trip.days.map(packDay)
    ];
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const base = location.origin + location.pathname;

    if (!canCompress()) return Promise.resolve(base + "#d=" + toB64Url(bytes));
    return deflate(bytes)
      .then(function (packed) { return base + "#z=" + toB64Url(packed); })
      .catch(function () { return base + "#d=" + toB64Url(bytes); });
  };

  // ---------- optional deflate ----------
  function canCompress() {
    return typeof CompressionStream === "function" && typeof Response === "function";
  }
  function deflate(bytes) {
    const cs = new CompressionStream("deflate-raw");
    return new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer()
      .then(function (buf) { return new Uint8Array(buf); });
  }
  function inflate(bytes) {
    const ds = new DecompressionStream("deflate-raw");
    return new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer()
      .then(function (buf) { return new Uint8Array(buf); });
  }

  function parsePayload(obj) {
    // v2: positional array. v1: the old {v,mode,settings,days} object.
    if (Array.isArray(obj)) {
      return {
        mode: obj[1] ? "edit" : "view",
        lang: obj[2] ? "vi" : "en",
        dateFormat: obj[3] ? "mdy" : "dmy",
        name: obj[4] || "",
        days: (obj[5] || []).map(unpackDay)
      };
    }
    if (obj && Array.isArray(obj.days)) {
      const s = obj.settings || {};
      return {
        mode: obj.mode === "edit" ? "edit" : "view",
        lang: s.lang === "vi" ? "vi" : "en",
        dateFormat: s.dateFormat === "mdy" ? "mdy" : "dmy",
        name: obj.name || "",
        days: TT.store.normalizeDays(obj.days)
      };
    }
    return null;
  }

  /** Returns a Promise of the shared trip, or null when there isn't one. */
  share.readFragment = function () {
    const hash = location.hash.replace(/^#/, "");
    const m = hash.match(/^(z|d)=(.+)$/);
    if (!m) return Promise.resolve(null);

    let bytes;
    try { bytes = fromB64Url(m[2]); }
    catch (e) { return Promise.resolve(null); }

    const raw = m[1] === "z" ? inflate(bytes) : Promise.resolve(bytes);
    return raw
      .then(function (out) { return JSON.parse(new TextDecoder().decode(out)); })
      .then(function (obj) {
        const parsed = parsePayload(obj);
        if (!parsed) return null;
        parsed.days = TT.store.normalizeDays(parsed.days);
        return parsed;
      })
      .catch(function (e) { console.error(e); return null; });
  };

  share.clearFragment = function () {
    history.replaceState(null, "", location.origin + location.pathname);
  };

  share.copy = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error("no clipboard api"));
  };
})(window.TT);
