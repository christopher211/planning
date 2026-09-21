/* English and Vietnamese strings.
 *
 * TT.t("key", {name: value}) looks a string up in the active language and
 * fills {placeholders}. Missing keys fall back to English, then to the key
 * itself, so a half-finished translation still renders something useful.
 */
(function (TT) {
  "use strict";

  const STRINGS = {
    en: {
      "trip.untitled": "Untitled trip",
      "trip.newName": "Name your new trip",
      "trip.renameTitle": "Rename this trip",
      "trip.copyOf": "{name} (copy)",
      "trip.switch": "Switch trip",
      "trip.title": "Your trips",
      "trip.new": "+ New trip",
      "trip.rename": "rename",
      "trip.duplicate": "duplicate",
      "trip.delete": "Delete trip",
      "trip.deleteConfirm": "Delete \u201C{name}\u201D and everything in it? This can't be undone.",
      "trip.favorite": "Add to favourites",
      "trip.unfavorite": "Remove from favourites",
      "trip.noDates": "no dates yet",
      "trip.counts": "{days} days \u00B7 {done}/{total} done",

      "day.collapse": "Collapse this day",
      "day.expand": "Expand this day",
      "day.planCount": "{n} plans",
      "btn.collapseAll": "collapse all",
      "btn.expandAll": "expand all",

      "view.timeline": "Timeline",
      "view.calendar": "Calendar",
      "view.label": "View",
      "cal.more": "+{n} more",

      "btn.calendarExport": "Calendar file",
      "btn.calendarExport.title": "Download a .ics file you can import into Apple, Google or Outlook calendars",
      "ics.done": "Downloaded {n} events. Open the file to add them to your calendar.",
      "ics.nothing": "Nothing to export yet \u2014 add some plans first.",

      "title.1": "Trip",
      "title.2": "Timeline",
      "tagline": "Drag a day to reshuffle it — dates always stay in trip order. Flag what's a must and what can slip.",

      "btn.openPdf": "Open PDF",
      "btn.exportPdf": "Export PDF",
      "btn.exporting": "Creating PDF…",
      "btn.clearAll": "clear all",
      "btn.share": "Share",
      "btn.sortByDate": "sort by date",
      "btn.sortByDate.title": "Put the day sections back in date order and each day's plans in time order",
      "btn.sortByTime": "sort by time",
      "btn.sortByTime.title": "Order this day's plans by their time",
      "btn.addDay": "Add day",
      "btn.addPlan": "+ add plan",
      "btn.add": "Add",
      "btn.cancel": "Cancel",
      "btn.close": "Close",

      "day.setDate": "Set a date",
      "day.changeDate": "Click to type a new date",
      "day.remove": "Remove day",
      "day.move": "Move day",
      "day.move.title": "Drag to move this day (or use ↑ ↓ keys). Dates stay in trip order.",
      "day.doneCount": "{done}/{total} done",
      "day.mustCount": "{n} must",
      "day.mustCount.title": "{n} must-do plans still open",

      "plan.placeholder": "What's the plan?",
      "plan.remove": "Remove plan",
      "plan.move": "Move plan",
      "plan.move.title": "Drag to move (or use ↑ ↓ keys)",
      "plan.markDone": "Mark as done",
      "plan.time": "Time",
      "plans.empty": "No plans yet",
      "plans.dropHere": "Drop a plan here",

      "empty.title": "No days yet",
      "empty.body": "Add your first day to start planning.",

      "pri.must.blurb": "must do — don't miss it",
      "pri.must.hint": "Must do — click to mark as if-time",
      "pri.must.aria": "Priority: must do. Click to mark as if-time.",
      "pri.optional.blurb": "if time — safe to skip when the day runs long",
      "pri.optional.hint": "If time (skippable) — click to clear the flag",
      "pri.optional.aria": "Priority: if time. Click to clear the flag.",
      "pri.normal.blurb": "no flag — an ordinary plan",
      "pri.normal.hint": "Unflagged — click to mark as must-do",
      "pri.normal.aria": "Priority: none. Click to flag as must-do.",

      "date.label": "Date, {fmt}",
      "date.pickCalendar": "Pick from a calendar",
      "date.invalid": "That isn't a real date — expected {fmt}.",
      "date.needFull": "Enter a full date as {fmt}.",
      "date.taken": "{date} is already on the timeline.",
      "date.fmtChanged": "Dates are now typed as {fmt}.",
      "fmt.label": "Date entry format",
      "lang.label": "Language",

      "toast.movedTo": "Moved to {date} — everything else shifted to keep dates in order.",
      "toast.movedToShort": "Moved to {date} — dates stay in order.",
      "toast.sorted": "Days back in date order, each day's plans back in time order.",
      "toast.alreadySorted": "Already in date and time order.",

      "confirm.removeDay": "Remove this day and its plans?",
      "confirm.clearAll": "Clear the whole timeline? This can't be undone.",
      "confirm.replace": "Replace your current timeline with the one in “{name}”?",

      "pdf.none": "No timeline found in this PDF. Only PDFs saved with the Export PDF button can be opened.",
      "pdf.bad": "This PDF couldn't be read. It may be damaged, try exporting it again.",
      "pdf.opened": "Opened {days} days and {plans} plans. Edit away, then export again.",

      "export.title": "Trip Timeline",
      "export.on": "Exported {date}",
      "export.legend": "MUST = don't miss it · IF TIME = safe to skip if the day runs long",
      "export.tag.must": "must",
      "export.tag.optional": "if time",
      "export.noDays": "No days planned yet.",
      "export.noPlans": "No plans yet",
      "export.noDate": "No date",

      "share.title": "Share this timeline",
      "share.body": "The link carries a snapshot of your timeline inside it. Nothing is uploaded anywhere — the data rides in the part of the URL that never reaches a server.",
      "share.mode.view": "Anyone with the link can view",
      "share.mode.edit": "Anyone with the link can edit their own copy",
      "share.copy": "Copy link",
      "share.copied": "Link copied.",
      "share.copyFailed": "Couldn't copy automatically — select the link and copy it.",
      "share.note": "Heads up: this is a snapshot, not a live document. Changes you make after sharing won't reach people who already have the link, and view-only is a courtesy, not a lock — anyone determined can read the data out of the link.",
      "share.tooLong": "This link is very long ({n} characters) and some apps will cut it short. Consider exporting a PDF instead.",
      "banner.view": "You're viewing a shared timeline — read-only.",
      "banner.edit": "You're viewing a shared timeline. Save a copy to keep any changes.",
      "banner.save": "Save as my timeline",
      "banner.leave": "Back to my timeline",
      "banner.saved": "Saved as your timeline.",
      "share.badLink": "That shared link couldn't be read. It may have been cut short."
    },

    vi: {
      "trip.untitled": "Chuy\u1EBFn \u0111i ch\u01B0a \u0111\u1EB7t t\u00EAn",
      "trip.newName": "\u0110\u1EB7t t\u00EAn cho chuy\u1EBFn \u0111i m\u1EDBi",
      "trip.renameTitle": "\u0110\u1ED5i t\u00EAn chuy\u1EBFn \u0111i",
      "trip.copyOf": "{name} (b\u1EA3n sao)",
      "trip.switch": "Chuy\u1EC3n chuy\u1EBFn \u0111i",
      "trip.title": "C\u00E1c chuy\u1EBFn \u0111i c\u1EE7a b\u1EA1n",
      "trip.new": "+ Chuy\u1EBFn \u0111i m\u1EDBi",
      "trip.rename": "\u0111\u1ED5i t\u00EAn",
      "trip.duplicate": "nh\u00E2n b\u1EA3n",
      "trip.delete": "Xo\u00E1 chuy\u1EBFn \u0111i",
      "trip.deleteConfirm": "Xo\u00E1 \u201C{name}\u201D c\u00F9ng to\u00E0n b\u1ED9 n\u1ED9i dung? Kh\u00F4ng th\u1EC3 ho\u00E0n t\u00E1c.",
      "trip.favorite": "Th\u00EAm v\u00E0o y\u00EAu th\u00EDch",
      "trip.unfavorite": "B\u1ECF kh\u1ECFi y\u00EAu th\u00EDch",
      "trip.noDates": "ch\u01B0a c\u00F3 ng\u00E0y",
      "trip.counts": "{days} ng\u00E0y \u00B7 {done}/{total} xong",

      "day.collapse": "Thu g\u1ECDn ng\u00E0y n\u00E0y",
      "day.expand": "M\u1EDF r\u1ED9ng ng\u00E0y n\u00E0y",
      "day.planCount": "{n} vi\u1EC7c",
      "btn.collapseAll": "thu g\u1ECDn t\u1EA5t c\u1EA3",
      "btn.expandAll": "m\u1EDF r\u1ED9ng t\u1EA5t c\u1EA3",

      "view.timeline": "D\u00F2ng th\u1EDDi gian",
      "view.calendar": "L\u1ECBch",
      "view.label": "Ki\u1EC3u xem",
      "cal.more": "+{n} n\u1EEFa",

      "btn.calendarExport": "Th\u00EAm v\u00E0o l\u1ECBch",
      "btn.calendarExport.title": "T\u1EA3i t\u1EC7p .ics \u0111\u1EC3 nh\u1EADp v\u00E0o l\u1ECBch Apple, Google ho\u1EB7c Outlook",
      "ics.done": "\u0110\u00E3 t\u1EA3i {n} s\u1EF1 ki\u1EC7n. M\u1EDF t\u1EC7p \u0111\u1EC3 th\u00EAm v\u00E0o l\u1ECBch.",
      "ics.nothing": "Ch\u01B0a c\u00F3 g\u00EC \u0111\u1EC3 xu\u1EA5t \u2014 h\u00E3y th\u00EAm v\u00E0i vi\u1EC7c tr\u01B0\u1EDBc.",

      "title.1": "Lịch Trình",
      "title.2": "Chuyến Đi",
      "tagline": "Kéo một ngày để sắp xếp lại — ngày tháng luôn giữ đúng thứ tự chuyến đi. Đánh dấu việc bắt buộc và việc có thể bỏ qua.",

      "btn.openPdf": "Mở PDF",
      "btn.exportPdf": "Xuất PDF",
      "btn.exporting": "Đang tạo PDF…",
      "btn.clearAll": "xoá tất cả",
      "btn.share": "Chia sẻ",
      "btn.sortByDate": "sắp theo ngày",
      "btn.sortByDate.title": "Đưa các ngày về đúng thứ tự ngày tháng và các việc về đúng thứ tự giờ",
      "btn.sortByTime": "sắp theo giờ",
      "btn.sortByTime.title": "Sắp các việc trong ngày này theo giờ",
      "btn.addDay": "Thêm ngày",
      "btn.addPlan": "+ thêm việc",
      "btn.add": "Thêm",
      "btn.cancel": "Huỷ",
      "btn.close": "Đóng",

      "day.setDate": "Chọn ngày",
      "day.changeDate": "Bấm để nhập ngày mới",
      "day.remove": "Xoá ngày",
      "day.move": "Di chuyển ngày",
      "day.move.title": "Kéo để chuyển ngày này (hoặc dùng phím ↑ ↓). Ngày tháng vẫn giữ đúng thứ tự.",
      "day.doneCount": "{done}/{total} xong",
      "day.mustCount": "{n} bắt buộc",
      "day.mustCount.title": "Còn {n} việc bắt buộc chưa xong",

      "plan.placeholder": "Dự định làm gì?",
      "plan.remove": "Xoá việc",
      "plan.move": "Di chuyển việc",
      "plan.move.title": "Kéo để di chuyển (hoặc dùng phím ↑ ↓)",
      "plan.markDone": "Đánh dấu hoàn thành",
      "plan.time": "Giờ",
      "plans.empty": "Chưa có việc nào",
      "plans.dropHere": "Thả việc vào đây",

      "empty.title": "Chưa có ngày nào",
      "empty.body": "Thêm ngày đầu tiên để bắt đầu lên kế hoạch.",

      "pri.must.blurb": "bắt buộc — đừng bỏ lỡ",
      "pri.must.hint": "Bắt buộc — bấm để chuyển sang nếu kịp",
      "pri.must.aria": "Mức ưu tiên: bắt buộc. Bấm để chuyển sang nếu kịp.",
      "pri.optional.blurb": "nếu kịp — có thể bỏ qua khi hết giờ",
      "pri.optional.hint": "Nếu kịp (có thể bỏ qua) — bấm để xoá đánh dấu",
      "pri.optional.aria": "Mức ưu tiên: nếu kịp. Bấm để xoá đánh dấu.",
      "pri.normal.blurb": "không đánh dấu — việc thường",
      "pri.normal.hint": "Chưa đánh dấu — bấm để đặt thành bắt buộc",
      "pri.normal.aria": "Mức ưu tiên: không. Bấm để đặt thành bắt buộc.",

      "date.label": "Ngày, {fmt}",
      "date.pickCalendar": "Chọn từ lịch",
      "date.invalid": "Ngày không hợp lệ — cần dạng {fmt}.",
      "date.needFull": "Nhập đủ ngày theo dạng {fmt}.",
      "date.taken": "{date} đã có trong lịch trình.",
      "date.fmtChanged": "Giờ nhập ngày theo dạng {fmt}.",
      "fmt.label": "Định dạng ngày",
      "lang.label": "Ngôn ngữ",

      "toast.movedTo": "Đã chuyển sang {date} — các ngày khác dịch theo để giữ đúng thứ tự.",
      "toast.movedToShort": "Đã chuyển sang {date} — ngày tháng vẫn đúng thứ tự.",
      "toast.sorted": "Các ngày đã về đúng thứ tự ngày tháng, các việc về đúng thứ tự giờ.",
      "toast.alreadySorted": "Đã đúng thứ tự ngày và giờ.",

      "confirm.removeDay": "Xoá ngày này cùng các việc trong đó?",
      "confirm.clearAll": "Xoá toàn bộ lịch trình? Không thể hoàn tác.",
      "confirm.replace": "Thay lịch trình hiện tại bằng nội dung trong “{name}”?",

      "pdf.none": "Không tìm thấy lịch trình trong PDF này. Chỉ mở được PDF đã xuất bằng nút Xuất PDF.",
      "pdf.bad": "Không đọc được PDF này. Có thể tệp đã hỏng, hãy thử xuất lại.",
      "pdf.opened": "Đã mở {days} ngày và {plans} việc. Cứ chỉnh sửa rồi xuất lại.",

      "export.title": "Lịch trình chuyến đi",
      "export.on": "Xuất ngày {date}",
      "export.legend": "BẮT BUỘC = đừng bỏ lỡ · NẾU KỊP = có thể bỏ qua nếu hết giờ",
      "export.tag.must": "bắt buộc",
      "export.tag.optional": "nếu kịp",
      "export.noDays": "Chưa lên kế hoạch ngày nào.",
      "export.noPlans": "Chưa có việc nào",
      "export.noDate": "Chưa có ngày",

      "share.title": "Chia sẻ lịch trình",
      "share.body": "Liên kết mang theo một bản chụp lịch trình bên trong nó. Không có gì được tải lên đâu cả — dữ liệu nằm ở phần URL không bao giờ gửi tới máy chủ.",
      "share.mode.view": "Ai có liên kết đều xem được",
      "share.mode.edit": "Ai có liên kết có thể sửa bản sao của họ",
      "share.copy": "Sao chép liên kết",
      "share.copied": "Đã sao chép liên kết.",
      "share.copyFailed": "Không tự sao chép được — hãy bôi đen liên kết rồi sao chép.",
      "share.note": "Lưu ý: đây là bản chụp, không phải tài liệu trực tiếp. Những thay đổi sau khi chia sẻ sẽ không đến được người đã có liên kết, và chế độ chỉ xem là phép lịch sự chứ không phải khoá — ai quyết tâm vẫn đọc được dữ liệu trong liên kết.",
      "share.tooLong": "Liên kết này rất dài ({n} ký tự) và một số ứng dụng sẽ cắt bớt. Cân nhắc xuất PDF thay thế.",
      "banner.view": "Bạn đang xem lịch trình được chia sẻ — chỉ đọc.",
      "banner.edit": "Bạn đang xem lịch trình được chia sẻ. Lưu một bản sao để giữ thay đổi.",
      "banner.save": "Lưu thành lịch trình của tôi",
      "banner.leave": "Về lịch trình của tôi",
      "banner.saved": "Đã lưu thành lịch trình của bạn.",
      "share.badLink": "Không đọc được liên kết chia sẻ này. Có thể liên kết đã bị cắt ngắn."
    }
  };

  TT.LANGS = ["en", "vi"];
  TT.LANG_LABEL = { en: "EN", vi: "VI" };

  TT.lang = function () {
    const s = TT.store && TT.store.state && TT.store.state.settings;
    return s && s.lang === "vi" ? "vi" : "en";
  };

  TT.locale = function () { return TT.lang() === "vi" ? "vi-VN" : "en-US"; };

  TT.t = function (key, params) {
    const lang = TT.lang();
    let s = STRINGS[lang][key];
    if (s == null) s = STRINGS.en[key];
    if (s == null) return key;
    if (!params) return s;
    return s.replace(/\{(\w+)\}/g, function (m, name) {
      return params[name] != null ? params[name] : m;
    });
  };
})(window.TT);
