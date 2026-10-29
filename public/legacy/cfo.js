/* ===== CFO Desk: part 1 (helpers, parsing, charts) ===== */
(function () {
  "use strict";
  var W = window, D = document;
  var CUR = { PKR: "PKR", AED: "AED", SAR: "SAR", BHD: "BHD", GBP: "£", USD: "$", EUR: "€", NONE: "" };
  var st = { mod: "tb", tbl: null, name: "", cur: "PKR", style: "pk", over: {}, map: {}, opt: {}, wb: null, sheets: [], sheet: "", notes: [] };
  var $ = function (id) { return D.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* ---------- formatting ---------- */
  function nf(x, d) { if (!isFinite(x)) return "–"; return Number(x).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function mny(x, d) { if (!isFinite(x)) return "–"; var p = CUR[st.cur], s = nf(Math.abs(x), d || 0), t = (p ? p + " " : "") + s; return Math.round(x) < 0 ? "(" + t + ")" : t; }
  function cmp(x) {
    if (!isFinite(x)) return "–";
    var a = Math.abs(x), s = x < 0 ? "-" : "", p = CUR[st.cur] ? CUR[st.cur] + " " : "";
    if (st.style === "pk") { if (a >= 1e7) return s + p + (a / 1e7).toFixed(2) + " Cr"; if (a >= 1e5) return s + p + (a / 1e5).toFixed(2) + " Lakh"; return s + p + nf(a); }
    if (a >= 1e9) return s + p + (a / 1e9).toFixed(2) + "B"; if (a >= 1e6) return s + p + (a / 1e6).toFixed(2) + "M"; if (a >= 1e4) return s + p + (a / 1e3).toFixed(1) + "K";
    return s + p + nf(a);
  }
  function pc(x, d) { return isFinite(x) ? (x * 100).toFixed(d == null ? 1 : d) + "%" : "–"; }
  function xr(x, d) { return isFinite(x) ? x.toFixed(d == null ? 2 : d) + "x" : "–"; }
  function dys(x) { return isFinite(x) ? Math.round(x) + " days" : "–"; }
  function div(a, b) { return b ? a / b : NaN; }

  /* ---------- parsing ---------- */
  function parseCSV(text) {
    text = String(text || "").replace(/^﻿/, "");
    var first = text.split(/\r?\n/).slice(0, 8).join("\n"), best = ",", bc = -1;
    [",", ";", "\t", "|"].forEach(function (d) { var c = first.split(d).length - 1; if (c > bc) { bc = c; best = d; } });
    var rows = [], row = [], cell = "", q = false, i, ch;
    for (i = 0; i < text.length; i++) {
      ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === best) { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : NaN;
    if (v instanceof Date || v == null) return NaN;
    var s = String(v).trim();
    if (!s || /^[-–—]+$/.test(s)) return NaN;
    var neg = false, dc = s.match(/\s*(dr|cr)\.?$/i);
    if (dc) { neg = /cr/i.test(dc[1]); s = s.slice(0, dc.index); }
    if (/^\(.*\)$/.test(s)) { neg = !neg; s = s.slice(1, -1); }
    if (/-$/.test(s)) { neg = !neg; s = s.slice(0, -1); }
    s = s.replace(/(rs\.?|pkr|aed|sar|bhd|gbp|usd|eur|[$£€])/gi, "").replace(/[%\s]/g, "");
    if (/^-/.test(s)) { neg = !neg; s = s.slice(1); }
    if (/^\+/.test(s)) s = s.slice(1);
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
    else if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(",", ".");
    else s = s.replace(/,/g, "");
    if (!/^\d*\.?\d+(e[+-]?\d+)?$/i.test(s)) return NaN;
    var n = parseFloat(s); return neg ? -n : n;
  }
  var MN = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
  function mkDate(y, m, d) { if (y < 100) y += 2000; var x = new Date(y, m, d); return (x.getFullYear() === y && x.getMonth() === m && x.getDate() === d) ? x : null; }
  function parseDate(v, mf) {
    if (v instanceof Date) return isNaN(v) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate());
    if (typeof v === "number") { if (v > 20000 && v < 80000) { var e = new Date(Math.round((v - 25569) * 86400000)); return new Date(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()); } return null; }
    if (v == null) return null;
    var s = String(v).trim(), m;
    if (!s) return null;
    if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) return mkDate(+m[1], +m[2] - 1, +m[3]);
    if ((m = s.match(/^(\d{1,2})[-\/. ]([A-Za-z]{3,9})[-\/. ,]+(\d{2,4})$/))) { var mo = MN[m[2].slice(0, 3).toLowerCase()]; return mo == null ? null : mkDate(+m[3], mo, +m[1]); }
    if ((m = s.match(/^([A-Za-z]{3,9})[-\/. ,]+(\d{1,2})[, ]+(\d{4})$/))) { var mo2 = MN[m[1].slice(0, 3).toLowerCase()]; return mo2 == null ? null : mkDate(+m[3], mo2, +m[2]); }
    if ((m = s.match(/^([A-Za-z]{3,9})[-\/. ,]+(\d{2,4})$/))) { var mo3 = MN[m[1].slice(0, 3).toLowerCase()]; return mo3 == null ? null : mkDate(+m[2], mo3, 1); }
    if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})$/))) return mkDate(+m[1], +m[2] - 1, 1);
    if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/))) { var a = +m[1], b = +m[2]; return mf ? mkDate(+m[3], a - 1, b) : mkDate(+m[3], b - 1, a); }
    return null;
  }
  function monthFirst(vals) {
    var df = 0, mf = 0;
    vals.slice(0, 400).forEach(function (v) { var m = typeof v === "string" && v.trim().match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.]\d{2,4}/); if (m) { if (+m[1] > 12) df++; if (+m[2] > 12) mf++; } });
    return mf > df && mf > 0;
  }
  function isBlank(v) { return v == null || (typeof v === "string" && !v.trim()); }
  function txt(v) { if (v instanceof Date) return v.toISOString().slice(0, 10); return v == null ? "" : String(v).trim(); }

  function tableFromRows(rows) {
    rows = rows.map(function (r) { return r.map(function (c) { return typeof c === "string" ? c.trim() : c; }); }).filter(function (r) { return r.some(function (c) { return !isBlank(c); }); });
    if (rows.length < 2) return null;
    var lim = Math.min(15, rows.length - 1), sc = [], mx = 0, i;
    for (i = 0; i < lim; i++) { var n = rows[i].filter(function (c) { return typeof c === "string" && c && isNaN(num(c)); }).length; sc.push(n); if (n > mx) mx = n; }
    var hi = 0; for (i = 0; i < sc.length; i++) { if (sc[i] >= 2 && sc[i] >= 0.6 * mx) { hi = i; break; } }
    var width = 0; rows.slice(hi, hi + 50).forEach(function (r) { if (r.length > width) width = r.length; });
    var seen = {}, heads = [];
    for (i = 0; i < width; i++) {
      var h = txt(rows[hi][i]) || ("Column " + (i + 1)); if (seen[h]) { seen[h]++; h += " (" + seen[h] + ")"; } else seen[h] = 1; heads.push(h);
    }
    var body = [], dropped = 0;
    rows.slice(hi + 1).forEach(function (r) {
      var rr = []; for (var j = 0; j < width; j++) rr.push(r[j] == null ? "" : r[j]);
      var firstTxt = ""; for (var k = 0; k < rr.length; k++) { if (typeof rr[k] === "string" && rr[k]) { firstTxt = rr[k]; break; } }
      if (/^(grand\s+)?total(s)?\b|^sub[- ]?total/i.test(firstTxt)) { dropped++; return; }
      body.push(rr);
    });
    return { heads: heads, rows: body, dropped: dropped, skippedTop: hi };
  }

  /* ---------- column helpers ---------- */
  function colVals(t, j) { return j >= 0 ? t.rows.map(function (r) { return r[j]; }) : []; }
  function colInfo(t, j) {
    var v = colVals(t, j).filter(function (x) { return !isBlank(x); }).slice(0, 600), n = v.length || 1, nn = 0, dd = 0, mf = monthFirst(v), seen = {}, dist = 0;
    v.forEach(function (x) { if (!isNaN(num(x)) && !(x instanceof Date)) nn++; if (parseDate(x, mf) && (typeof x !== "number" || (x > 20000 && x < 80000))) dd++; var k = String(x); if (!seen[k]) { seen[k] = 1; dist++; } });
    var datey = dd / n, numy = nn / n;
    if (v.length && v.every(function (x) { return typeof x === "number"; }) && datey > 0.9) { var mn = Math.min.apply(null, v); if (mn < 20000) datey = 0; }
    return { n: v.length, num: numy, date: datey, dist: dist, mf: mf };
  }
  function guess(t, rxs, kind, used) {
    var best = -1, bs = 0;
    t.heads.forEach(function (h, j) {
      if (used[j]) return;
      var lh = h.toLowerCase(), sc = 0;
      rxs.forEach(function (rx, k) { if (rx.test(lh)) sc = Math.max(sc, 10 - k); });
      if (!sc) return;
      var ci = t._ci[j] || (t._ci[j] = colInfo(t, j));
      if (kind === "num" && ci.num < 0.6) return;
      if (kind === "date" && ci.date < 0.6) return;
      if (kind === "cat" && ci.num > 0.8 && ci.dist > 12) return;
      if (sc > bs) { bs = sc; best = j; }
    });
    return best;
  }
  function typedGuess(t, kind, used) {
    var best = -1, bs = -1;
    t.heads.forEach(function (h, j) {
      if (used[j]) return; var ci = t._ci[j] || (t._ci[j] = colInfo(t, j)), sc = -1;
      if (kind === "date" && ci.date >= 0.8) sc = ci.date;
      if (kind === "num" && ci.num >= 0.8 && ci.date < 0.9) sc = ci.num + ci.dist / 1000;
      if (kind === "cat" && ci.num < 0.3 && ci.dist > 1 && ci.dist <= Math.max(12, ci.n * 0.6)) sc = 1 - ci.dist / (ci.n + 1);
      if (sc > bs) { bs = sc; best = j; }
    });
    return best;
  }
  function selOpts(t, cur, allowNone) {
    return (allowNone ? '<option value="-1">(not used)</option>' : "") + t.heads.map(function (h, j) { return '<option value="' + j + '"' + (j === cur ? " selected" : "") + ">" + esc(h) + "</option>"; }).join("");
  }

  /* ---------- date / series helpers ---------- */
  function mkey(d) { return d.getFullYear() * 12 + d.getMonth(); }
  function mlabel(k) { var y = Math.floor(k / 12), m = k % 12; return MON[m] + " " + String(y).slice(2); }
  function daysIn(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function monthSeries(items, getD, getV) {
    var map = {}, mn = Infinity, mx = -Infinity;
    items.forEach(function (it) { var k = mkey(getD(it)); map[k] = (map[k] || 0) + getV(it); if (k < mn) mn = k; if (k > mx) mx = k; });
    var keys = [], vals = []; for (var k = mn; k <= mx; k++) { keys.push(k); vals.push(map[k] || 0); }
    return { keys: keys, vals: vals, labels: keys.map(mlabel) };
  }
  function sum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
  function mean(a) { return a.length ? sum(a) / a.length : NaN; }
  function median(a) { if (!a.length) return NaN; var b = a.slice().sort(function (x, y) { return x - y; }), m = Math.floor(b.length / 2); return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }
  function stdev(a) { if (a.length < 2) return 0; var m = mean(a); return Math.sqrt(sum(a.map(function (x) { return (x - m) * (x - m); })) / (a.length - 1)); }
  function quant(a, p) { var b = a.slice().sort(function (x, y) { return x - y; }); if (!b.length) return NaN; var i = (b.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return b[lo] + (b[hi] - b[lo]) * (i - lo); }
  function linreg(y) { var n = y.length, sx = 0, sy = 0, sxy = 0, sxx = 0; for (var i = 0; i < n; i++) { sx += i; sy += y[i]; sxy += i * y[i]; sxx += i * i; } var d = n * sxx - sx * sx; if (!d) return { a: y[0] || 0, b: 0 }; var b = (n * sxy - sx * sy) / d; return { a: (sy - b * sx) / n, b: b }; }
  function groupBy(items, kf, vf) {
    var m = {}, order = []; items.forEach(function (it) { var k = kf(it); if (!m[k]) { m[k] = { k: k, v: 0, n: 0 }; order.push(k); } m[k].v += vf(it); m[k].n++; });
    return order.map(function (k) { return m[k]; });
  }
  function corr(x, y) { var n = x.length, mx = mean(x), my = mean(y), sxy = 0, sxx = 0, syy = 0; for (var i = 0; i < n; i++) { var a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN; }

  /* ---------- html builders ---------- */
  function cell(c) { return c && typeof c === "object" && c.h !== undefined ? c.h : esc(c); }
  function table(heads, rows, o) {
    o = o || {}; var nums = o.num || [], h = '<div class="tw"><table class="cfot"><thead><tr>' + heads.map(function (x, i) { return "<th" + (nums.indexOf(i) >= 0 ? ' class="n"' : "") + ">" + esc(x) + "</th>"; }).join("") + "</tr></thead><tbody>";
    rows.forEach(function (r) {
      var cls = "", cells = r; if (r && r.cells) { cls = r.cls || ""; cells = r.cells; }
      h += '<tr class="' + cls + '">' + cells.map(function (c, i) { return "<td" + (nums.indexOf(i) >= 0 ? ' class="n"' : "") + ">" + cell(c) + "</td>"; }).join("") + "</tr>";
    });
    return h + "</tbody></table></div>";
  }
  function kpi(label, value, sub, tone) { return '<div class="kpi' + (tone ? " " + tone : "") + '"><span>' + esc(label) + "</span><strong>" + esc(value) + "</strong>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</div>"; }
  function kpis(list) { return '<div class="kpis">' + list.join("") + "</div>"; }
  function box(title, inner, wide) { return '<div class="cbox' + (wide ? " wide" : "") + '"><h4>' + esc(title) + "</h4>" + inner + "</div>"; }
  function bars(items, o) {
    o = o || {}; var mx = 0; items.forEach(function (i) { if (Math.abs(i.v) > mx) mx = Math.abs(i.v); });
    var f = o.fmt || cmp, h = '<div class="hbs">';
    items.forEach(function (i) {
      var w = mx ? Math.abs(i.v) / mx * 100 : 0, tone = i.tone || (i.v < 0 ? "neg" : "");
      h += '<div class="hb"><span class="hl" title="' + esc(i.l) + '">' + esc(i.l) + '</span><span class="ht"><i class="' + tone + '" style="width:' + w.toFixed(1) + '%"></i></span><span class="hv">' + esc(f(i.v)) + (i.s != null ? ' <em>' + esc(i.s) + "</em>" : "") + "</span></div>";
    });
    return h + "</div>";
  }
  function trend(labels, vals, o) {
    o = o || {}; var n = vals.length, Wd = 640, Hd = 230, pl = 54, pr = 10, pt = 14, pb = 34, iw = Wd - pl - pr, ih = Hd - pt - pb;
    var all = vals.slice(); if (o.ma) all = all.concat(o.ma.filter(isFinite)); if (o.fc) all = all.concat(o.fc);
    var mx = Math.max.apply(null, all.concat([0])), mn = Math.min.apply(null, all.concat([0])); if (mx === mn) mx = mn + 1;
    var tot = n + (o.fc ? o.fc.length : 0), bw = iw / tot, sy = function (v) { return pt + ih - (v - mn) / (mx - mn) * ih; };
    var s = '<svg class="trend" viewBox="0 0 ' + Wd + " " + Hd + '" role="img" aria-label="' + esc(o.aria || "Trend chart") + '" preserveAspectRatio="xMidYMid meet">';
    for (var g = 0; g <= 4; g++) { var gv = mn + (mx - mn) * g / 4, gy = sy(gv); s += '<line x1="' + pl + '" x2="' + (Wd - pr) + '" y1="' + gy + '" y2="' + gy + '" class="gl"/><text x="' + (pl - 6) + '" y="' + (gy + 4) + '" text-anchor="end" class="ax">' + esc(cmp(gv).replace(/^[A-Z£$€]+\s/, "")) + "</text>"; }
    vals.forEach(function (v, i) { var x = pl + i * bw + bw * 0.14, y0 = sy(0), y1 = sy(v); s += '<rect x="' + x.toFixed(1) + '" y="' + Math.min(y0, y1).toFixed(1) + '" width="' + (bw * 0.72).toFixed(1) + '" height="' + Math.max(1, Math.abs(y1 - y0)).toFixed(1) + '" class="' + (v < 0 ? "bn" : "bp") + '"><title>' + esc(labels[i] + ": " + mny(v)) + "</title></rect>"; });
    if (o.fc) o.fc.forEach(function (v, i) { var x = pl + (n + i) * bw + bw * 0.14, y0 = sy(0), y1 = sy(v); s += '<rect x="' + x.toFixed(1) + '" y="' + Math.min(y0, y1).toFixed(1) + '" width="' + (bw * 0.72).toFixed(1) + '" height="' + Math.max(1, Math.abs(y1 - y0)).toFixed(1) + '" class="bf"><title>' + esc("Forecast " + (o.fcl ? o.fcl[i] : "") + ": " + mny(v)) + "</title></rect>"; });
    if (o.ma) { var pts = []; o.ma.forEach(function (v, i) { if (isFinite(v)) pts.push((pl + i * bw + bw / 2).toFixed(1) + "," + sy(v).toFixed(1)); }); if (pts.length > 1) s += '<polyline points="' + pts.join(" ") + '" class="ml"/>'; }
    var every = Math.ceil(tot / 12), all2 = labels.concat(o.fcl || []);
    for (var i2 = 0; i2 < tot; i2 += every) s += '<text x="' + (pl + i2 * bw + bw / 2).toFixed(1) + '" y="' + (Hd - 12) + '" text-anchor="middle" class="ax">' + esc(all2[i2] || "") + "</text>";
    return s + "</svg>" + (o.ma ? '<div class="lg"><i class="bp"></i>Monthly<i class="ml2"></i>3-month average' + (o.fc ? '<i class="bf"></i>Trend forecast' : "") + "</div>" : "");
  }
  function insights(list) {
    if (!list.length) return "";
    var tn = { good: "Strength", warn: "Watch", bad: "Risk", info: "Note" };
    return '<ul class="ins">' + list.map(function (i) { return '<li class="' + i.t + '"><b>' + tn[i.t] + ' · ' + esc(i.h) + "</b><span>" + esc(i.d) + "</span></li>"; }).join("") + "</ul>";
  }
  function stack(items) {
    var tot = sum(items.map(function (i) { return i.v; })) || 1;
    return '<div class="stk">' + items.map(function (i, k) { return '<i class="s' + k + '" style="width:' + (i.v / tot * 100).toFixed(2) + '%" title="' + esc(i.l + ": " + mny(i.v)) + '"></i>'; }).join("") + '</div><div class="lg">' + items.map(function (i, k) { return '<span><i class="s' + k + '"></i>' + esc(i.l) + " " + pc(i.v / tot) + "</span>"; }).join("") + "</div>";
  }
  function note(t) { return '<p class="cfo-n">' + esc(t) + "</p>"; }
  function emptyMsg(t) { return '<div class="cbox wide"><h4>Cannot analyse yet</h4><p>' + esc(t) + "</p></div>"; }

  W.__CFO = { st: st, $: $, esc: esc, nf: nf, mny: mny, cmp: cmp, pc: pc, xr: xr, dys: dys, div: div, parseCSV: parseCSV, num: num, parseDate: parseDate, monthFirst: monthFirst, isBlank: isBlank, txt: txt, tableFromRows: tableFromRows, colVals: colVals, colInfo: colInfo, guess: guess, typedGuess: typedGuess, selOpts: selOpts, mkey: mkey, mlabel: mlabel, daysIn: daysIn, monthSeries: monthSeries, sum: sum, mean: mean, median: median, stdev: stdev, quant: quant, linreg: linreg, groupBy: groupBy, corr: corr, table: table, kpi: kpi, kpis: kpis, box: box, bars: bars, trend: trend, insights: insights, stack: stack, note: note, emptyMsg: emptyMsg, MON: MON, CUR: CUR };
})();
/* ===== CFO Desk: part 2 (trial balance and financial statements) ===== */
(function () {
  "use strict";
  var C = window.__CFO, st = C.st, esc = C.esc, nf = C.nf, mny = C.mny, cmp = C.cmp, pc = C.pc, xr = C.xr, dys = C.dys, div = C.div, num = C.num, txt = C.txt, isBlank = C.isBlank;
  var table = C.table, kpi = C.kpi, kpis = C.kpis, box = C.box, bars = C.bars, insights = C.insights, note = C.note, emptyMsg = C.emptyMsg;
  C.mods = C.mods || {};

  var GL = { rev: "Revenue", othinc: "Other income", cogs: "Cost of sales", opex: "Operating expenses", dep: "Depreciation and amortisation", fin: "Finance cost", tax: "Income tax",
    cash: "Cash and bank", ar: "Receivables", inv: "Inventory", oca: "Other current assets", ppe: "Property, plant and equipment", nca: "Other non-current assets",
    ap: "Trade payables", std: "Short-term borrowings", ocl: "Other current liabilities", ltd: "Long-term borrowings", onl: "Other non-current liabilities",
    eqcap: "Share capital", eqre: "Reserves and retained earnings", unc: "Unclassified" };
  var GORDER = ["rev", "othinc", "cogs", "opex", "dep", "fin", "tax", "cash", "ar", "inv", "oca", "ppe", "nca", "ap", "std", "ocl", "ltd", "onl", "eqcap", "eqre", "unc"];
  var ASSET = { cash: 1, ar: 1, inv: 1, oca: 1, ppe: 1, nca: 1 }, LIAB = { ap: 1, std: 1, ocl: 1, ltd: 1, onl: 1 }, EQ = { eqcap: 1, eqre: 1 }, INC = { rev: 1, othinc: 1 }, EXP = { cogs: 1, opex: 1, dep: 1, fin: 1, tax: 1 };
  function side(g) { return (ASSET[g] || EXP[g]) ? 1 : -1; }

  var RULES = [
    ["ppe", /accumulated\s+(depreciation|amorti[sz]ation)|acc(um)?\.?\s*dep|provision for depreciation/, "any"],
    ["ar", /(allowance|provision)\s+for\s+(doubtful|bad|credit loss|impairment)|doubtful debts?\s+(allowance|provision)|expected credit loss/, "any"],
    ["oca", /staff\s+loans?|employee\s+loans?|loans?\s+to\b|advance\s+(income\s+)?tax|withholding\s+tax(?!\s+payable)|input\s+(vat|tax|gst)|sales\s+tax\s+(refundable|input|receivable)/, "A"],
    ["ap", /(accounts?|trade)\s+payables?|creditors?|bills?\s+payable|due to suppliers?|supplier/, "L"],
    ["ocl", /dividends?\s+payable|accrued|accruals?|outstanding\s+(expenses?|salar|wages)|(salar(y|ies)|wages?|bonus)\s+payable|unearned|deferred\s+(revenue|income)|advances?\s+from\s+customers?|customers?\s+advances?|(income|sales|gst|vat|withholding|payroll|corporate)\s+tax\s+payable|tax(es)?\s+payable|(gst|vat|sales tax)\s+(output|liability)|output\s+(vat|gst|sales tax)|provision\s+for\s+(tax|expenses|taxation)|other\s+payables?|contract\s+liabilit|security\s+deposits?\s+(from|received)|eobi payable|zakat payable|payable/, "L"],
    ["std", /overdraft|short[- ]?term\s+(loans?|borrowings?|finance|debt)|running\s+finance|current\s+(portion|maturity)|cash\s+credit|credit\s+card\s+(payable|balance)|line\s+of\s+credit|export\s+refinance|murabaha\s+short/, "L"],
    ["ltd", /long[- ]?term|term\s+(loan|finance)|mortgage|bonds?\b|debentures?|lease\s+liabilit|loans?\s+from|director'?s?\s+loan|bank\s+loan|notes?\s+payable|loans?\s+payable|borrowings?|\bloan\b(?!\s+(to|receivable))|sukuk|diminishing musharaka/, "L"],
    ["onl", /deferred\s+tax(?!\s+(expense|charge))|gratuity\s+(payable|liabilit)|retirement\s+benefit|end of service|long[- ]?term\s+provision/, "L"],
    ["eqcap", /share\s+capital|paid[- ]?up|owner'?s?\s+(capital|equity)|capital\s+(account|stock)|common\s+stock|ordinary\s+shares?|partner'?s?\s+capital|share\s+premium|proprietor'?s?\s+capital|^capital$/, "E"],
    ["eqre", /retained|reserves?\b|accumulated\s+(profit|loss|earnings)|unappropriated|surplus|drawings?|dividends?\s+(paid|declared)|owner'?s?\s+draw|profit\s+(and|&)\s+loss\s+(a\/c|account|appropriation)|p\s*&\s*l\s+(a\/c|account)|retained earnings|current\s+account\s+(partner|director)|opening\s+balance\s+equity/, "E"],
    ["othinc", /other\s+income|interest\s+(income|received|earned)|dividend\s+income|gains?\s+on|profit\s+on\s+(sale|disposal)|rental\s+income|exchange\s+gain|misc(ellaneous)?\s+income|bad\s+debts?\s+recovered|scrap\s+sales?|discount\s+received|write[- ]?back|income\s+from\s+investments?/, "I"],
    ["cogs", /cost\s+of\s+(goods|sales|revenue|services)|\bcogs\b|purchases?|opening\s+(stock|inventory)|raw\s+materials?\s+(consumed|used)|direct\s+(labou?r|materials?|costs?|expenses?)|freight\s+inward|carriage\s+inward|manufacturing\s+(cost|expense|overhead)|factory\s+(overhead|expense|cost)|production\s+(cost|overhead)|stock\s+adjustment|import\s+duties|cost\s+of\s+production|subcontract/, "X"],
    ["rev", /(?:^|\b)(sales?|revenues?|turnover|fees?\s+(income|earned|revenue)|service\s+(income|revenue|fees?)|income\s+from\s+(services|sales|operations)|commission\s+(income|earned|received)|professional\s+fees?\s+(income|earned)|consultancy\s+(income|fees)|contract\s+revenue|operating\s+income|export\s+sales|net\s+sales)\b/, "I"],
    ["dep", /(depreciation|amorti[sz]ation)(?!.*accumulated)/, "X"],
    ["fin", /interest\s+(expense|paid|on\s+loans?|charges?)|finance\s+(cost|charge|expense)|bank\s+(charges?|commission|fees?)|mark[- ]?up|exchange\s+loss|loan\s+processing|financial\s+charges|financing\s+cost|profit\s+on\s+(loan|borrowing)/, "X"],
    ["tax", /income\s+tax\s+(expense|charge)|provision\s+for\s+(income\s+)?tax(ation)?\s*(expense)?$|taxation$|tax\s+expense|current\s+tax(?!\s+(payable|receivable))|deferred\s+tax\s+(expense|charge)|corporate\s+tax\s+expense|super\s+tax|minimum\s+tax\s+expense/, "X"],
    ["opex", /expenses?|salar|wages|\brent\b|\brental|utilit|electric|\bgas\b|water|telephone|internet|advertis|marketing|travel|conveyance|fuel|repairs?|maintenance|insurance|printing|stationer|legal|professional|audit\s+fees?|office|postage|courier|entertainment|donation|zakat|subscription|training|commission\s+(paid|expense)|discount\s+allowed|bad\s+debts?|written\s+off|write[- ]?off|freight\s+outward|carriage\s+outward|selling|distribution|admin|general|miscellaneous|licen[cs]e|software\s+(cost|subscription|expense)|security\s+services|staff|bonus|eobi|provident|medical|uniform|cleaning|canteen|hosting|promotion|sponsorship|loss\s+on|impairment|penalt|\bfines?\b|charges/, "X"],
    ["ar", /receivables?|debtors?|due\s+from\s+customers?|customers?(?!\s+advance)/, "A"],
    ["inv", /inventor|\bstock\b|finished\s+goods|work[- ]in[- ]progress|\bwip\b|raw\s+materials?|merchandise|stores\s+and\s+spares|closing\s+stock|packing\s+material/, "A"],
    ["oca", /prepaid|prepayments?|advances?\b|deposits?\b(?!.*received)|loans?\s+to|staff\s+loans?|employee\s+loans?|tax\s+(refundable|receivable|recoverable|deducted|paid)|advance\s+tax|withholding\s+tax|input\s+(vat|tax|gst|sales)|sales\s+tax\s+(refundable|input|receivable)|(gst|vat)\s+(input|recoverable|receivable)|other\s+receivables?|short[- ]?term\s+investments?|marketable|accrued\s+income|interest\s+receivable|supplies|due\s+from/, "A"],
    ["cash", /\bcash\b|\bbank\b|petty|cheques?|wallet|current\s+account|saving(s)?\s+account|term\s+deposit|\b(hbl|ubl|mcb|meezan|alfalah|askari|faysal|nbp|abl|bop|jazzcash|easypaisa|stanchart|sadapay)\b/, "A"],
    ["ppe", /property|plant|equipment|machinery|building|\bland\b|furniture|fixtures?|vehicles?|computers?|capital\s+work|\bcwip\b|leasehold|motor|fixed\s+assets?|generator|tools?\b|improvements?|right[- ]of[- ]use|air\s*condition|\bups\b|solar/, "A"],
    ["nca", /intangible|goodwill|patent|trademarks?|software(?!\s+(cost|subscription|expense))|investments?|long[- ]?term\s+(deposits?|advances?|receivables?|prepay)|security\s+deposits?|deferred\s+(cost|tax\s+asset)|development\s+cost|licen[cs]es?\s+(asset|fee\s+paid)|website/, "A"]
  ];
  var TYPEMAP = [[/non[- ]?current\s+asset|fixed\s+asset/, "A"], [/current\s+asset|^assets?$|\basset\b/, "A"], [/non[- ]?current\s+liab|long[- ]?term\s+liab/, "L"], [/current\s+liab|^liabilit|\bliabilit/, "L"], [/equity|capital|reserve|owner/, "E"], [/revenue|income|sales|turnover/, "I"], [/expense|cost|cogs|overhead/, "X"]];

  function classify(name, code, typ) {
    var n = String(name || "").toLowerCase().replace(/\s+/g, " ").trim(), t = String(typ || "").toLowerCase().trim(), cls = null;
    if (t) { TYPEMAP.some(function (m) { if (m[0].test(t)) { cls = m[1]; return true; } }); }
    var i, r;
    for (i = 0; i < RULES.length; i++) {
      r = RULES[i];
      if (cls && r[2] !== "any" && r[2] !== cls) { if (!(cls === "I" && r[2] === "I")) continue; }
      if (r[1].test(n)) return r[0];
    }
    if (cls === "A") return /non[- ]?current|fixed/.test(t) ? "ppe" : "oca";
    if (cls === "L") return /non[- ]?current|long/.test(t) ? "ltd" : "ocl";
    if (cls === "E") return "eqre";
    if (cls === "I") return "rev";
    if (cls === "X") return "opex";
    var c = String(code == null ? "" : code).trim();
    if (/^[1-9]\d{1,}/.test(c)) {
      var d = c.charAt(0);
      if (d === "1") return "oca"; if (d === "2") return "ocl"; if (d === "3") return "eqre"; if (d === "4") return "rev"; if (d === "5") return "cogs"; if (/[6-9]/.test(d)) return "opex";
    }
    return "unc";
  }

  function tbCompute(t, m, o) {
    var accts = [], bad = 0;
    t.rows.forEach(function (r, i) {
      var name = txt(r[m.name]); if (!name) return;
      var net, dr = m.dr >= 0 ? num(r[m.dr]) : NaN, cr = m.cr >= 0 ? num(r[m.cr]) : NaN, bal = m.bal >= 0 ? num(r[m.bal]) : NaN;
      if (isFinite(dr) || isFinite(cr)) net = (isFinite(dr) ? dr : 0) - (isFinite(cr) ? cr : 0);
      else if (isFinite(bal)) net = o.credpos === "1" ? -bal : bal;
      else { bad++; return; }
      if (Math.abs(net) < 1e-9) return;
      var g = st.over["r" + i] || classify(name, m.code >= 0 ? t.rows[i][m.code] : "", m.type >= 0 ? t.rows[i][m.type] : "");
      accts.push({ i: i, name: name, code: m.code >= 0 ? txt(t.rows[i][m.code]) : "", net: net, g: g, amt: net * side(g) });
    });
    return { accts: accts, bad: bad };
  }
  function gsum(accts, g) { var s = 0; accts.forEach(function (a) { if (a.g === g) s += a.amt; }); return s; }

  function runTB(t, m, o) {
    if (m.name < 0 || (m.dr < 0 && m.cr < 0 && m.bal < 0)) return emptyMsg("Choose the Account name column and either Debit and Credit columns or one Balance column above.");
    var r = tbCompute(t, m, o), A = r.accts;
    if (!A.length) return emptyMsg("No account balances could be read. Check that the Debit, Credit or Balance column contains numbers.");
    var G = function (g) { return gsum(A, g); };
    var months = +o.months || 12, days = months * 30.4;
    var rev = G("rev"), cogs = G("cogs"), opex = G("opex"), dep = G("dep"), fin = G("fin"), tax = G("tax"), oth = G("othinc");
    var gp = rev - cogs, ebitda = gp - opex, ebit = ebitda - dep, pbt = ebit + oth - fin, np = pbt - tax, hasPL = A.some(function (a) { return INC[a.g] || EXP[a.g]; });
    var cash = G("cash"), ar = G("ar"), inv = G("inv"), oca = G("oca"), ppe = G("ppe"), nca = G("nca");
    var ap = G("ap"), std = G("std"), ocl = G("ocl"), ltd = G("ltd"), onl = G("onl"), cap = G("eqcap"), re = G("eqre");
    var ca = cash + ar + inv + oca, nonca = ppe + nca, ta = ca + nonca, cl = ap + std + ocl, ncl = ltd + onl, tl = cl + ncl, eq = cap + re + np, tle = tl + eq, diff = ta - tle;
    var drT = 0, crT = 0; A.forEach(function (a) { if (a.net > 0) drT += a.net; else crT += -a.net; });
    var unc = A.filter(function (a) { return a.g === "unc"; });
    var debt = std + ltd, lines = [];

    /* statements */
    var line = function (label, val, base, o2) { o2 = o2 || {}; return { cls: o2.cls || "", cells: [label, mny(val), isFinite(base) && base ? pc(val / base) : ""] }; };
    var detail = function (g) { return A.filter(function (a) { return a.g === g; }).sort(function (x, y) { return Math.abs(y.amt) - Math.abs(x.amt); }).slice(0, 6).map(function (a) { return { cls: "sub", cells: ["    " + a.name, mny(a.amt), ""] }; }); };
    var isr = [line("Revenue", rev, rev, { cls: "hd" })].concat(detail("rev"), [line("Cost of sales", -cogs, rev)], detail("cogs").slice(0, 3), [line("Gross profit", gp, rev, { cls: "tot" }), line("Operating expenses", -opex, rev)], detail("opex").slice(0, 5), [line("EBITDA", ebitda, rev, { cls: "tot" }), line("Depreciation and amortisation", -dep, rev), line("Operating profit (EBIT)", ebit, rev, { cls: "tot" }), line("Other income", oth, rev), line("Finance cost", -fin, rev), line("Profit before tax", pbt, rev, { cls: "tot" }), line("Income tax", -tax, rev), line("Net profit", np, rev, { cls: "grand" })]);
    var bsr = [line("Non-current assets", nonca, ta, { cls: "hd" }), line("Property, plant and equipment (net)", ppe, ta), line("Other non-current assets", nca, ta),
      line("Current assets", ca, ta, { cls: "hd" }), line("Inventory", inv, ta), line("Receivables", ar, ta), line("Cash and bank", cash, ta), line("Other current assets", oca, ta), line("Total assets", ta, ta, { cls: "grand" }),
      line("Equity", eq, ta, { cls: "hd" }), line("Share capital", cap, ta), line("Reserves and retained earnings", re, ta), line(hasPL ? "Profit for the period" : "Profit for the period (no income or expense accounts found)", np, ta),
      line("Non-current liabilities", ncl, ta, { cls: "hd" }), line("Long-term borrowings", ltd, ta), line("Other non-current liabilities", onl, ta),
      line("Current liabilities", cl, ta, { cls: "hd" }), line("Trade payables", ap, ta), line("Short-term borrowings", std, ta), line("Other current liabilities", ocl, ta), line("Total equity and liabilities", tle, ta, { cls: "grand" })];

    /* ratios */
    var R = {
      gm: div(gp, rev), em: div(ebitda, rev), om: div(ebit, rev), nm: div(np, rev), cr: div(ca, cl), qr: div(ca - inv, cl), cashr: div(cash, cl), wc: ca - cl,
      de: div(debt, eq), da: div(tl, ta), dr: div(debt, ebitda), ic: div(ebit, fin), roa: div(np * 12 / months, ta), roe: div(np * 12 / months, eq), at: div(rev * 12 / months, ta),
      dso: div(ar, rev) * days, dio: div(inv, cogs) * days, dpo: div(ap, cogs) * days, opexr: div(opex, rev), etr: div(tax, pbt), eqm: div(ta, eq)
    };
    R.ccc = R.dso + R.dio - R.dpo;
    var good = function (cond) { return cond ? "g" : "w"; };
    var rr = [
      ["Profitability", [
        ["Gross margin", pc(R.gm), R.gm >= 0.3 ? "g" : R.gm >= 0.15 ? "w" : "b", "Gross profit as a share of revenue"],
        ["EBITDA margin", pc(R.em), R.em >= 0.15 ? "g" : R.em >= 0.05 ? "w" : "b", "Operating cash earnings before depreciation"],
        ["Operating margin", pc(R.om), R.om >= 0.1 ? "g" : R.om >= 0.03 ? "w" : "b", "Profit from operations after depreciation"],
        ["Net margin", pc(R.nm), R.nm >= 0.08 ? "g" : R.nm >= 0.02 ? "w" : "b", "Net profit as a share of revenue"],
        ["Operating expense ratio", pc(R.opexr), "", "Operating expenses as a share of revenue"],
        ["Return on assets", pc(R.roa), R.roa >= 0.08 ? "g" : R.roa >= 0.03 ? "w" : "b", "Net profit (annualised) on total assets"],
        ["Return on equity", pc(R.roe), R.roe >= 0.15 ? "g" : R.roe >= 0.08 ? "w" : "b", "Net profit (annualised) on shareholders' equity"]]],
      ["Liquidity", [
        ["Current ratio", xr(R.cr), R.cr >= 1.5 ? "g" : R.cr >= 1 ? "w" : "b", "Current assets for each 1 of current liabilities"],
        ["Quick ratio", xr(R.qr), R.qr >= 1 ? "g" : R.qr >= 0.7 ? "w" : "b", "Current assets excluding inventory"],
        ["Cash ratio", xr(R.cashr), R.cashr >= 0.3 ? "g" : R.cashr >= 0.1 ? "w" : "b", "Cash and bank against current liabilities"],
        ["Working capital", mny(R.wc), R.wc > 0 ? "g" : "b", "Current assets less current liabilities"]]],
      ["Leverage", [
        ["Debt to equity", xr(R.de), R.de <= 1 ? "g" : R.de <= 2 ? "w" : "b", "Borrowings against equity"],
        ["Total liabilities to assets", pc(R.da), R.da <= 0.5 ? "g" : R.da <= 0.7 ? "w" : "b", "Share of assets funded by creditors"],
        ["Net debt to EBITDA", fin || debt ? xr((debt - cash) / ebitda) : "–", ebitda > 0 ? ((debt - cash) / ebitda <= 2 ? "g" : (debt - cash) / ebitda <= 4 ? "w" : "b") : "", "Years of EBITDA to repay net borrowings"],
        ["Interest cover", fin ? xr(R.ic) : "–", fin ? (R.ic >= 4 ? "g" : R.ic >= 2 ? "w" : "b") : "", "Operating profit against finance cost"]]],
      ["Efficiency", [
        ["Receivable days (DSO)", dys(R.dso), R.dso <= 45 ? "g" : R.dso <= 75 ? "w" : "b", "Average time to collect from customers"],
        ["Inventory days (DIO)", dys(R.dio), "", "Average time stock is held before sale"],
        ["Payable days (DPO)", dys(R.dpo), "", "Average time taken to pay suppliers"],
        ["Cash conversion cycle", dys(R.ccc), isFinite(R.ccc) ? (R.ccc <= 60 ? "g" : R.ccc <= 100 ? "w" : "b") : "", "Days cash is tied up in operations"],
        ["Asset turnover", xr(R.at), "", "Revenue (annualised) for each 1 of assets"]]]
    ];
    var tone = { g: '<span class="tg g">Healthy</span>', w: '<span class="tg w">Watch</span>', b: '<span class="tg b">Risk</span>', "": "" };
    var rtab = rr.map(function (grp) {
      return '<h5 class="rg">' + grp[0] + "</h5>" + table(["Measure", "Value", "Reading", "What it shows"], grp[1].map(function (x) { return [x[0], x[1], { h: tone[x[2]] }, x[3]]; }), { num: [1] });
    }).join("");

    /* insights */
    var ins = [];
    if (Math.abs(drT - crT) > Math.max(1, 0.001 * Math.max(drT, crT))) ins.push({ t: "bad", h: "Trial balance does not balance", d: "Total debits " + mny(drT) + " and total credits " + mny(crT) + " differ by " + mny(drT - crT) + ". Fix this first; every ratio below depends on it." });
    else ins.push({ t: "good", h: "Trial balance balances", d: "Total debits and credits agree at " + mny(drT) + "." });
    if (unc.length) ins.push({ t: "warn", h: unc.length + " account(s) not classified", d: "They are left out of the statements. Assign them in the account list below: " + unc.slice(0, 4).map(function (a) { return a.name; }).join(", ") + (unc.length > 4 ? "…" : "") + "." });
    else if (Math.abs(diff) > Math.max(1, 0.001 * ta) && Math.abs(drT - crT) <= Math.max(1, 0.001 * Math.max(drT, crT))) ins.push({ t: "warn", h: "Balance sheet is out by " + mny(diff), d: "Assets and equity plus liabilities should agree. A misclassified account is the usual cause: check the account list below." });
    if (hasPL && rev > 0) {
      if (np < 0) ins.push({ t: "bad", h: "Loss for the period", d: "Net loss of " + mny(-np) + " (" + pc(np / rev) + " of revenue). Review gross margin and operating expenses first." });
      else ins.push({ t: R.nm >= 0.08 ? "good" : "info", h: "Net profit " + mny(np), d: pc(R.nm) + " of revenue. Gross margin " + pc(R.gm) + ", EBITDA margin " + pc(R.em) + "." });
      if (R.gm < 0.15) ins.push({ t: "warn", h: "Thin gross margin (" + pc(R.gm) + ")", d: "Each 1% improvement in pricing or purchase cost adds about " + mny(rev * 0.01) + " to profit." });
      if (R.opexr > 0.3) ins.push({ t: "warn", h: "Operating expenses are " + pc(R.opexr) + " of revenue", d: "The largest lines are " + A.filter(function (a) { return a.g === "opex"; }).sort(function (x, y) { return y.amt - x.amt; }).slice(0, 3).map(function (a) { return a.name; }).join(", ") + "." });
      if (fin > 0 && R.ic < 2) ins.push({ t: "bad", h: "Interest cover is " + xr(R.ic), d: "Operating profit covers finance cost only " + xr(R.ic, 1) + ". Below 2x lenders usually become concerned." });
    }
    if (cl > 0) {
      if (R.cr < 1) ins.push({ t: "bad", h: "Current ratio below 1 (" + xr(R.cr) + ")", d: "Current liabilities exceed current assets by " + mny(cl - ca) + ". Plan collections, supplier terms or fresh funding." });
      else if (R.cr < 1.5) ins.push({ t: "warn", h: "Liquidity is tight (current ratio " + xr(R.cr) + ")", d: "Quick ratio " + xr(R.qr) + ". Keep an eye on inventory and receivables." });
      else ins.push({ t: "good", h: "Comfortable liquidity (current ratio " + xr(R.cr) + ")", d: "Working capital of " + mny(R.wc) + "." });
    }
    if (eq < 0) ins.push({ t: "bad", h: "Negative equity", d: "Liabilities exceed assets by " + mny(-eq) + "." });
    else if (eq > 0 && R.de > 2) ins.push({ t: "warn", h: "High borrowing (debt to equity " + xr(R.de, 1) + ")", d: "Borrowings of " + mny(debt) + " against equity of " + mny(eq) + "." });
    if (isFinite(R.dso) && R.dso > 75) ins.push({ t: "warn", h: "Slow collections (" + dys(R.dso) + ")", d: "Cutting receivable days by 10 would release about " + mny(rev / days * 10) + " of cash." });
    if (isFinite(R.dpo) && isFinite(R.dso) && R.dpo < R.dso - 20) ins.push({ t: "info", h: "You pay suppliers faster than you collect", d: "Payable days " + dys(R.dpo) + " versus receivable days " + dys(R.dso) + ". Negotiating longer supplier terms would help cash." });
    if (isFinite(R.etr) && pbt > 0 && (R.etr < 0.15 || R.etr > 0.45)) ins.push({ t: "info", h: "Effective tax rate " + pc(R.etr), d: "This is unusual for a standard Pakistan rate of 29% on company profit. Check the tax provision." });
    if (hasPL && R.roe >= 0 && isFinite(R.roe) && R.at) ins.push({ t: "info", h: "Return on equity " + pc(R.roe), d: "= net margin " + pc(R.nm) + " × asset turnover " + xr(R.at) + " × equity multiplier " + xr(R.eqm) + " (DuPont)." });

    /* charts */
    var isbars = bars([{ l: "Revenue", v: rev, tone: "pos" }, { l: "Cost of sales", v: -cogs, tone: "neg" }, { l: "Operating expenses", v: -opex, tone: "neg" }, { l: "Depreciation", v: -dep, tone: "neg" }, { l: "Finance cost", v: -fin, tone: "neg" }, { l: "Tax", v: -tax, tone: "neg" }, { l: "Net profit", v: np, tone: np >= 0 ? "pos" : "neg" }], { fmt: cmp });
    var fund = bars([{ l: "Total assets", v: ta, tone: "pos" }, { l: "Equity", v: eq, tone: "pos" }, { l: "Borrowings", v: debt, tone: "neg" }, { l: "Other liabilities", v: tl - debt, tone: "neg" }], { fmt: cmp });

    /* account list for manual override */
    var opts = function (cur) { return GORDER.map(function (g) { return '<option value="' + g + '"' + (g === cur ? " selected" : "") + ">" + GL[g] + "</option>"; }).join(""); };
    var acctRows = A.slice().sort(function (a, b) { return GORDER.indexOf(a.g) - GORDER.indexOf(b.g); }).map(function (a) {
      return [a.code, a.name, mny(a.net), { h: '<select class="gsel" data-r="' + a.i + '">' + opts(a.g) + "</select>" }];
    });
    var out = "";
    out += '<h3 class="cfo-h">Financial statements <small>from your trial balance</small></h3>';
    out += kpis([kpi("Revenue", cmp(rev)), kpi("Gross margin", pc(R.gm), "Gross profit " + cmp(gp)), kpi("Net profit", cmp(np), pc(R.nm) + " of revenue", np < 0 ? "bad" : ""), kpi("Total assets", cmp(ta)), kpi("Current ratio", xr(R.cr), "Working capital " + cmp(R.wc), R.cr < 1 ? "bad" : ""), kpi("Debt to equity", xr(R.de), "Borrowings " + cmp(debt))]);
    out += box("What the numbers say", insights(ins), true);
    out += '<div class="cgrid">' + box("Income statement", table(["", "Amount", "% of revenue"], isr, { num: [1, 2] })) + box("Balance sheet", table(["", "Amount", "% of assets"], bsr, { num: [1, 2] })) + "</div>";
    out += '<div class="cgrid">' + box("Where the revenue goes", isbars) + box("How the business is funded", fund) + "</div>";
    out += box("Ratio analysis", rtab + note("Readings use general rules of thumb. Healthy ranges differ by industry, so compare with your sector and your own history. Ratios on profit are annualised for a period of " + months + " months."), true);
    out += box("Accounts and their classification", '<details class="cfo-det"><summary>' + A.length + " accounts · change any classification if a line landed in the wrong place</summary>" + table(["Code", "Account", "Net debit / (credit)", "Statement line"], acctRows, { num: [2] }) + "</details>", true);
    return out;
  }

  C.mods.tb = {
    label: "Trial balance → statements",
    desc: "Upload a trial balance. You get the income statement, balance sheet, 20+ ratios and a plain-language read-out.",
    cols: "Account name, then Debit and Credit (or one Balance column). Account code and type are optional.",
    fields: [
      { k: "name", label: "Account name", kind: "cat", req: 1, rx: [/^account\s*name$|^account$|^name$|^description$|^particulars$|^ledger/, /account|name|descr|particular|ledger|head/] },
      { k: "code", label: "Account code", kind: "any", rx: [/^(account\s*)?(code|no|number|#)$/, /code|a\/c\s*no|acc.*no/] },
      { k: "dr", label: "Debit", kind: "num", rx: [/^debit(s)?$|^dr\.?$/, /debit|\bdr\b/] },
      { k: "cr", label: "Credit", kind: "num", rx: [/^credit(s)?$|^cr\.?$/, /credit|\bcr\b/] },
      { k: "bal", label: "Balance (if no debit or credit columns)", kind: "num", rx: [/^balance$|^closing(\s*balance)?$|^amount$/, /balance|closing|amount|net/] },
      { k: "type", label: "Account type (optional)", kind: "cat", rx: [/^type$|^account\s*type$|^category$|^class$|^group$/, /type|categor|class|group|nature/] }
    ],
    opts: [
      { k: "months", label: "Period covered (months)", type: "number", def: 12 },
      { k: "credpos", label: "A single Balance column shows", type: "select", options: [["0", "Debit balances as positive"], ["1", "Credit balances as positive"]], def: "0" }
    ],
    detect: function (t) { var h = t.heads.join("|").toLowerCase(); return /debit/.test(h) && /credit/.test(h) ? 9 : (/account/.test(h) && /balance/.test(h) ? 4 : 0); },
    run: runTB
  };
  C.classify = classify;
})();
/* ===== CFO Desk: part 3 (sales, expenses, budget, ageing, any data) ===== */
(function () {
  "use strict";
  var C = window.__CFO, st = C.st, esc = C.esc, nf = C.nf, mny = C.mny, cmp = C.cmp, pc = C.pc, xr = C.xr, num = C.num, txt = C.txt, isBlank = C.isBlank, sum = C.sum, mean = C.mean;
  var table = C.table, kpi = C.kpi, kpis = C.kpis, box = C.box, bars = C.bars, insights = C.insights, note = C.note, emptyMsg = C.emptyMsg, trend = C.trend, stack = C.stack;
  var parseDate = C.parseDate, monthSeries = C.monthSeries, mlabel = C.mlabel, groupBy = C.groupBy, MON = C.MON;

  function dateReader(t, j) { var mf = C.monthFirst(C.colVals(t, j)); return function (v) { return parseDate(v, mf); }; }
  function label(v) { var s = txt(v); return s || "(blank)"; }
  function pct(a, b) { return b ? a / b : NaN; }
  function dim(items, key, topN, total) {
    var g = groupBy(items, function (x) { return x[key]; }, function (x) { return x.a; }).sort(function (a, b) { return b.v - a.v; });
    return g;
  }
  function paretoNote(g, total) {
    var run = 0, k = 0; for (; k < g.length; k++) { run += g[k].v; if (run >= 0.8 * total) { k++; break; } }
    return { n: k, share: g.length ? k / g.length : 0 };
  }
  function dimBox(title, g, total, unit) {
    var top = g.slice(0, 8), rest = sum(g.slice(8).map(function (x) { return x.v; }));
    var items = top.map(function (x) { return { l: x.k, v: x.v, s: pc(x.v / total) }; });
    if (rest > 0) items.push({ l: "Others (" + (g.length - 8) + ")", v: rest, s: pc(rest / total), tone: "mut" });
    var pa = paretoNote(g, total);
    return box(title, bars(items) + '<p class="cfo-n">' + pa.n + " of " + g.length + " " + unit + " (" + pc(pa.share, 0) + ") make up 80% of the total. Top 1: " + pc(g[0].v / total) + ", top 5: " + pc(sum(g.slice(0, 5).map(function (x) { return x.v; })) / total) + ".</p>");
  }

  /* ================= SALES ================= */
  function runSales(t, m) {
    if (m.date < 0 || m.amt < 0) return emptyMsg("Choose the Date and Sales amount columns above.");
    var rd = dateReader(t, m.date), rows = [], skip = 0;
    t.rows.forEach(function (r) { var d = rd(r[m.date]), a = num(r[m.amt]); if (!d || !isFinite(a)) { skip++; return; } rows.push({ d: d, a: a, p: m.prod >= 0 ? label(r[m.prod]) : "", c: m.cust >= 0 ? label(r[m.cust]) : "", g: m.reg >= 0 ? label(r[m.reg]) : "", q: m.qty >= 0 ? num(r[m.qty]) : NaN, cost: m.cost >= 0 ? num(r[m.cost]) : NaN }); });
    if (!rows.length) return emptyMsg("No rows had both a readable date and amount.");
    var total = sum(rows.map(function (x) { return x.a; })), n = rows.length, ms = monthSeries(rows, function (x) { return x.d; }, function (x) { return x.a; });
    var last = rows.reduce(function (a, x) { return x.d > a ? x.d : a; }, rows[0].d), partial = last.getDate() < C.daysIn(last.getFullYear(), last.getMonth()) - 3 && ms.vals.length > 2;
    var vals = partial ? ms.vals.slice(0, -1) : ms.vals, labs = partial ? ms.labels.slice(0, -1) : ms.labels, nm = vals.length;
    var ma = vals.map(function (v, i) { return i < 2 ? NaN : (vals[i] + vals[i - 1] + vals[i - 2]) / 3; });
    var mom = nm > 1 ? vals[nm - 1] / vals[nm - 2] - 1 : NaN;
    var l3 = nm >= 6 ? sum(vals.slice(-3)) / sum(vals.slice(-6, -3)) - 1 : NaN;
    var yoy = nm >= 13 ? vals[nm - 1] / vals[nm - 13] - 1 : NaN, y12 = nm >= 24 ? sum(vals.slice(-12)) / sum(vals.slice(-24, -12)) - 1 : NaN;
    var hasCost = rows.some(function (x) { return isFinite(x.cost); }), cost = sum(rows.map(function (x) { return isFinite(x.cost) ? x.cost : 0; }));
    var best = vals.indexOf(Math.max.apply(null, vals)), worst = vals.indexOf(Math.min.apply(null, vals));
    var fc = null, fcl = null;
    if (nm >= 6) { var lr = C.linreg(vals); fc = [0, 1, 2].map(function (i) { return Math.max(0, lr.a + lr.b * (nm + i)); }); var lk = ms.keys[nm - 1]; fcl = [1, 2, 3].map(function (i) { return mlabel(lk + i); }); }
    var ins = [];
    if (isFinite(mom)) ins.push({ t: mom >= 0 ? "good" : "warn", h: "Last full month " + (mom >= 0 ? "up " : "down ") + pc(Math.abs(mom)) + " on the month before", d: labs[nm - 1] + " sales were " + mny(vals[nm - 1]) + " against " + mny(vals[nm - 2]) + "." });
    if (isFinite(l3)) ins.push({ t: l3 >= 0.05 ? "good" : l3 <= -0.05 ? "bad" : "info", h: "Last 3 months " + (l3 >= 0 ? "up " : "down ") + pc(Math.abs(l3)) + " on the 3 months before", d: "A steadier signal than a single month: " + mny(sum(vals.slice(-3))) + " against " + mny(sum(vals.slice(-6, -3))) + "." });
    if (isFinite(yoy)) ins.push({ t: yoy >= 0 ? "good" : "warn", h: "Year on year " + (yoy >= 0 ? "+" : "") + pc(yoy), d: labs[nm - 1] + " against " + labs[nm - 13] + "." });
    if (isFinite(y12)) ins.push({ t: y12 >= 0 ? "good" : "warn", h: "Last 12 months " + (y12 >= 0 ? "+" : "") + pc(y12) + " on the 12 before", d: mny(sum(vals.slice(-12))) + " against " + mny(sum(vals.slice(-24, -12))) + "." });
    var dims = [["Product / item", "p", "products"], ["Customer", "c", "customers"], ["Region / channel", "g", "regions"]].filter(function (d) { return rows.some(function (x) { return x[d[1]]; }); });
    var boxes = "", conc = [];
    dims.forEach(function (d) {
      var g = dim(rows, d[1], 8, total); if (g.length < 2) return;
      boxes += dimBox("Sales by " + d[0].toLowerCase(), g, total, d[2]);
      var t1 = g[0].v / total; if (t1 > 0.3) ins.push({ t: t1 > 0.5 ? "bad" : "warn", h: "Dependence on one " + d[0].split(" ")[0].toLowerCase() + ": " + g[0].k, d: pc(t1) + " of sales. Losing it would hurt; build the next tier." });
      conc.push(g);
    });
    if (hasCost) {
      var pg = groupBy(rows.filter(function (x) { return isFinite(x.cost); }), function (x) { return x.p || x.c || "All"; }, function (x) { return x.a; });
      var cg = groupBy(rows.filter(function (x) { return isFinite(x.cost); }), function (x) { return x.p || x.c || "All"; }, function (x) { return x.cost; }), cm = {}; cg.forEach(function (x) { cm[x.k] = x.v; });
      var mt = pg.map(function (x) { return { k: x.k, s: x.v, c: cm[x.k], gp: x.v - cm[x.k] }; }).sort(function (a, b) { return b.gp - a.gp; });
      boxes += box("Profit by " + (m.prod >= 0 ? "product" : "customer"), table(["Item", "Sales", "Cost", "Gross profit", "Margin"], mt.slice(0, 12).map(function (x) { return [x.k, mny(x.s), mny(x.c), mny(x.gp), pc(x.gp / x.s)]; }), { num: [1, 2, 3, 4] }));
      var low = mt.filter(function (x) { return x.gp / x.s < 0.1 && x.s > total * 0.03; });
      if (low.length) ins.push({ t: "warn", h: "Low-margin lines: " + low.slice(0, 3).map(function (x) { return x.k; }).join(", "), d: "These bring in meaningful sales but under 10% gross margin. Review price or cost." });
      ins.push({ t: "info", h: "Overall gross margin " + pc((total - cost) / total), d: "Gross profit " + mny(total - cost) + " on sales of " + mny(total) + "." });
    }
    var seas = "";
    if (nm >= 12) {
      var bym = {}; ms.keys.slice(0, nm).forEach(function (k, i) { var c = k % 12; (bym[c] = bym[c] || []).push(vals[i]); });
      var avg = []; for (var c = 0; c < 12; c++) avg.push({ l: MON[c], v: bym[c] ? mean(bym[c]) : 0 }), 0;
      var am = mean(avg.map(function (x) { return x.v; }));
      seas = box("Seasonality: average sales by calendar month", bars(avg.map(function (x) { return { l: x.l, v: x.v, s: (x.v / am * 100).toFixed(0) + "% of avg", tone: x.v >= am ? "pos" : "mut" }; })));
      var hi = avg.slice().sort(function (a, b) { return b.v - a.v; })[0], lo = avg.slice().sort(function (a, b) { return a.v - b.v; })[0];
      ins.push({ t: "info", h: "Strongest month " + hi.l + ", weakest " + lo.l, d: "Plan stock, staffing and cash around this pattern." });
    } else {
      var wd = [0, 0, 0, 0, 0, 0, 0]; rows.forEach(function (x) { wd[x.d.getDay()] += x.a; });
      var names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      if (rows.length > 40) seas = box("Sales by day of week", bars(wd.map(function (v, i) { return { l: names[i], v: v, s: pc(v / total, 0) }; })));
    }
    if (fc) ins.push({ t: "info", h: "Trend projection for the next 3 months: " + cmp(sum(fc)), d: "A straight-line extension of the monthly history, not a forecast of seasonality or events. Use as a starting point." });
    if (partial) ins.push({ t: "info", h: "Last month looks incomplete", d: labs.length ? mlabel(ms.keys[ms.keys.length - 1]) + " ends on day " + last.getDate() + ", so it is shown but excluded from growth and trend figures." : "" });
    if (m.qty >= 0 && rows.some(function (x) { return isFinite(x.q) && x.q > 0; })) {
      var q = sum(rows.map(function (x) { return isFinite(x.q) ? x.q : 0; }));
      ins.push({ t: "info", h: "Average selling price " + mny(total / q, 2) + " per unit", d: nf(q) + " units sold in total." });
    }
    var out = '<h3 class="cfo-h">Sales analysis <small>' + nf(n) + " transactions · " + mlabel(ms.keys[0]) + " to " + mlabel(ms.keys[ms.keys.length - 1]) + "</small></h3>";
    out += kpis([kpi("Total sales", cmp(total)), kpi("Average per month", cmp(mean(vals)), nm + " months"), kpi("Last month vs previous", isFinite(mom) ? (mom >= 0 ? "+" : "") + pc(mom) : "–", labs[nm - 1], mom < 0 ? "bad" : ""), kpi("Transactions", nf(n), "Average " + cmp(total / n)), kpi(hasCost ? "Gross margin" : "Best month", hasCost ? pc((total - cost) / total) : labs[best], hasCost ? "Gross profit " + cmp(total - cost) : cmp(vals[best])), kpi("Annualised run-rate", cmp(nm >= 3 ? sum(vals.slice(-3)) * 4 : total / nm * 12), "from the last 3 months")]);
    out += box("What the numbers say", insights(ins), true);
    out += box("Monthly sales", trend(labs, vals, { ma: ma, fc: fc, fcl: fcl, aria: "Monthly sales" }) + (fc ? note("Lighter bars at the end are a straight-line projection.") : ""), true);
    out += '<div class="cgrid">' + boxes + seas + "</div>";
    if (skip) out += note(skip + " row(s) were skipped because the date or amount could not be read.");
    return out;
  }
  C.mods.sales = {
    label: "Sales analysis", desc: "Trend, growth, top customers and products, concentration, seasonality, margin and a simple projection.",
    cols: "One row per sale or invoice: Date and Amount. Add Product, Customer, Region, Quantity or Cost for deeper analysis.",
    fields: [
      { k: "date", label: "Date", kind: "date", req: 1, rx: [/^date$|invoice\s*date|sale(s)?\s*date|order\s*date|txn\s*date|transaction\s*date/, /date|day|month|period/] },
      { k: "amt", label: "Sales amount", kind: "num", req: 1, rx: [/^(net\s*)?(sales|revenue|amount|total|value)$|sales\s*amount|net\s*amount|invoice\s*amount|line\s*total|^total$/, /sales|revenue|amount|total|value|net/] },
      { k: "prod", label: "Product / item", kind: "cat", rx: [/^product(\s*name)?$|^item(\s*name)?$|^sku$|^service$/, /product|item|sku|service|description|material/] },
      { k: "cust", label: "Customer", kind: "cat", rx: [/^customer(\s*name)?$|^client$|^party$|^buyer$/, /customer|client|party|buyer|account/] },
      { k: "reg", label: "Region / channel", kind: "cat", rx: [/^region$|^channel$|^city$|^branch$|^territory$|^store$/, /region|channel|city|branch|territory|store|area|country|zone|segment/] },
      { k: "qty", label: "Quantity", kind: "num", rx: [/^qty$|^quantity$|^units?$/, /qty|quantity|units|volume/] },
      { k: "cost", label: "Cost of the sale (optional)", kind: "num", rx: [/^cost$|^cogs$|cost\s*of\s*(goods|sales)/, /cogs|cost/] }
    ],
    opts: [], detect: function (t) { var h = t.heads.join("|").toLowerCase(); return /(sales|revenue|invoice)/.test(h) && /(customer|product|item)/.test(h) ? 6 : (/(sales|revenue)/.test(h) ? 3 : 0); }, run: runSales
  };

  /* ================= EXPENSES ================= */
  function runExp(t, m, o) {
    if (m.date < 0 || m.amt < 0 || m.cat < 0) return emptyMsg("Choose the Date, Amount and Expense category columns above.");
    var rd = dateReader(t, m.date), rows = [], skip = 0;
    t.rows.forEach(function (r, i) { var d = rd(r[m.date]), a = num(r[m.amt]); if (!d || !isFinite(a)) { skip++; return; } rows.push({ i: i, d: d, a: a, k: label(r[m.cat]), v: m.vend >= 0 ? label(r[m.vend]) : "", dp: m.dept >= 0 ? label(r[m.dept]) : "" }); });
    if (!rows.length) return emptyMsg("No rows had both a readable date and amount.");
    var total = sum(rows.map(function (x) { return x.a; })), n = rows.length, ms = monthSeries(rows, function (x) { return x.d; }, function (x) { return x.a; });
    var last = rows.reduce(function (a, x) { return x.d > a ? x.d : a; }, rows[0].d), partial = last.getDate() < C.daysIn(last.getFullYear(), last.getMonth()) - 3 && ms.vals.length > 2;
    var vals = partial ? ms.vals.slice(0, -1) : ms.vals, labs = partial ? ms.labels.slice(0, -1) : ms.labels, nm = vals.length, keys = ms.keys.slice(0, nm);
    var ma = vals.map(function (v, i) { return i < 2 ? NaN : (vals[i] + vals[i - 1] + vals[i - 2]) / 3; });
    var cats = groupBy(rows, function (x) { return x.k; }, function (x) { return x.a; }).sort(function (a, b) { return b.v - a.v; });
    var revn = +o.revenue || 0, ins = [];
    var mom = nm > 1 ? vals[nm - 1] / vals[nm - 2] - 1 : NaN;
    /* category trend: recent vs earlier */
    var split = nm >= 6 ? nm - 3 : Math.floor(nm / 2), ct = [];
    if (nm >= 4) {
      var recentKeys = {}, earlyKeys = {}; keys.forEach(function (k, i) { if (i >= split) recentKeys[k] = 1; else earlyKeys[k] = 1; });
      var rl = nm - split, el = split;
      cats.slice(0, 12).forEach(function (c) {
        var re = 0, ea = 0; rows.forEach(function (x) { if (x.k !== c.k) return; var k = C.mkey(x.d); if (recentKeys[k]) re += x.a; else if (earlyKeys[k]) ea += x.a; });
        var rm = re / rl, em = ea / el; ct.push({ k: c.k, rm: rm, em: em, ch: em ? rm / em - 1 : NaN });
      });
      var up = ct.filter(function (x) { return isFinite(x.ch) && x.ch > 0.2 && x.rm > total / nm * 0.03; }).sort(function (a, b) { return (b.rm - b.em) - (a.rm - a.em); });
      if (up.length) ins.push({ t: "warn", h: "Fastest-rising: " + up.slice(0, 3).map(function (x) { return x.k + " (+" + pc(x.ch, 0) + ")"; }).join(", "), d: "Average monthly spend over the latest " + rl + " months compared with the " + el + " months before. Confirm each increase is intended." });
      var dn = ct.filter(function (x) { return isFinite(x.ch) && x.ch < -0.2; }).sort(function (a, b) { return a.ch - b.ch; });
      if (dn.length) ins.push({ t: "good", h: "Falling: " + dn.slice(0, 3).map(function (x) { return x.k + " (" + pc(x.ch, 0) + ")"; }).join(", "), d: "Spend per month is lower than earlier in the period." });
    }
    if (isFinite(mom)) ins.push({ t: mom > 0.15 ? "warn" : "info", h: "Last full month " + (mom >= 0 ? "up " : "down ") + pc(Math.abs(mom)), d: labs[nm - 1] + " spend was " + mny(vals[nm - 1]) + " against " + mny(vals[nm - 2]) + "." });
    if (revn > 0) ins.push({ t: total / revn > 0.9 ? "bad" : total / revn > 0.7 ? "warn" : "info", h: "Spend is " + pc(total / revn) + " of the revenue you entered", d: "Total expenses " + mny(total) + " against revenue " + mny(revn) + "." });
    if (cats.length > 1 && cats[0].v / total > 0.4) ins.push({ t: "warn", h: cats[0].k + " is " + pc(cats[0].v / total) + " of all spend", d: "One category drives the cost base; any saving there counts most." });
    /* vendors */
    var vbox = "";
    if (m.vend >= 0) {
      var vg = groupBy(rows, function (x) { return x.v; }, function (x) { return x.a; }).sort(function (a, b) { return b.v - a.v; });
      if (vg.length > 1) { vbox = dimBox("Spend by vendor", vg, total, "vendors"); if (vg[0].v / total > 0.25) ins.push({ t: "info", h: "Top vendor: " + vg[0].k + " (" + pc(vg[0].v / total) + ")", d: "Worth a rate review and a backup supplier." }); }
    }
    var dbox = ""; if (m.dept >= 0) { var dg = groupBy(rows, function (x) { return x.dp; }, function (x) { return x.a; }).sort(function (a, b) { return b.v - a.v; }); if (dg.length > 1) dbox = dimBox("Spend by department", dg, total, "departments"); }
    /* anomalies */
    var an = [], byc = {}; rows.forEach(function (x) { (byc[x.k] = byc[x.k] || []).push(x); });
    Object.keys(byc).forEach(function (k) {
      var L = byc[k]; if (L.length < 8) return; var a = L.map(function (x) { return x.a; }), q1 = C.quant(a, 0.25), q3 = C.quant(a, 0.75), iqr = q3 - q1, md = C.median(a);
      L.forEach(function (x) { if (x.a > q3 + 3 * iqr && x.a > md * 2) an.push({ x: x, md: md }); });
    });
    an.sort(function (a, b) { return b.x.a - a.x.a; });
    var abox = "";
    if (an.length) { abox = box("Unusually large payments", table(["Date", "Category", "Vendor", "Amount", "Typical in category"], an.slice(0, 8).map(function (z) { return [z.x.d.toISOString().slice(0, 10), z.x.k, z.x.v, mny(z.x.a), mny(z.md)]; }), { num: [3, 4] }) + note("Flagged when a payment is far above the normal range for its own category. Check the supporting document.")); ins.push({ t: "warn", h: an.length + " unusually large payment(s)", d: "Largest: " + mny(an[0].x.a) + " in " + an[0].x.k + " on " + an[0].x.d.toISOString().slice(0, 10) + "." }); }
    var seen = {}, dup = []; rows.forEach(function (x) { var k = [x.d.getTime(), x.a, x.v || x.k].join("|"); if (seen[k]) { seen[k].c++; } else { seen[k] = { x: x, c: 1 }; } });
    Object.keys(seen).forEach(function (k) { if (seen[k].c > 1 && seen[k].x.a !== 0) dup.push(seen[k]); });
    dup.sort(function (a, b) { return b.x.a * (b.c - 1) - a.x.a * (a.c - 1); });
    var dbx = "";
    if (dup.length) { var dsum = sum(dup.map(function (z) { return z.x.a * (z.c - 1); })); dbx = box("Possible duplicate payments", table(["Date", "Category", "Vendor", "Amount", "Times"], dup.slice(0, 8).map(function (z) { return [z.x.d.toISOString().slice(0, 10), z.x.k, z.x.v, mny(z.x.a), z.c]; }), { num: [3, 4] }) + note("Same date, amount and vendor (or category) appearing more than once.")); ins.push({ t: "warn", h: dup.length + " possible duplicate(s) worth " + mny(dsum), d: "Check whether these are genuine repeat payments." }); }
    var out = '<h3 class="cfo-h">Expense and cost analysis <small>' + nf(n) + " entries · " + mlabel(ms.keys[0]) + " to " + mlabel(ms.keys[ms.keys.length - 1]) + "</small></h3>";
    out += kpis([kpi("Total spend", cmp(total)), kpi("Average per month", cmp(mean(vals)), nm + " months"), kpi("Largest category", cats[0].k, cmp(cats[0].v) + " · " + pc(cats[0].v / total)), kpi("Last month vs previous", isFinite(mom) ? (mom >= 0 ? "+" : "") + pc(mom) : "–", labs[nm - 1], mom > 0.15 ? "bad" : ""), kpi("Entries", nf(n), "Average " + cmp(total / n)), kpi("Of revenue", revn > 0 ? pc(total / revn) : "Add revenue", revn > 0 ? "" : "optional input above")]);
    out += box("What the numbers say", insights(ins), true);
    out += box("Monthly spend", trend(labs, vals, { ma: ma, aria: "Monthly spend" }), true);
    out += '<div class="cgrid">' + dimBox("Spend by category", cats, total, "categories") + vbox + dbox + "</div>";
    if (ct.length) out += box("Category trend: latest months against earlier", table(["Category", "Earlier (per month)", "Latest (per month)", "Change"], ct.map(function (x) { return [x.k, mny(x.em), mny(x.rm), isFinite(x.ch) ? (x.ch >= 0 ? "+" : "") + pc(x.ch, 0) : "new"]; }), { num: [1, 2, 3] }), true);
    out += '<div class="cgrid">' + abox + dbx + "</div>";
    if (skip) out += note(skip + " row(s) were skipped because the date or amount could not be read.");
    return out;
  }
  C.mods.exp = {
    label: "Expense & cost analysis", desc: "Where the money goes: categories, vendors, trends, unusually large payments and possible duplicates.",
    cols: "One row per expense: Date, Amount and Category. Add Vendor and Department for more detail.",
    fields: [
      { k: "date", label: "Date", kind: "date", req: 1, rx: [/^date$|bill\s*date|payment\s*date|expense\s*date|txn\s*date|voucher\s*date/, /date|day|month/] },
      { k: "amt", label: "Amount", kind: "num", req: 1, rx: [/^amount$|^expense$|^cost$|^debit$|^value$|^total$|^paid$/, /amount|expense|cost|debit|value|total|paid/] },
      { k: "cat", label: "Expense category", kind: "cat", req: 1, rx: [/^category$|^expense\s*(type|head|category)$|^account$|^head$|^nature$|^type$/, /categor|expense|account|head|nature|type|ledger|class/] },
      { k: "vend", label: "Vendor / payee", kind: "cat", rx: [/^vendor(\s*name)?$|^payee$|^supplier(\s*name)?$|^paid\s*to$|^party$/, /vendor|payee|supplier|paid\s*to|party|beneficiary/] },
      { k: "dept", label: "Department / cost centre", kind: "cat", rx: [/^department$|^dept$|^cost\s*cent(re|er)$|^project$/, /department|dept|cost\s*cent|project|division/] }
    ],
    opts: [{ k: "revenue", label: "Revenue for the same period (optional)", type: "number", def: "" }],
    detect: function (t) { var h = t.heads.join("|").toLowerCase(); return /(expense|vendor|payee|supplier|paid)/.test(h) ? 6 : (/category/.test(h) && /amount/.test(h) ? 3 : 0); }, run: runExp
  };

  /* ================= BUDGET VS ACTUAL ================= */
  function runBva(t, m, o) {
    if (m.item < 0 || m.bud < 0 || m.act < 0) return emptyMsg("Choose the Item, Budget and Actual columns above.");
    var map = {}, order = [], skip = 0, periods = {}, porder = [];
    t.rows.forEach(function (r) {
      var it = txt(r[m.item]), b = num(r[m.bud]), a = num(r[m.act]); if (!it || (!isFinite(b) && !isFinite(a))) { skip++; return; }
      b = isFinite(b) ? b : 0; a = isFinite(a) ? a : 0;
      var ty = m.type >= 0 ? String(r[m.type]).toLowerCase() : "";
      if (!map[it]) { map[it] = { k: it, b: 0, a: 0, ty: ty }; order.push(it); }
      map[it].b += b; map[it].a += a; if (ty) map[it].ty = ty;
      if (m.per >= 0) { var p = txt(r[m.per]); if (p) { if (!periods[p]) { periods[p] = { b: 0, a: 0, bs: 0, as: 0 }; porder.push(p); } }}
    });
    var items = order.map(function (k) {
      var x = map[k], rev;
      if (o.kind === "rev") rev = true; else if (o.kind === "exp") rev = false;
      else if (x.ty) rev = /rev|sales|income|turnover/.test(x.ty) && !/expense|cost/.test(x.ty); else rev = /(revenue|sales|income|turnover|fees? earned)/i.test(x.k) && !/(expense|cost|tax)/i.test(x.k);
      x.rev = rev; x.v = x.a - x.b; x.fav = rev ? x.v >= 0 : x.v <= 0; x.vp = x.b ? x.v / Math.abs(x.b) : NaN; return x;
    });
    if (!items.length) return emptyMsg("No usable rows found.");
    var rb = sum(items.filter(function (x) { return x.rev; }).map(function (x) { return x.b; })), ra = sum(items.filter(function (x) { return x.rev; }).map(function (x) { return x.a; }));
    var eb = sum(items.filter(function (x) { return !x.rev; }).map(function (x) { return x.b; })), ea = sum(items.filter(function (x) { return !x.rev; }).map(function (x) { return x.a; }));
    var hasRev = items.some(function (x) { return x.rev; });
    var netB = rb - eb, netA = ra - ea, adverse = items.filter(function (x) { return !x.fav && Math.abs(x.vp) > 0.02; }), over10 = items.filter(function (x) { return !x.fav && isFinite(x.vp) && Math.abs(x.vp) >= 0.1; });
    var ins = [];
    if (hasRev) ins.push({ t: netA >= netB ? "good" : "bad", h: "Net result " + (netA >= netB ? "ahead of" : "behind") + " budget by " + mny(Math.abs(netA - netB)), d: "Actual " + mny(netA) + " against budget " + mny(netB) + "." });
    else ins.push({ t: ea <= eb ? "good" : "warn", h: "Total spend " + (ea <= eb ? "under" : "over") + " budget by " + mny(Math.abs(ea - eb)), d: "Actual " + mny(ea) + " against budget " + mny(eb) + " (" + pc((ea - eb) / eb) + ")." });
    var worst = items.filter(function (x) { return !x.fav; }).sort(function (a, b) { return Math.abs(b.v) - Math.abs(a.v); }).slice(0, 3);
    if (worst.length) ins.push({ t: "warn", h: "Biggest adverse variances: " + worst.map(function (x) { return x.k; }).join(", "), d: worst.map(function (x) { return x.k + " " + mny(Math.abs(x.v)) + (isFinite(x.vp) ? " (" + pc(Math.abs(x.vp), 0) + ")" : ""); }).join("; ") + "." });
    if (over10.length) ins.push({ t: "bad", h: over10.length + " line(s) are 10% or more adverse to budget", d: "These need an explanation and a corrective plan: " + over10.slice(0, 5).map(function (x) { return x.k; }).join(", ") + "." });
    var best = items.filter(function (x) { return x.fav && Math.abs(x.vp) > 0.02; }).sort(function (a, b) { return Math.abs(b.v) - Math.abs(a.v); })[0];
    if (best) ins.push({ t: "good", h: "Best favourable variance: " + best.k, d: mny(Math.abs(best.v)) + (isFinite(best.vp) ? " (" + pc(Math.abs(best.vp), 0) + ")" : "") + (best.rev ? " above budget." : " below budget.") });
    var sorted = items.slice().sort(function (a, b) { return Math.abs(b.v) - Math.abs(a.v); });
    var rows = sorted.map(function (x) { return { cls: x.fav ? "" : (Math.abs(x.vp) >= 0.1 ? "bad" : ""), cells: [x.k, x.rev ? "Revenue" : "Expense", mny(x.b), mny(x.a), mny(x.v), isFinite(x.vp) ? (x.vp >= 0 ? "+" : "") + pc(x.vp) : "–", { h: Math.abs(x.vp) <= 0.02 ? '<span class="tg">On budget</span>' : (x.fav ? '<span class="tg g">Favourable</span>' : '<span class="tg b">Adverse</span>') }] }; });
    var vb = bars(sorted.slice(0, 10).map(function (x) { return { l: x.k, v: x.fav ? Math.abs(x.v) : -Math.abs(x.v), tone: x.fav ? "pos" : "neg" }; }), { fmt: function (v) { return (v < 0 ? "Adverse " : "Favourable ") + cmp(Math.abs(v)); } });
    var out = '<h3 class="cfo-h">Budget versus actual <small>' + items.length + " lines</small></h3>";
    out += kpis([hasRev ? kpi("Revenue vs budget", (ra - rb >= 0 ? "+" : "") + cmp(ra - rb), pc(rb ? (ra - rb) / rb : NaN) + " · actual " + cmp(ra)) : kpi("Total budget", cmp(eb)), kpi("Expenses vs budget", (ea - eb >= 0 ? "+" : "") + cmp(ea - eb), pc(eb ? (ea - eb) / eb : NaN) + " · actual " + cmp(ea), ea > eb ? "bad" : ""), hasRev ? kpi("Net result vs budget", (netA - netB >= 0 ? "+" : "") + cmp(netA - netB), "Actual " + cmp(netA), netA < netB ? "bad" : "") : kpi("Total actual", cmp(ea)), kpi("Lines adverse", adverse.length + " of " + items.length, over10.length + " by 10% or more", over10.length ? "bad" : "")]);
    out += box("What the numbers say", insights(ins), true);
    out += '<div class="cgrid">' + box("Largest variances", vb) + box("Totals", table(["", "Budget", "Actual", "Variance"], (hasRev ? [["Revenue", mny(rb), mny(ra), mny(ra - rb)]] : []).concat([["Expenses", mny(eb), mny(ea), mny(ea - eb)]], hasRev ? [{ cls: "grand", cells: ["Net result", mny(netB), mny(netA), mny(netA - netB)] }] : []), { num: [1, 2, 3] })) + "</div>";
    out += box("Line by line", table(["Item", "Type", "Budget", "Actual", "Variance", "Variance %", "Status"], rows, { num: [2, 3, 4, 5] }) + note("Variance is actual minus budget. For revenue, above budget is favourable. For expenses, below budget is favourable. Lines within 2% are shown as on budget."), true);
    if (skip) out += note(skip + " row(s) skipped.");
    return out;
  }
  C.mods.bva = {
    label: "Budget vs actual", desc: "Compare budget with actual by line: variances, favourable and adverse, and what needs action.",
    cols: "One row per budget line: Item, Budget and Actual. Add a Type column (Revenue or Expense) if you have both.",
    fields: [
      { k: "item", label: "Item / account", kind: "cat", req: 1, rx: [/^item$|^account(\s*name)?$|^line(\s*item)?$|^particulars$|^description$|^head$/, /item|account|line|particular|descr|head|category/] },
      { k: "bud", label: "Budget", kind: "num", req: 1, rx: [/^budget(ed)?$|^plan(ned)?$|^forecast$|^target$/, /budget|plan|forecast|target/] },
      { k: "act", label: "Actual", kind: "num", req: 1, rx: [/^actual(s)?$|^spent$|^achieved$/, /actual|spent|achiev|real/] },
      { k: "type", label: "Type: revenue or expense (optional)", kind: "cat", rx: [/^type$|^nature$|^class$|^kind$/, /type|nature|class|kind|group/] },
      { k: "per", label: "Period / month (optional)", kind: "any", rx: [/^period$|^month$|^quarter$|^date$/, /period|month|quarter|date/] }
    ],
    opts: [{ k: "kind", label: "If there is no Type column, treat items as", type: "select", options: [["auto", "Detect from the item names"], ["exp", "All expenses"], ["rev", "All revenue"]], def: "auto" }],
    detect: function (t) { var h = t.heads.join("|").toLowerCase(); return /budget/.test(h) && /actual/.test(h) ? 9 : 0; }, run: runBva
  };

  /* ================= AGEING ================= */
  var BK = ["Not yet due", "1–30 days", "31–60 days", "61–90 days", "Over 90 days"];
  function runAge(t, m, o) {
    if (m.party < 0 || m.amt < 0 || (m.due < 0 && m.inv < 0)) return emptyMsg("Choose the Customer or supplier, Amount outstanding, and a Due date or Invoice date column above.");
    var asOf = parseDate(o.asof, false) || (function () { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); })();
    var terms = +o.terms || 0, rdD = m.due >= 0 ? dateReader(t, m.due) : null, rdI = m.inv >= 0 ? dateReader(t, m.inv) : null, rows = [], skip = 0;
    t.rows.forEach(function (r) {
      var a = num(r[m.amt]), p = label(r[m.party]), due = rdD ? rdD(r[m.due]) : null, inv = rdI ? rdI(r[m.inv]) : null;
      if (!due && inv) due = new Date(inv.getFullYear(), inv.getMonth(), inv.getDate() + terms);
      if (!isFinite(a) || !due) { skip++; return; }
      var late = Math.round((asOf - due) / 86400000), b = late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : late <= 90 ? 3 : 4;
      rows.push({ p: p, a: a, late: late, b: b });
    });
    if (!rows.length) return emptyMsg("No rows had both an amount and a readable date.");
    var pay = o.kind === "ap", total = sum(rows.map(function (x) { return x.a; })), bt = [0, 0, 0, 0, 0]; rows.forEach(function (x) { bt[x.b] += x.a; });
    var overdue = total - bt[0], odRows = rows.filter(function (x) { return x.late > 0; }), wavg = overdue ? sum(odRows.map(function (x) { return x.a * x.late; })) / overdue : 0;
    var rates = [0.005, 0.02, 0.05, 0.15, 0.4].map(function (d, i) { var v = parseFloat(o["pr" + i]); return isFinite(v) ? v / 100 : d; });
    var prov = sum(bt.map(function (v, i) { return v * rates[i]; }));
    var pg = {}; rows.forEach(function (x) { if (!pg[x.p]) pg[x.p] = [0, 0, 0, 0, 0, 0]; pg[x.p][x.b] += x.a; pg[x.p][5] += x.a; });
    var parties = Object.keys(pg).map(function (k) { return { k: k, v: pg[k] }; }).sort(function (a, b) { return b.v[5] - a.v[5]; });
    var who = pay ? "suppliers" : "customers", ins = [];
    ins.push({ t: overdue / total > 0.4 ? "bad" : overdue / total > 0.2 ? "warn" : "good", h: pc(overdue / total, 0) + " of the balance is past due", d: mny(overdue) + " is overdue out of " + mny(total) + ", on average " + Math.round(wavg) + " days late." });
    if (bt[4] > 0) ins.push({ t: "bad", h: mny(bt[4]) + " is over 90 days", d: pay ? "Expect supplier pressure, late fees or stopped supply. Agree a payment plan." : "Chase these first. The longer a debt ages the less likely it is collected; consider a provision." });
    var tp = parties[0]; if (tp && tp.v[5] / total > 0.25) ins.push({ t: "warn", h: "Concentration: " + tp.k + " is " + pc(tp.v[5] / total, 0) + " of the balance", d: pay ? "Heavy dependence on one supplier relationship." : "One customer holds a large share of your receivables. Watch their credit closely." });
    var late90 = parties.filter(function (p) { return p.v[4] > 0; }).slice(0, 3); if (late90.length) ins.push({ t: "warn", h: (pay ? "Longest overdue suppliers: " : "Focus the collection effort on: ") + late90.map(function (p) { return p.k; }).join(", "), d: "These " + who + " have balances over 90 days." });
    if (!pay) ins.push({ t: "info", h: "Indicative provision " + mny(prov), d: "At the rates shown below (" + rates.map(function (r) { return (r * 100).toFixed(1).replace(/\.0$/, "") + "%"; }).join(", ") + "). A starting point for discussion with your auditor, not an accounting entry." });
    else ins.push({ t: "info", h: "Cash needed to clear everything past due: " + mny(overdue), d: "Of which " + mny(bt[1]) + " is 1 to 30 days late. Prioritise by supplier importance and any late-payment penalties." });
    var prow = parties.slice(0, 15).map(function (p) { return [p.k, mny(p.v[0]), mny(p.v[1]), mny(p.v[2]), mny(p.v[3]), mny(p.v[4]), mny(p.v[5])]; });
    var out = '<h3 class="cfo-h">' + (pay ? "Payables" : "Receivables") + " ageing <small>as at " + asOf.toISOString().slice(0, 10) + " · " + rows.length + " open items · " + parties.length + " " + who + "</small></h3>";
    out += kpis([kpi("Total outstanding", cmp(total)), kpi("Past due", cmp(overdue), pc(overdue / total, 0) + " of total", overdue / total > 0.4 ? "bad" : ""), kpi("Over 90 days", cmp(bt[4]), pc(bt[4] / total, 0) + " of total", bt[4] > 0 ? "bad" : ""), kpi("Average days late", Math.round(wavg) + " days", "weighted by amount, overdue items"), kpi(pay ? "Open suppliers" : "Indicative provision", pay ? String(parties.length) : cmp(prov), pay ? "" : "see rates below")]);
    out += box("What the numbers say", insights(ins), true);
    out += box("Ageing profile", stack(bt.map(function (v, i) { return { l: BK[i], v: Math.max(0, v) }; })) + table(["Bucket", "Amount", "Share", pay ? "" : "Provision rate", pay ? "" : "Provision"].filter(function (x, i) { return !pay || i < 3; }), bt.map(function (v, i) { return pay ? [BK[i], mny(v), pc(v / total)] : [BK[i], mny(v), pc(v / total), { h: '<input class="prate" data-pr="' + i + '" type="number" step="0.5" min="0" max="100" value="' + (rates[i] * 100).toFixed(1).replace(/\.0$/, "") + '"> %' }, mny(v * rates[i])]; }), { num: [1, 2, 3, 4] }), true);
    out += box("Largest balances by " + (pay ? "supplier" : "customer"), table([pay ? "Supplier" : "Customer"].concat(BK, ["Total"]), prow, { num: [1, 2, 3, 4, 5, 6] }) + (parties.length > 15 ? note("Showing the 15 largest of " + parties.length + ".") : ""), true);
    if (skip) out += note(skip + " row(s) skipped because the amount or date could not be read.");
    return out;
  }
  C.mods.age = {
    label: "Receivable / payable ageing", desc: "Who owes you (or whom you owe), how overdue it is, concentration and an indicative provision.",
    cols: "One row per open invoice: Customer or supplier, Amount outstanding and a Due date (or Invoice date plus credit terms).",
    fields: [
      { k: "party", label: "Customer or supplier", kind: "cat", req: 1, rx: [/^customer(\s*name)?$|^supplier(\s*name)?$|^vendor(\s*name)?$|^party(\s*name)?$|^client$|^name$/, /customer|supplier|vendor|party|client|name|debtor|creditor/] },
      { k: "amt", label: "Amount outstanding", kind: "num", req: 1, rx: [/^(amount\s*)?(outstanding|due|balance|open)$|^balance$|^amount$|^pending$/, /outstanding|balance|amount|due\s*amt|pending|open|receivable|payable/] },
      { k: "due", label: "Due date", kind: "date", rx: [/^due\s*date$|^due$|^payment\s*due/, /due/] },
      { k: "inv", label: "Invoice date (used if no due date)", kind: "date", rx: [/^invoice\s*date$|^bill\s*date$|^date$/, /invoice|bill|date|doc/] }
    ],
    opts: [
      { k: "kind", label: "This is a list of", type: "select", options: [["ar", "Receivables (money owed to you)"], ["ap", "Payables (money you owe)"]], def: "ar" },
      { k: "asof", label: "As-of date", type: "date", def: "" },
      { k: "terms", label: "Credit terms (days), if only invoice date", type: "number", def: 30 }
    ],
    detect: function (t) { var h = t.heads.join("|").toLowerCase(); return /(due|outstanding|ageing|aging)/.test(h) && /(customer|supplier|party|vendor)/.test(h) ? 7 : (/due\s*date/.test(h) ? 4 : 0); }, run: runAge
  };

  /* ================= ANY DATA ================= */
  function runAny(t, m) {
    var heads = t.heads, nrows = t.rows.length, info = heads.map(function (h, j) { return C.colInfo(t, j); });
    var nums = [], blanks = [];
    heads.forEach(function (h, j) {
      var vals = t.rows.map(function (r) { return r[j]; }), nb = vals.filter(isBlank).length; blanks.push(nb);
      if (info[j].num >= 0.8 && info[j].date < 0.9) { var a = vals.map(num).filter(isFinite); if (a.length > 1) nums.push({ j: j, h: h, a: a }); }
    });
    var ins = [], out = '<h3 class="cfo-h">Data explorer <small>' + nf(nrows) + " rows · " + heads.length + " columns</small></h3>";
    var seen = {}, dups = 0; t.rows.forEach(function (r) { var k = r.join("¦"); if (seen[k]) dups++; else seen[k] = 1; });
    var worstBlank = heads.map(function (h, j) { return { h: h, p: blanks[j] / nrows }; }).filter(function (x) { return x.p > 0.05; }).sort(function (a, b) { return b.p - a.p; });
    if (dups) ins.push({ t: "warn", h: dups + " duplicate row(s)", d: "Identical rows can double-count amounts. Remove them or confirm they are genuine." });
    else ins.push({ t: "good", h: "No duplicate rows", d: "Every row is unique." });
    if (worstBlank.length) ins.push({ t: "warn", h: "Missing values in " + worstBlank.slice(0, 3).map(function (x) { return x.h + " (" + pc(x.p, 0) + ")"; }).join(", "), d: "Blank cells can hide transactions or skew totals." });
    var measure = m.meas >= 0 ? nums.filter(function (x) { return x.j === m.meas; })[0] : nums[0];
    if (nums.length) {
      var rowsS = nums.map(function (x) { var a = x.a; return [x.h, nf(a.length), mny(sum(a)), mny(mean(a)), mny(C.median(a)), mny(Math.min.apply(null, a)), mny(Math.max.apply(null, a)), nf(C.stdev(a), 2)]; });
      out += box("Numeric columns", table(["Column", "Count", "Total", "Average", "Median", "Min", "Max", "Std dev"], rowsS, { num: [1, 2, 3, 4, 5, 6, 7] }), true);
    }
    if (measure) {
      var a = measure.a, q1 = C.quant(a, 0.25), q3 = C.quant(a, 0.75), iqr = q3 - q1, hiF = q3 + 1.5 * iqr, loF = q1 - 1.5 * iqr, outl = a.filter(function (v) { return v > hiF || v < loF; });
      if (outl.length) ins.push({ t: "warn", h: outl.length + " outlier(s) in " + measure.h, d: "Values outside " + mny(loF) + " to " + mny(hiF) + ". Largest: " + mny(Math.max.apply(null, a)) + "." });
      var gj = m.grp >= 0 ? m.grp : -1;
      if (gj < 0) { for (var j = 0; j < heads.length; j++) if (j !== measure.j && info[j].num < 0.3 && info[j].dist > 1 && info[j].dist <= Math.max(12, nrows * 0.6) && info[j].date < 0.8) { gj = j; break; } }
      var dj = m.date >= 0 ? m.date : -1; if (dj < 0) { for (var k = 0; k < heads.length; k++) if (info[k].date >= 0.8) { dj = k; break; } }
      if (gj >= 0) {
        var gr = groupBy(t.rows.filter(function (r) { return isFinite(num(r[measure.j])); }), function (r) { return label(r[gj]); }, function (r) { return num(r[measure.j]); }).sort(function (x, y) { return y.v - x.v; }), tot = sum(gr.map(function (x) { return x.v; }));
        if (gr.length > 1 && tot > 0) { out += '<div class="cgrid">' + dimBox(measure.h + " by " + heads[gj], gr, tot, "groups") + box("Group detail", table([heads[gj], "Rows", "Total", "Average", "Share"], gr.slice(0, 15).map(function (x) { return [x.k, nf(x.n), mny(x.v), mny(x.v / x.n), pc(x.v / tot)]; }), { num: [1, 2, 3, 4] })) + "</div>"; ins.push({ t: "info", h: gr[0].k + " leads " + measure.h + " (" + pc(gr[0].v / tot) + ")", d: "Across " + gr.length + " groups in " + heads[gj] + "." }); }
      }
      if (dj >= 0) {
        var rd = dateReader(t, dj), its = []; t.rows.forEach(function (r) { var d = rd(r[dj]), v = num(r[measure.j]); if (d && isFinite(v)) its.push({ d: d, a: v }); });
        if (its.length > 3) { var ms = monthSeries(its, function (x) { return x.d; }, function (x) { return x.a; }); if (ms.vals.length > 1) { out += box(measure.h + " by month", trend(ms.labels, ms.vals, { ma: ms.vals.map(function (v, i) { return i < 2 ? NaN : (ms.vals[i] + ms.vals[i - 1] + ms.vals[i - 2]) / 3; }), aria: "Monthly trend" }), true); } }
      }
    }
    if (nums.length > 1) {
      var pairs = [], lim = Math.min(nums.length, 8);
      for (var x = 0; x < lim; x++) for (var y = x + 1; y < lim; y++) { var n = Math.min(nums[x].a.length, nums[y].a.length); var r = C.corr(nums[x].a.slice(0, n), nums[y].a.slice(0, n)); if (isFinite(r) && Math.abs(r) >= 0.5) pairs.push({ a: nums[x].h, b: nums[y].h, r: r }); }
      pairs.sort(function (p, q) { return Math.abs(q.r) - Math.abs(p.r); });
      if (pairs.length) out += box("Columns that move together", table(["Column A", "Column B", "Correlation"], pairs.slice(0, 6).map(function (p) { return [p.a, p.b, p.r.toFixed(2)]; }), { num: [2] }) + note("Values near +1 rise together, near -1 move in opposite directions. Correlation is not proof of cause."), true);
    }
    out += box("Data quality", table(["Column", "Missing", "Distinct values", "Looks like"], heads.map(function (h, j) { return [h, nf(blanks[j]) + " (" + pc(blanks[j] / nrows, 0) + ")", nf(info[j].dist) + (nrows > 600 ? "+" : ""), info[j].date >= 0.8 ? "Date" : info[j].num >= 0.8 ? "Number" : "Text"]; }), { num: [1, 2] }), true);
    var insHtml = box("What the numbers say", insights(ins), true);
    return out.replace(/(<h3 class="cfo-h">.*?<\/h3>)/, function (mm) { return mm + insHtml; });
  }
  C.mods.any = {
    label: "Any dataset", desc: "Drop in any table: totals, averages, outliers, top groups, trend over time and data quality checks.",
    cols: "Any table with a header row. Optionally pick the number to analyse, a grouping column and a date column.",
    fields: [
      { k: "meas", label: "Number to analyse", kind: "num", rx: [/^amount$|^value$|^total$/, /amount|value|total|sales|revenue|cost|price|qty/] },
      { k: "grp", label: "Group by", kind: "cat", rx: [/^category$|^type$|^name$/, /categor|type|name|product|customer|region|dept|group/] },
      { k: "date", label: "Date", kind: "date", rx: [/^date$/, /date|month|period/] }
    ],
    opts: [], detect: function () { return 0; }, run: runAny
  };
})();
/* ===== CFO Desk: part 4 (page shell, samples, upload, styles) ===== */
(function () {
  "use strict";
  var C = window.__CFO, st = C.st, $ = C.$, esc = C.esc, MODS = C.mods, ORDER = ["tb", "sales", "exp", "bva", "age", "any"];
  var built = false, timer = null;

  var CSS = ".cfo-priv{display:flex;gap:12px;align-items:flex-start;background:color-mix(in srgb,var(--teal) 12%,var(--card));border:1px solid color-mix(in srgb,var(--teal) 45%,var(--line));border-radius:14px;padding:14px 18px;margin-bottom:22px;font-size:.92rem}.cfo-priv svg{flex:none;color:var(--teal);margin-top:2px}" +
    ".cfo-in{padding:24px}.cfo-in h3{margin:0 0 4px;font-size:1.3rem}.cfo-in p{margin:0 0 14px;color:var(--mute)}" +
    ".cfo-drop{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;border:2px dashed color-mix(in srgb,var(--teal) 55%,var(--line));border-radius:16px;padding:26px 16px;cursor:pointer;background:var(--bg);transition:all .2s}.cfo-drop:hover,.cfo-drop.on{border-color:var(--teal);background:color-mix(in srgb,var(--teal) 10%,var(--bg))}.cfo-drop b{font-size:1.02rem}.cfo-drop span{font-size:.85rem;color:var(--mute)}.cfo-drop input{display:none}" +
    ".cfo-act{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 0}.cfo-act button,.cfo-chip button{font:600 .88rem Inter,sans-serif;border:1px solid var(--teal);background:transparent;color:var(--ink);padding:9px 16px;border-radius:99px;cursor:pointer;transition:all .2s}.cfo-act button:hover,.cfo-chip button:hover{background:var(--brand);color:#fff;border-color:var(--brand)}.cfo-act button.p{background:var(--acc);border-color:var(--acc);color:#1b1500}" +
    ".cfo-paste{display:none;margin-top:14px}.cfo-paste.on{display:block}.cfo-paste textarea{min-height:140px;font:.84rem/1.45 ui-monospace,Menlo,Consolas,monospace;margin-bottom:8px}" +
    ".cfo-set{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-top:16px}.cfo-set label{display:block;font-size:.8rem;color:var(--mute);margin-bottom:2px}.cfo-set select,.cfo-set input{margin:0;padding:10px 12px;font-size:.9rem}" +
    ".cfo-chip{display:none;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px;padding:10px 14px;border-radius:12px;background:var(--bg);border:1px solid var(--line);font-size:.9rem}.cfo-chip.on{display:flex}.cfo-chip b{word-break:break-all}.cfo-chip select{width:auto;margin:0;padding:6px 10px}.cfo-chip button{padding:6px 12px;font-size:.8rem}" +
    ".cfo-msg{margin-top:12px;font-size:.9rem;color:#b3261e;display:none}.cfo-msg.on{display:block}.cfo-msg.ok{color:var(--teal)}" +
    ".cfo-map{margin-top:18px;padding:22px}.cfo-map h4{margin:0 0 4px}.cfo-map p{margin:0 0 12px;color:var(--mute);font-size:.88rem}" +
    ".cfo-h{font:700 1.5rem Fraunces,Georgia,serif;margin:30px 0 14px;color:var(--ink)}.cfo-h small{display:block;font:500 .85rem Inter,sans-serif;color:var(--mute);margin-top:4px}" +
    ".kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}.kpi{background:var(--card);border:1px solid var(--line);border-top:3px solid var(--acc);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:3px}.kpi span{font-size:.78rem;color:var(--mute)}.kpi strong{font:700 1.4rem/1.2 Fraunces,Georgia,serif;color:var(--ink);word-break:break-word}.kpi small{font-size:.76rem;color:var(--mute)}.kpi.bad{border-top-color:#b3261e}.kpi.bad strong{color:#b3261e}" +
    ".cgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:16px;margin-bottom:16px;align-items:start}.cbox{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px 22px;margin-bottom:16px;min-width:0}.cgrid>.cbox{margin-bottom:0}.cbox h4{margin:0 0 12px;font:700 1.02rem 'Plus Jakarta Sans',Inter,sans-serif}.cbox.wide{grid-column:1/-1}.cbox p{margin:0 0 8px}" +
    ".cfo-n{font-size:.8rem;color:var(--mute);margin:10px 0 0!important;line-height:1.5}" +
    ".ins{list-style:none;margin:0;padding:0;display:grid;gap:10px}.ins li{border-left:4px solid var(--line);background:var(--bg);border-radius:0 10px 10px 0;padding:10px 14px;display:flex;flex-direction:column;gap:2px}.ins li b{font-size:.92rem}.ins li span{font-size:.86rem;color:var(--mute)}.ins .good{border-left-color:var(--teal)}.ins .warn{border-left-color:var(--acc)}.ins .bad{border-left-color:#b3261e}.ins .info{border-left-color:#7d8f83}" +
    ".hbs{display:grid;gap:7px}.hb{display:grid;grid-template-columns:minmax(80px,34%) 1fr auto;gap:10px;align-items:center;font-size:.86rem}.hl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ht{height:10px;border-radius:99px;background:color-mix(in srgb,var(--line) 70%,transparent);overflow:hidden}.ht i{display:block;height:100%;border-radius:99px;background:var(--teal)}.ht i.neg{background:#c0463d}.ht i.mut{background:#97a59b}.ht i.pos{background:var(--teal)}.hv{font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right}.hv em{font-style:normal;color:var(--mute);font-size:.78rem;margin-left:4px}" +
    ".trend{width:100%;height:auto;display:block}.trend .gl{stroke:var(--line);stroke-width:1}.trend .ax{fill:var(--mute);font-size:10px}.trend .bp{fill:var(--teal);opacity:.85}.trend .bn{fill:#c0463d}.trend .bf{fill:var(--acc);opacity:.55}.trend .ml{stroke:var(--acc);stroke-width:2.5;fill:none;stroke-linejoin:round}" +
    ".lg{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.78rem;color:var(--mute);margin-top:8px;align-items:center}.lg span{display:inline-flex;align-items:center;gap:6px}.lg i{display:inline-block;width:11px;height:11px;border-radius:3px;background:var(--teal)}.lg i.bf{background:var(--acc);opacity:.6}.lg i.ml2{height:3px;width:18px;background:var(--acc);border-radius:2px}" +
    ".stk{display:flex;height:22px;border-radius:99px;overflow:hidden;margin-bottom:6px}.stk i{display:block;height:100%}.s0{background:#2f7a50}.s1{background:#8aaa4f}.s2{background:#c9a35a}.s3{background:#d2693f}.s4{background:#a8281f}.lg .s0,.lg .s1,.lg .s2,.lg .s3,.lg .s4{opacity:1}" +
    ".cfot{font-size:.86rem}.cfot th{width:auto;white-space:nowrap;background:color-mix(in srgb,var(--line) 35%,transparent);font-size:.78rem}.cfot td,.cfot th{padding:8px 10px}.cfot .n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.cfot tr.hd td{font-weight:700;background:color-mix(in srgb,var(--line) 28%,transparent)}.cfot tr.tot td{font-weight:700;border-top:1px solid var(--ink)}.cfot tr.grand td{font-weight:800;border-top:2px solid var(--ink);border-bottom:3px double var(--ink)}.cfot tr.sub td{color:var(--mute);font-size:.8rem;padding-top:3px;padding-bottom:3px;white-space:pre}.cfot tr.bad td{background:color-mix(in srgb,#b3261e 8%,transparent)}.cfot select.gsel{margin:0;padding:6px 8px;font-size:.8rem;min-width:190px}.cfot input.prate{width:72px;margin:0;padding:5px 8px;font-size:.84rem}" +
    ".tg{display:inline-block;font:700 .72rem Inter,sans-serif;padding:2px 9px;border-radius:99px;background:var(--line);color:var(--ink)}.tg.g{background:color-mix(in srgb,var(--teal) 22%,transparent);color:var(--teal)}.tg.w{background:color-mix(in srgb,var(--acc) 30%,transparent);color:#7a5a12}.tg.b{background:color-mix(in srgb,#b3261e 16%,transparent);color:#b3261e}" +
    ".rg{margin:18px 0 6px;font:700 .8rem 'Plus Jakarta Sans',Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--teal)}.rg:first-child{margin-top:0}" +
    ".cfo-det summary{cursor:pointer;font-weight:600;margin-bottom:12px;color:var(--teal)}" +
    ".cfo-tools{display:flex;flex-wrap:wrap;gap:10px;margin:26px 0 0}.cfo-cta{margin-top:30px;display:flex;gap:18px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:var(--hero);color:#fff;border-radius:20px;padding:26px 30px}.cfo-cta h3{margin:0 0 4px;color:#fff;font-size:1.3rem}.cfo-cta p{margin:0;opacity:.88;max-width:560px}.cfo-cta .btn{margin:0}" +
    ".cfo-empty{text-align:center;padding:30px 10px;color:var(--mute)}" +
    "body.cfo-printing .cfo-in,body.cfo-printing .cfo-map,body.cfo-printing .cfo-priv,body.cfo-printing .cfo-tools,body.cfo-printing .cfo-cta,body.cfo-printing .cfo-msg{display:none!important}" +
    "@media print{.cfo-h{margin-top:12px}.cbox,.kpi{break-inside:avoid}.cfot select.gsel,.cfot input.prate{border:0;background:transparent;appearance:none}}" +
    "@media(max-width:640px){.cfo-in,.cfo-map{padding:18px 16px}.cbox{padding:16px}.hb{grid-template-columns:minmax(70px,38%) 1fr auto}.cfo-cta{padding:22px}}";

  /* ---------- samples and templates ---------- */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function ds(d) { return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear(); }
  function lastFullMonthEnd() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 0); }
  var SAMPLES = {
    tb: function () {
      var R = [["Account Code", "Account Name", "Debit", "Credit"], ["1001", "Cash in hand", 150000, ""], ["1002", "Bank - HBL current account", 2980000, ""], ["1100", "Accounts receivable", 4200000, ""], ["1105", "Allowance for doubtful debts", "", 120000], ["1200", "Inventory", 3600000, ""], ["1300", "Prepayments", 300000, ""], ["1310", "Advance income tax", 450000, ""],
        ["1500", "Plant and machinery", 6000000, ""], ["1510", "Furniture and fixtures", 900000, ""], ["1520", "Vehicles", 2400000, ""], ["1590", "Accumulated depreciation", "", 2100000], ["1600", "Intangible assets - software", 500000, ""],
        ["2001", "Accounts payable", "", 3300000], ["2100", "Accrued expenses", "", 650000], ["2200", "Sales tax payable", "", 420000], ["2300", "Short-term bank loan (running finance)", "", 1500000], ["2500", "Long-term loan", "", 4000000],
        ["3001", "Share capital", "", 5000000], ["3100", "Retained earnings", "", 2800000],
        ["4001", "Sales revenue", "", 28000000], ["4002", "Sales returns", 400000, ""], ["4500", "Other income", "", 350000],
        ["5001", "Cost of goods sold", 17600000, ""], ["6001", "Salaries and wages", 3600000, ""], ["6002", "Rent expense", 1200000, ""], ["6003", "Utilities", 540000, ""], ["6004", "Marketing and advertising", 700000, ""], ["6005", "Repairs and maintenance", 260000, ""], ["6006", "Professional fees", 180000, ""],
        ["6100", "Depreciation expense", 650000, ""], ["7001", "Interest expense", 780000, ""], ["8001", "Income tax expense", 850000, ""]];
      return R.map(function (r) { return r.join(","); }).join("\n").replace(/Bank - HBL current account/, '"Bank - HBL current account"').replace(/Short-term bank loan \(running finance\)/, '"Short-term bank loan (running finance)"');
    },
    sales: function () {
      var r = rng(7), end = lastFullMonthEnd(), prods = [["Industrial pumps", 85000, 0.62], ["Water filters", 12000, 0.55], ["Spare parts", 4500, 0.48], ["Service contracts", 30000, 0.30], ["Solar kits", 140000, 0.74], ["Accessories", 2500, 0.58]];
      var cust = [["Apex Textiles", 0.3], ["Noor Traders", 0.12], ["Delta Foods", 0.1], ["Metro Hospitals", 0.09], ["Sunrise Mills", 0.08], ["Zain Builders", 0.07], ["City Retail", 0.06], ["Green Farms", 0.05], ["Alpha Steel", 0.05], ["Walk-in", 0.08]], regs = ["Islamabad", "Lahore", "Karachi", "Peshawar"];
      var pick = function (a) { var x = r() * a.reduce(function (s, c) { return s + c[1]; }, 0), s = 0; for (var i = 0; i < a.length; i++) { s += a[i][1]; if (x <= s) return a[i]; } return a[a.length - 1]; };
      var out = ["Date,Invoice,Product,Customer,Region,Quantity,Amount,Cost"], inv = 1000;
      for (var m = 17; m >= 0; m--) {
        var ms = new Date(end.getFullYear(), end.getMonth() - m, 1), dim = new Date(ms.getFullYear(), ms.getMonth() + 1, 0).getDate(), grow = 1 + (17 - m) * 0.022, seas = [1.1, 0.9, 0.95, 1.0, 1.05, 1.0, 0.95, 0.9, 1.0, 1.05, 1.1, 1.25][ms.getMonth()], n = Math.round(24 * grow * seas);
        for (var i = 0; i < n; i++) {
          var p = pick(prods.map(function (x, k) { return [x, [0.12, 0.25, 0.3, 0.12, 0.05, 0.16][k]]; }))[0], c = pick(cust)[0], qty = Math.max(1, Math.round(r() * (p[1] > 50000 ? 3 : 14))), price = p[1] * (0.92 + r() * 0.16), amt = Math.round(qty * price), day = 1 + Math.floor(r() * dim);
          out.push([ds(new Date(ms.getFullYear(), ms.getMonth(), day)), "INV-" + (inv++), p[0], c, regs[Math.floor(r() * 4)], qty, amt, Math.round(amt * (p[2] + (r() - 0.5) * 0.06))].join(","));
        }
      }
      return out.join("\n");
    },
    exp: function () {
      var r = rng(11), end = lastFullMonthEnd(), out = ["Date,Category,Vendor,Department,Amount"];
      var fixed = [["Salaries", "Payroll", "Admin", 1800000], ["Rent", "Capital Properties", "Admin", 400000]], varc = [["Raw materials", ["Delta Steel", "Metro Chemicals", "Apex Imports"], "Production", 2600000, 0.25], ["Utilities", ["K-Electric / LESCO", "SNGPL"], "Production", 310000, 0.15], ["Marketing", ["Digital Edge", "Print House", "Expo Events"], "Sales", 220000, 0.4], ["Travel", ["PIA", "Careem", "Serena Hotels"], "Sales", 140000, 0.5], ["Professional fees", ["Khan & Co", "Legal Associates"], "Admin", 120000, 0.3], ["Repairs", ["Techfix", "Mehran Engineering"], "Production", 90000, 0.7]];
      for (var m = 11; m >= 0; m--) {
        var ms = new Date(end.getFullYear(), end.getMonth() - m, 1), dim = new Date(ms.getFullYear(), ms.getMonth() + 1, 0).getDate(), d1 = function (day) { return ds(new Date(ms.getFullYear(), ms.getMonth(), day)); };
        fixed.forEach(function (f) { out.push([d1(Math.min(dim, 28)), f[0], f[1], f[2], f[3] + (f[0] === "Salaries" ? (11 - m) * 12000 : 0)].join(",")); });
        varc.forEach(function (v) { var k = 3 + Math.floor(r() * 4), up = v[0] === "Marketing" ? 1 + (11 - m) * 0.08 : 1; for (var i = 0; i < k; i++) out.push([d1(1 + Math.floor(r() * dim)), v[0], v[1][Math.floor(r() * v[1].length)], v[2], Math.round(v[3] / k * up * (1 + (r() - 0.5) * v[4]))].join(",")); });
      }
      out.push([ds(new Date(end.getFullYear(), end.getMonth() - 3, 14)), "Marketing", "Expo Events", "Sales", 1850000].join(","));
      out.push([ds(new Date(end.getFullYear(), end.getMonth() - 1, 9)), "Professional fees", "Khan & Co", "Admin", 120000].join(","));
      out.push([ds(new Date(end.getFullYear(), end.getMonth() - 1, 9)), "Professional fees", "Khan & Co", "Admin", 120000].join(","));
      return out.join("\n");
    },
    bva: function () {
      var R = [["Item", "Type", "Budget", "Actual"], ["Product sales", "Revenue", 24000000, 22600000], ["Service income", "Revenue", 6000000, 6900000], ["Cost of materials", "Expense", 13500000, 14300000], ["Salaries and wages", "Expense", 4800000, 4750000], ["Rent", "Expense", 1200000, 1200000], ["Marketing", "Expense", 900000, 1350000], ["Utilities", "Expense", 600000, 690000], ["Travel", "Expense", 400000, 310000], ["Professional fees", "Expense", 350000, 340000], ["Repairs and maintenance", "Expense", 300000, 520000], ["Insurance", "Expense", 250000, 250000], ["Finance cost", "Expense", 780000, 840000]];
      return R.map(function (r) { return r.join(","); }).join("\n");
    },
    age: function () {
      var r = rng(5), t = new Date(), today = new Date(t.getFullYear(), t.getMonth(), t.getDate()), cs = ["Apex Textiles", "Noor Traders", "Delta Foods", "Metro Hospitals", "Sunrise Mills", "Zain Builders", "City Retail", "Alpha Steel"], out = ["Customer,Invoice,Invoice Date,Due Date,Outstanding"], n = 1;
      cs.forEach(function (c, k) { var cnt = 2 + Math.floor(r() * 3); for (var i = 0; i < cnt; i++) { var off = [-12, 8, 25, 48, 75, 110, 150][Math.floor(r() * (k < 2 ? 4 : 7))], due = new Date(today.getFullYear(), today.getMonth(), today.getDate() - off), inv = new Date(due.getFullYear(), due.getMonth(), due.getDate() - 30); out.push([c, "INV-" + (2000 + n++), ds(inv), ds(due), Math.round((150000 + r() * 1400000) * (k === 0 ? 2.2 : 1))].join(",")); } });
      return out.join("\n");
    },
    any: function () { return SAMPLES.sales(); }
  };
  var TEMPLATES = {
    tb: "Account Code,Account Name,Debit,Credit\n1001,Cash in hand,150000,\n2001,Accounts payable,,300000\n",
    sales: "Date,Invoice,Product,Customer,Region,Quantity,Amount,Cost\n01/04/2026,INV-1001,Water filters,Noor Traders,Lahore,10,120000,66000\n",
    exp: "Date,Category,Vendor,Department,Amount\n05/04/2026,Rent,Capital Properties,Admin,400000\n",
    bva: "Item,Type,Budget,Actual\nProduct sales,Revenue,24000000,22600000\nMarketing,Expense,900000,1350000\n",
    age: "Customer,Invoice,Invoice Date,Due Date,Outstanding\nApex Textiles,INV-2001,01/09/2026,01/10/2026,450000\n",
    any: "Date,Category,Amount\n01/04/2026,Example,1000\n"
  };

  /* ---------- UI ---------- */
  function msg(t, ok) { var m = $("cfoMsg"); if (!m) return; m.textContent = t || ""; m.className = "cfo-msg" + (t ? " on" : "") + (ok ? " ok" : ""); }
  function loadXLSX(cb) {
    if (window.XLSX) return cb();
    var s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = cb;
    s.onerror = function () { msg("The Excel reader could not be loaded (check your connection). Save the sheet as CSV and upload that instead."); };
    document.head.appendChild(s);
  }
  function download(name, text) { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

  function build() {
    var host = $("cfo"); if (!host || built) return; built = true;
    var style = document.createElement("style"); style.id = "cfoCss"; style.textContent = CSS; document.head.appendChild(style);
    host.innerHTML = '<div class="ph" data-bg="financeH"><div class="w"><div class="crumb">Private · Runs in your browser · Free</div><h1>CFO Desk: turn your numbers into decisions</h1><p>Upload a trial balance, sales, expenses, budget or receivables file. Get financial statements, ratios, trends and plain-language findings in seconds.</p></div></div>' +
      '<section><div class="w"><div class="cfo-priv"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><span><b>Your data stays on your device.</b> Files are read and analysed inside your browser. Nothing is uploaded to BIZEASE SOLUTIONS or to any server, and closing the page clears it.</span></div>' +
      '<div class="tabs" id="cfoTabs" role="tablist"></div><div class="c cfo-in" id="cfoIn"></div><div class="c cfo-map" id="cfoMap" style="display:none"></div><div id="cfoOut" aria-live="polite"></div><div id="cfoTools"></div>' +
      '<div class="cfo-cta"><div><h3>Want a CFO-level review of these numbers?</h3><p>BIZEASE SOLUTIONS prepares management accounts, budgets, cash-flow forecasts and board-ready reports for businesses in Pakistan and abroad.</p></div><a class="btn" href="#contact" style="color:#1b1500">Talk to an adviser</a></div>' +
      '<p class="note" style="color:var(--mute)">Analysis is automated and indicative. It relies on how your accounts are named and the period you supply, so review the findings with a qualified accountant before acting on them.</p></div></section>';
    renderTabs(); renderIn();
    if (typeof hydrate === "function") try { hydrate(); } catch (e) {}
  }
  function renderTabs() {
    $("cfoTabs").innerHTML = ORDER.map(function (k) { return '<button type="button" role="tab" data-m="' + k + '" class="' + (k === st.mod ? "on" : "") + '">' + esc(MODS[k].label) + "</button>"; }).join("");
    Array.prototype.forEach.call($("cfoTabs").querySelectorAll("button"), function (b) { b.onclick = function () { switchMod(b.getAttribute("data-m")); }; });
  }
  function renderIn() {
    var M = MODS[st.mod];
    $("cfoIn").innerHTML = "<h3>" + esc(M.label) + "</h3><p>" + esc(M.desc) + " <b>Your file needs:</b> " + esc(M.cols) + "</p>" +
      '<label class="cfo-drop" id="cfoDrop" for="cfoFile"><b>Drop a file here, or click to choose</b><span>CSV or Excel (.xlsx, .xls) · up to 25 MB</span><input id="cfoFile" type="file" accept=".csv,.txt,.tsv,.xlsx,.xls,.xlsm,.ods"></label>' +
      '<div class="cfo-act"><button type="button" id="cfoPasteB">Paste data from Excel</button><button type="button" class="p" id="cfoSample">Try with sample data</button><button type="button" id="cfoTpl">Download blank template</button></div>' +
      '<div class="cfo-paste" id="cfoPaste"><textarea id="cfoTa" placeholder="Copy cells from Excel or Google Sheets, including the header row, and paste here"></textarea><div class="cfo-act" style="margin-top:0"><button type="button" class="p" id="cfoGo">Analyse pasted data</button></div></div>' +
      '<div class="cfo-chip" id="cfoChip"></div><div class="cfo-msg" id="cfoMsg" role="status"></div>' +
      '<div class="cfo-set"><div><label for="cfoCur">Currency</label><select id="cfoCur">' + Object.keys(C.CUR).map(function (k) { return '<option value="' + k + '"' + (k === st.cur ? " selected" : "") + ">" + (k === "NONE" ? "No currency label" : k) + "</option>"; }).join("") + '</select></div><div><label for="cfoSty">Large numbers</label><select id="cfoSty"><option value="pk"' + (st.style === "pk" ? " selected" : "") + '>Lakh / Crore</option><option value="intl"' + (st.style === "intl" ? " selected" : "") + ">Thousand / Million / Billion</option></select></div></div>";
    var drop = $("cfoDrop"), fi = $("cfoFile");
    fi.onchange = function () { if (fi.files[0]) handleFile(fi.files[0]); fi.value = ""; };
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("on"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("on"); }); });
    drop.addEventListener("drop", function (e) { var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) handleFile(f); });
    $("cfoPasteB").onclick = function () { $("cfoPaste").classList.toggle("on"); $("cfoTa").focus(); };
    $("cfoGo").onclick = function () { var v = $("cfoTa").value; if (!v.trim()) return msg("Paste your data first."); setTable(C.parseCSV(v), "Pasted data"); };
    $("cfoSample").onclick = function () { setTable(C.parseCSV(SAMPLES[st.mod]()), "Sample data", true); };
    $("cfoTpl").onclick = function () { download("bizease-" + st.mod + "-template.csv", TEMPLATES[st.mod]); };
    $("cfoCur").onchange = function () { st.cur = this.value; run(); };
    $("cfoSty").onchange = function () { st.style = this.value; run(); };
    chip();
  }
  function chip() {
    var c = $("cfoChip"); if (!c) return;
    if (!st.tbl) { c.className = "cfo-chip"; c.innerHTML = ""; return; }
    c.className = "cfo-chip on";
    c.innerHTML = '<span>Loaded: <b>' + esc(st.name) + "</b> · " + C.nf(st.tbl.rows.length) + " rows · " + st.tbl.heads.length + " columns" + (st.tbl.dropped ? " · " + st.tbl.dropped + " total row(s) ignored" : "") + "</span>" +
      (st.sheets.length > 1 ? '<select id="cfoSheet" aria-label="Worksheet">' + st.sheets.map(function (s) { return "<option" + (s === st.sheet ? " selected" : "") + ">" + esc(s) + "</option>"; }).join("") + "</select>" : "") + '<button type="button" id="cfoClear">Clear</button>';
    $("cfoClear").onclick = clearData;
    var sh = $("cfoSheet"); if (sh) sh.onchange = function () { pickSheet(sh.value); };
  }
  function clearData() { st.tbl = null; st.wb = null; st.sheets = []; st.name = ""; st.over = {}; st.map = {}; chip(); $("cfoMap").style.display = "none"; $("cfoOut").innerHTML = ""; $("cfoTools").innerHTML = ""; msg(""); }

  function handleFile(f) {
    msg(""); if (f.size > 25 * 1024 * 1024) return msg("That file is larger than 25 MB. Export a smaller date range and try again.");
    var ext = (f.name.split(".").pop() || "").toLowerCase(), fr = new FileReader();
    if (/^(xlsx|xls|xlsm|ods)$/.test(ext)) {
      msg("Reading Excel file…", true);
      loadXLSX(function () {
        fr.onload = function () { try { st.wb = XLSX.read(new Uint8Array(fr.result), { type: "array", cellDates: true }); st.sheets = st.wb.SheetNames.slice(); st.fileLabel = f.name; var first = st.sheets.filter(function (s) { return XLSX.utils.sheet_to_json(st.wb.Sheets[s], { header: 1 }).length > 1; })[0] || st.sheets[0]; pickSheet(first); } catch (e) { msg("That Excel file could not be read. Try saving it as CSV."); } };
        fr.readAsArrayBuffer(f);
      });
    } else { fr.onload = function () { st.wb = null; st.sheets = []; setTable(C.parseCSV(fr.result), f.name); }; fr.readAsText(f); }
  }
  function pickSheet(name) { st.sheet = name; var rows = XLSX.utils.sheet_to_json(st.wb.Sheets[name], { header: 1, raw: true, defval: "", blankrows: false }); setTable(rows, st.fileLabel + (st.sheets.length > 1 ? " · " + name : ""), false, true); }

  function setTable(rows, name, isSample, keepSheets) {
    var t = C.tableFromRows(rows);
    if (!t || !t.rows.length) { st.tbl = null; chip(); return msg("We could not find a header row followed by data. Make sure the first row has column names."); }
    t._ci = {}; st.tbl = t; st.name = name; st.over = {}; st.map = {}; st.opt = st.opt || {};
    if (!keepSheets && !st.wb) st.sheets = [];
    msg("");
    if (!isSample) {
      var best = st.mod, bs = 0; ORDER.forEach(function (k) { var s = MODS[k].detect(t); if (s > bs) { bs = s; best = k; } });
      if (bs >= 6 && best !== st.mod) { st.mod = best; renderTabs(); renderIn(); msg("This looks like " + MODS[best].label.toLowerCase() + " data, so we switched to that analysis. Use the tabs above if you want a different one.", true); }
    }
    chip(); automap(); renderMap(); run(true);
  }
  function switchMod(k) { st.mod = k; renderTabs(); renderIn(); if (st.tbl) { automap(); renderMap(); run(); } else { $("cfoMap").style.display = "none"; $("cfoOut").innerHTML = ""; $("cfoTools").innerHTML = ""; } }

  function automap() {
    var t = st.tbl, M = MODS[st.mod], used = {}, map = {};
    M.fields.forEach(function (f) {
      var j = C.guess(t, f.rx, f.kind === "any" ? null : f.kind, used);
      if (j < 0 && f.req && f.kind !== "any") j = C.typedGuess(t, f.kind, used);
      if (j >= 0) used[j] = 1; map[f.k] = j;
    });
    if (st.mod === "tb") { if (map.dr >= 0 && map.cr >= 0) map.bal = -1; if (map.name < 0) map.name = C.typedGuess(t, "cat", used); if (map.dr < 0 && map.cr < 0 && map.bal < 0) { var j = C.typedGuess(t, "num", used); map.bal = j; } }
    st.map = map;
    st.opt[st.mod] = st.opt[st.mod] || {};
    M.opts.forEach(function (o) { if (st.opt[st.mod][o.k] == null) st.opt[st.mod][o.k] = o.def; });
    if (st.mod === "age" && !st.opt.age.asof) st.opt.age.asof = new Date().toISOString().slice(0, 10);
  }
  function renderMap() {
    var t = st.tbl, M = MODS[st.mod], el = $("cfoMap"); if (!t) return;
    var h = "<h4>Check how your columns were read</h4><p>We matched your columns automatically. Change any choice if it is wrong; the analysis below updates at once.</p><div class=\"cfo-set\">";
    M.fields.forEach(function (f) { h += '<div><label for="cm_' + f.k + '">' + esc(f.label) + (f.req ? " *" : "") + '</label><select id="cm_' + f.k + '" data-k="' + f.k + '">' + C.selOpts(t, st.map[f.k], true) + "</select></div>"; });
    M.opts.forEach(function (o) {
      var v = st.opt[st.mod][o.k]; h += '<div><label for="co_' + o.k + '">' + esc(o.label) + "</label>";
      if (o.type === "select") h += '<select id="co_' + o.k + '" data-o="' + o.k + '">' + o.options.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === v ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join("") + "</select>";
      else h += '<input id="co_' + o.k + '" data-o="' + o.k + '" type="' + o.type + '" value="' + esc(v == null ? "" : v) + '">';
      h += "</div>";
    });
    el.innerHTML = h + "</div>"; el.style.display = "";
    Array.prototype.forEach.call(el.querySelectorAll("[data-k]"), function (s) { s.onchange = function () { st.map[s.getAttribute("data-k")] = +s.value; st.over = {}; run(); }; });
    Array.prototype.forEach.call(el.querySelectorAll("[data-o]"), function (s) { var f = function () { st.opt[st.mod][s.getAttribute("data-o")] = s.value; clearTimeout(timer); timer = setTimeout(run, 250); }; s.onchange = f; s.oninput = f; });
  }

  function run(scroll) {
    var t = st.tbl, out = $("cfoOut"); if (!t) return;
    var M = MODS[st.mod], html;
    try { html = M.run(t, st.map, st.opt[st.mod] || {}); } catch (e) { if (window.console) console.error(e); html = '<div class="cbox wide"><h4>Something went wrong</h4><p>We could not analyse this file. Check the column choices above or try the template.</p></div>'; }
    out.innerHTML = html;
    Array.prototype.forEach.call(out.querySelectorAll("select.gsel"), function (s) { s.onchange = function () { st.over["r" + s.getAttribute("data-r")] = s.value; run(); }; });
    Array.prototype.forEach.call(out.querySelectorAll("input.prate"), function (s) { s.onchange = function () { st.opt.age["pr" + s.getAttribute("data-pr")] = s.value; run(); }; });
    $("cfoTools").innerHTML = '<div class="cfo-tools"><button type="button" class="btn" id="cfoPrint" style="color:#1b1500">Print or save as PDF</button><button type="button" class="btn" id="cfoCsv" style="background:transparent;border:1px solid var(--teal);color:var(--ink)">Download tables (CSV)</button></div>';
    $("cfoPrint").onclick = function () { document.body.classList.add("cfo-printing"); setTimeout(function () { window.print(); document.body.classList.remove("cfo-printing"); }, 50); };
    $("cfoCsv").onclick = exportCsv;
    if (scroll === true) { var y = out.getBoundingClientRect().top + window.pageYOffset - 90; window.scrollTo({ top: y, behavior: "smooth" }); }
  }
  function exportCsv() {
    var lines = [], q = function (s) { s = String(s).replace(/\s+/g, " ").trim(); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    Array.prototype.forEach.call($("cfoOut").querySelectorAll(".cbox"), function (b) {
      var title = (b.querySelector("h4") || {}).textContent || "";
      Array.prototype.forEach.call(b.querySelectorAll("table.cfot"), function (tb) {
        if (tb.querySelector("select,input")) { /* skip editable tables' inputs but keep text */ }
        lines.push(q(title)); Array.prototype.forEach.call(tb.querySelectorAll("tr"), function (tr) { lines.push(Array.prototype.map.call(tr.children, function (c) { var s = c.querySelector("select") ? c.querySelector("select").selectedOptions[0].textContent : c.querySelector("input") ? c.querySelector("input").value + "%" : c.textContent; return q(s); }).join(",")); }); lines.push("");
      });
    });
    if (!lines.length) return;
    download("bizease-cfo-analysis.csv", lines.join("\n"));
  }

  window.CFO = { mount: function () { build(); }, _st: st, _samples: SAMPLES, _load: function (mod, csv) { st.mod = mod; renderTabs(); renderIn(); setTable(C.parseCSV(csv), "Test", true); } };
})();
