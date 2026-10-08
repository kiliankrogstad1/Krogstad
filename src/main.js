/* ================= Krogstad PWA – Hauptteil =================
   Daten kommen verschlüsselt (data.enc.json). Entschlüsselt wird nur im Speicher, mit Kilians Passwort.
   Schlüssel-Aufbau: Passwort → PBKDF2 → AES-Key → entschlüsselt privaten RSA-Schlüssel → entschlüsselt Daten-Key → Daten. */
const APPV = "1.1";
const $ = id => document.getElementById(id);
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const ub64 = u => { let s = ""; const a = new Uint8Array(u); for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode.apply(null, a.subarray(i, i + 8192)); return btoa(s) };
const LS = { get(k, d) { try { const v = localStorage.getItem("kg_" + k); return v == null ? d : JSON.parse(v) } catch (e) { return d } },
             set(k, v) { try { localStorage.setItem("kg_" + k, JSON.stringify(v)) } catch (e) {} } };
let PW = null, BUNDLE = null;

async function kdf(pw, salt, iter) {
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function fetchJSON(url) {
  const r = await fetch(url + "?t=" + Date.now(), { cache: "no-store" }).catch(() => null) || await caches.match(url).catch(() => null);
  if (!r || !r.ok) { const c = await caches.match(url).catch(() => null); if (!c) throw new Error("nicht erreichbar"); return c.json() }
  return r.json();
}

/* ---------- Ersteinrichtung: Schlüsselpaar erzeugen ---------- */
async function setupKeys(pw) {
  const kp = await crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
  const pub = await crypto.subtle.exportKey("jwk", kp.publicKey);
  const priv = await crypto.subtle.exportKey("pkcs8", kp.privateKey);
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 400000;
  const k = await kdf(pw, salt, iter);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, priv);
  return { v: 1, erstellt: new Date().toISOString(), pub, priv: { salt: ub64(salt), iv: ub64(iv), iter, ct: ub64(ct) } };
}

/* ---------- Entsperren ---------- */
async function unlock(pw) {
  const keys = await fetchJSON("keys.json");
  const k = await kdf(pw, b64(keys.priv.salt), keys.priv.iter);
  let pkcs8;
  try { pkcs8 = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(keys.priv.iv) }, k, b64(keys.priv.ct)) }
  catch (e) { throw new Error("PW") }
  const priv = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
  const d = await fetchJSON("data.enc.json");
  const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, priv, b64(d.ek));
  const dk = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(d.iv) }, dk, b64(d.ct));
  let txt;
  if (d.gzip && "DecompressionStream" in window) {
    const s = new Blob([plain]).stream().pipeThrough(new DecompressionStream("gzip"));
    txt = await new Response(s).text();
  } else txt = new TextDecoder().decode(plain);
  return JSON.parse(txt);
}

/* lokale Geheimnisse (Anthropic-Key) mit dem Passwort verschlüsseln */
async function sealLocal(name, value) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await kdf(PW, salt, 200000);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(value));
  LS.set("sec_" + name, { salt: ub64(salt), iv: ub64(iv), ct: ub64(ct) });
}
async function openLocal(name) {
  const x = LS.get("sec_" + name, null); if (!x || !PW) return null;
  try { const k = await kdf(PW, b64(x.salt), 200000); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(x.iv) }, k, b64(x.ct))) } catch (e) { return null }
}

/* ---------- Sperrbildschirm ---------- */
const WAIT = [0, 10e3, 30e3, 60e3, 300e3];
async function initLock() {
  const lk = $("lock"), f = $("lockForm"), pw = $("lockPw"), pw2 = $("lockPw2"), txt = $("lockTxt"), msg = $("lockMsg"), btn = $("lockBtn");
  let hatKeys = true;
  try { await fetchJSON("keys.json") } catch (e) { hatKeys = false }
  const modus = hatKeys ? "login" : "setup";
  pw2.hidden = modus !== "setup";
  txt.textContent = modus === "setup" ? "Ersteinrichtung, Sir. Wählen Sie ein starkes Passwort (mind. 10 Zeichen) – es schützt Ihre verschlüsselten Daten." : "Guten " + (new Date().getHours() < 11 ? "Morgen" : new Date().getHours() < 18 ? "Tag" : "Abend") + ", Sir. Ihr Passwort bitte.";
  btn.lastChild.textContent = modus === "setup" ? "Schlüssel erzeugen" : "Entsperren";
  setTimeout(() => pw.focus(), 80);
  const tick = () => { const st = LS.get("lockst", { f: 0, u: 0 }), r = Math.ceil((st.u - Date.now()) / 1000); if (r > 0) { msg.textContent = "Bitte " + r + " s warten."; btn.disabled = true; setTimeout(tick, 1000) } else { btn.disabled = false; if (/warten/.test(msg.textContent)) msg.textContent = "" } };
  tick();
  f.onsubmit = async e => {
    e.preventDefault(); if (btn.disabled) return; msg.textContent = "";
    if (modus === "setup") {
      if (pw.value.length < 10) { msg.textContent = "Mindestens 10 Zeichen, Sir."; return }
      if (pw.value !== pw2.value) { msg.textContent = "Die Passwörter stimmen nicht überein."; return }
      btn.disabled = true; eyeBusy(true); txt.textContent = "Erzeuge Schlüssel …";
      const k = await setupKeys(pw.value); eyeBusy(false); eyeHappy(2000);
      const blob = new Blob([JSON.stringify(k)], { type: "application/json" }), a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "krogstad-schluessel.json"; document.body.appendChild(a); a.click(); a.remove();
      txt.textContent = "Fertig, Sir. Die Datei „krogstad-schluessel.json“ wurde gespeichert. Schicken Sie sie Claude – danach kann ich Ihre Daten liefern. (Sie ist mit Ihrem Passwort geschützt.)";
      pw.value = pw2.value = ""; pw.hidden = pw2.hidden = btn.hidden = true; return;
    }
    const st = LS.get("lockst", { f: 0, u: 0 });
    btn.disabled = true; eyeBusy(true);
    try {
      const data = await unlock(pw.value);
      PW = pw.value; BUNDLE = data; LS.set("lockst", { f: 0, u: 0 }); eyeBusy(false); eyeAnger(0); eyeHappy(1500);
      setTimeout(() => { lk.hidden = true; $("app").hidden = false; start(data) }, 700);
    } catch (err) {
      eyeBusy(false); btn.disabled = false;
      if (err.message === "PW") { st.f++; st.u = Date.now() + WAIT[Math.min(st.f, 4)]; LS.set("lockst", st); eyeAnger(Math.min(1, st.f / 3)); pw.value = ""; msg.textContent = st.f === 1 ? "Falsches Passwort." : st.f === 2 ? "Wieder falsch, Sir." : "Sir. Ernsthaft?"; tick() }
      else msg.textContent = "Daten nicht erreichbar (" + err.message + "). Einmal online öffnen, dann klappt es auch offline.";
    }
  };
}

/* ---------- App ---------- */
function relativ(iso) { const m = (Date.now() - new Date(iso)) / 6e4; return m < 60 ? Math.round(m) + " min" : m < 1440 ? Math.round(m / 60) + " h" : Math.round(m / 1440) + " Tagen" }
function start(D) {
  S.events = D.events || []; S.todos = D.todos || []; S.goals = D.goals || []; S.tasks = D.tasks || []; S.mails = D.mails || null;
  S.yt = D.youtube || null; S.vids = D.videos || null; S.arena = D.arena || null; S.bitpanda = D.bitpanda || null; S.absent = D.absences || {};
  const lokal = LS.get("habits_" + ymd(new Date()), null); S.habits = lokal || (D.habits_heute_datum === ymd(new Date()) ? D.habits || {} : {});
  const done = LS.get("todo_done", {}); S.todos.forEach(t => { if (done[t.id] != null) t.done = done[t.id] });
  $("stand").textContent = "Daten von vor " + relativ(D.stand) + (navigator.onLine ? "" : " · offline");
  route(); addEventListener("hashchange", route);
  setInterval(() => { uhr() }, 30000); uhr();
}
function uhr() { const n = new Date(); $("clock").textContent = hm(n); $("dtxt").textContent = pad(n.getDate()) + ". " + MON[n.getMonth()].slice(0, 3) + " " + n.getFullYear() }
const VIEWS = ["core", "heute", "woche", "todos", "ziele", "mails", "youtube", "finanzen", "alfred"];
function route() {
  let v = (location.hash || "#core").slice(1); if (!VIEWS.includes(v)) v = "core"; CUR = v;
  document.querySelectorAll(".view").forEach(x => x.hidden = x.dataset.view !== v);
  document.querySelectorAll("#nav a").forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === "#" + v ? "page" : "false"));
  ({ core: () => CORE.show(), heute: rHeute, woche: rWoche, todos: rTodos, ziele: rZiele, mails: rMails, youtube: rYT, finanzen: rFin, alfred: rAlfred })[v]();
  window.scrollTo(0, 0);
}
function tlItem(x, now, heute) {
  const li = el("li"); li.style.setProperty("--c", "var(" + x.c + ")"); if (x.off) li.classList.add("off");
  if (heute) { const end = x.end || x.start; if (end < now && !x.allDay && !x.bed) li.classList.add("past"); if (x.end && x.start <= now && now < x.end) li.classList.add("now") }
  const t = el("div", "t", x.allDay ? "—" : hm(x.start)); if (x.end && !x.allDay) t.appendChild(el("span", null, hm(x.end)));
  const r = el("div", "r"); r.appendChild(el("i")); const c = el("div", "c"); c.appendChild(el("b", null, x.title));
  const sub = [x.sub, x.off ? "entfällt" : ""].filter(Boolean).join(" · "); if (sub) c.appendChild(el("div", null, sub));
  li.append(t, r, c); return li;
}
function rHeute() {
  const now = new Date(), day = sod(now), box = $("v-heute"); box.textContent = "";
  const p = el("section", "panel"), ph = el("div", "ph"); ph.append(el("h2", null, "// Heute · " + WDL[day.getDay()]), el("div", "meta", ymd(day).split("-").reverse().join(".")));
  p.appendChild(ph);
  const br = el("div", "briefrow"), eye = el("canvas", "eye"); eye.dataset.size = "48"; br.append(eye, el("div", "brieftext", D_brief()));
  p.appendChild(br);
  const rr = routine(day), bar = el("div", "daybar");
  if (rr.fei) bar.appendChild(el("span", "badge", "Feiertag · " + rr.fei)); if (rr.fer) bar.appendChild(el("span", "badge", "Schulferien · " + rr.fer)); if (rr.abs) bar.appendChild(el("span", "badge", (rr.abs.reason || "Krank") + " gemeldet"));
  p.appendChild(bar);
  const ol = el("ol", "tl"); items(day).forEach(x => ol.appendChild(tlItem(x, now, true))); p.appendChild(ol);
  box.appendChild(p);
}
function D_brief() { return (BUNDLE.briefing && BUNDLE.briefing.datum === ymd(new Date()) ? BUNDLE.briefing.text : localBriefing(new Date())) }
function rWoche() {
  const box = $("v-woche"); box.textContent = ""; const base = sod(new Date());
  for (let i = 0; i < 14; i++) {
    const d = addDays(base, i), p = el("section", "panel"), ph = el("div", "ph");
    ph.append(el("h2", null, (i === 0 ? "Heute" : i === 1 ? "Morgen" : WDL[d.getDay()]) + " · " + d.getDate() + "." + (d.getMonth() + 1) + "."), el("div", "meta", routine(d).fer || routine(d).fei || ""));
    p.appendChild(ph); const ol = el("ol", "tl"); items(d).filter(x => x.kind !== "r" || /Arbeit|Schule|Gym|Feiertag|Ferien|Krank/.test(x.title)).forEach(x => ol.appendChild(tlItem(x, new Date(), false))); p.appendChild(ol); box.appendChild(p);
  }
}
function rTodos() {
  const box = $("v-todos"); box.textContent = ""; const p = el("section", "panel"); p.appendChild(el("div", "ph")).appendChild(el("h2", null, "// To-dos"));
  const done = LS.get("todo_done", {});
  [["hoch", "--amber"], ["mittel", "--green"], ["niedrig", "--blue"]].forEach(([pr, c]) => {
    const l = S.todos.filter(t => (t.prio || "mittel") === pr); if (!l.length) return;
    p.appendChild(el("div", "colh", pr.toUpperCase()));
    l.forEach(t => { const it = el("label", "item"); it.style.setProperty("--c", "var(" + c + ")"); const ck = el("input"); ck.type = "checkbox"; ck.checked = !!t.done;
      ck.onchange = () => { done[t.id] = ck.checked; t.done = ck.checked; LS.set("todo_done", done); if (ck.checked) eyeHappy(1500) };
      it.append(ck, el("div", "b", t.title)); p.appendChild(it) });
  });
  p.appendChild(el("p", "note", "Abhaken wird auf diesem Gerät gespeichert. Ins Krogstad-Online übernimmt Claude es beim nächsten Abgleich (noch nicht automatisch)."));
  box.appendChild(p);
}
function rZiele() {
  const box = $("v-ziele"); box.textContent = ""; const p = el("section", "panel"); p.appendChild(el("div", "ph")).appendChild(el("h2", null, "// Habits heute"));
  habitDefs().forEach(d => { const it = el("label", "item"); const ck = el("input"); ck.type = "checkbox"; ck.checked = !!(S.habits || {})[d.id];
    ck.onchange = () => { S.habits = Object.assign({}, S.habits, { [d.id]: ck.checked }); LS.set("habits_" + ymd(new Date()), S.habits); if (ck.checked) eyeHappy(1500) };
    it.append(ck, el("div", "b", d.t)); p.appendChild(it) });
  const g = el("section", "panel"); g.appendChild(el("div", "ph")).appendChild(el("h2", null, "// Ziele"));
  S.goals.forEach(x => g.appendChild(el("div", "item", (x.done ? "✓ " : "○ ") + x.title)));
  box.append(p, g);
}
function rMails() {
  const box = $("v-mails"); box.textContent = ""; const p = el("section", "panel"); p.appendChild(el("div", "ph")).appendChild(el("h2", null, "// Ungelesene Mails"));
  if (!S.mails || !S.mails.length) p.appendChild(el("div", "empty", "Keine ungelesenen Mails beim letzten Abgleich."));
  (S.mails || []).forEach(m => { const it = el("div", "item"); const b = el("div", "b"); b.append(el("div", null, m.subject || "(ohne Betreff)"), el("div", null, (m.from || "") + (m.date ? " · " + m.date : ""))); if (m.snippet) b.appendChild(el("div", "note", m.snippet)); it.appendChild(b); p.appendChild(it) });
  p.appendChild(el("p", "note", "Antworten: in der Gmail-App oder in Krogstad-Online (mit Alfred-Entwurf).")); box.appendChild(p);
}
function rYT() {
  const box = $("v-youtube"); box.textContent = ""; const y = S.yt, p = el("section", "panel"); p.appendChild(el("div", "ph")).appendChild(el("h2", null, "// YouTube · MrKrogi"));
  if (!y) { p.appendChild(el("div", "empty", "Keine Daten.")); box.appendChild(p); return }
  const top = el("div", "ar-top"); [["Abonnenten", (y.subs || 0).toLocaleString("de-CH"), "Ziel " + (y.goalSubs || 1000)], ["Aufrufe", (y.views || 0).toLocaleString("de-CH"), "+" + (y.viewsGained30 || 0).toLocaleString("de-CH") + " / 30 Tage"], ["Videos", String(y.videos || 0), "Stand " + (y.asOf || "")], ["Fortschritt", Math.round((y.subs || 0) / (y.goalSubs || 1000) * 100) + " %", "bis Monetarisierung"]]
    .forEach(([k, v, n]) => { const c = el("div", "stat"); c.append(el("div", "k", k), el("div", "v", v), el("div", "note", n)); top.appendChild(c) }); p.appendChild(top);
  const V = (S.vids && S.vids.videos) || []; V.slice().sort((a, b) => b.views - a.views).slice(0, 10).forEach(v => p.appendChild(el("div", "item", v.views.toLocaleString("de-CH") + " · " + v.title)));
  box.appendChild(p);
}
function rFin() {
  const box = $("v-finanzen"); box.textContent = ""; const fm = x => Number(x || 0).toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const A = S.arena; if (A) { const p = el("section", "panel"); p.appendChild(el("div", "ph")).appendChild(el("h2", null, "// Bot-Arena · Spielgeld"));
    const d = A.team_chf - (A.team_start_chf || 1000); p.appendChild(el("div", "big", fm(A.team_chf) + " CHF")); p.appendChild(el("div", "note", (d >= 0 ? "+" : "") + fm(d) + " CHF · Stand " + String(A.stand).replace("T", " ") + " UTC"));
    const t = el("table", "ar-tab"); (A.bots || []).filter(b => b.aktiv).sort((a, b) => b.rendite - a.rendite).forEach((b, i) => { const r = el("tr"); r.append(el("td", "n", String(i + 1)), el("td", null, b.name), el("td", "n " + (b.rendite >= 0 ? "up" : "dn"), (b.rendite >= 0 ? "+" : "") + b.rendite.toFixed(2) + " %"), el("td", null, (b.positionen || []).join(", ") || "Bargeld")); t.appendChild(r) });
    const w = el("div", "ar-wrap"); w.appendChild(t); p.appendChild(w); box.appendChild(p) }
  const B = S.bitpanda; if (B) { const p = el("section", "panel"); p.appendChild(el("div", "ph")).appendChild(el("h2", null, "// Bitpanda · " + B.stand.split("-").reverse().join(".")));
    p.appendChild(el("div", "big", fm(B.total_chf) + " CHF")); (B.positionen || []).filter(x => x.wert >= 1).forEach(x => p.appendChild(el("div", "item", x.name + " · " + fm(x.wert) + " CHF"))); box.appendChild(p) }
}
/* ---------- Alfred (online, eigener Anthropic-Schlüssel) ---------- */
let hist = [];
async function rAlfred() {
  const box = $("v-alfred"); if (box.dataset.ok) return; box.dataset.ok = 1;
  const p = el("section", "panel"); const ph = el("div", "ph"), eye = el("canvas", "eye"); eye.dataset.size = "38"; ph.append(eye, el("h2", null, "// Alfred")); p.appendChild(ph);
  const log = el("div", "log"); log.appendChild(el("div", "msg ai", "Zu Diensten, Sir. Ich kenne Ihren Stand von vor " + relativ(BUNDLE.stand) + "."));
  const f = el("form"), inp = el("input"), sb = el("button", "jarvis-btn", "Senden"); inp.placeholder = "Frage an Alfred"; sb.type = "submit"; f.append(inp, sb); p.append(log, f);
  const keyBox = el("div", "act"); p.appendChild(keyBox); box.appendChild(p);
  const zeigeKey = async () => { keyBox.textContent = ""; const k = await openLocal("anthropic"); if (k) { keyBox.appendChild(el("div", "note", "Anthropic-Schlüssel ist verschlüsselt auf diesem Gerät gespeichert.")); const x = el("button", "btn", "Schlüssel entfernen"); x.type = "button"; x.onclick = () => { LS.set("sec_anthropic", null); zeigeKey() }; keyBox.appendChild(x); return }
    keyBox.appendChild(el("div", "note", "Für Gespräche braucht Alfred Ihren Anthropic-Schlüssel (sk-ant-…). Er wird mit Ihrem Passwort verschlüsselt nur auf diesem Gerät gespeichert."));
    const ki = el("input"); ki.type = "password"; ki.placeholder = "sk-ant-…"; const kb = el("button", "btn", "Speichern"); kb.type = "button"; kb.onclick = async () => { if (!/^sk-ant-/.test(ki.value.trim())) return; await sealLocal("anthropic", ki.value.trim()); zeigeKey() }; keyBox.append(ki, kb) };
  zeigeKey();
  f.onsubmit = async e => { e.preventDefault(); const q = inp.value.trim(); if (!q) return; inp.value = "";
    log.appendChild(el("div", "msg me", q)); const a = el("div", "msg ai", "…"); log.appendChild(a);
    if (!navigator.onLine) { a.textContent = "Ich bin offline, Sir. Gespräche gehen nur mit Internet."; return }
    const key = await openLocal("anthropic"); if (!key) { a.textContent = "Bitte zuerst den Anthropic-Schlüssel unten speichern."; return }
    hist.push({ role: "user", content: q }); eyeBusy(true);
    try {
      const sys = ALFRED + " Du kannst hier nur lesen und beraten.\nJetzt: " + new Date().toLocaleString("de-CH") + "\n\n" + contextText();
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 600, system: sys, messages: hist.slice(-10) }) });
      const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || r.status);
      a.textContent = j.content[0].text; hist.push({ role: "assistant", content: a.textContent });
    } catch (err) { hist.pop(); a.textContent = "Verzeihung, Sir: " + String(err.message || err).slice(0, 120) } finally { eyeBusy(false); log.scrollTop = log.scrollHeight }
  };
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
$("sperren").onclick = () => location.reload();
initLock();
