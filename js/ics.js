/* iCalendar (.ics) export.
 *
 * Downloading a .ics file is the portable way onto a phone: Apple Calendar,
 * Google Calendar and Outlook all import one. It is a one-time import, not a
 * live subscription — a subscription needs a URL a calendar app can re-fetch
 * on a schedule, which needs a server this site doesn't have.
 *
 * Times are written "floating" (no timezone, no trailing Z), so 07:00 shows as
 * 07:00 wherever the phone happens to be. For a trip typed in local times that
 * is what people mean.
 */
(function (TT) {
  "use strict";

  const ics = TT.ics = {};
  const DEFAULT_MINUTES = 60;

  function esc(s) {
    return String(s)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");
  }

  /** RFC 5545 wants lines folded at 75 octets, continuations starting with a space. */
  function fold(line) {
    const bytes = new TextEncoder().encode(line);
    if (bytes.length <= 75) return line;
    const out = [];
    let chunk = "";
    let used = 0;
    for (const ch of line) {                       // iterate by code point, never split one
      const size = new TextEncoder().encode(ch).length;
      if (used + size > (out.length ? 74 : 75)) {
        out.push(chunk);
        chunk = "";
        used = 0;
      }
      chunk += ch;
      used += size;
    }
    if (chunk) out.push(chunk);
    return out[0] + out.slice(1).map(function (c) { return "\r\n " + c; }).join("");
  }

  function stamp(d) {
    return d.getUTCFullYear() +
      String(d.getUTCMonth() + 1).padStart(2, "0") +
      String(d.getUTCDate()).padStart(2, "0") + "T" +
      String(d.getUTCHours()).padStart(2, "0") +
      String(d.getUTCMinutes()).padStart(2, "0") +
      String(d.getUTCSeconds()).padStart(2, "0") + "Z";
  }
  const dateOnly = function (iso) { return iso.replace(/-/g, ""); };
  function localStamp(iso, minutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2, "0");
    const m = String(minutes % 60).padStart(2, "0");
    return dateOnly(iso) + "T" + h + m + "00";
  }
  function nextDay(iso) {
    const d = TT.parseLocalDate(iso);
    d.setDate(d.getDate() + 1);
    return TT.toISO(d);
  }

  ics.build = function (trip) {
    const now = stamp(new Date());
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Trip Timeline//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:" + esc(trip.name)
    ];

    trip.days.forEach(function (day) {
      if (!day.date) return;
      day.plans.forEach(function (p, i) {
        const text = (p.text || "").trim();
        if (!text && !p.time) return;

        const firstBreak = text.indexOf("\n");
        const summary = firstBreak < 0 ? text : text.slice(0, firstBreak);
        const rest = firstBreak < 0 ? "" : text.slice(firstBreak + 1);

        lines.push("BEGIN:VEVENT");
        lines.push("UID:" + day.id + "-" + i + "@trip-timeline");
        lines.push("DTSTAMP:" + now);

        if (p.time) {
          const start = Number(p.time.slice(0, 2)) * 60 + Number(p.time.slice(3, 5));
          lines.push("DTSTART:" + localStamp(day.date, start));
          lines.push("DTEND:" + localStamp(day.date, Math.min(start + DEFAULT_MINUTES, 24 * 60 - 1)));
        } else {
          // no time given: an all-day entry, which needs an exclusive end date
          lines.push("DTSTART;VALUE=DATE:" + dateOnly(day.date));
          lines.push("DTEND;VALUE=DATE:" + dateOnly(nextDay(day.date)));
        }

        const tag = p.priority === "must" ? TT.t("export.tag.must")
          : p.priority === "optional" ? TT.t("export.tag.optional") : "";
        lines.push("SUMMARY:" + esc((tag ? "[" + tag + "] " : "") + (summary || TT.t("plan.placeholder"))));
        if (rest) lines.push("DESCRIPTION:" + esc(rest));

        // 1 is the highest priority in RFC 5545, 9 the lowest
        if (p.priority === "must") lines.push("PRIORITY:1");
        else if (p.priority === "optional") lines.push("PRIORITY:9");
        if (p.done) lines.push("STATUS:CONFIRMED");
        lines.push("END:VEVENT");
      });
    });

    lines.push("END:VCALENDAR");
    return lines.map(fold).join("\r\n") + "\r\n";
  };

  ics.download = function (trip) {
    const text = ics.build(trip);
    const events = (text.match(/BEGIN:VEVENT/g) || []).length;
    if (!events) { TT.toast(TT.t("ics.nothing"), true); return 0; }

    const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (trip.name || "trip").replace(/[^\wÀ-ỹ .-]+/g, "").trim().slice(0, 60) + ".ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    TT.toast(TT.t("ics.done", { n: events }));
    return events;
  };
})(window.TT);
