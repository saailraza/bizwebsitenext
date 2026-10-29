
(function(){"use strict";var w=window;
/* ===================== BIZBOT engine, part 1: text, knowledge base, search ===================== */
var CTRY_NAME = { pk: "Pakistan", uae: "United Arab Emirates", ksa: "Saudi Arabia", bh: "Bahrain", uk: "United Kingdom", us: "United States" };
var CTRY_SHORT = { pk: "Pakistan", uae: "the UAE", ksa: "Saudi Arabia", bh: "Bahrain", uk: "the UK", us: "the US" };
var CTRY_CUR = { pk: "PKR", uae: "AED", ksa: "SAR", bh: "BHD", uk: "GBP", us: "USD" };
var CTRY_RX = {
  pk: /\b(pakistan|pakistani|pakistan(i)?s|islamabad|lahore|karachi|rawalpindi|peshawar|quetta|faisalabad|fbr|secp|ntn|pra|srb|kpra|punjab|sindh|pkr|rupees?|rs)\b/,
  uae: /\b(uae|u\.a\.e|emirates|emirati|dubai|abu dhabi|sharjah|ajman|fujairah|ras al khaimah|aed|dirhams?|fta|jafza|dmcc|ifza|meydan|rakez)\b/,
  ksa: /\b(saudi|ksa|riyadh|jeddah|dammam|misa|zatca|sar|riyals?|qiwa|gosi)\b/,
  bh: /\b(bahrain|bahraini|manama|nbr|bhd|sijilat)\b/,
  uk: /\b(uk|u\.k|united kingdom|britain|british|england|london|hmrc|companies house|gbp|pounds?)\b|£/,
  us: /\b(usa|u\.s\.a|united states|america|american|irs|delaware|wyoming|florida llc|usd|form 5472|5472|c-corp|ccorp|us (llc|company|corp|corporation|tax|business|entity|incorporation|formation|resident|citizen|based|market|customers?|clients?|bank)|(in|for|to|from|of|into) (the )?us)\b/
};
function detectCountries(t) {
  var s = " " + String(t || "").toLowerCase() + " ", out = [];
  Object.keys(CTRY_RX).forEach(function (k) { if (CTRY_RX[k].test(s)) out.push(k); });
  // GCC words that do not name one country
  return out;
}

/* ---------- normalisation ---------- */
var STOP = {};
("a an the and or of to in on at for from by with is are was were be been being am do does did can could should would will shall may might must i me my mine we our you your he she it its they them their this that these those there here what which who whom whose how when where why if then rate rates provide provides offer offers much long many benefit benefits than so as not no yes please pls tell give show want need know about any some also just very more most such into over under between during before after up down out off again further once only own same too s t don now get got has have had having let lets us ok okay hi hello hey thanks thank " +
  "kya kia hai hain hay hy h ho hu hoon hun tha thi ka ki ke ko se me mein main mai par pe per aur ya bhi hi to toh na nahi nahin mujhe mujhy mera meri mere meray hum humein ham aap ap apka apki apke tum tumhara kar kr karo karna karen karein krna kro krein kijiye kijye karun karu karoon btao batao bataye bataein bata btaen btain dein den dijiye dijye dena diya chahiye chahye chaahiye chahta chahti chahtay wala wali wale waly lagay lagey lagega lagta lagti liye liey lye k ky kuch koi kisi kon kaun jo jab tab agar jese jaise yeh ye yah woh wo uska uski unka un iska iski ise isko isse isme use usse ab abhi bas sirf ek kaise kese kaisay kaisa kaisi kitna kitni kitne kab kahan kahin kyun kyu kiya hota hoti hote hui hua gaya gayi sakta sakti sakte sakty").split(" ").forEach(function (w) { STOP[w] = 1; });

var SYN = {};
function syn(canon, list) { list.split(" ").forEach(function (w) { SYN[w] = canon; }); }
syn("salary", "salaries salaried tankhwah tankhwa tankha talab wage wages");
syn("register", "registration registrations registered registering incorporation incorporate incorporated incorporating formation rajistar registar registeration regester setup establish launch banana banani banwana banwani");
syn("company", "companies firm firms business businesses karobar karobaar karobari corporation corporations enterprise");
syn("document", "documents docs doc paperwork papers kaghaz kaghazat documentation requirement requirements required checklist");
syn("tax", "taxes taxation taxable tex taxed");
syn("penalty", "penalties penalised penalized fine fines jurmana surcharge");
syn("cost", "costs price prices pricing fee fees charges charge kharcha kharch qeemat package quote");
syn("accounting", "accountant accountants bookkeeping bookkeeper books");
syn("audit", "audits auditing auditor auditors");
syn("uae", "dubai emirates emirati sharjah ajman");
syn("ksa", "saudi riyadh jeddah");
syn("uk", "britain british england london");
syn("usa", "america american");
syn("pakistan", "pakistani islamabad lahore karachi");
syn("loan", "loans borrowing borrow karza qarz");
syn("invest", "investing investment investments invested");
syn("start", "starting begin");

var PHRASES = [
  [/\b(non[\s-]?filers?|not (in|on) (the )?atl|not a filer)\b/g, " nonfiler "],
  [/\b(sales tax|gst|vat|value added tax)\b/g, " vat "],
  [/\b(corporate (income )?tax|corporation tax|company tax|profit tax)\b/g, " corptax "],
  [/\b(free[\s-]?zones?)\b/g, " freezone "],
  [/\b(e[\s-]?invoic\w*|fatoorah)\b/g, " einvoice "],
  [/\b(how long|how many (days|weeks|months)|kitne din|kitna time|kitni der|kab tak|how soon|turn ?around|time lagta|kitna waqt)\b/g, " timeline "],
  [/\b(last date|due date|deadlines?)\b/g, " deadline "],
  [/\b(withholding tax|withholding|withhold|wht)\b/g, " withholding "],
  [/\b(tax residency|residency certificate|trc)\b/g, " trc "],
  [/\b(bank account|bank accounts|open a bank)\b/g, " bankaccount "],
  [/\b(who are you|your name)\b/g, " identity "]
];
function normText(t) {
  var s = " " + String(t || "").toLowerCase().replace(/[’`]/g, "'").replace(/&/g, " and ") + " ";
  PHRASES.forEach(function (p) { s = s.replace(p[0], p[1]); });
  return s;
}
function stem(w) {
  if (w.length < 4 || /^\d+$/.test(w)) return w;
  if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + "y";
  if (/(ss|us|is)$/.test(w)) return w;
  if (/(ches|shes|xes|zes|sses)$/.test(w)) return w.slice(0, -2);
  if (/ing$/.test(w) && w.length > 5) { var b = w.slice(0, -3); return /(.)\1$/.test(b) ? b.slice(0, -1) : b; }
  if (/ed$/.test(w) && w.length > 4) { var c = w.slice(0, -2); return /(.)\1$/.test(c) ? c.slice(0, -1) : c; }
  if (/ly$/.test(w) && w.length > 5) return w.slice(0, -2);
  if (/s$/.test(w)) return w.slice(0, -1);
  return w;
}
function rawWords(t) { return (normText(t).match(/[a-z]+|\d+/g) || []); }
function tokenize(t) {
  return rawWords(t).map(function (w) { return SYN[w] || w; }).filter(function (w) { return !STOP[w] && w.length > 1; }).map(stem);
}

/* ---------- fuzzy correction ---------- */
var VOCAB = {};
function editWithin(a, b, k) {
  if (Math.abs(a.length - b.length) > k) return false;
  var prev = [], i, j;
  for (j = 0; j <= b.length; j++) prev[j] = j;
  for (i = 1; i <= a.length; i++) {
    var cur = [i], best = i;
    for (j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > k) return false;
    prev = cur;
  }
  return prev[b.length] <= k;
}
function correctWord(w) {
  if (w.length < 5 || VOCAB[w] || /^\d+$/.test(w) || SYN[w] || STOP[w]) return w;
  var k = w.length >= 8 ? 2 : 1, best = null, bd = 0;
  for (var v in VOCAB) {
    if (v.charAt(0) !== w.charAt(0) || v.length < 4) continue;
    if (editWithin(w, v, k) && VOCAB[v] > bd) { best = v; bd = VOCAB[v]; }
  }
  return best || w;
}

/* ---------- knowledge base ---------- */
var KB = { chunks: [], idx: null, ready: false, blogSlugs: {} };
function cleanTitle(s) { return String(s || "").replace(/[^\x00-\x7F]+/g, "").replace(/\s+/g, " ").trim(); }
function addChunk(c) {
  c.tags = c.tags || []; c.text = String(c.text || "").trim(); c.title = String(c.title || "").trim();
  if (!c.text) return;
  c.id = KB.chunks.length; KB.chunks.push(c);
}
function slabText(y) {
  var S = y.S, L = [];
  for (var i = 0; i < S.length; i++) {
    var a = S[i], nxt = S[i + 1], lo = a[0], hi = nxt ? nxt[0] : null, r = Math.round(a[2] * 1000) / 10;
    var rng = i === 0 ? ("Up to PKR " + fmt(hi)) : (nxt ? ("PKR " + fmt(lo) + " to " + fmt(hi)) : ("Above PKR " + fmt(lo)));
    if (i === 0) L.push("- " + rng + ": nil (exempt)");
    else L.push("- " + rng + ": " + (a[1] ? "PKR " + fmt(a[1]) + " plus " : "") + r + "% of the amount above PKR " + fmt(lo));
  }
  if (y.s) L.push("- A surcharge of " + Math.round(y.s * 100) + "% applies to the tax when annual income is above PKR 10,000,000");
  return L.join("\n");
}
function buildStatic() {
  var g = function (k) { return w[k]; };
  var SV = g("SV"), ISV = g("ISV"), C = g("C"), CL = g("CL"), CN = g("CN"), CMP = g("CMP"), PEN = g("PEN"), FQ = g("FQ"), T = g("T"), FG = g("FG"), YL = g("YL"), WE = g("E");
  var cname = function (k) { return CTRY_NAME[k]; };
  try {
    (SV || []).forEach(function (s) {
      addChunk({ type: "service", title: s[1], text: s[2] + "\nIncludes:\n" + s[3].map(function (x) { return "- " + x; }).join("\n"), url: "#services", src: "Services" });
    });
    (ISV || []).forEach(function (s) {
      addChunk({ type: "service", title: "International service: " + s[1], text: s[2], url: "#services/international", src: "International services" });
    });
  } catch (e) {}
  try {
    Object.keys(C || {}).forEach(function (k) {
      var c = C[k], u = "#services/international/" + k, n = c.n;
      addChunk({ type: "country", title: "Company formation in " + n, text: c.t, tags: [k], url: u, src: n + " set-up" });
      addChunk({ type: "country", title: "Entity options in " + n, text: "Company types you can set up in " + n + ":\n" + c.e.map(function (x) { return "- " + x; }).join("\n"), tags: [k], url: u, src: n + " set-up" });
      addChunk({ type: "country", title: "Steps to set up a company in " + n, text: "Typical steps to register a company in " + n + ":\n" + c.s.map(function (x, i) { return (i + 1) + ". " + x; }).join("\n"), tags: [k], url: u, src: n + " set-up" });
      c.x.forEach(function (r) {
        addChunk({ type: "fact", group: "tax:" + r[0].toLowerCase() + ":" + k, title: r[0] + " in " + n, text: r[0] + " in " + n + ": " + r[1], tags: [k], url: u, src: n + " tax snapshot", label: r[0] });
      });
    });
  } catch (e) {}
  try {
    Object.keys(CL || {}).forEach(function (k) {
      addChunk({ type: "list", title: "Documents needed to set up a company in " + cname(k), text: "Documents to prepare for " + (CN && CN[k] || cname(k)) + ":\n" + CL[k].map(function (x) { return "- " + x; }).join("\n"), tags: [k], url: "#resources/check", src: cname(k) + " document checklist" });
    });
  } catch (e) {}
  try {
    var head = CMP[0], keys = { "United Arab Emirates": "uae", "Saudi Arabia": "ksa", "Bahrain": "bh", "United Kingdom": "uk", "United States": "us" };
    for (var i = 1; i < CMP.length; i++) {
      for (var j = 1; j < head.length; j++) {
        var k2 = keys[head[j]];
        addChunk({ type: "fact", group: "cmp:" + CMP[i][0], title: CMP[i][0] + " in " + head[j], text: CMP[i][0] + " in " + head[j] + ": " + CMP[i][j], tags: k2 ? [k2] : [], url: "#resources/cmp", src: "Country comparison", label: CMP[i][0] });
      }
    }
  } catch (e) {}
  try {
    var pkeys = { "United Arab Emirates": "uae", "Pakistan": "pk", "United Kingdom": "uk", "United States": "us", "Saudi Arabia": "ksa", "Bahrain": "bh" };
    PEN.forEach(function (r) {
      addChunk({ type: "fact", group: "pen", title: r[1] + " (" + r[0] + ")", text: r[1] + " in " + r[0] + ": " + r[2], tags: pkeys[r[0]] ? [pkeys[r[0]]] : [], url: "#resources/pen", src: "Deadlines and penalties", label: "Deadline or penalty", tagw: "deadline penalty late filing due date fine" });
    });
  } catch (e) {}
  try {
    FQ.forEach(function (q) { addChunk({ type: "faq", title: q[0], text: q[1], url: "#resources/faq", src: "FAQ" }); });
  } catch (e) {}
  try {
    T.forEach(function (t) {
      var tg = (t.id === "uae" || t.id === "ksa" || t.id === "uk" || t.id === "us") ? [t.id] : (/^(pk|pk5|biz|agri|gst|wht)$/.test(t.id) ? ["pk"] : []);
      addChunk({ type: "tool", title: cleanTitle(t.n) + " calculator", text: t.d, tags: tg, url: "#tax/" + t.id, src: cleanTitle(t.n) + " calculator", tool: t.id });
    });
    FG.forEach(function (t) {
      addChunk({ type: "tool", title: t.n + " calculator", text: t.d, url: "#finance/" + t.id, src: t.n + " calculator", tool: t.id });
    });
  } catch (e) {}
  try {
    YL.forEach(function (y, i) {
      addChunk({ type: "slab", title: "Pakistan salary tax slabs for " + y.n, text: "Salaried individual income tax slabs for " + y.n + ":\n" + slabText(y), tags: ["pk"], url: "#tax/pk", src: "Salary tax slabs " + y.n, yi: i });
    });
  } catch (e) {}
  try {
    addChunk({ type: "page", title: "CFO Desk: free financial analysis tool", text: "The CFO Desk page analyses your own files inside your browser. Nothing is uploaded to any server.\n- Trial balance: income statement, balance sheet, 20+ financial ratios and findings\n- Sales analysis: trend, growth, top customers and products, concentration, seasonality, projection\n- Expense and cost analysis: categories, vendors, unusual payments, possible duplicates\n- Budget vs actual: favourable and adverse variances\n- Receivable and payable ageing\n- Any dataset: quick summary of a CSV or Excel file\nUpload a CSV or Excel file and download the result as CSV or PDF.", url: "#cfo", src: "CFO Desk", tagw: "cfo analysis analytics trial balance financial statements upload excel csv sales expense budget ageing ratios" });
  } catch (e) {}
  try {
    var BS = w.BS;
    if (BS) addChunk({ type: "slab", title: "Pakistan normal income tax slabs for business, AOP and non-salaried individuals", text: "Normal income tax slabs for business owners, non-salaried individuals and AOPs (FY 2024-25, 2025-26 and 2026-27):\n- Up to PKR 600,000: nil\n- PKR 600,000 to 1,200,000: 15% of the amount above PKR 600,000\n- PKR 1,200,000 to 1,600,000: PKR 90,000 plus 20% of the amount above PKR 1,200,000\n- PKR 1,600,000 to 3,200,000: PKR 170,000 plus 30% of the amount above PKR 1,600,000\n- PKR 3,200,000 to 5,600,000: PKR 650,000 plus 40% of the amount above PKR 3,200,000\n- Above PKR 5,600,000: PKR 1,610,000 plus 45% of the amount above PKR 5,600,000\n- A 10% surcharge on the tax applies when income is above PKR 10,000,000\nCompanies pay a flat 29% (20% for small companies).", tags: ["pk"], url: "#tax/biz", src: "Business income tax slabs", yi: 99, tagw: "business normal slab aop sole proprietor non salaried self employed freelancer company" });
  } catch (e) {}
  try {
    WE.forEach(function (e, i) {
      var f = function (p) { return p ? p[0] + "% (filer) / " + p[1] + "% (non-filer)" : "not applicable"; };
      addChunk({ type: "wht", title: "Withholding tax, section " + e[0] + ": " + e[1], text: "Section " + e[0] + " – " + e[1] + ". Company: " + f(e[2]) + ". Individual and AOP: " + f(e[3]) + ". Nature: " + e[4] + ". Collected by: " + e[5] + ".", tags: ["pk"], url: "#tax/wht", src: "Withholding tax finder", wi: i });
    });
  } catch (e) {}
}
function scrapeDom() {
  if (typeof document === "undefined") return;
  var tmp = document.createElement("div");
  var txt = function (el) { tmp.innerHTML = el.innerHTML.replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " "); return (tmp.textContent || "").replace(/\s+/g, " ").trim(); };
  function pageSections(id, url, src, skip) {
    var p = document.getElementById(id); if (!p) return;
    Array.prototype.forEach.call(p.querySelectorAll("section"), function (s) {
      if (skip && skip(s)) return;
      var h = s.querySelector("h2,h3"), title = h ? txt(h) : src;
      var body = [];
      Array.prototype.forEach.call(s.querySelectorAll("h3,h4,p,li,.ci,summary,details p,.tl > *"), function (n) {
        if (n.closest("form,button,select,.tabs")) return;
        var t = txt(n); if (t && t.length > 2 && body.indexOf(t) < 0) body.push(t);
      });
      var text = body.join("\n"); if (text.length < 20) return;
      addChunk({ type: "page", title: title, text: text.slice(0, 1800), url: "#" + id, src: src });
    });
  }
  pageSections("about", "#about", "About us");
  pageSections("applications", "#applications", "Applications", function (s) { return !s.querySelector("h2") || !!s.querySelector(".band"); });
  pageSections("careers", "#careers", "Careers", function (s) { return !!s.querySelector("form"); });
  pageSections("home", "#home", "Home", function (s) { return !!(s.querySelector("#hs,#hc,.blogg,#car,.hero,.hf")); });
  var contact = document.getElementById("contact");
  if (contact) {
    var ci = [];
    Array.prototype.forEach.call(contact.querySelectorAll(".ci"), function (n) { ci.push("- " + txt(n)); });
    if (ci.length) addChunk({ type: "page", title: "Contact details, phone, email, office address and working hours", text: "BIZEASE SOLUTIONS contact details:\n" + ci.join("\n"), url: "#contact", src: "Contact page", fact: "contact" });
    Array.prototype.forEach.call(contact.querySelectorAll("details"), function (d) {
      var q = d.querySelector("summary"), a = d.querySelector("p");
      if (q && a) addChunk({ type: "faq", title: txt(q), text: txt(a), url: "#contact", src: "FAQ" });
    });
  }
  var ex = document.querySelector(".fcta h2");
}
function blogCountryTags(p) {
  var s = (p.title + " " + p.cat).toLowerCase(), tags = detectCountries(s);
  if (/pakistan|secp|ntn|fbr/.test(s) && tags.indexOf("pk") < 0) tags.push("pk");
  return tags;
}
function addBlog(p) {
  if (KB.blogSlugs[p.slug]) return;
  KB.blogSlugs[p.slug] = 1;
  var url = "/blog/" + p.slug + "/", tags = blogCountryTags(p), src = p.title;
  if (p.lead) addChunk({ type: "blog", group: "blog:" + p.slug, title: p.title, doc: p.title, text: p.lead, tags: tags, url: url, src: src, ext: true, date: p.date });
  p.secs.forEach(function (s) {
    addChunk({ type: "blog", group: "blog:" + p.slug, title: p.title + ": " + s[0], doc: p.title, sec: s[0], text: s[1], tags: tags, url: url, src: src, ext: true, date: p.date, tagw: (p.tags || []).join(" ") });
  });
}
function buildIndex() {
  var df = {}, N = KB.chunks.length, tot = 0;
  KB.chunks.forEach(function (c) {
    var tt = tokenize(c.title), bt = tokenize(c.text), gt = tokenize((c.tags || []).map(function (k) { return CTRY_NAME[k]; }).join(" ") + " " + (c.tagw || ""));
    var all = tt.concat(tt).concat(bt).concat(gt), tf = {};
    all.forEach(function (x) { tf[x] = (tf[x] || 0) + 1; });
    c.tf = tf; c.len = all.length; c.set = {}; tot += all.length;
    Object.keys(tf).forEach(function (x) { df[x] = (df[x] || 0) + 1; c.set[x] = 1; VOCAB[x] = (VOCAB[x] || 0) + 1; });
  });
  Object.keys(SYN).forEach(function (x) { VOCAB[stem(SYN[x])] = VOCAB[stem(SYN[x])] || 1; });
  KB.idx = { df: df, N: N, avg: tot / Math.max(1, N) };
}
function idf(t) { var d = KB.idx.df[t] || 0; return Math.log(1 + (KB.idx.N - d + 0.5) / (d + 0.5)); }
function initKB(blogs) {
  if (KB.ready) return;
  KB.chunks = [];
  buildStatic(); scrapeDom();
  (blogs || []).forEach(addBlog);
  buildIndex(); KB.ready = true;
}
function addBlogsLive(list) {
  if (!KB.ready) return;
  var before = KB.chunks.length;
  list.forEach(addBlog);
  if (KB.chunks.length > before) buildIndex();
}

/* ---------- search ---------- */
function analyzeQuery(q) {
  var words = rawWords(q).map(function (x) { return SYN[x] || x; }).filter(function (x) { return !STOP[x] && x.length > 1; });
  var terms = [], seen = {};
  words.forEach(function (x) {
    var s = stem(x); if (!KB.idx.df[s]) { var c = correctWord(s); if (c !== s) s = c; }
    if (!seen[s]) { seen[s] = 1; terms.push(s); }
  });
  return terms;
}
var K1 = 1.4, BB = 0.6;
function search(q, opts) {
  opts = opts || {};
  var terms = analyzeQuery(q), want = opts.countries || [], implicit = opts.implicit || [];
  if (!terms.length) return { terms: terms, hits: [] };
  var known = terms.filter(function (t) { return KB.idx.df[t]; }), totIdf = 0;
  known.forEach(function (t) { totIdf += idf(t); });
  var hasWht = terms.indexOf("withholding") >= 0 || /\bsection\b/.test(q.toLowerCase());
  var hasSlab = /slab|rate|salary|income tax|bracket/i.test(q);
  var res = [];
  KB.chunks.forEach(function (c) {
    var s = 0, m = 0;
    known.forEach(function (t) {
      var f = c.tf[t]; if (!f) return;
      var w1 = idf(t); m += w1;
      s += w1 * (f * (K1 + 1)) / (f + K1 * (1 - BB + BB * c.len / KB.idx.avg));
    });
    if (!s) return;
    var cov = totIdf ? m / totIdf : 0;
    s *= (0.45 + 0.55 * cov);
    if (c.type === "wht" && !hasWht) s *= 0.35;
    if (c.type === "slab" && !hasSlab) s *= 0.5;
    if (c.type === "tool") s *= 0.8;
    if (c.type === "faq") s *= 1.15;
    if (c.type === "blog") s *= 0.92;
    if (c.type === "fact") s *= 1.5;
    if (c.type === "list" && terms.indexOf("document") >= 0) s *= 2.2;
    if (!c.tags.length && want.length && c.type !== "tool") {
      var mn = c.mention || (c.mention = detectCountries(c.title + " " + c.text.slice(0, 300)));
      if (mn.length && !mn.some(function (k) { return want.indexOf(k) >= 0; })) s *= 0.3;
    }
    if (c.tags.length) {
      if (want.length) {
        var hit = c.tags.some(function (k) { return want.indexOf(k) >= 0; });
        s *= hit ? 1.9 : 0.3;
      } else if (implicit.length) {
        if (c.tags.some(function (k) { return implicit.indexOf(k) >= 0; })) s *= 1.35;
      }
    }
    res.push({ c: c, s: s, cov: cov });
  });
  res.sort(function (a, b) { return b.s - a.s; });
  return { terms: terms, hits: res, totIdf: totIdf };
}

/* ---------- composing answers from website text ---------- */
function splitSentences(p) {
  return p.replace(/([.!?])\s+(?=[A-Z0-9"“(£$])/g, "$1\u0001").split("\u0001").map(function (x) { return x.trim(); }).filter(Boolean);
}
function chunkUnits(c) {
  var out = [], lines = c.text.split("\n"), tableHead = false, inTable = false;
  lines.forEach(function (ln) {
    ln = ln.trim(); if (!ln) return;
    if (/^\|/.test(ln)) {
      var cells = ln.replace(/^\|\s*/, "").split(" · ");
      if (!inTable) { inTable = true; return; }
      out.push({ t: "**" + cells[0] + "**" + (cells.length > 1 ? " – " + cells.slice(1).join("; ") : ""), kind: "item" });
      return;
    }
    inTable = false;
    if (/^- /.test(ln)) out.push({ t: ln.slice(2), kind: "item" });
    else if (/^\d+\.\s/.test(ln)) out.push({ t: ln.replace(/^\d+\.\s/, ""), kind: "step" });
    else splitSentences(ln).forEach(function (s) { out.push({ t: s, kind: "para" }); });
  });
  return out;
}
function unitScore(u, qset) {
  var toks = tokenize(u.t), s = 0, seen = {};
  toks.forEach(function (t) { if (qset[t] && !seen[t]) { seen[t] = 1; s += idf(t); } });
  return s;
}
function renderChunk(c, qterms, full) {
  var units = chunkUnits(c), qset = {}; qterms.forEach(function (t) { qset[t] = 1; });
  var listy = units.filter(function (u) { return u.kind !== "para"; }).length >= 2;
  var pick = units.map(function (u, i) { return i; });
  if (!full && units.length > 6) {
    var sc = units.map(function (u, i) { return { i: i, s: unitScore(u, qset) + (i === 0 ? 0.01 : 0) }; });
    sc.sort(function (a, b) { return b.s - a.s; });
    var take = sc.slice(0, listy ? 6 : 4).filter(function (x, k) { return x.s > 0 || k === 0; });
    pick = take.map(function (x) { return x.i; }).sort(function (a, b) { return a - b; });
    if (listy && pick.indexOf(0) < 0 && units[0].kind === "para") pick.unshift(0);
  }
  var lines = [], num = 0, lastKind = "";
  pick.forEach(function (i) {
    var u = units[i];
    if (u.kind === "item") lines.push("- " + u.t);
    else if (u.kind === "step") { num++; lines.push(num + ". " + u.t); }
    else lines.push(u.t);
    lastKind = u.kind;
  });
  var omitted = units.length - pick.length;
  return { md: lines.join("\n"), listy: listy, omitted: omitted };
}
function dedupeByGroup(hits, n) {
  var seen = {}, out = [];
  for (var i = 0; i < hits.length && out.length < n; i++) {
    var g = hits[i].c.group || ("id:" + hits[i].c.id);
    if (hits[i].c.type === "blog") g = hits[i].c.group;
    if (seen[g] && hits[i].c.type !== "fact") continue;
    seen[g] = 1; out.push(hits[i]);
  }
  return out;
}
function srcItems(chs) {
  var seen = {}, out = [];
  chs.forEach(function (c) {
    var key = (c.src || c.title); if (seen[key]) return; seen[key] = 1;
    out.push({ title: c.src || c.title, href: c.url, ext: !!c.ext, blog: c.type === "blog" });
  });
  return out.slice(0, 3);
}

/* ===================== BIZBOT engine, part 2: numbers + calculators ===================== */
function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
var NW = { ek: 1, one: 1, do: 2, two: 2, teen: 3, three: 3, char: 4, four: 4, panch: 5, paanch: 5, five: 5, chhe: 6, chay: 6, six: 6, saat: 7, seven: 7, aath: 8, eight: 8, nau: 9, nine: 9, das: 10, ten: 10, pandrah: 15, fifteen: 15, bees: 20, twenty: 20, tees: 30, thirty: 30, chalis: 40, forty: 40, pachas: 50, fifty: 50, saath: 60, sixty: 60, sattar: 70, seventy: 70, assi: 80, eighty: 80, nabbe: 90, ninety: 90, sau: 100, hundred: 100, paune: 0.75 };
var MULT = { k: 1e3, thousand: 1e3, hazar: 1e3, hazaar: 1e3, lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5, crore: 1e7, crores: 1e7, cr: 1e7, million: 1e6, mn: 1e6, m: 1e6, mil: 1e6, billion: 1e9, bn: 1e9, arab: 1e9 };
var CURRX = [
  ["AED", /\b(aed|dirhams?)\b/], ["SAR", /\b(sar|riyals?)\b/], ["BHD", /\b(bhd|dinars?)\b/], ["GBP", /\b(gbp|pounds?)\b|£/],
  ["USD", /\b(usd|dollars?)\b|\$/], ["EUR", /\b(eur|euros?)\b|€/], ["PKR", /\b(pkr|rupees?|rupay|rupaye|rs\.?)\b/]
];
function detectCurrency(t) { for (var i = 0; i < CURRX.length; i++) if (CURRX[i][1].test(t)) return CURRX[i][0]; return null; }

function wordsToDigits(t) {
  return t.replace(/\b([a-z]+)\s+(hazar|hazaar|thousand|lakh|lakhs|lac|lacs|crore|crores|million|arab)\b/g, function (m, a, b) {
    return NW[a] != null ? (NW[a] + " " + b) : m;
  });
}
/* returns {money:[], pct:[], dur:[{v,unit}], years:[], all:[]} */
function parseQuantities(raw) {
  var t = " " + String(raw || "").toLowerCase().replace(/(\d),(?=\d{3}\b)/g, "$1").replace(/(\d)\s*[-–]\s*(\d{2})\b(?!\d)/g, "$1-$2") + " ";
  t = wordsToDigits(t);
  var out = { money: [], pct: [], dur: [], years: [], all: [], fy: null };
  var fy = t.match(/\b(?:fy|f\.y\.?)?\s*(20\d\d)\s*[-\/]\s*(\d\d)\b/);
  if (fy) { out.fy = +fy[1] + 1; t = t.replace(fy[0], " "); }
  var rx = /(\d+(?:\.\d+)?)(?:\s*)(%|percent|pct|fisad|months?|mahin[ae]|mah|saal|sal|years?|yrs?|yr|din|days?|crores?|cr|lakhs?|lacs?|lac|million|mil|mn|billion|bn|arab|hazaa?r|thousand|k|m)?(?![a-z0-9])/g, m;
  while ((m = rx.exec(t))) {
    var n = parseFloat(m[1]), u = m[2] || "", pos = m.index;
    if ((u === "k" || u === "m" || u === "cr" || u === "mn" || u === "mil") && /\s/.test(m[0].slice(m[1].length, m[0].length - u.length))) { u = ""; rx.lastIndex = m.index + m[1].length; }
    if (u === "%" || /^(percent|pct|fisad)$/.test(u)) { out.pct.push(n); out.all.push({ k: "pct", v: n, pos: pos }); continue; }
    if (/^(month|months|mahina|mahine|mah)$/.test(u)) { out.dur.push({ v: n, unit: "Months" }); out.all.push({ k: "dur", v: n, pos: pos }); continue; }
    if (/^(saal|sal|year|years|yr|yrs)$/.test(u)) { out.dur.push({ v: n, unit: "Years" }); out.all.push({ k: "dur", v: n, pos: pos }); continue; }
    if (/^(din|day|days)$/.test(u)) { out.dur.push({ v: n / 30, unit: "Months" }); continue; }
    var mult = MULT[u];
    if (mult) { out.money.push(n * mult); out.all.push({ k: "money", v: n * mult, pos: pos }); continue; }
    var after = t.slice(rx.lastIndex, rx.lastIndex + 14), before = t.slice(Math.max(0, pos - 12), pos);
    if (n >= 2000 && n <= 2100 && Number.isInteger(n) && !/\b(rs|pkr|aed|sar|usd|\$|£)\s*$/.test(before)) { out.years.push(n); continue; }
    out.money.push(n); out.all.push({ k: "money", v: n, pos: pos });
  }
  return out;
}
function monthlyOrAnnual(t, deflt) {
  if (/\b(annual|annually|yearly|saalana|salana|per year|a year|per annum|p\.a|pa|yearly|saal ka|saal ki|saal bhar)\b/.test(t)) return "annual";
  if (/\b(monthly|per month|a month|mahana|mahine|mahina|pm|month)\b/.test(t)) return "monthly";
  return deflt;
}

/* ---------- tool plumbing ---------- */
function findTool(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; }
function defaults(tool) {
  var v = {}; tool.f.forEach(function (f) { v[f[0]] = Array.isArray(f[2]) ? f[2][0] : f[2]; }); return v;
}
function fieldKind(f) {
  var l = f[1].toLowerCase();
  if (Array.isArray(f[2])) return "sel";
  if (/optional/.test(l)) return "opt";
  if (/%|rate|return|inflation|ownership|margin/.test(l)) return "pct";
  if (/\b(term|years?|age|life|holding|months?)\b/.test(l) && !/cost|price|payment|contribution/.test(l)) return "dur";
  if (/cash flows/.test(l)) return "txt";
  return "money";
}
var REQ = {
  emi: ["a", "r", "t"], flat: ["a", "r", "t"], mortgage: ["p", "r"], auto: ["p", "r", "t"], apr: ["a", "r", "t", "fee"], payoff: ["a", "r", "y"], cc: ["b", "p", "r"], afford: ["inc", "r", "y"],
  compound: ["p", "r", "y"], simple: ["p", "r", "y"], goal: ["t", "y"], ret: ["a", "ra"], roi: ["c", "f", "y"], infl: ["a", "r", "y"], be: ["fc", "p", "vc"], margin: ["c", "p"], dep: ["c", "l"], zakat: ["c"]
};
var FG_ORDER = [
  ["flat", /flat (interest )?rate|flat interest/], ["mortgage", /mortgage|home loan|housing (finance|loan)|house loan|ghar ka loan/], ["auto", /(car|auto|vehicle|bike) (loan|financ|lease)|gari (ka )?loan/],
  ["apr", /\bapr\b|true cost|effective (loan )?rate/], ["cc", /credit card/], ["payoff", /early (pay|settle|repay)|extra (\d[\d.,]*\w* )?(payments?|a month|per month|monthly)|prepay|pre-pay|pay(ing)? ?off|pay it off|settle .*loan/], ["afford", /afford|how much (loan|can i borrow)|loan eligib|borrow(ing)? capacity/],
  ["compound", /compound/], ["simple", /simple interest/], ["goal", /sav(e|ing)s? goal|goal.*sav|how much (to|should i) save|target amount/], ["ret", /retire|pension planning/], ["roi", /\broi\b|cagr|return on invest/],
  ["npv", /\bnpv\b|\birr\b|net present/], ["infl", /inflation/], ["be", /break[\s-]?even/], ["margin", /\bmargin\b|mark[\s-]?up/], ["dep", /depreciat/], ["zakat", /zakat|zakaat/],
  ["emi", /\b(emi|loan|instal+ments?|qist|kist|karza|qarz)\b/]
];
function detectFG(q) { for (var i = 0; i < FG_ORDER.length; i++) if (FG_ORDER[i][1].test(q)) return FG_ORDER[i][0]; return null; }

function hasCalcVerb(q) { return /\b(calculate|calc|compute|work out|figure|hisab|hisaab|nikal|nikalo|kitna|kitni|kitne|how much|what would|what will|what is my|btao|batao|bata do|btaen|estimate)\b/.test(q); }

function fillFromQuantities(tool, qty, ctx) {
  var v = defaults(tool), got = {}, mi = 0, pi = 0, di = 0, hasOpt = [];
  var money = qty.money.slice(), pct = qty.pct.slice(), dur = qty.dur.slice();
  var rq = REQ[tool.id] || [];
  var kinds = tool.f.map(function (f, i) { return [f, fieldKind(f), rq.indexOf(f[0]) >= 0 ? rq.indexOf(f[0]) : 50 + i]; });
  kinds.sort(function (a, b) { return a[2] - b[2]; });
  // zakat / simple: money fields get assigned in order
  kinds.forEach(function (p) {
    var f = p[0], k = p[1];
    if (k === "money" && mi < money.length) { v[f[0]] = money[mi++]; got[f[0]] = 1; }
    else if (k === "pct" && pi < pct.length) { v[f[0]] = pct[pi++]; got[f[0]] = 1; }
    else if (k === "dur" && di < dur.length) {
      var d = dur[di++], l = f[1].toLowerCase();
      if (/months/.test(l)) v[f[0]] = d.unit === "Months" ? d.v : d.v * 12;
      else if (/years|\(years\)|age/.test(l) && !/term$/.test(l)) v[f[0]] = d.unit === "Years" ? d.v : d.v / 12;
      else v[f[0]] = d.v;
      var uf = tool.f.filter(function (x) { return x[0] === "u"; })[0];
      if (uf) v.u = d.unit;
      got[f[0]] = 1;
    } else if (k === "opt" && mi < money.length) { hasOpt.push(f[0]); }
  });
  // bare "5 year" with unit select: ensure unit coherent when the tool has 'u' but no duration was given
  return { v: v, got: got };
}
function runTool(list, tool, v) {
  var rows = tool.c(v), out = [];
  if (!Array.isArray(rows) || !rows.length || !Array.isArray(rows[0]) || rows[0].length !== 2) return null;
  return rows;
}
function prefixCur(rows, cur) {
  return rows.map(function (r) {
    var val = String(r[1]);
    if (cur && /^-?[\d,]+(\.\d+)?$/.test(val)) val = cur + " " + val;
    return [r[0], val];
  });
}

/* ---------- Pakistan salary / income tax ---------- */
function pickYear(q, qty) {
  var YL = w.YL, y = qty.fy || (qty.years.length ? qty.years[0] : null), idx = -1, ambiguous = false;
  if (!y) return { idx: 0, label: YL[0].n, assumed: true };
  // "tax year 2026" and a bare "2026" both mean TY 2026 in FBR's convention
  for (var i = 0; i < YL.length; i++) if (YL[i].n.indexOf("TY " + y + ")") >= 0) idx = i;
  if (idx < 0) {
    // FY label like 2025-26 maps to TY2026 = covered above via qty.fy; fall back to nearest
    var best = 0, bd = 99;
    YL.forEach(function (x, i) { var ty = +x.n.match(/TY (\d{4})/)[1], d = Math.abs(ty - y); if (d < bd) { bd = d; best = i; } });
    return { idx: best, label: YL[best].n, assumed: true, outside: y };
  }
  var nextIdx = idx - 1; // newer year
  var bare = !qty.fy && !/\b(fy|financial year|tax year|ty)\b/.test(q);
  return { idx: idx, label: YL[idx].n, assumed: false, other: bare && nextIdx >= 0 ? nextIdx : -1 };
}
function calcPkSalary(q, qty, ctx) {
  var YL = w.YL;
  if (!qty.money.length) return { need: ["your salary or income amount"], tool: "pk", partial: {} };
  var amt = qty.money[0], period = monthlyOrAnnual(q, /\b(salary|tankhw|tankha|talab|wages?|payroll|take.?home)\b/.test(q) ? "monthly" : "annual");
  var yr = pickYear(q, qty), y = YL[yr.idx], annual = period === "monthly" ? amt * 12 : amt;
  var t = w.taxY(annual, y), notes = [];
  var rows = [
    ["Tax year", y.n], ["Salary", "PKR " + fmt(amt) + (period === "monthly" ? " per month" : " per year")], ["Annual income", "PKR " + fmt(annual)],
    ["Annual tax", "PKR " + fmt(t)], ["Monthly tax", "PKR " + fmt(t / 12)], ["Monthly take-home", "PKR " + fmt((annual - t) / 12)],
    ["Effective rate", (annual ? t / annual * 100 : 0).toFixed(2) + "%"]
  ];
  if (t === 0) notes.push("Income up to PKR 600,000 a year is exempt under these slabs, so no salary tax is due.");
  if (annual > 1e7 && y.s) notes.push("Includes the " + Math.round(y.s * 100) + "% surcharge for income above PKR 10,000,000.");
  if (yr.assumed && !yr.outside) notes.push("You didn't mention a year, so I used the current one, " + y.n + ".");
  if (yr.outside) notes.push("The site covers FY 2022-23 to FY 2026-27, so I used the nearest year, " + y.n + ".");
  if (yr.other >= 0) {
    var o = YL[yr.other], t2 = w.taxY(annual, o);
    var tyN = y.n.match(/TY (\d{4})/)[1];
    notes.push("I read “" + tyN + "” as tax year " + tyN + ", which is " + y.n.replace(/ \(TY.*$/, "") + ". For " + o.n + " the tax would be PKR " + fmt(t2 / 12) + " per month.");
  }
  if (period === "monthly" && !/\bmonthly|per month|month|mahana|mahine\b/.test(q)) notes.push("I took " + fmt(amt) + " as a monthly salary. Say “annual” if it is a yearly figure.");
  var prev = YL[yr.idx + 1];
  if (prev && yr.idx + 1 < YL.length) {
    var tp = w.taxY(annual, prev), diff = tp - t;
    if (Math.abs(diff) >= 1) notes.push("Compared with " + prev.n + ", you " + (diff > 0 ? "pay PKR " + fmt(diff / 12) + " less" : "pay PKR " + fmt(-diff / 12) + " more") + " each month.");
  }
  return { title: "Pakistan salary tax · " + y.n, hero: ["Monthly tax", "PKR " + fmt(t / 12)], rows: rows.slice(1), notes: notes, link: { t: "Open the salary tax calculator", h: "#tax/pk" }, toolId: "pk", vals: { amt: amt, period: period, yi: yr.idx } };
}

/* ---------- Pakistan business / AOP normal slabs ---------- */
function calcPkBiz(q, qty, ctx) {
  if (!qty.money.length) return { need: ["your total annual taxable income"], tool: "biz", partial: {} };
  var BTP = w.BTP, a = qty.money[0], period = monthlyOrAnnual(q, "annual");
  if (period === "monthly") a *= 12;
  var tp = BTP[0];
  if (/\bsmall company\b/.test(q)) tp = BTP[3];
  else if (/\b(company|pvt|private limited|limited|corporate|corporation|ltd)\b/.test(q)) tp = BTP[2];
  else if (/\b(aop|partnership|firm|association of persons)\b/.test(q)) tp = BTP[1];
  var t = w.btax(a, tp), notes = [];
  var rows = [["Taxpayer type", tp], ["Annual taxable income", "PKR " + fmt(a)], ["Income tax for the year", "PKR " + fmt(t)], ["Monthly equivalent", "PKR " + fmt(t / 12)], ["Advance tax per quarter (approx.)", "PKR " + fmt(t / 4)], ["Income after tax", "PKR " + fmt(a - t)], ["Effective rate", (a ? t / a * 100 : 0).toFixed(2) + "%"]];
  if (tp === BTP[0] || tp === BTP[1]) { if (a > 1e7) notes.push("Includes the 10% surcharge on tax for income above PKR 10,000,000."); notes.push("Normal slabs for business owners, AOPs and non-salaried individuals (same for FY 2024-25 to FY 2026-27). Say “company” for the 29% company rate."); }
  else notes.push("Flat company rate. Super tax, minimum tax and credits are not included.");
  if (period === "monthly") notes.push("I multiplied your monthly figure by 12 to get annual income.");
  return { title: "Pakistan business income tax", hero: ["Tax for the year", "PKR " + fmt(t)], rows: rows.slice(1), notes: notes, link: { t: "Open the business income tax calculator", h: "#tax/biz" }, toolId: "biz", vals: { a: a } };
}

/* ---------- agriculture income tax ---------- */
function calcAgri(q, qty, ctx) {
  if (!qty.money.length) return { need: ["your net annual agricultural income"], tool: "agri", partial: {} };
  var a = qty.money[0]; if (monthlyOrAnnual(q, "annual") === "monthly") a *= 12;
  var pv = /\b(sindh)\b/.test(q) ? "Sindh" : /\b(kp|kpk|khyber|pakhtunkhwa|peshawar)\b/.test(q) ? "Khyber Pakhtunkhwa" : /\b(balochistan|baluchistan|quetta)\b/.test(q) ? "Balochistan" : "Punjab";
  var YL = w.AGY, y = qty.fy || (qty.years.length ? qty.years[0] : null), yi = 0;
  if (y) { YL.forEach(function (n, i) { if (n.indexOf("TY " + y + ")") >= 0) yi = i; }); }
  var tp = /\bsmall company\b/.test(q) ? w.AGT[2] : /\b(company|pvt|private limited|corporate farm)\b/.test(q) ? w.AGT[1] : w.AGT[0];
  var o = w.agri(a, pv, YL[yi], tp), notes = [];
  if (o.na) return { text: o.na };
  var t = o.t;
  if (!/\b(punjab|sindh|kp|kpk|khyber|pakhtunkhwa|balochistan|baluchistan)\b/.test(q)) notes.push("No province was mentioned, so I used Punjab. Say Sindh, KP or Balochistan to switch.");
  if (!y) notes.push("No year was mentioned, so I used the latest, " + YL[0] + ".");
  notes.push("Excludes super tax on very high agricultural income, per-acre land tax and Zakat / Ushr.");
  return { title: "Agriculture income tax · " + pv + " · " + YL[yi], hero: ["Agricultural income tax", "PKR " + fmt(t)], rows: [["Net agricultural income", "PKR " + fmt(a)], ["Rate scale", o.r], ["Monthly equivalent", "PKR " + fmt(t / 12)], ["Income after tax", "PKR " + fmt(a - t)], ["Effective rate", (a ? t / a * 100 : 0).toFixed(2) + "%"]], notes: notes, link: { t: "Open the agriculture tax calculator", h: "#tax/agri" }, toolId: "agri", vals: { a: a } };
}

/* ---------- VAT / GST ---------- */
function calcVat(q, qty, ctx, cs) {
  if (!qty.money.length) return { need: ["the amount"], tool: "vat", partial: {} };
  var amt = qty.money[0], map = { pk: 18, uae: 5, ksa: 15, bh: 10, uk: 20 }, c = cs.length ? cs[0] : (ctx.country || "pk");
  if (c === "us") return { text: "The US has no federal VAT or GST. Sales tax is set by each state and varies from 0% to roughly 10%. Give me the state rate and I'll calculate it, e.g. “$1,000 at 7% sales tax”." };
  var r = map[c], note = [];
  if (qty.pct.length && c === "pk") r = qty.pct[0];
  else if (qty.pct.length) { r = qty.pct[0]; }
  if (!cs.length && !ctx.country) note.push("No country was mentioned, so I used Pakistan's standard 18%.");
  var extract = /\b(inclusive|including|include|included|extract|remove|gross|shamil|shamil hai|with (vat|tax|gst))\b/.test(q);
  var net = extract ? amt / (1 + r / 100) : amt, tax = net * r / 100, cur = CTRY_CUR[c];
  var nm = (c === "pk" ? "GST" : "VAT");
  return { title: CTRY_SHORT[c].replace(/^the /, "") + " " + nm + " at " + r + "%", hero: [nm + " amount", cur + " " + fmt(tax)], rows: [["Net amount", cur + " " + fmt(net)], [nm + " (" + r + "%)", cur + " " + fmt(tax)], ["Gross amount", cur + " " + fmt(net + tax)]], notes: note.concat([extract ? "Treated " + cur + " " + fmt(amt) + " as VAT-inclusive." : "Treated " + cur + " " + fmt(amt) + " as the amount before tax. Say “including VAT” if it already includes tax."]), link: { t: "Open the VAT / GST calculator", h: "#tax/vat" }, toolId: "vat", vals: { amt: amt } };
}

/* ---------- corporate tax ---------- */
function calcCorp(q, qty, ctx, cs) {
  var c = cs.filter(function (k) { return k !== "pk" && k !== "bh"; })[0] || (ctx.country && /^(uae|ksa|uk|us)$/.test(ctx.country) ? ctx.country : null);
  if (!c) return null;
  var tool = findTool(w.T, c);
  if (!qty.money.length) return { need: ["the annual profit"], tool: c, partial: {} };
  var v = defaults(tool); v.p = qty.money[0];
  if (c === "ksa") { if (qty.pct.length && /foreign|owner/.test(q)) v.fo = qty.pct[0]; if (qty.money.length > 1) v.zb = qty.money[1]; }
  if (c === "us" && qty.pct.length) v.st = qty.pct[0];
  var rows = prefixCur(tool.c(v), tool.cur), notes = [];
  if (c === "uae") notes.push("Excludes free-zone 0% on qualifying income and other reliefs.");
  if (c === "ksa" && !qty.pct.length) notes.push("Assumed 100% foreign ownership and no zakat base. Tell me the ownership % or zakat base to refine this.");
  if (c === "uk") notes.push("Single company, no associated companies, marginal relief applied between £50k and £250k.");
  if (c === "us") notes.push("Federal 21% C-Corp rate" + (qty.pct.length ? " plus " + qty.pct[0] + "% state tax." : ". Add a state rate for a total.") + " LLCs taxed as pass-through work differently.");
  return { title: CTRY_NAME[c] + " corporate tax on " + tool.cur + " " + fmt(v.p), hero: [rows[0][0], rows[0][1]], rows: rows.slice(1), notes: notes, link: { t: "Open the " + CTRY_SHORT[c].replace(/^the /, "") + " tax calculator", h: "#tax/" + c }, toolId: c, vals: { p: v.p } };
}

/* ---------- withholding tax ---------- */
function calcWht(q, qty, ctx) {
  var E = w.E, qt = tokenize(q.replace(/withholding|section|tax|rate/g, " ")), best = -1, bs = 0;
  var sec = q.match(/\bsection\s*(\d{3}[a-z]?)\b|\b(1[0-9]{2}[a-z]?)\b/);
  E.forEach(function (e, i) {
    var s = 0, tk = tokenize(e[1] + " " + e[4]), set = {}; tk.forEach(function (x) { set[x] = 1; });
    qt.forEach(function (x) { if (set[x]) s += 1; });
    if (sec && (e[0] === (sec[1] || sec[2]))) s += 10;
    if (s > bs) { bs = s; best = i; }
  });
  if (best < 0 || bs < 1) return { need: ["the type of payment (for example rent, IT services, imports, dividend, contracts)"], tool: "wht", partial: {} };
  if (!qty.money.length) return { need: ["the payment amount"], tool: "wht", partial: { wi: best } };
  var e = E[best], co = !/\b(individual|aop|person|banda|fard)\b/.test(q), nf = /\b(non[\s-]?filer|nonfiler|not filer|atl)\b/.test(q) ? 1 : 0;
  var o = w.wrate(e, co, nf, qty.money[0]);
  if (o.msg) return { text: o.msg + " (Section " + e[0] + ")" };
  var amt = qty.money[0];
  return { title: "Withholding tax · Section " + e[0], hero: ["Tax to withhold", "PKR " + fmt(o.t)], rows: [["Payment", "PKR " + fmt(amt)], ["Nature", e[1]], ["Rate", o.r], ["Net payable", "PKR " + fmt(amt - o.t)], ["Recipient", co ? "Company" : "Individual / AOP"], ["Status", nf ? "Non-filer" : "Filer"]], notes: ["Rates are the TY 2027 rates on the site. Say “individual” or “non-filer” to change the recipient or status."], link: { t: "Open the withholding tax finder", h: "#tax/wht" }, toolId: "wht", vals: { wi: best, amt: amt } };
}

/* ---------- generic financial calculators ---------- */
function labelOf(tool, k) { var f = tool.f.filter(function (x) { return x[0] === k; })[0]; return f ? f[1].replace(/\s*\(.*?\)\s*/g, "").toLowerCase() : k; }
function calcFin(id, q, qty, ctx, cs) {
  var tool = findTool(w.FG, id); if (!tool) return null;
  if (id === "npv") return { text: "NPV and IRR need a list of yearly cash flows. Send them like “NPV initial 1000000 discount 12% cash flows 300000, 400000, 500000”, or use the calculator.", link: { t: "Open the NPV & IRR calculator", h: "#finance/npv" } };
  var cur = detectCurrency(q) || (cs.length && !/\b(pk)\b/.test(cs[0]) ? CTRY_CUR[cs[0]] : null) || ctx.cur || "PKR";
  var ageSpec = null;
  if (id === "ret") {
    var am = q.match(/\b(?:age|umar|ab meri)\s*(?:is|hai|h)?\s*(\d{2})\b/), rm = q.match(/\bretire\w*\s*(?:at|age|by|in|hon[ge]*)?\s*(?:age)?\s*(\d{2})\b/);
    qty = JSON.parse(JSON.stringify(qty));
    [am, rm].forEach(function (x) { if (x) { var i = qty.money.indexOf(+x[1]); if (i >= 0) qty.money.splice(i, 1); } });
    ageSpec = { a: am ? +am[1] : null, ra: rm ? +rm[1] : null };
  }
  var fl = fillFromQuantities(tool, qty, ctx), v = fl.v, got = fl.got, req = REQ[id] || [];
  if (ageSpec) { if (ageSpec.a) { v.a = ageSpec.a; got.a = 1; } if (ageSpec.ra) { v.ra = ageSpec.ra; got.ra = 1; } }
  // salary-style 'monthly income' for afford etc. handled by generic money assignment
  if (id === "zakat" && qty.money.length) { v.c = qty.money[0]; got.c = 1; }
  if (id === "cc" && qty.pct.length === 0 && !got.r) { /* rate required */ }
  tool.f.forEach(function (f) { var kd = fieldKind(f); if (!got[f[0]] && (kd === "money" || kd === "opt") && req.indexOf(f[0]) < 0) v[f[0]] = 0; });
  var missing = req.filter(function (k) { return !got[k]; });
  if (id === "ret" && !got.a) { var ages = qty.money.filter(function (x) { return x >= 18 && x <= 90; }); }
  if (missing.length) return { need: missing.map(function (k) { return labelOf(tool, k); }), tool: id, partial: { got: got, v: v }, ex: tool };
  var prev = w.FCUR; w.FCUR = cur; var rows;
  try { rows = tool.c(v); } finally { w.FCUR = prev; }
  var cc = rows.map(function (r) { return [r[0], String(r[1]).replace(/(\d)\.00(?!\d)/g, "$1")]; });
  if (!Array.isArray(cc) || !cc.length || cc[0].length !== 2) return null;
  var assumed = [];
  tool.f.forEach(function (f) { if (!got[f[0]] && fieldKind(f) !== "sel" && f[0] !== "u" && fieldKind(f) !== "money" && fieldKind(f) !== "opt") assumed.push(f[1].replace(/\s*\(.*?\)\s*/g, "").toLowerCase() + " " + v[f[0]]); });
  var notes = [];
  if (assumed.length) notes.push("Assumed (change by telling me): " + assumed.join(", ") + ".");
  if (!detectCurrency(q) && !ctx.cur) notes.push("Amounts shown in PKR. Mention a currency (AED, USD, GBP…) to switch.");
  var heroRow = cc.filter(function (r) { return /^(monthly (payment|instalment)|regular monthly|total monthly)/i.test(r[0]); })[0] || cc[0];
  return { title: tool.n, hero: [heroRow[0], heroRow[1]], rows: cc.filter(function (r) { return r !== heroRow && r[0] !== "Note"; }), notes: notes, link: { t: "Open the " + tool.n + " calculator", h: "#finance/" + id }, toolId: id, vals: { v: v, got: got, cur: cur }, curSet: detectCurrency(q) };
}

/* ---------- dispatcher ---------- */
function detectCalc(q, qty, cs, ctx) {
  var hasNum = qty.money.length > 0, verb = hasCalcVerb(q);
  var salaryish = /\b(salary|salaries|tankhw\w*|tankha|talab|wages?|payroll|take.?home|income|earning|kamai)\b/.test(q), taxish = /\b(tax|tex|ٹیکس|deduction|katay?ga|kategi|katta|kat ?ta|kitna)\b/.test(q);
  var pkCtx = !cs.length || cs.indexOf("pk") >= 0;
  var qn = " " + q + " ";
  // order matters: most specific first
  if (/\bwithholding\b/.test(qn) && (hasNum || verb)) return "wht";
  if (/\b(agri\w*|zarai|zirai|farm\w*|kisan|zameendar|crop\w*|kheti)\b/.test(q) && (hasNum || verb) && /\b(tax|income)\b/.test(q)) return "agri";
  var bizish = /\b(business|non[\s-]?salaried|aop|sole proprietor\w*|partnership|self[\s-]?employed|freelanc\w*|normal (tax )?slabs?|trader|shopkeeper|karobar\w*|dukan\w*|firm|overall income|total income|taxable income)\b/.test(q) || (/\bcompany\b/.test(q) && cs.indexOf("pk") >= 0);
  if (bizish && taxish && pkCtx && hasNum && !/\b(vat|gst|sales tax|withholding)\b/.test(q) && !(cs.length && !cs.indexOf("pk") < 0 && cs.some(function (k) { return k !== "pk"; }))) return "biz";
  if (salaryish && taxish && pkCtx && (hasNum || verb)) return "pk";
  if (/\b(vat|gst|sales tax)\b|\bvat\b/.test(qn) || / vat /.test(normText(q))) { if ((hasNum || verb) && !/\b(registration|register|return|filing|deadline|threshold|rate)\b/.test(qn.replace(/(\d)/g, ""))) return "vat"; if (hasNum && /\b(add|extract|calculate|including|inclusive|kitna)\b/.test(qn)) return "vat"; }
  if ((/\b(corporate tax|corporation tax|company tax|profit tax|income tax|zakat|cit)\b|corptax/.test(normText(q)) || (taxish && /\b(profit|profits|company|business|corporate|earnings|net income)\b/.test(q))) && hasNum && cs.some(function (c) { return /^(uae|ksa|uk|us)$/.test(c); }) && !/\bzakat\b.*\b(gold|silver|nisab)\b/.test(q)) return "corp";
  var fg = detectFG(q);
  if (fg && (hasNum || verb) && !(/\b(what is|define|meaning|explain|kya hota|kya hai)\b/.test(q) && !hasNum)) return "fin:" + fg;
  if (hasNum && ctx.last && ctx.last.kind && !cs.length && !/\b(how|what|why|who|when|where|kya|kaise|kab|kon)\b/.test(q) && tokenize(q).filter(function (x) { return !/^\d+$/.test(x); }).length <= 2) return "follow";
  if (salaryish && taxish && hasNum) return "pk";
  return null;
}
function runCalc(kind, q, qty, cs, ctx) {
  if (kind === "agri") return calcAgri(q, qty, ctx);
  if (kind === "biz") return calcPkBiz(q, qty, ctx);
  if (kind === "pk") return calcPkSalary(q, qty, ctx);
  if (kind === "vat") return calcVat(q, qty, ctx, cs);
  if (kind === "corp") return calcCorp(q, qty, ctx, cs);
  if (kind === "wht") return calcWht(q, qty, ctx);
  if (kind.indexOf("fin:") === 0) return calcFin(kind.slice(4), q, qty, ctx, cs);
  return null;
}

/* ===================== BIZBOT engine, part 3: conversation ===================== */
var WA_NUM = "923084535456";
var ctx = { country: null, last: null, pending: null, lastTopic: "", cur: null };
var EX = {
  pk: "e.g. “my salary is 150k per month, tax for 2026”", biz: "e.g. “business income 5 million, how much tax?”", vat: "e.g. “VAT on AED 25,000 in UAE”", wht: "e.g. “withholding tax on rent of 500,000 for a company”", uae: "e.g. “UAE corporate tax on AED 2 million profit”",
  ksa: "e.g. “Saudi tax on SAR 3 million profit”", uk: "e.g. “UK corporation tax on £120,000 profit”", us: "e.g. “US corporate tax on $400,000 profit with 5% state tax”",
  emi: "e.g. “EMI for a 10 lakh loan at 14% for 5 years”", flat: "e.g. “flat rate loan 500,000 at 10% for 3 years”", mortgage: "e.g. “mortgage on a 500,000 home at 6.5%”", auto: "e.g. “car loan 3 million at 14% for 48 months”",
  apr: "e.g. “APR on a 1,000,000 loan with 20,000 fees at 12% for 3 years”", payoff: "e.g. "+"“pay off a 2 million loan at 12% with 10 years left, extra 10,000 a month”", cc: "e.g. “credit card balance 200,000 at 36% paying 15,000 a month”",
  afford: "e.g. “income 300,000 a month, how much loan can I afford at 12% for 10 years”", compound: "e.g. “compound interest on 100,000 at 10% for 10 years”", simple: "e.g. “simple interest on 100,000 at 10% for 3 years”",
  goal: "e.g. “save 5 million in 10 years”", ret: "e.g. “retirement plan age 30, retire at 60”", roi: "e.g. “invested 1 million, now 1.8 million after 4 years”", infl: "e.g. “100,000 today in 10 years at 8% inflation”",
  be: "e.g. “break-even: fixed costs 500,000, price 1,500, variable cost 900”", margin: "e.g. “margin if cost is 1,000 and price is 1,400”", dep: "e.g. “depreciation on 1 million asset over 5 years”", zakat: "e.g. “zakat on 10 lakh cash and gold worth 5 lakh”"
};
var FIELD_HINT = { a: "amount", r: "interest rate %", t: "term" };

function looksRomanUrdu(q) {
  var n = 0; (q.match(/\b(mujhe|mujhy|mera|meri|mere|kya|hai|hain|hay|btao|batao|bata|kitna|kitni|ka|ki|ke|mein|krna|karna|karni|krni|chahiye|saal|sal|tankhwah|aap|kar|kr|ko|se|wala|wali|ho|hu|hun|h|k)\b/g) || []).forEach(function () { n++; });
  return n >= 2;
}
function isHandoff(q) {
  return /\b(human|representative|real person|live agent|live chat|customer (care|support|service)|talk (to|with) (a |an |the )?(person|someone|somebody|team|consultant|advisor|adviser|agent|expert|manager|staff|executive)|speak (to|with) (a |an |the )?(person|someone|somebody|team|consultant|advisor|adviser|agent|expert|manager|staff|executive)|connect me|call me|call back|insan|banday se|bande se|banda se|kisi se baat|kisi insan|koi insan|real banda|team se baat|consultant se baat|representative se|rep se|human se|agent se|whatsapp)\b/.test(q);
}
function pk(n) { return n; }

function renderCalc(r, ru) {
  var lead = r.lead || (ru ? "Aap ke figures ke hisab se hisab ye hai:" : "Here is the calculation:");
  return { text: lead, calc: { title: r.title, hero: r.hero, rows: (r.rows || []).filter(function (x) { return !r.hero || x[0] !== r.hero[0]; }), notes: r.notes || [] }, link: r.link ? [r.link] : null };
}
function askForMore(r, ru) {
  var ex = EX[r.tool] || "";
  var tool = findTool(w.T, r.tool) || findTool(w.FG, r.tool);
  var nm = tool ? cleanTitle(tool.n) : "this";
  var list = r.need.slice(0, 5);
  var line = list.length > 1 ? list.slice(0, -1).join(", ") + " and " + list[list.length - 1] : list[0];
  var txt = (ru ? "Is hisab ke liye mujhe ye maloom hona chahiye: **" : "To work out the " + nm.toLowerCase() + " I still need **") + line + "**.";
  if (ex) txt += "\n\nYou can send everything in one message, " + ex + ".";
  return { text: txt };
}
function handleCalc(q, kind, qty, cs, ru, followOf) {
  var r = runCalc(kind, q, qty, cs, ctx);
  if (!r) return null;
  if (r.need) { ctx.pending = { kind: kind, q: q }; return askForMore(r, ru); }
  ctx.pending = null;
  if (r.text) return { text: r.text, link: r.link ? [r.link] : null };
  if (r.curSet) ctx.cur = r.curSet;
  ctx.last = { kind: kind, q: q, qty: qty, vals: r.vals };
  return renderCalc(r, ru);
}

/* ---------- knowledge answers ---------- */
function yearFromQuery(q) {
  var qty = parseQuantities(q); return qty.fy || qty.years[0] || null;
}
function chunkBody(h, qterms, n) {
  var r = renderChunk(h.c, qterms, false); return r.md;
}
function groupCountries(order, chunks) {
  var m = {}; chunks.forEach(function (c) { if (c.tags.length) m[c.tags[0]] = c; });
  return order.filter(function (k) { return m[k]; }).map(function (k) { return m[k]; });
}
function knowledge(q, cs) {
  var s = search(q, { countries: cs, implicit: ctx.country ? [ctx.country] : [] });
  var hits = s.hits;
  if (!hits.length) return null;
  var top = hits[0], qterms = s.terms;
  var gt = s.terms.filter(function (t) { return !/^(kar\w*|krn\w*|krt\w*|krw\w*|bata\w*|bta\w*|chahi\w*|sakt\w*|skt\w*|hot[aie]|milt\w*|den[aei]|dei?n|lag\w*|chal\w*|rehta|rahta)$/.test(t); });
  var nKnown = gt.filter(function (t) { return KB.idx.df[t]; }).length;
  if (gt.length >= 2 && nKnown / gt.length < 0.6 && !cs.length) return { weak: hits.slice(0, 3) };
  if (gt.length === 1 && top.cov < 1 && !cs.length) return { weak: hits.slice(0, 3) };
  if (top.cov < 0.34 || top.s < 1.0) return { weak: hits.slice(0, 3) };
  if (top.c.type !== "fact" && cs.length && s.terms.length <= 5) {
    var fh = hits.filter(function (h) { return h.c.type === "fact" && h.cov >= 0.5; })[0];
    if (fh) { top = fh; }
  }
  var c = top.c, text = "", chosen = [c], sec = [];
  if (c.type === "fact") {
    if (cs.length) {
      var mine = hits.filter(function (h) { return h.c.type === "fact" && h.c.tags.some(function (k) { return cs.indexOf(k) >= 0; }) && h.cov >= top.cov * 0.95; });
      var seenL = {}; mine.sort(function (a, b) { return b.c.text.length - a.c.text.length; }); mine = mine.filter(function (h) { var l = ((h.c.label || h.c.title) + "|" + h.c.tags[0]).toLowerCase().replace(/ income| \/ sales| tax/g, ""); if (seenL[l]) return false; seenL[l] = 1; return true; }).slice(0, mine[0] && mine[0].cov >= 0.99 ? 2 : 4);
      text = mine.length === 1 ? mine[0].c.text : mine.map(function (h) { return "- " + h.c.text; }).join("\n"); chosen = mine.map(function (h) { return h.c; });
    } else {
      var g = c.group, all = KB.chunks.filter(function (x) { return x.group === g; });
      var order = ["pk", "uae", "ksa", "bh", "uk", "us"], ord = groupCountries(order, all);
      if (ord.length > 1) { text = ord.map(function (x) { return "- " + x.text; }).join("\n"); chosen = ord; }
      else { text = "- " + c.text; }
    }
    return { text: text, sources: srcItems(chosen), title: null };
  }
  if (c.type === "slab") {
    var yv = yearFromQuery(q), pick = c;
    if (/\b(business|normal|aop|non[\s-]?salaried|self[\s-]?employed|freelanc\w*|sole|partnership|company|karobar\w*)\b/.test(q) && !/\bsalar(y|ied)\b/.test(q)) {
      var bz = KB.chunks.filter(function (x) { return x.type === "slab" && x.yi === 99; })[0];
      if (bz) return { text: "**" + bz.title + "**\n" + bz.text.split("\n").slice(1).join("\n") + "\n\nSend me your annual income, for example “business income 50 lakh”, and I will work out the tax.", sources: srcItems([bz]) };
    }
    if (yv) KB.chunks.forEach(function (x) { if (x.type === "slab" && /TY (\d{4})/.test(x.title) === false && x.src.indexOf("TY " + yv + ")") >= 0) pick = x; });
    if (yv) KB.chunks.forEach(function (x) { if (x.type === "slab" && x.title.indexOf("TY " + yv + ")") >= 0) pick = x; });
    if (!yv) KB.chunks.forEach(function (x) { if (x.type === "slab" && x.yi === 0) pick = x; });
    var hint = "\n\nSend me an amount, for example “my salary is 150k per month”, and I will work out the exact tax.";
    return { text: "**" + pick.title + "**\n" + pick.text.split("\n").slice(1).join("\n") + hint, sources: srcItems([pick]) };
  }
  if (c.type === "wht") {
    var ws = hits.filter(function (h) { return h.c.type === "wht" && h.cov >= top.cov * 0.75; }).slice(0, 3);
    return { text: ws.map(function (h) { return "**Section " + h.c.text.split(" – ")[0].replace("Section ", "") + "**: " + h.c.text.split(" – ").slice(1).join(" – "); }).join("\n\n") + "\n\nGive me the payment amount and I will calculate the deduction.", sources: srcItems(ws.map(function (h) { return h.c; })) };
  }
  if (c.type === "tool") {
    var cl = c.text;
    var tl = findTool(w.T, c.tool) || findTool(w.FG, c.tool), ex = EX[c.tool] || "";
    return { text: "**" + c.title + "**\n" + cl + (ex ? "\n\nI can run it for you right here. Send your figures, " + ex + "." : ""), sources: srcItems([c]) };
  }
  if (c.type === "blog") {
    var picks = [], used = {};
    hits.forEach(function (h) {
      if (picks.length >= 2 || h.c.type !== "blog" || h.cov < top.cov * 0.7) return;
      var key = h.c.group + "|" + h.c.sec; if (used[key]) return; used[key] = 1; picks.push(h);
    });
    var body = picks.map(function (h) {
      var r = renderChunk(h.c, qterms, false);
      return "**" + (h.c.sec && h.c.sec !== "Overview" ? h.c.sec : h.c.doc || h.c.title) + "**" + (picks.length > 1 && h.c.doc && h.c.sec && h.c.sec !== "Overview" ? " (" + h.c.doc + ")" : "") + "\n" + r.md;
    }).join("\n\n");
    return { text: body, sources: srcItems(picks.map(function (h) { return h.c; })), blog: true };
  }
  // service/country/list/faq/page: main chunk, optional second
  var main = renderChunk(c, qterms, false);
  text = (c.type === "faq" ? "**" + c.title + "**\n" : "**" + c.title + "**\n") + main.md;
  chosen = [c];
  var second = null;
  for (var i = 1; i < hits.length; i++) { var h = hits[i]; if (h.c.type === "blog" || (h.c.group && h.c.group === c.group)) continue; if (h.c.title !== c.title && h.s >= top.s * 0.85 && h.cov >= 0.6 && h.c.type !== "tool" && h.c.type !== "slab" && h.c.type !== "wht") { second = h; break; } }
  if (second) { text += "\n\n**" + second.c.title + "**\n" + renderChunk(second.c, qterms, false).md; chosen.push(second.c); }
  var blogHit = hits.filter(function (h) { return h.c.type === "blog" && h.cov >= top.cov * 0.85 && h.s >= top.s * 0.8; })[0];
  if (blogHit) chosen.push(blogHit.c);
  return { text: text, sources: srcItems(chosen) };
}

/* ---------- conversation ---------- */
function smallTalk(q) {
  var t = q.trim();
  if (/^(hi+|hello+|hey+|hy|helo|salam|slam|assalam\S*|aoa|a\.o\.a|good (morning|afternoon|evening)|namaste|hola)[\s!.,]*(bizbot|there|bot)?[\s!.]*$/.test(t)) return "Wa-alaikum-assalam! What would you like to work out today: a company set-up, a tax question or a calculation?";
  if (/\b(thanks|thank you|thx|shukriya|shukria|jazak\S*|great help|mehrbani)\b/.test(t) && t.split(/\s+/).length <= 7) return "You're welcome! If you have another question or figures to calculate, send them here.";
  if (/^(ok|okay|k|theek|thik|acha|accha|got it|fine|cool|nice|good|great|sahi)[\s!.]*$/.test(t)) return "Sure. Ask me anything else about company set-up, tax or compliance, or send figures and I'll calculate them.";
  if (/^(bye|goodbye|allah hafiz|khuda hafiz|see you|ta ta)[\s!.]*$/.test(t)) return "Allah Hafiz! I'm here whenever you need me.";
  if (/\b(who are you|what are you|what can you do|your name|aap kaun|tum kaun|kya kar sakte|what do you do|how do you work|help me|can you help)\b/.test(t) && t.split(/\s+/).length <= 9) return "I'm BIZBOT. I read the BIZEASE SOLUTIONS website to answer questions on company registration, tax, accounting, audit and compliance for Pakistan, the UAE, Saudi Arabia, Bahrain, the UK and the US. I can also calculate salary tax, VAT/GST, withholding tax, corporate tax, loans, savings and more, right here in the chat. Just type your question in English or Roman Urdu.";
  if (/\b(how are you|kaise ho|kese ho|kaisay ho|how r u)\b/.test(t)) return "I'm doing well, thank you. What can I help you with?";
  return null;
}
function stripCountryWords(q) {
  var out = " " + q + " ";
  Object.keys(CTRY_RX).forEach(function (k) { out = out.replace(new RegExp(CTRY_RX[k].source, "g"), " "); });
  return out.replace(/\s+/g, " ").trim();
}
function reply(raw) {
  var q0 = String(raw || "").trim(); if (!q0) return null;
  var q = q0.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " "), ru = looksRomanUrdu(q);
  if (isHandoff(q)) {
    return { text: "Of course. Our team can talk to you directly on WhatsApp, and they will pick this up from there.", handoff: { t: "Chat with a representative on WhatsApp", h: "https://wa.me/" + WA_NUM + "?text=" + encodeURIComponent("Hello BIZEASE SOLUTIONS, I would like to talk to a representative.") } };
  }
  var cs = detectCountries(q);
  var st = smallTalk(q); if (st) return { text: st };
  var qty = parseQuantities(q);
  // multi-turn: answer to a question the bot asked
  if (ctx.pending) {
    var other = detectCalc(q, qty, cs, ctx);
    var isAnswer = qty.all.length || qty.years.length || qty.fy || qty.dur.length;
    if (isAnswer && (!other || other === ctx.pending.kind || other === "follow")) {
      var merged = ctx.pending.q + " " + q, mq = parseQuantities(merged), mcs = detectCountries(merged);
      var res = handleCalc(merged, ctx.pending.kind, mq, mcs.length ? mcs : cs, ru);
      if (res) { if (mcs.length) ctx.country = mcs[0]; return res; }
    }
    if (!other) ctx.pending = null;
  }
  var kind = detectCalc(q, qty, cs, ctx);
  if (kind === "follow") {
    var L = ctx.last, nq = parseQuantities(q), base = JSON.parse(JSON.stringify(L.qty));
    if (nq.money.length) base.money = nq.money.concat(base.money.slice(nq.money.length));
    if (nq.pct.length) base.pct = nq.pct.concat(base.pct.slice(nq.pct.length));
    if (nq.dur.length) base.dur = nq.dur.concat(base.dur.slice(nq.dur.length));
    if (nq.years.length) base.years = nq.years;
    if (nq.fy) base.fy = nq.fy;
    var res2 = handleCalc(L.q + " " + q, L.kind, base, cs.length ? cs : detectCountries(L.q), ru);
    if (res2) return res2;
  } else if (kind) {
    var res3 = handleCalc(q, kind, qty, cs, ru);
    if (res3) { if (cs.length) ctx.country = cs[0]; return res3; }
  }
  // follow-up on a topic with only a country ("and Saudi Arabia?")
  var q2 = q;
  if (cs.length && ctx.lastTopic) {
    var rest = tokenize(stripCountryWords(q)).filter(function (x) { return KB.idx.df[x]; });
    if (rest.length < 1) q2 = ctx.lastTopic + " " + q;
  }
  var k = knowledge(q2, cs);
  if (cs.length) ctx.country = cs[0];
  if (k && k.text) {
    ctx.lastTopic = cs.length ? stripCountryWords(q2) : q2;
    return { text: k.text, sources: k.sources || [] };
  }
  var near = k && k.weak ? k.weak.map(function (h) { return h.c; }).filter(function (c) { return c.type !== "wht" && c.type !== "slab"; }) : [];
  var aiFlag = true;
  var txt = "I couldn't find a clear answer to that on the BIZEASE website. Try adding the country and the topic, for example “documents needed for a Saudi company” or “UAE corporate tax rate”. For calculations, include your figures, for example “salary 80k, tax for 2026”.";
  if (near.length) txt += "\n\nThe closest pages I found:";
  return { text: txt, sources: srcItems(near), ai: aiFlag };
}
function context(raw) {
  var q = String(raw || "").toLowerCase().replace(/\s+/g, " "), cs = detectCountries(q), out = [];
  try {
    var s = search(q, { countries: cs, implicit: ctx.country ? [ctx.country] : [] });
    s.hits.slice(0, 5).forEach(function (h) { if (h.cov >= 0.2) out.push({ title: String(h.c.title || "").slice(0, 150), text: String(h.c.text || "").slice(0, 600), src: String(h.c.type || "") }); });
  } catch (e) {}
  return out;
}

w.BIZBOT = {
  context: context,
  init: function (blogs) { initKB(blogs); return KB.chunks.length; },
  addBlogs: addBlogsLive,
  reply: function (q) { try { return reply(q); } catch (e) { if (w.console) console.error(e); return { text: "Something went wrong while working that out. Please rephrase your question or include the figures again." }; } },
  _kb: KB, _ctx: ctx, _search: search, _parse: parseQuantities
};

w.__BIZBOT_BLOGS=[{"slug":"how-to-choose-erp-for-sme-sap-oracle-odoo","title":"How to Choose an ERP for Your SME: SAP, Oracle, Odoo and Cloud ERP Compared","cat":"Accounting & Technology","date":"2026-10-09","tags":["ERP","SAP","Oracle"],"lead":"An ERP (Enterprise Resource Planning) system puts accounting, sales, purchasing, inventory, payroll and reporting on one database. For a growing SME the right ERP replaces spreadsheets and disconnected tools. The wrong one becomes an expensive project nobody uses. This guide shows how to choose.","secs":[["Signs your business is ready for an ERP","- The same data is typed into Excel, an accounting package and a sales tool.\n- Month-end closing takes more than a week because numbers do not match.\n- You cannot see stock, receivables or branch performance in real time.\n- Sales tax, withholding tax and invoicing rules are handled manually and errors are creeping in.\n- You are adding branches, warehouses or companies in other countries."],["Step 1: Write down your requirements first","Before talking to any vendor, list what the system must do: modules (finance, inventory, manufacturing, HR/payroll, CRM), number of users, number of companies and branches, currencies, and reports management needs every month. Separate must-haves from nice-to-haves . This single document prevents most failed projects."],["Step 2: Understand the main options","| Option · Best suited to · Things to consider\n| SAP (Business One for SMEs, S/4HANA for larger firms) · Growing and mid-sized companies wanting a proven, structured system · Usually needs a certified implementation partner; higher implementation effort and cost\n| Oracle (NetSuite and Oracle Cloud ERP) · Mid-sized, multi-entity and multi-currency businesses wanting a cloud platform · Subscription pricing; strong consolidation and reporting; customisation needs specialist skills\n| Odoo · SMEs that want modular, flexible and cost-effective software · Community and Enterprise editions; very customisable, so quality depends heavily on the implementer\n| Cloud accounting + add-ons (Xero, QuickBooks, Zoho) · Small businesses with simple operations · Great for accounting; limited for manufacturing or complex inventory"],["Step 3: Count the real cost","The licence or subscription is only one line. Budget for:\n- Implementation: setup, data migration, configuration, integrations. This is often as large as, or larger than, the software cost.\n- Customisation: every custom report or workflow adds build, testing and upgrade cost.\n- Training: staff who are not trained will go back to Excel.\n- Support and hosting: annual support, cloud hosting, backups and security."],["Step 4: Check local compliance","For businesses in Pakistan, confirm that the system handles sales tax invoices for FBR and provincial authorities (PRA, SRB, KPRA, BRA), withholding tax, multi-currency and local reporting formats, and that a local partner can support you in your time zone. In the UAE, Saudi Arabia, Bahrain and the UK, check VAT handling and e-invoicing requirements before you sign."],["Why ERP projects fail","- No clear owner inside the company; the project is left to the IT vendor.\n- Requirements change constantly, so scope and cost grow.\n- Dirty data is migrated as is, so the new system gives the same wrong numbers.\n- Too many customisations to copy old habits instead of improving processes.\n- No training or go-live support.\nPractical tip: Start with finance, sales and inventory (phase 1), go live, stabilise, and only then add manufacturing, HR or CRM. Smaller phases fail less often."],["A simple selection checklist","1. Document requirements and rank them.\n2. Shortlist 2 or 3 products and ask for a demo with your sample data.\n3. Ask for references from similar companies in your country.\n4. Get a fixed-scope implementation quote with a timeline.\n5. Plan data cleaning, training and a parallel run before go-live.\nThe best ERP is the one your team will actually use, that fits your tax rules, and that you can afford to implement properly.\n← All articles"]]},{"slug":"internal-audit-vs-external-audit-why-it-matters","title":"Internal Audit vs External Audit: Differences, Benefits and When Your Business Needs Each","cat":"Audit & Assurance","date":"2026-10-07","tags":["InternalAudit","ExternalAudit","StatutoryAudit"],"lead":"Business owners often use \"audit\" for any review of the books, but internal and external audits have different purposes, different people and different outcomes. Knowing the difference helps you decide what your business really needs.","secs":[["What is an external (statutory) audit?","An external audit is an independent examination of your financial statements by a qualified audit firm. The auditor gives an opinion on whether the statements present a true and fair view in line with the applicable accounting framework. Banks, investors, regulators and tax authorities rely on this opinion."],["What is an internal audit?","An internal audit is an ongoing review of how the business actually runs: controls, processes, risks and compliance with policies. It can be done by an in-house team or outsourced to a firm. It reports to management or the audit committee and focuses on improving operations, not on giving a financial opinion."],["Key differences","| Point · Internal audit · External audit\n| Purpose · Improve controls, reduce risk, find inefficiency and fraud · Give an independent opinion on the financial statements\n| Performed by · Employees or an outsourced internal audit provider · Independent audit firm appointed by the shareholders\n| Reports to · Management, board or audit committee · Shareholders and external users\n| Scope · Any process: purchasing, payroll, inventory, IT, compliance · Financial statements and the accounting records behind them\n| Frequency · Continuous or periodic through the year · Usually once a year\n| Required by law? · Required for certain entities, such as listed companies; optional for most others · Required for most registered companies and many free zone entities"],["Other audits you may hear about","- Compliance audit: checks adherence to specific laws or policies, for example tax, SECP or labour rules.\n- Tax audit: a review by the tax authority of the returns and records you filed.\n- Risk review: assesses fraud, cash, cyber and operational risks and recommends controls.\n- Special or forensic review: investigates a specific concern such as suspected fraud."],["Benefits of each","- Credibility with banks, investors and buyers.\n- Fewer errors in the financial statements.\n- Meets legal and licensing requirements.\n- Early detection of fraud, waste and weak controls.\n- Better compliance, so fewer penalties and tax surprises.\n- Clear recommendations that management can act on."],["When does your business need each?","- Statutory audit when the law, your regulator, your bank or your free zone requires audited accounts, or when you are raising money or selling the business.\n- Internal audit when you have multiple branches, cash-heavy operations, growing staff numbers, or have noticed stock, payroll or expense leakage.\n- Both as the business matures: internal audit strengthens controls through the year so the external audit is smoother and cheaper.\nGood to know: The external auditor must stay independent. The same firm should not prepare your books and also audit them, so use separate teams or firms where required.\nBIZEASE SOLUTIONS supports audit coordination, internal control reviews and compliance health checks for businesses in Pakistan and the Gulf.\n← All articles"]]},{"slug":"best-cloud-accounting-software-xero-quickbooks-zoho","title":"Xero vs QuickBooks vs Zoho Books: Best Cloud Accounting Software for SMEs","cat":"Accounting & Technology","date":"2026-10-05","tags":["CloudAccounting","Xero","QuickBooks"],"lead":"Cloud accounting lets you see your numbers from anywhere, share them with your accountant instantly and cut manual entry. Xero, QuickBooks Online and Zoho Books are the three names SMEs ask about most. Here is how they compare.","secs":[["At a glance","| Area · Xero · QuickBooks Online · Zoho Books\n| Best for · Service and trading SMEs with an accountant involved · Small businesses wanting a big ecosystem of apps and accountants · Budget-conscious SMEs, especially those already using Zoho apps\n| Ease of use · Clean and simple · Very familiar, many tutorials · Simple, with many settings to explore\n| Multi-currency · Available on higher plans · Available on higher plans · Supported\n| VAT / GST support · Strong for UK and several regions · Strong for US and UK; varies by country · Built-in tax support for several Gulf countries and the UK\n| Integrations · Large app marketplace · Very large app marketplace · Deep link to Zoho CRM, Inventory and other Zoho apps\n| Reporting · Good standard reports, customisable · Good standard reports · Good standard reports"],["Xero","Xero is popular with accountants for its clean interface, reconciliation workflow and collaboration tools. It suits businesses that want to work closely with their accounting firm."],["QuickBooks Online","QuickBooks has the biggest user base and a very large number of connected apps. It works well for small businesses that sell products or services and want invoicing, expenses and reports in one place. Features vary by country, so check what is available in yours."],["Zoho Books","Zoho Books is competitive on price and fits naturally if you already use Zoho CRM or Zoho Inventory. It includes VAT features for several Gulf countries, which helps businesses operating in the UAE, Saudi Arabia or Bahrain."],["What about Pakistan?","None of these tools is built around Pakistan's FBR and provincial sales tax portals, so you will usually record tax rates manually and file returns separately. Bank feeds for local banks are usually limited, so statements are often imported by file. A good chart of accounts, tax codes and a clear month-end routine matter more than the software brand."],["How to choose","1. Where do you operate? Pick the tool with the best tax support for that country.\n2. Which other systems must it connect with: POS, payroll, CRM, e-commerce?\n3. How many users and how much inventory do you handle?\n4. What does your accountant already use?\n5. Run a free trial using one month of real transactions before you decide.\nMoving from Excel? Clean your customer, supplier and opening balance data first. Importing messy spreadsheets simply moves the mess into the cloud.\nBIZEASE SOLUTIONS sets up and migrates businesses to Xero, QuickBooks and Zoho Books, including chart of accounts design, opening balances and team training.\n← All articles"]]},{"slug":"us-llc-for-non-residents-form-5472","title":"US LLC for Non-Residents: Delaware vs Wyoming, EIN, Form 5472 and Compliance","cat":"United States","date":"2026-10-02","tags":["USLLC","Delaware","Wyoming","EIN","Form5472","EcommerceBusiness","NonResidentLLC"],"lead":"Forming a US LLC as a non-resident: choosing Delaware or Wyoming, EIN, registered agent, bank account, Form 5472 and pro-forma 1120 annual filing requirements.","secs":[["Overview","A US LLC is popular with freelancers, e-commerce sellers, SaaS founders and agencies who want to sell to American customers, use US payment platforms and appear credible to global clients. Non-residents can own a US LLC, but the tax and reporting rules deserve attention."],["Choosing a state","Delaware is known for its business-friendly courts and is common for startups seeking investors. Wyoming offers low fees and strong privacy features, and is popular with small operators. Other states such as Florida or Texas may suit businesses with local operations. Compare formation fees, annual fees and state taxes."],["Formation steps","1. Pick the state and entity type (LLC or C-Corporation).\n2. Appoint a registered agent and file the Articles of Organization.\n3. Prepare an Operating Agreement.\n4. Apply for an EIN with the IRS using Form SS-4.\n5. Open a business bank or payment account."],["Taxes to understand","- A single-member LLC owned by a non-resident is generally disregarded for US federal income tax, with different results if there is income effectively connected with a US trade or business\n- A C-Corporation pays 21 percent federal corporate tax\n- State taxes vary, and sales tax depends on where you have nexus\n- Pakistani owners may also have tax obligations at home"],["The crucial annual filing","Foreign-owned single-member LLCs usually must file Form 5472 with a pro-forma Form 1120 each year, even with little or no income. Penalties for missing this filing are significant."],["Banking and payments","Stripe, PayPal and US banks each have their own KYC. Use accurate details and keep clean accounting.\nBIZEASE SOLUTIONS helps with formation, EIN, bookkeeping and annual compliance so your US LLC stays in good standing.\n← All articles"]]},{"slug":"start-uk-limited-company-from-pakistan","title":"How to Start a UK Limited Company from Pakistan: Companies House, HMRC and Tax","cat":"United Kingdom","date":"2026-09-28","tags":["UKLimitedCompany","CompaniesHouse","HMRC","CorporationTax","UKBusiness","NonResidentDirector"],"lead":"Guide for Pakistani entrepreneurs forming a UK Ltd company: Companies House registration, registered office, director ID verification, corporation tax and VAT.","secs":[["Overview","A UK private limited company (Ltd) is one of the fastest ways to build credibility for international trade, e-commerce, consultancy and digital services. Non-residents can usually incorporate and act as directors and shareholders, but there are tax and compliance obligations that must be handled correctly."],["What you need","- A unique company name and suitable SIC codes\n- A UK registered office address\n- Director and shareholder details, including passport and residential address\n- Identity verification for directors and people with significant control\n- A Memorandum and Articles of Association"],["Incorporation steps","1. Choose the name and check availability.\n2. File the application with Companies House.\n3. Receive the certificate of incorporation, often within a short time.\n4. Register for Corporation Tax with HMRC.\n5. Register for VAT when required, for example above the turnover threshold (currently £90,000) or voluntarily.\n6. Open a business bank account or payment account."],["UK tax snapshot","- Corporation tax: 25 percent main rate, with 19 percent for small profits up to £50,000 and marginal relief in between\n- VAT: 20 percent standard rate\n- Annual filings: confirmation statement, annual accounts and corporation tax return (CT600)"],["Residency matters","A company incorporated in the UK is treated as UK tax resident. If the directors live in Pakistan, you must also consider Pakistani tax residency, permanent establishment risk and double-tax-treaty relief. Take advice before you start trading."],["Why use BIZEASE SOLUTIONS","We prepare your incorporation, coordinate the registered office, handle HMRC registrations and provide ongoing UK bookkeeping and filings, while keeping your Pakistan-side disclosures in order.\n← All articles"]]},{"slug":"bahrain-company-formation-wll-guide","title":"Bahrain Company Formation: WLL, SPC and Branch Setup with 100% Foreign Ownership","cat":"Bahrain","date":"2026-09-22","tags":["BahrainBusiness","CompanyFormationBahrain","WLL","Sijilat","GCCBusiness","VATBahrain"],"lead":"How to register a company in Bahrain: WLL, Single Person Company and branch options, Sijilat registration, 10% VAT, no corporate tax for most businesses and visa tips.","secs":[["Overview","Bahrain is often chosen by entrepreneurs who want a fast, cost-effective Gulf base. Most sectors allow full foreign ownership, set-up is relatively quick and the tax regime is business friendly."],["Common entity types","- WLL: With Limited Liability company, the most popular choice for trading and services\n- SPC: Single Person Company for one owner\n- Branch of a foreign company\n- Holding or offshore structures for specific needs"],["Registration steps","1. Reserve the business name through the Sijilat commercial registration portal.\n2. Choose the activity and legal form and prepare the Memorandum of Association.\n3. Obtain Commercial Registration and the required licences.\n4. Register with the municipality and with the Social Insurance Organisation (GOSI) if you employ people.\n5. Register for VAT with the National Bureau for Revenue (NBR) if your turnover requires it.\n6. Open a bank account and arrange visas."],["Tax snapshot","- Corporate tax: generally none for most businesses, with special rules for oil and gas and for large multinational groups\n- VAT: 10 percent\n- Personal income tax: none\n- Social insurance contributions apply to employees"],["Why founders choose Bahrain","Lower operating costs than many Gulf cities, strong banking, easy access to Saudi Arabia through the King Fahd Causeway and a supportive regulator."],["Compliance after set-up","Renew your commercial registration, file VAT returns where registered, keep proper accounts and update records when shareholders or activities change.\nBIZEASE SOLUTIONS handles Bahrain incorporation, accounting, VAT and annual renewals for Pakistani and international owners.\n← All articles"]]},{"slug":"saudi-arabia-company-setup-misa-license","title":"Saudi Arabia Company Setup: MISA Licence, Commercial Registration, Zakat and VAT","cat":"Saudi Arabia","date":"2026-09-17","tags":["SaudiArabiaBusiness","MISA","Vision2030","ZATCA","ZakatTax","RiyadhBusiness"],"lead":"Step-by-step guide to starting a company in Saudi Arabia: MISA investment licence, commercial registration, ZATCA tax, Zakat, 15% VAT and Saudisation considerations.","secs":[["Overview","Saudi Arabia is one of the fastest-growing business markets in the region as Vision 2030 drives investment in technology, construction, logistics, tourism and healthcare. Foreign investors can set up in the Kingdom, but the process has its own licensing and compliance steps."],["Common legal forms","- Limited Liability Company (LLC)\n- Branch of a foreign company\n- Regional Headquarters (RHQ) programme for multinationals\n- Joint-stock or professional companies"],["Typical set-up steps","1. Obtain an investment licence from the Ministry of Investment (MISA) for foreign-owned companies.\n2. Reserve the trade name and register in the Commercial Register through the Ministry of Commerce.\n3. Prepare articles of association and complete chamber of commerce registration.\n4. Register with ZATCA for tax, and with GOSI and Qiwa for social insurance and employment.\n5. Open a corporate bank account and plan staffing, including Saudisation quotas."],["Taxes to understand","- Corporate income tax: 20 percent on the foreign-owned share of profit\n- Zakat: 2.5 percent on the Saudi or GCC-owned share of the zakat base\n- VAT: 15 percent\n- Withholding tax: 5 to 20 percent on certain payments abroad, depending on the type\n- E-invoicing (Fatoorah) requirements apply in phases"],["Timeline and cost","Saudi licensing normally takes longer than Gulf free zones because several authorities are involved. Timing depends on the activity, capital, documents and attestation."],["How we help","BIZEASE SOLUTIONS coordinates with licensed local partners for MISA and commercial registration and then sets up ZATCA, VAT, accounting and payroll. Rules are updated frequently, so we verify the latest requirements before each filing.\n← All articles"]]},{"slug":"uae-free-zone-vs-mainland-company","title":"UAE Free Zone vs Mainland Company: Which Setup Is Better for You?","cat":"UAE","date":"2026-09-10","tags":["UAEFreeZone","DubaiMainland","CompanyFormationUAE","DubaiBusiness","LLC","StartupUAE"],"lead":"Compare UAE free zone and mainland company formation: ownership, trading rights, licences, visas, costs, corporate tax and which one suits your business model.","secs":[["Overview","One of the first decisions when setting up a company in the UAE is whether to choose a free zone or the mainland. Both are legitimate and popular, but they serve different business models."],["Free zone company","Free zones such as DMCC, JAFZA, IFZA, Meydan, RAKEZ and others offer simplified set-up, flexible office options and a range of licence packages. - Up to 100 percent foreign ownership - Fast incorporation and straightforward documentation - Possible corporate tax advantages for qualifying activities - Restrictions on trading directly with the UAE mainland unless allowed by the zone and licence"],["Mainland company","A mainland LLC is licensed by the Department of Economic Development (DED) of the relevant emirate. - Freedom to trade across the UAE and bid for government work - Most activities now allow 100 percent foreign ownership, though some regulated activities need approvals or a local partner - A physical office or lease is generally required - Normal 9 percent corporate tax regime applies"],["How to choose","1. Who are your customers: mainland clients or international buyers?\n2. Do you need retail premises or a large team?\n3. How many visas do you need?\n4. What is your budget for licence, office and renewals?\n5. Which activity will appear on the licence?"],["Common mistakes","- Choosing a free zone only because it is cheap, then discovering mainland restrictions\n- Ignoring corporate tax, VAT and audit obligations\n- Not planning bank-account opening and KYC early"],["Expert help","BIZEASE SOLUTIONS compares jurisdictions for you, prepares the documents, coordinates with licensing partners and sets up accounting and tax registrations from day one. Pakistani founders can book a free consultation on WhatsApp.\n← All articles"]]},{"slug":"uae-corporate-tax-guide-for-businesses","title":"UAE Corporate Tax Guide: 9% Rate, AED 375,000 Threshold, Registration and Free Zone Rules","cat":"UAE","date":"2026-09-03","tags":["UAECorporateTax","DubaiBusiness","FTA","FreeZone","VATUAE","TaxCompliance"],"lead":"Everything business owners should know about UAE corporate tax: the 9% rate, AED 375,000 threshold, mandatory registration, qualifying free zone income and penalties.","secs":[["Overview","The United Arab Emirates introduced federal corporate tax to align with international standards while keeping one of the most competitive tax environments in the world. If you own or plan to open a company in Dubai, Abu Dhabi, Sharjah or any free zone, you need to understand how it works."],["The basics","- 9 percent on taxable income above AED 375,000\n- 0 percent on taxable income up to AED 375,000\n- Qualifying free zone persons may enjoy 0 percent on qualifying income if they meet the conditions\n- No personal income tax on salaries\n- VAT remains at 5 percent"],["Who must register?","Generally every taxable person, including mainland companies and free zone companies, must register with the Federal Tax Authority (FTA) and obtain a Tax Registration Number even if profits are low or the company expects to claim 0 percent. Late registration can attract an administrative penalty of AED 10,000."],["Free zone benefits are conditional","A free zone company does not automatically pay zero tax. It must earn qualifying income, maintain adequate substance in the UAE, keep proper records and meet other tests. Income from the mainland or from non-qualifying activities may be taxed at 9 percent."],["Accounting and audit requirements","Companies should keep accounting records for the required retention period and prepare financial statements. Audited accounts may be needed depending on the licence type, free zone rules and income level."],["Deadlines","The corporate tax return is generally due within nine months after the end of the financial year. VAT returns are filed periodically, and penalties apply for late VAT registration and returns."],["How BIZEASE SOLUTIONS can help","We assist with UAE company formation, corporate tax and VAT registration, bookkeeping, audit coordination and tax return filing. Rules and thresholds are updated by the authorities, so we confirm current requirements for every client.\n← All articles"]]},{"slug":"it-exports-freelancers-tax-pakistan","title":"Tax Guide for Freelancers and IT Exporters in Pakistan: PSEB, Export Proceeds and Filing","cat":"Pakistan Taxation","date":"2026-08-24","tags":["FreelancerTaxPakistan","ITExports","PSEB","SoftwareHouse","DigitalServices","FBR"],"lead":"How Pakistani freelancers, software houses and IT exporters are taxed: PSEB registration, export proceeds, withholding at the bank and why filing a return still matters.","secs":[["Overview","Pakistan's freelancers and IT companies earn valuable foreign exchange and the tax law recognises this with special treatment for export of services. Understanding the rules helps you keep more of your earnings and stay compliant."],["Register your business properly","Freelancers can work as individuals, but growing teams usually move to a registered company or partnership. Registration with the Pakistan Software Export Board (PSEB) may be needed to access concessionary tax treatment for IT and IT-enabled services. Make sure your NTN is active as well."],["How export proceeds are taxed","When export proceeds are brought into Pakistan through the banking channel, tax may be collected at a reduced rate at source, and in many cases this is treated as the final tax on that income, subject to conditions. The exact rate and conditions depend on the type of service and the current Finance Act, so check the latest rule before relying on it."],["Why you should still file a return","- Proof of income for visas, bank finance and property purchases\n- Staying on the Active Taxpayer List for lower withholding elsewhere\n- Claiming refunds or adjustments where applicable\n- Clean records if FBR sends a notice"],["Practical tips","1. Receive payments through a bank, not informal channels, and keep the remittance advice\n2. Issue proper invoices for every client\n3. Separate personal and business bank accounts\n4. Track expenses such as software, hardware and internet for accurate profit figures\n5. Plan for sales tax on services where the provincial law applies"],["Growing globally","Many clients ask Pakistani developers to invoice through a UK Ltd or US LLC. This can help with payment gateways and credibility but also creates tax obligations in both countries. Get advice before setting it up.\nBIZEASE SOLUTIONS supports freelancers and software houses with registration, bookkeeping, tax returns and cross-border structuring.\n← All articles"]]},{"slug":"pakistan-economy-what-businesses-should-watch","title":"Pakistan Economy: Key Indicators Every Business Owner Should Watch in 2026","cat":"Pakistan Economy","date":"2026-08-10","tags":["PakistanEconomy","Inflation","StateBankOfPakistan","ExchangeRate","SME","BusinessGrowth"],"lead":"Inflation, policy rate, exchange rate, exports and tax policy: how Pakistan's economic indicators affect pricing, cash flow, financing and expansion plans for businesses.","secs":[["Overview","Every business in Pakistan operates inside the national economy. Knowing which indicators move your costs and revenues helps you plan better, even if you are not an economist. This article summarises what to watch. It is general information, not investment advice, and figures change often."],["1. Inflation","Inflation affects the price of raw materials, salaries, rent and utilities. When it rises, margins shrink unless you revise prices. Track the monthly consumer price index published by the Pakistan Bureau of Statistics and review supplier contracts regularly."],["2. The policy rate and borrowing costs","The State Bank of Pakistan sets the policy rate, which influences bank lending rates. Higher rates make working-capital finance more expensive and can delay expansion. Lower rates support investment but may change deposit returns. Build interest cost into your cash-flow forecast."],["3. Exchange rate (PKR)","Importers feel currency movement immediately through landed cost; exporters benefit when the rupee weakens but face input-cost pressure. Consider pricing clauses, forward planning with your bank and keeping accurate foreign-currency records for tax."],["4. Exports and remittances","Exports and remittances support foreign-exchange reserves. Sectors such as IT services, textiles and agriculture continue to be important, and special tax treatment often applies to exporters."],["5. Tax and regulatory policy","The annual Finance Act can change income tax slabs, withholding rates and sales tax rules. Review the changes soon after each budget and update your pricing, payroll and compliance calendar."],["Practical steps","- Prepare a 12-month cash-flow forecast and update it quarterly\n- Keep clean books so lenders and investors can trust your numbers\n- Register with FBR and provincial authorities to avoid higher non-filer costs\n- Consider diversifying into export markets\nBIZEASE SOLUTIONS helps Pakistani SMEs build reliable financial reporting, budgets and tax plans, and supports expansion into the UAE, Saudi Arabia, Bahrain, the UK and the US.\n← All articles"]]},{"slug":"sales-tax-pakistan-fbr-pra-srb-guide","title":"Sales Tax in Pakistan: FBR, PRA or SRB? Registration and Return Filing Guide","cat":"Pakistan Taxation","date":"2026-07-27","tags":["SalesTaxPakistan","PRA","SRB","FBR","GSTPakistan","TaxReturn"],"lead":"Understand sales tax in Pakistan: when to register with FBR, PRA (Punjab) or SRB (Sindh), the standard 18% rate, input tax adjustment and monthly return deadlines.","secs":[["Overview","Sales tax is one of the most important compliance areas for Pakistani businesses. The standard rate on most goods is 18 percent, while services are taxed by the provincial authorities under their own laws. Choosing the right authority is the first step."],["Which authority applies?","- FBR (federal): sales tax on supply of goods\n- PRA (Punjab Revenue Authority): sales tax on services provided in Punjab\n- SRB (Sindh Revenue Board): sales tax on services provided in Sindh\n- KPRA and BRA: services in Khyber Pakhtunkhwa and Balochistan\nA business that sells goods and also provides services may need to register with more than one authority."],["How the system works","You charge sales tax on your sales (output tax) and claim credit for tax paid on purchases (input tax). The difference is paid to the government. Proper invoices with the supplier's registration number are essential to claim input tax."],["Monthly return filing","Registered businesses file a sales tax return every month, normally due around the 15th of the following month. Late filing or wrong claims can lead to default surcharge, penalties and blocked input tax."],["Good practices","1. Issue compliant tax invoices every time\n2. Match purchase invoices with the supplier's filed returns\n3. Reconcile books to the return before submission\n4. Keep records for the period required by law"],["Use our calculator","The Pakistan Sales Tax tool on our site adds or extracts sales tax in seconds. For special rates, exemptions or sector-specific rules, speak to an adviser.\nBIZEASE SOLUTIONS registers businesses with FBR, PRA and SRB and files monthly sales tax returns on your behalf.\n← All articles"]]},{"slug":"withholding-tax-in-pakistan-explained","title":"Withholding Tax in Pakistan Explained: Sections 149, 151, 152, 153 and More","cat":"Pakistan Taxation","date":"2026-07-12","tags":["WithholdingTaxPakistan","FBR","Section153","TaxCompliance","IncomeTaxOrdinance","PakistanBusiness"],"lead":"Plain-English guide to withholding tax in Pakistan: who must deduct, which payments are covered, filer and non-filer rates, and common compliance mistakes.","secs":[["Overview","Withholding tax (WHT) is the system under which the person making a payment deducts income tax at source and deposits it with the government. In Pakistan it is a major source of revenue, so almost every business must deal with it."],["How withholding works","When a company pays a supplier, contractor, landlord, employee or foreign vendor, it may have to deduct a percentage as tax and deposit it into the government treasury. The payee later claims this as a credit in their own return, or it becomes the final tax depending on the section."],["Common sections businesses meet","- Section 149: salary income, deducted by the employer on slab rates\n- Section 151: profit on debt such as bank profit and savings certificates\n- Section 152: payments to non-residents, including royalties and technical fees\n- Section 153: payments for goods, services and execution of contracts\n- Section 155: rent of immovable property\n- Section 236 series: telephone, auctions, property and other specified transactions"],["Why rates differ","Rates depend on the type of payment, whether the recipient is a company or an individual or AOP, and whether the recipient is on the Active Taxpayer List. Non-filers usually face higher rates. Some payments are a final tax, others are minimum tax or adjustable."],["Typical mistakes","1. Deducting at the wrong rate or under the wrong section\n2. Not collecting NTN and filer status before payment\n3. Deducting tax but depositing it late\n4. Skipping monthly withholding statements, which can disallow expenses and attract penalties"],["Use our free tool, then verify","Our Pakistan Withholding Tax Finder lets you search by payment type and see the section, rate and nature of the tax. Rates change with each Finance Act, so always confirm the current rate before filing.\nBIZEASE SOLUTIONS manages monthly withholding computation, deposit and statement filing for businesses of all sizes.\n← All articles"]]},{"slug":"ntn-registration-and-active-taxpayer-list-pakistan","title":"NTN Registration in Pakistan and Why Being on the Active Taxpayer List Matters","cat":"Pakistan Taxation","date":"2026-06-29","tags":["NTN","ActiveTaxpayerList","FBR","IncomeTaxPakistan","FilerVsNonFiler","TaxPakistan"],"lead":"How to get an NTN in Pakistan, what the Active Taxpayer List (ATL) means, and how filer vs non-filer status changes withholding tax on your payments.","secs":[["Overview","The National Tax Number (NTN) is your identity with the Federal Board of Revenue (FBR). Individuals, associations of persons and companies all need one to file income tax returns, register for sales tax and deal with banks, customs and government departments."],["Who needs an NTN?","Salaried persons above the taxable threshold, business owners, freelancers, exporters, importers, property investors and every company should hold an NTN. Even if your income is low, being registered and filing a return is useful as proof of income for visas, bank loans and business contracts."],["What is the Active Taxpayer List (ATL)?","The ATL is the FBR list of persons who have filed their income tax return for the relevant period. Being on the list means you are treated as a filer. Many withholding tax rates in Pakistan are significantly higher for persons who are not on the list. This applies to payments such as bank profit, cash withdrawals, property purchases, vehicle registration and many business payments."],["Filer vs non-filer: the practical impact","- Higher withholding rates on banking transactions and purchases\n- Higher advance tax on property and vehicle transactions\n- Possible restrictions in dealing with some departments and banks\n- Weaker position when applying for loans or tenders"],["How to stay active","1. Register your NTN online through the FBR portal.\n2. Keep records of salary slips, bank statements, invoices and expenses.\n3. File the annual income tax return before the due date.\n4. Keep your wealth statement and reconciliations consistent year to year.\nYou can estimate withholding tax for most payment types with our free Pakistan withholding tax finder, then confirm the final figure with an adviser."],["Need help?","BIZEASE SOLUTIONS prepares and files income tax returns for salaried individuals, business owners and companies, and can bring late filers back on track. Contact us for a quick review.\n← All articles"]]},{"slug":"how-to-register-a-company-in-pakistan-secp","title":"How to Register a Company in Pakistan with SECP: Step-by-Step Guide (2026)","cat":"Pakistan Business","date":"2026-06-18","tags":["CompanyRegistrationPakistan","SECP","PrivateLimitedCompany","StartupPakistan","NTN","BusinessInPakistan"],"lead":"Complete guide to company registration in Pakistan with SECP: private limited vs SMC vs partnership, documents, NTN, bank account and compliance after incorporation.","secs":[["Overview","Starting a business in Pakistan begins with choosing the right legal structure and registering it correctly. A properly registered company can open a corporate bank account, issue tax invoices, sign contracts, hire staff and win larger clients. This guide explains how company registration in Pakistan with the Securities and Exchange Commission of Pakistan (SECP) works."],["Choose the right business structure","The most common options are sole proprietorship, partnership or AOP, Single Member Company (SMC) and private limited company. A sole proprietorship is the simplest, but the owner carries unlimited personal liability. An SMC or private limited company gives limited liability and looks more credible to banks, investors and corporate customers. As a general rule a private limited company needs at least two members and directors, while an SMC can be owned by one person."],["Documents you normally need","- CNIC copies of all directors and shareholders\n- Three proposed company names for SECP name reservation\n- Memorandum and Articles of Association with the business objects\n- Registered office address and proof of occupancy\n- Active email address and mobile number for every director"],["Typical registration steps","1. Reserve the company name through SECP's online system.\n2. Prepare and file the incorporation documents with the registration fee.\n3. Receive the Certificate of Incorporation.\n4. Register the company for NTN with FBR and, where needed, for sales tax with FBR, PRA or SRB.\n5. Open a corporate bank account."],["What to do after incorporation","Registration is only the start. Companies must keep proper books, file annual returns and audited financial statements with SECP, and file income tax and sales tax returns on time. Missing deadlines leads to penalties and can hurt your standing as an active taxpayer."],["How BIZEASE SOLUTIONS can help","Our team handles name reservation, SECP incorporation, FBR and provincial tax registration, bank-account documentation and ongoing bookkeeping from our Islamabad office. If you plan to expand abroad later, we can also set up your UAE, Saudi, Bahrain, UK or US entity under one compliance plan.\n← All articles"]]}].concat(w.__BIZBOT_EXTRA||[]);
/* ===================== BIZBOT UI ===================== */
(function () {
  if (typeof document === "undefined" || !document.body) return;
  var B = w.BIZBOT, KEY = "bizbotChat.v2";
  var WELCOME = "Assalam-o-Alaikum! 👋 I'm <b>BIZBOT</b>, the BIZEASE SOLUTIONS assistant.<br>Ask me about <b>company registration, tax, accounting, audit, VAT/GST</b> or use the <b>tax calculators</b> for Pakistan, UAE, Saudi Arabia, Bahrain, UK and USA.<br><small>Roman Urdu mein bhi pooch sakte hain.</small>";
  var PH = ["Ask about tax, set-up or compliance…", "Try: salary 50k, 2026 ka tax kitna?", "Try: documents needed for a Saudi company", "Try: EMI on 10 lakh at 14% for 5 years", "Try: UAE tax on AED 2m profit"];
  var css = document.createElement("style"); css.id = "bbCss"; css.textContent = "#bbL,#bbT,#bbP{--g0:#0b2417;--g1:#173f2b;--g2:#2f7a50;--gold:var(--acc,#c9a35a);--paper:var(--card,#fffaf0);--bgp:var(--bg,#f4eddc);--ink2:var(--ink,#14251b);--ln:var(--line,#e0d5ba);--mt:var(--mute,#5a6a5e)}\n#bbL{position:fixed;right:16px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:60;display:inline-flex;align-items:center;gap:9px;border:0;cursor:pointer;color:#fff;background:linear-gradient(135deg,var(--g0),var(--g1) 60%,#2c5a3f);border-radius:99px;padding:9px 18px 9px 9px;font:700 .86rem Inter,system-ui,sans-serif;box-shadow:0 12px 30px #0007,inset 0 0 0 1px #ffffff1a;letter-spacing:.1em;transition:transform .2s,filter .2s}\n#bbL:hover{filter:brightness(1.12);transform:translateY(-2px)}\n#bbL.hide{display:none}\n#bbL .bi{width:34px;height:34px;border-radius:50%;background:var(--gold);color:#1b1500;display:grid;place-items:center}\n#bbL .dot{position:absolute;top:7px;left:34px;width:10px;height:10px;border-radius:50%;background:#2ee26f;border:2px solid var(--g0)}\n#bbT{position:fixed;right:16px;bottom:calc(130px + env(safe-area-inset-bottom,0px));z-index:60;background:var(--paper);color:var(--ink2);border:1px solid var(--ln);border-radius:14px 14px 4px 14px;padding:10px 14px;font:500 .84rem/1.4 Inter,sans-serif;box-shadow:0 12px 30px #0003;display:none;max-width:240px}\n#bbT.on{display:block;animation:bbp .4s}\n@keyframes bbp{from{opacity:0;transform:translateY(10px)}}\n#bbP{position:fixed;right:16px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:70;width:min(420px,calc(100vw - 24px));height:min(640px,calc(100vh - 100px));background:var(--bgp);color:var(--ink2);border:1px solid var(--ln);border-radius:20px;box-shadow:0 30px 80px #0008;display:none;flex-direction:column;overflow:hidden;font:15px/1.5 Inter,system-ui,sans-serif}\n#bbP.on{display:flex;animation:bbp .3s}\n#bbP *{box-sizing:border-box}\n.bbh{background:linear-gradient(135deg,var(--g0),var(--g1) 65%,#2c5a3f);color:#fff;padding:14px 14px 14px 16px;display:flex;align-items:center;gap:12px;border-bottom:3px solid var(--gold);flex:none}\n.bbh .av{width:42px;height:42px;border-radius:12px;background:var(--gold);color:#1b1500;display:grid;place-items:center;font:700 1.35rem Fraunces,Georgia,serif;flex:none;box-shadow:inset 0 -3px 0 #0002}\n.bbh .bhx{min-width:0}.bbh b{display:block;letter-spacing:.14em;font-size:1rem;line-height:1.2}\n.bbh small{display:flex;align-items:center;gap:6px;color:#b6dcc0;font-size:.72rem;line-height:1.3}\n.bbh small i{width:7px;height:7px;border-radius:50%;background:#2ee26f;flex:none}\n.bbh button{background:#ffffff1c;color:#fff;border:0;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:1rem;line-height:1;display:grid;place-items:center;flex:none}\n.bbh #bbR{margin-left:auto}\n.bbh button:hover{background:#ffffff40}\n#bbM{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;overscroll-behavior:contain}\n.bm{max-width:92%;padding:11px 14px;border-radius:16px;font-size:.92rem;word-wrap:break-word;overflow-wrap:anywhere}\n.bm.b{background:var(--paper);border:1px solid var(--ln);border-top-left-radius:4px;align-self:flex-start;box-shadow:0 1px 0 #0000000a}\n.bm.u{background:var(--g1);color:#fff;border-top-right-radius:4px;align-self:flex-end;white-space:pre-wrap}\n.bm p{margin:0 0 .5em}.bm p:last-child{margin-bottom:0}\n.bm ul,.bm ol{margin:.2em 0 .6em;padding-left:1.15em}.bm li{margin:.18em 0}\n.bm strong{font-weight:650}\n.bm a{color:var(--g2);font-weight:600;text-decoration-thickness:1px;text-underline-offset:2px}\n.bm small{opacity:.78;display:inline-block;line-height:1.4;margin-top:4px}\n.bcard{margin:.7em 0 .3em;border:1px solid var(--ln);border-top:3px solid var(--gold);border-radius:10px;background:linear-gradient(#fffdf6,#fbf5e6);padding:12px 13px;color:var(--g0)}\n.bct{font-weight:650;font-size:.82rem;letter-spacing:.01em;color:var(--mt);margin-bottom:6px}\n.bhero{display:flex;flex-direction:column;gap:0;padding:2px 0 10px;border-bottom:1px dashed var(--ln);margin-bottom:6px}\n.bhero span{font-size:.76rem;color:var(--mt)}\n.bhero strong{font:600 1.75rem/1.15 Fraunces,Georgia,serif;color:var(--g0);font-variant-numeric:tabular-nums lining-nums;letter-spacing:-.01em}\n.bl{margin:0}.bl>div{display:flex;align-items:baseline;gap:8px;padding:5px 0}\n.bl dt{color:var(--mt);font-size:.82rem;flex:0 1 auto}\n.bl>div::after{content:\"\";order:1;flex:1 1 12px;border-bottom:1px dotted #b9ad8c;transform:translateY(-3px);min-width:8px}\n.bl dd{margin:0;order:2;font-weight:650;font-size:.86rem;text-align:right;font-variant-numeric:tabular-nums;color:var(--g0);flex:0 1 auto}\n.bnote{font-size:.78rem!important;color:var(--mt);margin:.6em 0 0!important;padding-top:.5em;border-top:1px dashed var(--ln);line-height:1.45}\n.blk{display:flex;flex-wrap:wrap;gap:8px;margin-top:.7em}\n.bm a.bgo{display:inline-flex;align-items:center;gap:6px;color:var(--g1);background:#173f2b12;border:1px solid #173f2b33;border-radius:99px;padding:6px 12px;font-size:.8rem;text-decoration:none}\n.bm a.bgo:hover{background:var(--g1);color:#fff}\n.bm a.bwa{display:inline-flex;align-items:center;gap:8px;background:#25d366;color:#052e16;border-radius:99px;padding:10px 16px;font-weight:700;font-size:.88rem;text-decoration:none;box-shadow:0 6px 16px #25d36655}\n.bm a.bwa:hover{filter:brightness(1.06)}\n.bsrc{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;margin-top:.75em;padding-top:.55em;border-top:1px solid var(--ln);font-size:.74rem;color:var(--mt)}\n.bsrc span{margin-right:2px}\n.bm .bsrc a{font-weight:500;font-size:.74rem;color:var(--g2);background:#2f7a5014;border-radius:6px;padding:2px 7px;text-decoration:none}\n.bm .bsrc a:hover{background:var(--g2);color:#fff}\n.bty{display:flex;gap:4px;padding:13px 15px}.bty i{width:7px;height:7px;border-radius:50%;background:var(--mt);animation:bbd 1s infinite}.bty i:nth-child(2){animation-delay:.15s}.bty i:nth-child(3){animation-delay:.3s}\n@keyframes bbd{0%,60%,100%{opacity:.25;transform:none}30%{opacity:1;transform:translateY(-3px)}}\n.bbf{display:flex;gap:8px;padding:10px 10px 6px;border-top:1px solid var(--ln);background:var(--paper);align-items:flex-end;flex:none}\n.bbf textarea{flex:1;margin:0;padding:11px 14px;border:1px solid var(--ln);border-radius:20px;background:var(--bgp);color:var(--ink2);font:inherit;font-size:.92rem;min-width:0;resize:none;max-height:110px;line-height:1.4;display:block}\n.bbf textarea:focus{outline:0;border-color:var(--g2);box-shadow:0 0 0 3px #2f7a5030}\n.bbf button{border:0;background:var(--g1);color:#fff;width:42px;height:42px;border-radius:50%;cursor:pointer;flex:none;display:grid;place-items:center;transition:background .2s,transform .2s}\n.bbf button:hover{background:var(--g2);transform:scale(1.05)}\n.bbn{font-size:.68rem;color:var(--mt);text-align:center;padding:0 10px 8px;background:var(--paper);flex:none}\n#bbL:focus-visible,#bbP button:focus-visible,#bbP a:focus-visible{outline:2px solid var(--gold);outline-offset:2px}\n@media(max-width:640px){#bbP{left:8px;right:8px;width:auto;bottom:8px;top:8px;height:auto;border-radius:16px}#bbL{padding:8px 14px 8px 8px}#bbT{display:none!important}.bbf textarea{font-size:16px}}\n@media(prefers-reduced-motion:reduce){#bbP.on,#bbT.on{animation:none}#bbM{scroll-behavior:auto}}\n@media print{#bbL,#bbP,#bbT{display:none!important}}\n.bm .bai{min-height:1em}.bm .bnote2{display:block;margin-top:.55em;font-size:.7rem;color:var(--mt);opacity:.9}.bsrc[hidden]{display:none}\n"; document.head.appendChild(css);

  var L = document.createElement("button"); L.id = "bbL"; L.type = "button"; L.setAttribute("aria-label", "Open BIZBOT chat assistant");
  L.innerHTML = '<span class="bi"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11.5h7M8.5 14.5h4"/></svg></span><span class="bt">BIZBOT</span><span class="dot"></span>';
  var TS = document.createElement("div"); TS.id = "bbT"; TS.textContent = "Ask BIZBOT: tax, company set-up, audit. I can calculate too.";
  var P = document.createElement("div"); P.id = "bbP"; P.setAttribute("role", "dialog"); P.setAttribute("aria-label", "BIZBOT chat");
  P.innerHTML = '<div class="bbh"><span class="av">B</span><div class="bhx"><b>BIZBOT</b><small><i></i>Online · answers from the BIZEASE website</small></div><button id="bbR" type="button" title="Start a new chat" aria-label="Start a new chat"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button><button id="bbX" type="button" aria-label="Close chat">✕</button></div><div id="bbM" aria-live="polite"></div><form class="bbf" id="bbF"><textarea id="bbI" rows="1" placeholder="" autocomplete="off" aria-label="Type your question"></textarea><button type="submit" aria-label="Send"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg></button></form><div class="bbn">Information and estimates only, not legal or tax advice.</div>';
  document.body.appendChild(TS); document.body.appendChild(L); document.body.appendChild(P);
  var M = document.getElementById("bbM"), I = document.getElementById("bbI"), F = document.getElementById("bbF"), hist = [], booted = false, started = false, phI = 0, phT = null;

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function inline(s) {
    s = esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, h) { return '<a href="' + h + '"' + (/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : "") + ">" + t + "</a>"; });
    return s;
  }
  function md(t) {
    var lines = String(t || "").split("\n"), out = [], list = null;
    function close() { if (list) { out.push("</" + list + ">"); list = null; } }
    lines.forEach(function (ln) {
      var m;
      if ((m = ln.match(/^\s*[-•]\s+(.*)$/))) { if (list !== "ul") { close(); out.push("<ul>"); list = "ul"; } out.push("<li>" + inline(m[1]) + "</li>"); }
      else if ((m = ln.match(/^\s*\d+\.\s+(.*)$/))) { if (list !== "ol") { close(); out.push("<ol>"); list = "ol"; } out.push("<li>" + inline(m[1]) + "</li>"); }
      else if (!ln.trim()) { close(); }
      else { close(); out.push("<p>" + inline(ln) + "</p>"); }
    });
    close(); return out.join("");
  }
  function calcHtml(c) {
    var h = '<div class="bcard"><div class="bct">' + esc(c.title) + "</div>";
    if (c.hero) h += '<div class="bhero"><span>' + esc(c.hero[0]) + "</span><strong>" + esc(c.hero[1]) + "</strong></div>";
    if (c.rows && c.rows.length) { h += '<dl class="bl">'; c.rows.forEach(function (r) { h += "<div><dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }); h += "</dl>"; }
    (c.notes || []).forEach(function (n) { h += '<p class="bnote">' + esc(n) + "</p>"; });
    return h + "</div>";
  }
  function bubbleHtml(r) {
    var h = "";
    if (r.html) h += '<div class="bm b">' + r.html + "</div>";
    else {
      h += '<div class="bm b">' + md(r.text);
      if (r.calc) h += calcHtml(r.calc);
      if (r.link && r.link.length) h += '<div class="blk">' + r.link.map(function (l) { return '<a class="bgo" href="' + l.h + '">' + esc(l.t) + "</a>"; }).join("") + "</div>";
      if (r.handoff) h += '<div class="blk"><a class="bwa" href="' + r.handoff.h + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.3.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.4.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>' + esc(r.handoff.t) + "</a></div>";
      if (r.sources && r.sources.length) h += '<div class="bsrc"><span>From the website</span>' + r.sources.map(function (s) { return '<a href="' + s.href + '"' + (s.ext && /^(https?:|\/blog\/)/.test(s.href) ? ' target="_blank" rel="noopener"' : "") + ">" + esc(s.title) + "</a>"; }).join("") + "</div>";
      h += "</div>";
    }
    return h;
  }
  function scrollDown() { M.scrollTop = M.scrollHeight; }
  function addU(t) { var d = document.createElement("div"); d.className = "bm u"; d.textContent = t; M.appendChild(d); scrollDown(); }
  function addB(r) { var d = document.createElement("div"); d.innerHTML = bubbleHtml(r); while (d.firstChild) M.appendChild(d.firstChild); scrollDown(); }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(hist.slice(-40))); } catch (e) {} }
  function boot() {
    if (booted) return; booted = true;
    var blogs = []; try { blogs = w.__BIZBOT_BLOGS || []; } catch (e) {}
    try { B.init(blogs); } catch (e) { if (w.console) console.error(e); }
  }
  function typing() {
    var t = document.createElement("div"); t.className = "bm b bty"; t.innerHTML = "<i></i><i></i><i></i>"; M.appendChild(t); scrollDown(); return t;
  }
  var CFG = null, cfgP = null, busy = false;
  function loadCfg() {
    if (cfgP) return cfgP;
    cfgP = fetch("/bizbot-config.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { CFG = j && j.enabled && /^https:\/\//.test(j.api || "") ? j : { enabled: false }; return CFG; }).catch(function () { CFG = { enabled: false }; return CFG; });
    return cfgP;
  }
  function plain(b) {
    var t = b.text || ""; if (b.calc) { t += "\n" + (b.calc.title || "") + (b.calc.hero ? ": " + b.calc.hero[0] + " " + b.calc.hero[1] : ""); }
    return t.replace(/\*\*/g, "").slice(0, 1500);
  }
  function aiMessages(txt) {
    var m = [], items = hist.slice(-12);
    items.forEach(function (x) {
      if (x.u) m.push({ role: "user", content: x.u.slice(0, 1500) });
      else if (x.b && !x.b.ai && !x.b.handoff) { var t = plain(x.b); if (t) m.push({ role: "assistant", content: t }); }
    });
    return m.slice(-8);
  }
  function aiBubble() {
    var d = document.createElement("div"); d.className = "bm b";
    d.innerHTML = '<div class="bai"></div><div class="bsrc bsrc-ai" hidden></div><small class="bnote2">Answer from AI search. Please verify important figures and dates.</small>';
    M.appendChild(d); return d;
  }
  function ask(txt, r, t) {
    var done = false, text = "", srcs = [], bub = null, ctrl = new AbortController(), timer = setTimeout(function () { if (!text) ctrl.abort(); }, 15000);
    function fallback(note) {
      if (done) return; done = true; clearTimeout(timer); busy = false;
      if (t.parentNode) t.remove(); if (bub) bub.remove();
      var fb = { text: r.text, sources: r.sources };
      if (note) fb.text = note + "\n\n" + fb.text;
      addB(fb); hist.push({ b: fb }); save();
    }
    function finish() {
      if (done) return; done = true; clearTimeout(timer); busy = false;
      var b = { text: text.trim(), ai: true, aisrc: srcs }; hist.push({ b: b }); save();
    }
    var ctx = []; try { ctx = B.context(txt); } catch (e) {}
    fetch(CFG.api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: aiMessages(txt).concat([{ role: "user", content: txt }]), context: ctx }), signal: ctrl.signal }).then(function (res) {
      if (res.status === 429) { res.json().then(function (j) { fallback(j && j.error === "daily_limit" ? "You have reached today's limit for AI answers." : "Please wait a moment before asking again."); }, function () { fallback(); }); return; }
      if (!res.ok || !res.body) { fallback(); return; }
      var rd = res.body.getReader(), dec = new TextDecoder(), buf = "";
      function pump() {
        return rd.read().then(function (x) {
          if (x.done) { if (text) finish(); else fallback(); return; }
          buf += dec.decode(x.value, { stream: true });
          var parts = buf.split("\n\n"); buf = parts.pop();
          parts.forEach(function (p) {
            if (p.indexOf("data:") !== 0) return; var ev; try { ev = JSON.parse(p.slice(5)); } catch (e) { return; }
            if (ev.t === "delta") {
              if (!bub) { t.remove(); bub = aiBubble(); }
              text += ev.text; bub.firstChild.innerHTML = md(text); scrollDown();
            } else if (ev.t === "source" && /^https?:\/\//.test(ev.url || "")) {
              srcs.push({ title: ev.title || ev.url, href: ev.url });
              if (bub) { var sb = bub.querySelector(".bsrc-ai"); sb.hidden = false; sb.innerHTML = "<span>Sources</span>" + srcs.slice(0, 5).map(function (s) { return '<a href="' + esc(s.href) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title.slice(0, 40)) + "</a>"; }).join(""); }
            } else if (ev.t === "error" && !text) { fallback(); }
            else if (ev.t === "done") { if (text) { if (bub && srcs.length) { var sb2 = bub.querySelector(".bsrc-ai"); sb2.hidden = false; sb2.innerHTML = "<span>Sources</span>" + srcs.slice(0, 5).map(function (s) { return '<a href="' + esc(s.href) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title.slice(0, 40)) + "</a>"; }).join(""); } finish(); } }
          });
          return done ? null : pump();
        });
      }
      return pump();
    }).catch(function () { if (text) finish(); else fallback(); });
  }
  function send(txt) {
    txt = (txt || "").trim(); if (!txt || busy) return; boot();
    addU(txt); hist.push({ u: txt }); I.value = ""; grow();
    var t = typing(), r = B.reply(txt);
    if (r && r.ai) {
      busy = true;
      loadCfg().then(function (c) { if (c && c.enabled) ask(txt, r, t); else { busy = false; setTimeout(function () { t.remove(); addB(r); hist.push({ b: r }); save(); }, 400); } });
      return;
    }
    var delay = Math.min(900, 350 + (r && r.text ? r.text.length * 1.2 : 200));
    setTimeout(function () { t.remove(); if (r) { addB(r); hist.push({ b: r }); save(); } }, delay);
  }
  function restore() {
    var data = null; try { data = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) {}
    addB({ html: WELCOME });
    if (data && data.length) {
      data.forEach(function (x) { if (x.u) { addU(x.u); } else if (x.b) { if (x.b.ai) { var ab = aiBubble(); ab.firstChild.innerHTML = md(x.b.text); if (x.b.aisrc && x.b.aisrc.length) { var sb = ab.querySelector(".bsrc-ai"); sb.hidden = false; sb.innerHTML = "<span>Sources</span>" + x.b.aisrc.slice(0, 5).map(function (q) { return '<a href="' + esc(q.href) + '" target="_blank" rel="noopener noreferrer">' + esc(q.title.slice(0, 40)) + "</a>"; }).join(""); } } else addB(x.b); } });
      hist = data;
    }
  }
  function openP() {
    P.classList.add("on"); TS.classList.remove("on"); L.classList.add("hide");
    if (!started) { started = true; restore(); boot(); }
    startPH();
    setTimeout(function () { try { I.focus({ preventScroll: true }); } catch (e) {} scrollDown(); }, 60);
  }
  function closeP() { P.classList.remove("on"); L.classList.remove("hide"); stopPH(); }
  function reset() { M.innerHTML = ""; hist = []; try { sessionStorage.removeItem(KEY); } catch (e) {} if (w.BIZBOT._ctx) { var c = w.BIZBOT._ctx; c.country = null; c.last = null; c.pending = null; c.lastTopic = ""; c.cur = null; } addB({ html: WELCOME }); }
  function grow() { I.style.height = "auto"; I.style.height = Math.min(110, I.scrollHeight) + "px"; }
  function startPH() { stopPH(); I.placeholder = PH[phI % PH.length]; phT = setInterval(function () { if (document.activeElement === I && I.value) return; phI++; I.placeholder = PH[phI % PH.length]; }, 4200); }
  function stopPH() { if (phT) { clearInterval(phT); phT = null; } }

  L.onclick = openP; document.getElementById("bbX").onclick = closeP; document.getElementById("bbR").onclick = reset;
  F.onsubmit = function (e) { e.preventDefault(); send(I.value); };
  I.addEventListener("input", grow);
  I.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(I.value); } });
  M.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a"); if (!a) return;
    var h = a.getAttribute("href") || "";
    if (/^(#|\/)/.test(h) && !/^\/blog\//.test(h) && w.innerWidth <= 640) closeP();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && P.classList.contains("on")) closeP(); });
  try {
    if (!sessionStorage.getItem("bbHi2")) {
      setTimeout(function () { if (!P.classList.contains("on") && w.innerWidth > 640) { TS.classList.add("on"); setTimeout(function () { TS.classList.remove("on"); }, 7000); } try { sessionStorage.setItem("bbHi2", "1"); } catch (e) {} }, 5000);
    }
  } catch (e) {}
})();

})();
