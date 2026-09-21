/* Sharing by link.
 *
 * There is no server here — the site is static files on GitHub Pages — so a
 * share link carries the timeline *inside itself*, in the URL fragment. The
 * fragment is the one part of a URL browsers never send to the server, so the
 * trip stays between whoever holds the link.
 *
 * What that buys and what it doesn't:
 *   - it works with zero infrastructure, and nothing is uploaded anywhere
 *   - a link is a snapshot: later edits don't reach people who already have it
 *   - "view only" is a mode the page honours, not a lock. The data is in the
 *     link, so anyone determined can read it. Real per-person permissions need
 *     accounts and a server; see the note in the README.
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

  // ---------- optional deflate, so long trips make shorter links ----------
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

  /** @param mode "view" | "edit" */
  share.buildLink = function (mode) {
    const state = TT.store.state;
    const payload = {
      v: 1,
      mode: mode === "edit" ? "edit" : "view",
      settings: state.settings,
      days: state.days
    };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const base = location.origin + location.pathname;

    if (!canCompress()) {
      return Promise.resolve(base + "#d=" + toB64Url(bytes));
    }
    return deflate(bytes)
      .then(function (packed) { return base + "#z=" + toB64Url(packed); })
      .catch(function () { return base + "#d=" + toB64Url(bytes); });
  };

  /** Returns a Promise of the shared payload, or null when there isn't one. */
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
        const data = TT.store.normalize(obj);
        if (!data) return null;
        data.mode = obj.mode === "edit" ? "edit" : "view";
        return data;
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
