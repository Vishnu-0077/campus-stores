(() => {
  const storageKey = "campus-stores.shift.v1";
  const root = document.getElementById("campus-stores");
  const q = (selector) => root.querySelector(selector);
  const requests = [
    {
      id: "RQ-214",
      club: "Film Society",
      event: "Courtyard screening",
      owner: "Isha Rao",
      due: "Fri 8 pm",
      items: ["HDMI projector", "Portable speaker", "USB-C → HDMI adapter"],
      note: "Playback is from a USB-C-only laptop. The host will collect at 4 pm.",
    },
    {
      id: "RQ-209",
      club: "Debate Union",
      event: "Finals rehearsal",
      owner: "Tara Shah",
      due: "Sat 10 am",
      items: ["Wireless microphone"],
      note: "Rehearsal runs into the evening.",
    },
    {
      id: "RQ-217",
      club: "Photo Circle",
      event: "Street portrait walk",
      owner: "Dev Menon",
      due: "Sat noon",
      items: ["Digital camera"],
      note: "Collection on Saturday morning.",
    },
  ];
  const assets = [
    { id: "PR-04", type: "HDMI projector", model: "BenQ MH550", bin: "A2" },
    {
      id: "PR-06",
      type: "HDMI projector",
      model: "Epson EB-X49",
      bin: "Workshop",
      repair: true,
    },
    { id: "SP-02", type: "Portable speaker", model: "JBL Eon One", bin: "B1" },
    { id: "SP-05", type: "Portable speaker", model: "Bose S1", bin: "B2" },
    {
      id: "AD-12",
      type: "USB-C → HDMI adapter",
      model: "Belkin AVC002",
      bin: "C4",
    },
    {
      id: "AD-15",
      type: "USB-C → HDMI adapter",
      model: "Anker A8312",
      bin: "C4",
    },
    { id: "MI-09", type: "Wireless microphone", model: "Shure BLX", bin: "B3" },
    { id: "CA-03", type: "Digital camera", model: "Sony A6400", bin: "D2" },
  ];
  const people = [
    "Isha Rao",
    "Kabir Sen",
    "Leela Das",
    "Tara Shah",
    "Dev Menon",
  ];
  const shifts = [
    {
      time: "Friday · 3:45 pm",
      title: "Pickup at the counter",
      text: "Kabir is here for the Film Society screening. The film starts at four. Can he leave with everything he needs?",
      next: "Move to return time",
    },
    {
      time: "Friday · 7:30 pm",
      title: "The kit comes back in pieces",
      text: "Kabir has brought back the projector and speaker. “Leela still has the adapter. She’ll drop it off tomorrow at nine.” Take the return and hand over to the morning shift.",
      next: "Move to next morning",
    },
    {
      time: "Saturday · 9:00 am",
      title: "Morning shift",
      text: "You’ve just taken over. Leela walks in with an adapter. Work out what was outstanding from the screening and close the loan for the right item.",
    },
  ];
  // Prototype: a rough ordering of desk times so the register can flag overdue slips.
  const phaseRank = [0.5, 0.9, 2];
  const timeRank = { "Fri 8 pm": 1, "Sat 9 am": 2, "Sat 10 am": 3, "Sat noon": 4 };
  const returnTimes = Object.keys(timeRank);
  const pages = [
    ["Requests", "clipboard-list"],
    ["Inventory", "package"],
    ["Loan register", "book-open"],
    ["Desk book", "messages-square"],
  ];
  const original = () => ({
    version: 1,
    tab: "Requests",
    phase: 0,
    selected: "",
    returning: "",
    counter: "",
    filter: "All items",
    loans: [
      {
        num: 401,
        req: "RQ-209",
        asset: "MI-09",
        who: "Tara Shah",
        due: "Sat 10 am",
        back: false,
      },
    ],
    notes: [],
    editing: false,
    onlyOpen: true,
    notice: "Sample shift · All records are fictional.",
  });
  let s = original();
  const getAsset = (id) => assets.find((x) => x.id === id);
  const getReq = (id) => requests.find((x) => x.id === id);
  const out = (id) => s.loans.find((l) => l.asset === id && !l.back);
  const esc = (x) =>
    String(x).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const opts = (list) =>
    list
      .map(([v, t]) => '<option value="' + esc(v) + '">' + esc(t) + "</option>")
      .join("");
  const btn = (label, act, val = "", style = "") =>
    '<button type="button" data-action="' +
    act +
    '" data-val="' +
    esc(val) +
    '" class="' +
    style +
    '">' +
    esc(label) +
    "</button>";
  const head = (title, sub, control = "") =>
    '<div class="sectionhead"><div><h2>' +
    title +
    "</h2><small>" +
    sub +
    "</small></div>" +
    control +
    "</div>";
  const row = (label, sub, right) =>
    '<div class="row"><div><strong>' +
    esc(label) +
    "</strong><small>" +
    esc(sub) +
    "</small></div><div>" +
    right +
    "</div></div>";
  const badge = (t, good = false, cls = "") =>
    '<span class="tag' +
    (good ? " good" : "") +
    (cls ? " " + cls : "") +
    '">' +
    esc(t) +
    "</span>";
  // A <select> with a placeholder and a preselected value. `attr` names it.
  const pick = (attr, list, value = "", placeholder = "Select…") =>
    "<select " +
    attr +
    '><option value="">' +
    esc(placeholder) +
    "</option>" +
    list
      .map(
        (v) =>
          '<option value="' +
          esc(v) +
          '"' +
          (v === value ? " selected" : "") +
          ">" +
          esc(v) +
          "</option>",
      )
      .join("") +
    "</select>";
  const overdue = (l) => !l.back && phaseRank[s.phase] > timeRank[l.due];
  const holderOf = (l) => l.holder || l.who;
  const expectedOf = (l) => l.expected || l.due;
  const unitName = (l) => getAsset(l.asset).type + " " + l.asset;
  // Prototype: the action the next shift should take on a unit left out after a partial return.
  const nextStep = (l) => {
    const a = getAsset(l.asset);
    return (
      "Collect " + a.id + " (" + a.model + ") from " + l.holder + " at " +
      l.expected + " · confirm the tag · put back on shelf " + a.bin
    );
  };
  const nextLine = (l) =>
    !l.back && l.holder
      ? '<p class="nextstep"><b>Next:</b> ' + esc(nextStep(l)) + "</p>"
      : "";
  // Where a unit is right now, in words the next shift can act on.
  const whereabouts = (l) => {
    if (l.back)
      return "Returned" + (l.returnedBy ? " by " + l.returnedBy : "");
    if (l.holder)
      return "Still out · with " + l.holder + " · expected " + l.expected;
    return "Out · with " + l.who + " · due " + l.due;
  };
  function requestPage() {
    let html = head(
      "Approved requests",
      "Student Activities Office · 3 approved forms",
    );
    if (s.selected) {
      const r = getReq(s.selected);
      html +=
        btn("Back to list", "close") +
        '<div class="record"><small>' +
        r.id +
        " · Approved</small><h3>" +
        r.event +
        "</h3><p>" +
        r.club +
        " · Filed by " +
        r.owner +
        "</p><p><b>Return by</b> " +
        r.due +
        "</p><p><b>Approved equipment · kit status</b></p><ul>" +
        r.items
          .map((x) => {
            const slips = s.loans.filter(
              (l) => l.req === r.id && getAsset(l.asset).type === x,
            );
            const l = slips.find((l) => !l.back) || slips[slips.length - 1];
            return (
              "<li>" +
              esc(x) +
              " · " +
              (l
                ? esc(l.asset + " · " + whereabouts(l)) +
                  (overdue(l) ? " " + badge("Overdue", false, "warn") : "")
                : "Not issued") +
              "</li>"
            );
          })
          .join("") +
        "</ul><p>" +
        r.note +
        "</p></div>";
    } else
      html += requests
        .map((r) =>
          row(
            r.event,
            r.id + " · " + r.club,
            btn("View form", "request", r.id),
          ),
        )
        .join("");
    return html;
  }
  function inventory() {
    let html = head(
      "Inventory",
      "Physical units · home shelf and current availability",
    );
    html +=
      '<div class="buttons"><label>Show <select data-filter>' +
      opts(
        ["All items", "On shelf", "On loan", "In repair"].map((f) => [f, f]),
      ) +
      "</select></label></div>";
    for (const a of assets) {
      const status = a.repair
        ? "In repair"
        : out(a.id)
          ? "On loan"
          : "On shelf";
      if (s.filter !== "All items" && s.filter !== status) continue;
      html += row(
        a.id + " · " + a.type,
        a.model + " · " + a.bin,
        badge(status, status === "On shelf"),
      );
    }
    return html;
  }
  function register() {
    let html = head(
      "Loan register",
      "One slip per physical unit",
      s.editing || s.returning
        ? btn("Cancel", "cancel")
        : btn("New issue slip", "new", "", "primary"),
    );
    if (s.returning) return html + returnForm();
    if (!s.editing) html += expectedPanel() + counterPanel();
    if (s.editing) {
      const available = assets.filter((a) => !a.repair && !out(a.id));
      const select = (label, key, options) =>
        "<label><span>" +
        label +
        '</span><select name="' +
        key +
        '" required><option value="">Select…</option>' +
        opts(options) +
        "</select></label>";
      return (
        html +
        '<form data-issue><div class="form">' +
        select(
          "Approved request",
          "req",
          requests.map((r) => [r.id, r.id + " · " + r.club]),
        ) +
        select(
          "Unit leaving the desk",
          "asset",
          available.map((a) => [a.id, a.id + " · " + a.type]),
        ) +
        select(
          "Collected by",
          "who",
          people.map((p) => [p, p]),
        ) +
        select(
          "Return by",
          "due",
          ["Fri 8 pm", "Sat 9 am", "Sat 10 am", "Sat noon"].map((d) => [d, d]),
        ) +
        '</div><button type="submit" class="primary">Save issue slip</button></form>'
      );
    }
    html +=
      '<div class="buttons">' +
      ["Outstanding", "All slips"]
        .map(
          (v, i) =>
            '<button type="button" data-action="scope" data-val="' +
            i +
            '" aria-pressed="' +
            (s.onlyOpen === (i === 0)) +
            '">' +
            v +
            "</button>",
        )
        .join("") +
      "</div>";
    const shown = s.loans
      .filter((l) => !s.onlyOpen || !l.back)
      .slice()
      .reverse();
    if (!shown.length) html += "<p>No outstanding slips.</p>";
    for (const l of shown) {
      const a = getAsset(l.asset);
      html += row(
        "L-" + l.num + " · " + a.type,
        a.id +
          " · " +
          a.model +
          " · " +
          l.req +
          " · Issued to " +
          l.who +
          " · Due " +
          l.due,
        '<div class="slipstate">' +
          (overdue(l) ? badge("Overdue since " + l.due, false, "warn") : "") +
          (l.back
            ? badge(whereabouts(l))
            : (l.holder ? badge(whereabouts(l), false, "out") : "") +
              btn("Record return", "return", l.req)) +
          "</div>",
      );
      html += nextLine(l);
    }
    return html;
  }
  // Prototype: everything due back at the desk, soonest first, with who is bringing it.
  function expectedPanel() {
    const open = s.loans
      .filter((l) => !l.back)
      .sort((a, b) => timeRank[expectedOf(a)] - timeRank[expectedOf(b)]);
    if (!open.length) return "";
    return (
      '<div class="record expect"><small>Expected at the counter</small><ul>' +
      open
        .map(
          (l) =>
            "<li><b>" +
            esc(expectedOf(l)) +
            "</b> · " +
            esc(unitName(l) + " from " + holderOf(l)) +
            (overdue(l) ? " " + badge("Overdue since " + l.due, false, "warn") : "") +
            "</li>",
        )
        .join("") +
      "</ul></div>"
    );
  }
  // Prototype: start from the person at the counter, not the slip number.
  function counterPanel() {
    let html =
      '<div class="buttons"><label>Who’s at the counter? ' +
      pick("data-counter", people, s.counter, "Choose a person…") +
      "</label></div>";
    if (!s.counter) return html;
    const mine = s.loans.filter((l) => !l.back && holderOf(l) === s.counter);
    const passedOn = s.loans.filter(
      (l) => !l.back && l.who === s.counter && l.holder && l.holder !== s.counter,
    );
    html += '<div class="record counter"><h3>With ' + esc(s.counter) + "</h3>";
    if (!mine.length) html += "<p>Nothing on loan is with them.</p>";
    for (const l of mine) {
      const a = getAsset(l.asset);
      html += row(
        unitName(l) + " · " + a.model,
        l.req +
          " · slip L-" +
          l.num +
          (l.who !== s.counter ? " · issued to " + l.who : "") +
          " · expected " +
          expectedOf(l),
        '<div class="slipstate">' +
          (overdue(l) ? badge("Overdue", false, "warn") : "") +
          btn("Take return", "return", l.req, "primary") +
          "</div>",
      );
      html += nextLine(l);
    }
    for (const l of passedOn)
      html +=
        "<p><small>Issued to them but now with " +
        esc(l.holder) +
        ": " +
        esc(unitName(l)) +
        ", expected " +
        esc(l.expected) +
        ".</small></p>";
    return html + "</div>";
  }
  // Prototype: return a request's kit as one checklist. Anything not on the
  // counter must be given a current holder and an expected time; anything ticked
  // must have its tag confirmed so the right slip closes.
  function returnForm() {
    const r = getReq(s.returning);
    const open = s.loans.filter((l) => l.req === r.id && !l.back);
    const lastHolder = open.find((l) => l.holder);
    const by =
      s.counter || (lastHolder ? lastHolder.holder : open[0] ? open[0].who : "");
    return (
      '<form data-return><div class="record"><small>' +
      esc(r.id + " · " + r.club) +
      "</small><h3>Return · " +
      esc(r.event) +
      "</h3><p>Tick each unit that is on the counter now and type the tag printed on it. For anything still out, record who has it and when it is coming back.</p></div>" +
      '<div class="form"><label><span>Returned by</span>' +
      pick('name="by"', people, by) +
      "</label></div>" +
      '<datalist id="tags">' +
      assets.map((a) => '<option value="' + esc(a.id) + '"></option>').join("") +
      "</datalist>" +
      open
        .map((l) => {
          const a = getAsset(l.asset);
          return (
            '<fieldset class="checkitem"><label class="check"><input type="checkbox" name="back" value="' +
            l.num +
            '" /><span><strong>' +
            esc(a.type) +
            "</strong><small>Slip L-" +
            l.num +
            " is for " +
            esc(a.id) +
            " · " +
            esc(a.model) +
            " · shelf " +
            esc(a.bin) +
            (l.holder ? " · with " + esc(l.holder) : "") +
            (overdue(l) ? " · overdue since " + esc(l.due) : "") +
            '</small></span></label><div class="form tagcheck"><label><span>Tag on the unit in hand</span><input name="tag-' +
            l.num +
            '" list="tags" autocomplete="off" placeholder="e.g. ' +
            esc(a.id.slice(0, 3)) +
            '…" /></label></div><div class="form stillout"><label><span>Who has it now?</span>' +
            pick('name="holder-' + l.num + '"', people, l.holder || "") +
            "</label><label><span>Expected back</span>" +
            pick('name="expected-' + l.num + '"', returnTimes, l.expected || "") +
            "</label></div></fieldset>"
          );
        })
        .join("") +
      '<button type="submit" class="primary">Save return</button></form>'
    );
  }
  function deskbook() {
    let html = head(
      "Desk book",
      "Messages from clubs and notes for the next shift",
    );
    const entries = [
      [
        "Friday · 3:20 pm",
        "Isha Rao · Film Society",
        "Kabir Sen is picking up our whole screening kit. Please issue it in his name. I’m setting up in the courtyard.",
      ],
      [
        "Friday · 3:30 pm",
        "Tara Shah · Debate Union",
        "Our microphone stays with me overnight. I’ll return it by 10 am Saturday.",
      ],
    ];
    if (s.phase >= 1)
      entries.push([
        "Friday · 7:30 pm",
        "Kabir Sen · Film Society",
        "I brought the projector and speaker. Leela Das has our adapter. She’ll be at the counter at 9 am tomorrow.",
      ]);
    for (const n of s.notes)
      entries.push([
        shifts[n.phase].time,
        n.auto ? "Counter handover · recorded with the return" : "Counter handover",
        n.text,
      ]);
    for (const [t, author, body] of entries.slice().reverse())
      html +=
        '<article class="record"><small>' +
        esc(t) +
        "</small><h3>" +
        esc(author) +
        "</h3><p>" +
        esc(body) +
        "</p></article>";
    return (
      html +
      '<form data-note><div class="form"><label class="full"><span>Note for the next shift</span><textarea name="note" rows="2" maxlength="400" required></textarea></label></div><button type="submit">Add handover note</button></form>'
    );
  }
  const screens = {
    Requests: requestPage,
    Inventory: inventory,
    "Loan register": register,
    "Desk book": deskbook,
  };
  function paint() {
    const phase = shifts[s.phase];
    q("[data-clock]").textContent = phase.time;
    q("[data-shift-title]").textContent = phase.title;
    q("[data-shift]").textContent = phase.text;
    const advance = q('[data-action="advance"]');
    advance.hidden = !phase.next;
    advance.textContent = phase.next || "";
    q("[data-nav]").innerHTML = pages
      .map(
        ([n, icon]) =>
          '<button type="button" data-action="tab" data-val="' +
          n +
          '" aria-pressed="' +
          (s.tab === n) +
          '"><svg aria-hidden="true" class="store-icon"><use href="#icon-' +
          icon +
          '"></use></svg>' +
          n +
          "</button>",
      )
      .join("");
    q("[data-page]").innerHTML = screens[s.tab]();
    if (q("[data-filter]")) q("[data-filter]").value = s.filter;
    q("[data-status]").textContent = s.notice;
  }
  function commit(msg) {
    if (msg) s.notice = msg;
    paint();
    try {
      localStorage.setItem(storageKey, JSON.stringify(s));
    } catch {
      q("[data-status]").textContent +=
        " Browser storage is unavailable. Progress lasts for this visit.";
    }
  }
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const v = b.dataset.val;
    switch (b.dataset.action) {
      case "restart":
        s = original();
        break;
      case "advance":
        if (s.phase < 2) s.phase++;
        s.notice = "Shift time updated.";
        break;
      case "tab":
        s.tab = v;
        s.editing = false;
        s.returning = "";
        break;
      case "close":
        s.selected = "";
        break;
      case "request":
        s.selected = v;
        break;
      case "new":
        s.editing = true;
        break;
      case "cancel":
        s.editing = false;
        s.returning = "";
        break;
      case "scope":
        s.onlyOpen = v === "0";
        break;
      case "return":
        if (!getReq(v)) return;
        s.returning = v;
        s.editing = false;
        break;
    }
    commit();
  });
  root.addEventListener("change", (e) => {
    if (e.target.matches("[data-filter]")) {
      s.filter = e.target.value;
      commit();
    }
    if (e.target.matches("[data-counter]")) {
      s.counter = e.target.value;
      commit();
    }
  });
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const form = new FormData(f);
    if (f.matches("[data-note]")) {
      const text = String(form.get("note")).trim();
      if (!text) return;
      s.notes.push({ phase: s.phase, text });
      commit("Handover note saved.");
      return;
    }
    if (f.matches("[data-return]")) {
      const r = getReq(s.returning);
      if (!r) return;
      const open = s.loans.filter((l) => l.req === r.id && !l.back);
      const ticked = form.getAll("back").map(Number);
      const by = String(form.get("by") || "");
      const say = (t) => (q("[data-status]").textContent = t);
      if (!ticked.length) return say("Tick at least one unit that is on the counter.");
      if (!people.includes(by)) return say("Choose who brought the kit back.");
      const back = open.filter((l) => ticked.includes(l.num));
      const still = open.filter((l) => !ticked.includes(l.num));
      // Tag check: the unit in hand must be the unit on the slip.
      for (const l of back) {
        const tag = String(form.get("tag-" + l.num) || "")
          .trim()
          .toUpperCase();
        const want = getAsset(l.asset);
        if (!tag)
          return say(
            "Type the tag printed on the " + want.type + " before closing slip L-" + l.num + ".",
          );
        if (tag === want.id) continue;
        const got = getAsset(tag);
        if (!got) return say("Tag " + tag + " is not in inventory. Check the label and try again.");
        const gotSlip = out(got.id);
        const where = got.repair
          ? "in repair"
          : gotSlip
            ? "on loan on slip L-" + gotSlip.num
            : "on shelf " + got.bin + ", not on loan";
        return say(
          "Wrong unit: " +
            got.id +
            " (" +
            got.model +
            ") is " +
            where +
            ". Slip L-" +
            l.num +
            " is for " +
            want.id +
            " (" +
            want.model +
            "). Nothing was closed.",
        );
      }
      for (const l of still) {
        const holder = form.get("holder-" + l.num);
        const expected = form.get("expected-" + l.num);
        if (!people.includes(holder) || !returnTimes.includes(expected))
          return say(
            "For each unit still out, record who has it now and when it is expected back.",
          );
        l.holder = holder;
        l.expected = expected;
      }
      for (const l of back) {
        l.back = true;
        l.returnedBy = by;
        l.returnedAt = shifts[s.phase].time;
      }
      const name = unitName;
      if (still.length)
        s.notes.push({
          phase: s.phase,
          auto: true,
          text:
            r.id +
            " " +
            r.club +
            ": " +
            back.map(name).join(", ") +
            " returned by " +
            by +
            ". Still out: " +
            still
              .map(
                (l) =>
                  name(l) +
                  " (" +
                  getAsset(l.asset).model +
                  ") with " +
                  l.holder +
                  ", expected " +
                  l.expected +
                  ", slip L-" +
                  l.num +
                  " stays open. Next: " +
                  nextStep(l),
              )
              .join("; ") +
            ".",
        });
      s.returning = "";
      s.counter = "";
      commit(
        back.map((l) => l.asset).join(", ") +
          " returned by " +
          by +
          ". " +
          (still.length
            ? still.length + " unit still out; handover note added."
            : r.id + " kit complete."),
      );
      return;
    }
    if (!f.matches("[data-issue]")) return;
    const [req, asset, who, due] = ["req", "asset", "who", "due"].map((k) =>
      form.get(k),
    );
    const unit = getAsset(asset),
      r = getReq(req);
    if (!r || !unit || unit.repair || out(asset) || !people.includes(who))
      return;
    if (!r.items.includes(unit.type)) {
      q("[data-status]").textContent =
        "This equipment type is outside the approved request. Choose an approved unit.";
      return;
    }
    if (
      s.loans.some(
        (l) => l.req === req && !l.back && getAsset(l.asset).type === unit.type,
      )
    ) {
      q("[data-status]").textContent =
        "The approved quantity of this equipment type is already on loan.";
      return;
    }
    const num = Math.max(...s.loans.map((l) => l.num)) + 1;
    s.loans.push({ num, req, asset, who, due, back: false });
    s.editing = false;
    commit("Issued " + asset + " to " + who + " on slip L-" + num + ".");
  });
  function restore(d) {
    if (
      !d ||
      d.version !== 1 ||
      !Object.hasOwn(screens, d.tab) ||
      !shifts[d.phase] ||
      (d.selected && !getReq(d.selected)) ||
      (d.returning && !getReq(d.returning)) ||
      (d.counter && !people.includes(d.counter)) ||
      !Array.isArray(d.notes) ||
      !d.notes.every(
        (n) => n && shifts[n.phase] && typeof n.text === "string",
      ) ||
      !Array.isArray(d.loans) ||
      !d.loans.length ||
      !d.loans.every(
        (l) =>
          l && getReq(l.req) && getAsset(l.asset) && Number.isInteger(l.num),
      )
    )
      return;
    s = {
      ...original(),
      ...d,
      loans: d.loans.map((l) => ({ ...l })),
      notes: d.notes.map((n) => ({ ...n })),
    };
    paint();
  }
  paint();
  try {
    restore(JSON.parse(localStorage.getItem(storageKey)));
  } catch {
    // Keep the fresh shift when storage is unavailable or the saved data is invalid.
  }
})();
