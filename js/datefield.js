/* A typed date field.
 *
 * Native <input type="date"> fights you: typing "1" for December immediately
 * commits January. This keeps a plain digit buffer instead, paints the slashes
 * in as you go ("12122026" -> "12/12/2026"), refuses impossible segments, and
 * stops accepting keystrokes once eight digits are in. The calendar button is
 * still there for anyone who would rather point at it.
 */
(function (TT) {
  "use strict";

  const PLACEHOLDER = { mdy: "MM/DD/YYYY", dmy: "DD/MM/YYYY" };

  /** Paint separators into a digit buffer; a completed segment gets its slash
   *  straight away so the caret is already past it. */
  function maskOf(d) {
    let s = d.slice(0, 2);
    if (d.length >= 2) s += "/";
    s += d.slice(2, 4);
    if (d.length >= 4) s += "/";
    s += d.slice(4, 8);
    return s;
  }

  function digitIndexForStr(str, pos) {
    let n = 0;
    for (let i = 0; i < pos && i < str.length; i++) if (str[i] >= "0" && str[i] <= "9") n++;
    return n;
  }

  function strIndexForDigit(d, n) {
    if (n <= 0) return 0;
    const s = maskOf(d);
    let count = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] >= "0" && s[i] <= "9") {
        count++;
        if (count === n) {
          let j = i + 1;
          while (j < s.length && s[j] === "/") j++;
          return j;
        }
      }
    }
    return s.length;
  }

  TT.DateField = function (opts) {
    opts = opts || {};
    const fmt = TT.store.dateFormat();
    const seg0max = fmt === "mdy" ? 12 : 31;   // month first in mdy, day first in dmy
    const seg1max = fmt === "mdy" ? 31 : 12;

    let digits = "";
    let done = false;   // guards against commit firing twice (Enter then blur)

    const root = TT.el("span", "datefield");
    const input = TT.el("input", "df-text");
    input.type = "text";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = PLACEHOLDER[fmt];
    input.setAttribute("aria-label", TT.t("date.label", { fmt: PLACEHOLDER[fmt] }));

    const cal = TT.el("button", "df-cal");
    cal.type = "button";
    cal.title = TT.t("date.pickCalendar");
    cal.setAttribute("aria-label", TT.t("date.pickCalendar"));
    cal.innerHTML = TT.ICON.calendar;

    const native = TT.el("input", "df-native");
    native.type = "date";
    native.tabIndex = -1;
    native.setAttribute("aria-hidden", "true");

    root.append(input, cal, native);

    // ---------- buffer <-> screen ----------
    function paint(caretDigit) {
      input.value = maskOf(digits);
      const pos = strIndexForDigit(digits, caretDigit);
      try { input.setSelectionRange(pos, pos); } catch (e) { /* not focused yet */ }
      root.classList.remove("invalid");
    }

    /** A two-digit segment has to be a real month/day; a lone digit is fine
     *  because it is still a prefix. The year may not start with 0. */
    function segmentsOk(d) {
      if (d.length >= 2) {
        const a = parseInt(d.slice(0, 2), 10);
        if (a < 1 || a > seg0max) return false;
      }
      if (d.length >= 4) {
        const b = parseInt(d.slice(2, 4), 10);
        if (b < 1 || b > seg1max) return false;
      }
      if (d.length >= 5 && d[4] === "0") return false;
      return true;
    }

    /** "5" can only be May, so close the segment and move on. "1" is left alone
     *  because the user may still be reaching for the 2 in December. */
    function autoPad(d) {
      if (d.length === 1 && parseInt(d, 10) * 10 > seg0max) return "0" + d;
      if (d.length === 3 && parseInt(d[2], 10) * 10 > seg1max) return d.slice(0, 2) + "0" + d[2];
      return d;
    }

    function selectionDigits() {
      const s = input.value;
      return [digitIndexForStr(s, input.selectionStart), digitIndexForStr(s, input.selectionEnd)];
    }

    function insertDigits(str) {
      const sel = selectionDigits();
      let d = digits.slice(0, sel[0]) + digits.slice(sel[1]);
      let caret = sel[0];
      for (let i = 0; i < str.length; i++) {
        if (d.length >= 8) break;                       // complete: ignore the rest
        const next = d.slice(0, caret) + str[i] + d.slice(caret);
        if (!segmentsOk(next)) continue;                // e.g. "19" as a month
        d = next; caret++;
        if (caret === d.length) {
          const padded = autoPad(d);
          if (padded !== d) { d = padded; caret = d.length; }
        }
      }
      digits = d;
      paint(caret);
    }

    function deleteDigits(forward) {
      const sel = selectionDigits();
      let a = sel[0], b = sel[1];
      if (a === b) {
        if (forward) { if (b >= digits.length) return; b = a + 1; }
        else { if (a === 0) return; a = a - 1; }
      }
      digits = digits.slice(0, a) + digits.slice(b);
      paint(a);
    }

    // ---------- validation ----------
    function toISO() {
      if (digits.length !== 8) return null;
      const first = parseInt(digits.slice(0, 2), 10);
      const second = parseInt(digits.slice(2, 4), 10);
      const year = parseInt(digits.slice(4, 8), 10);
      const month = fmt === "mdy" ? first : second;
      const day = fmt === "mdy" ? second : first;
      if (year < 1000 || month < 1 || month > 12) return null;
      if (day < 1 || day > TT.daysInMonth(year, month)) return null;   // catches Feb 30, leap years
      return year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    }

    function setISO(iso) {
      if (!iso) { digits = ""; paint(0); return; }
      const parts = iso.split("-");
      const mm = parts[1], dd = parts[2], yyyy = parts[0];
      digits = (fmt === "mdy" ? mm + dd : dd + mm) + yyyy;
      paint(8);
    }

    function flagInvalid(msg) {
      root.classList.add("invalid");
      TT.toast(msg || TT.t("date.invalid", { fmt: PLACEHOLDER[fmt] }), true);
    }

    function commit() {
      if (done) return;
      const iso = toISO();
      if (digits.length === 0) { done = true; if (opts.onCancel) opts.onCancel(); return; }
      if (!iso) { flagInvalid(); return; }
      done = true;
      if (opts.onCommit) opts.onCommit(iso);
    }

    function cancel() {
      if (done) return;
      done = true;
      if (opts.onCancel) opts.onCancel();
    }

    // ---------- events ----------
    input.addEventListener("beforeinput", function (e) {
      const t = e.inputType;
      if (t === "insertText" || t === "insertFromPaste" || t === "insertCompositionText" || t === "insertReplacementText") {
        e.preventDefault();
        const raw = e.data || (e.dataTransfer ? e.dataTransfer.getData("text") : "") || "";
        const incoming = raw.replace(/\D/g, "");
        if (incoming) insertDigits(incoming);
        return;
      }
      if (t.indexOf("delete") === 0) {
        e.preventDefault();
        deleteDigits(t.indexOf("Forward") > 0);
      }
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); commit(); return; }
      if (e.key === "Escape") { e.preventDefault(); cancel(); return; }
      // "/" or "-" closes the current segment early: "1/" becomes "01/"
      if (e.key === "/" || e.key === "-") {
        e.preventDefault();
        if (digits.length === 1 || digits.length === 3) {
          digits = digits.length === 1 ? "0" + digits : digits.slice(0, 2) + "0" + digits[2];
          paint(digits.length);
        }
      }
    });

    input.addEventListener("blur", function () {
      // let a click on the calendar button through without committing
      setTimeout(function () {
        if (done || root.contains(document.activeElement)) return;
        if (opts.commitOnBlur === false) return;
        commit();
      }, 0);
    });

    cal.addEventListener("mousedown", function (e) { e.preventDefault(); });
    cal.addEventListener("click", function () {
      native.value = toISO() || "";
      try { native.showPicker(); }
      catch (e) { native.focus(); native.click(); }
    });
    native.addEventListener("change", function () {
      if (!native.value) return;
      setISO(native.value);
      commit();
    });

    setISO(opts.value || "");
    done = false;

    return {
      root: root,
      input: input,
      focus: function () { input.focus(); input.setSelectionRange(input.value.length, input.value.length); },
      getISO: toISO,
      setISO: setISO,
      placeholder: PLACEHOLDER[fmt]
    };
  };
})(window.TT);
