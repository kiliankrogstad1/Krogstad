"""Baut die App (index.html) aus der Krogstad-Online-Version, damit beide gleich aussehen und gleich viel zeigen.
Aufruf: python3 tools/port.py <krogstad-online.html>
Ersetzt: Sperre (→ verschlüsseltes Datenpaket), claude.ai-Datenquellen (→ data.enc.json), Offline-Kopie/Passwort-Ändern (→ Alfred-Schlüssel)."""
import sys, re, pathlib

R = pathlib.Path(__file__).parent.parent
src = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")


def cut(s, a, b, neu=""):
    i = s.index(a); j = s.index(b, i)
    return s[:i] + neu + s[j:]


def rep(s, a, b, n=1):
    assert s.count(a) >= 1, a[:80]
    return s.replace(a, b) if n == 0 else s.replace(a, b, n)


style = src[src.index("<style>"):src.index("</style>") + 8]
body = src[src.index('<div class="lock"'):src.index("<script>")]
js = src[src.index("<script>") + 8:src.rindex("</script>")]

# ---------- Markup ----------
body = cut(body, '<div class="lock"', '<div class="wrap"',
           '<div class="lock" id="lock"><form id="lockForm" autocomplete="off"><canvas class="eye" id="eyeLock" data-size="104" style="margin:0 auto 4px" aria-hidden="true"></canvas>'
           '<h1>Alfred · Identifikation</h1><p id="lockTxt">Einen Moment, Sir …</p>'
           '<input type="text" class="pwmask" id="lockPw" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Passwort" aria-label="Passwort">'
           '<button class="jarvis-btn" type="submit" id="lockBtn"><i></i>Entsperren</button><div class="lmsg" id="lockMsg" role="status"></div></form></div>\n')
body = rep(body, '  </div>\n\n  <!-- HOME -->', '  </div>\n  <p class="note" id="stand" style="margin:0 0 8px">–</p>\n\n  <!-- HOME -->')
i = body.index('<section class="panel" aria-labelledby="h13">'); j = body.index("</section>", i) + 10
body = body[:i] + ('<section class="panel" aria-labelledby="h13">\n      <div class="ph"><h2 id="h13"><span>10</span> // Sicherheit, Klang & Alfred</h2><div class="meta">dieses Gerät</div></div>\n'
                   '      <div class="act" style="border-left-color:var(--cyan)" id="keyBox"></div>\n'
                   '      <p class="note">Sperre nach 5 min im Hintergrund oder 15 min ohne Bedienung. Falsches Passwort: 10 s · 30 s · 1 min · 5 min Wartezeit.</p>\n'
                   '      <div class="volbox" id="volSec"></div>\n      <p class="note" id="pendBox"></p>\n    </section>') + body[j:]
body = rep(body, 'Alfred schreibt auf Wunsch einen Antwort-Entwurf. Gesendet wird nie automatisch, nur gespeichert als Entwurf in Gmail.',
           'Stand vom letzten Abgleich (3× täglich). Alfred schreibt auf Wunsch einen Antwort-Entwurf zum Kopieren.')
body = rep(body, '<p class="note">Routine aus deiner Wochenvorlage', '<p class="note">App · Daten verschlüsselt, Abgleich 3× täglich · Routine aus deiner Wochenvorlage')
body = (R / "src" / "pwa_ui.html").read_text(encoding="utf-8") + body
body = rep(body, '<form id="jvForm">', '<div class="act" id="jvKey" hidden></div><form id="jvForm">')

# ---------- Script ----------
shim = (R / "src" / "pwa_shim.js").read_text(encoding="utf-8")
js = cut(js, "/* ---------- Sperre ---------- */", "const TZ=", shim + "\n")
js = re.sub(r'const getSample=async\(\)=>\{if\(S\.smp===undefined\)[^\n]*\n', "", js)
js = cut(js, "/* ---------- Data ---------- */", "/* ---------- Abwesenheit", "")
js = cut(js, "/* ---------- Sicherheit ---------- */", "/* ---------- Alfred Chat ---------- */", "")
js = rep(js, '(S.calLoaded?"Google Kalender · live":"Kalender lädt")', '"Kalender · "+standTxt()', 0)
js = rep(js, '(S.calLoaded?"live":"lädt")', 'standTxt()', 0)
js = rep(js, 'save.onclick=async()=>{if(!S.mcp)return;',
         'save.onclick=async()=>{if(!S.mcp){try{await navigator.clipboard.writeText(ta.value);st.textContent="Kopiert – in Gmail einfügen und selbst senden."}catch(_){st.textContent="Text markieren und kopieren."}return}')
js = rep(js, 'const save=el("button","jarvis-btn","Als Entwurf in Gmail speichern")', 'const save=el("button","jarvis-btn","Antwort kopieren")')
js = rep(js, 'if(!smp&&!log.dataset.na){log.dataset.na="1";log.appendChild(el("div","msg ai","Alfred ist in dieser Ansicht nicht verfügbar."))}',
         'keyBox(document.getElementById("jvKey"));if(!smp&&!log.dataset.na){log.dataset.na="1";log.appendChild(el("div","msg ai","Für Gespräche brauche ich Ihren Anthropic-Schlüssel, Sir – unten eintragen."))}')
js = rep(js, 'q=inp.value.trim();const smp=', 'q=inp.value.trim();{const kr=typeof KAudio!=="undefined"&&q&&KAudio.command(q);if(kr){inp.value="";log.appendChild(el("div","msg me",q));log.appendChild(el("div","msg ai",kr));log.scrollTop=log.scrollHeight;return}}const smp=')
js = rep(js, 'const smp=await getSample();if(!q||!smp)return;', 'const smp=await getSample();if(!q)return;if(!smp){keyBox(document.getElementById("jvKey"));return}')
js = rep(js, ':"Verzeihung, Sir, das hat nicht geklappt."}', ':err&&err.code==="offline"?"Ich bin offline, Sir. Gespräche gehen nur mit Internet.":"Verzeihung, Sir: "+String(err&&err.message||"Fehler").slice(0,120)}')
for bad in ("claude.use(\"mcp\")", "MYMAIL", "OFF_TPL", "krogChangePw"):
    assert bad not in js or bad == 'claude.use("mcp")', bad
js = rep(js, '["finanzen","Finanzen","offen","--violet"]', '["finanzen","Finanzen",S.bitpanda?Math.round(S.bitpanda.total_chf)+" CHF":"–","--violet"]')
js += "\n" + (R / "src" / "pwa_audio.js").read_text(encoding="utf-8")
js += "\n" + (R / "src" / "pwa_ui.js").read_text(encoding="utf-8")
js += '\nif("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});\n'

extra = """<style>
html,body{overscroll-behavior-y:none}
[hidden]{display:none!important}
.pwmask{-webkit-text-security:disc;text-security:disc}
.lock input{background:transparent;border:1px solid var(--line-hi);color:inherit;padding:10px 12px;font:inherit;font-size:16px}
#keyBox input,#jvKey input{background:transparent;border:1px solid var(--line-hi);color:inherit;padding:9px 10px;font-size:16px}
#jvKey{margin:0 0 10px}
.bar{background:rgba(2,7,11,.94);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);box-shadow:0 8px 18px -10px rgba(0,0,0,.8)}
.jv{background:var(--bg,#02070b);box-shadow:0 0 0 1px var(--line-hi),0 18px 60px rgba(0,0,0,.7)}
@media (max-width:600px){
 .bar{gap:8px;padding-block:8px}
 .ar-top .v{font-size:19px;white-space:nowrap}
 .stats .v{font-size:17px;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.2}
 .ar-top{grid-template-columns:repeat(2,minmax(0,1fr))}
 .ar-tab{font-size:12.5px}.ar-tab td,.ar-tab th{padding:7px 5px}
 .ar-tab td b{white-space:nowrap}
 .ar-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
}
/* Scrollbalken im Krogstad-Stil */
*{scrollbar-width:thin;scrollbar-color:rgba(95,225,214,.45) transparent}
::-webkit-scrollbar{width:6px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(95,225,214,.55),rgba(70,175,255,.35));border-radius:6px;box-shadow:0 0 6px rgba(95,225,214,.5)}
::-webkit-scrollbar-thumb:hover{background:var(--cyan)}
::-webkit-scrollbar-corner{background:transparent}
.nav,.daynav,.vfilter{scrollbar-width:none}.nav::-webkit-scrollbar,.daynav::-webkit-scrollbar,.vfilter::-webkit-scrollbar{display:none}
.ar-wrap{scrollbar-width:thin}
/* Start-Animation */
.splash{position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:radial-gradient(ellipse at center,rgba(95,225,214,.07),transparent 55%),var(--bg,#02070b);transition:opacity .6s ease,filter .6s ease;cursor:pointer}
.splash.out{opacity:0;filter:blur(6px);pointer-events:none}
.sp-eye{position:relative;width:132px;height:132px;border-radius:50%;overflow:hidden;filter:drop-shadow(0 0 0 transparent);transition:filter 1.2s ease}
.splash.open .sp-eye{filter:drop-shadow(0 0 22px rgba(95,225,214,.45))}
.sp-eye .lid{position:absolute;left:-10%;width:120%;height:52%;background:var(--bg,#02070b);transition:transform 1s cubic-bezier(.65,0,.25,1)}
.sp-eye .lid.top{top:0;border-radius:0 0 50% 50%/0 0 38% 38%;transform-origin:top;box-shadow:0 2px 0 rgba(95,225,214,.6)}
.sp-eye .lid.bot{bottom:0;border-radius:50% 50% 0 0/38% 38% 0 0;transform-origin:bottom;box-shadow:0 -2px 0 rgba(95,225,214,.6)}
.splash.open .lid.top{transform:translateY(-100%)}.splash.open .lid.bot{transform:translateY(100%)}
.sp-title{font-family:var(--font-display);font-size:30px;letter-spacing:.42em;color:var(--fg);margin-left:.42em;opacity:0;transform:translateY(8px);transition:all .8s ease;text-shadow:0 0 18px rgba(95,225,214,.35)}
.sp-by{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);opacity:0;transition:opacity .8s ease}
.sp-hello{min-height:1.4em;font-family:var(--font-mono);font-size:14px;letter-spacing:.08em;color:var(--cyan);margin-top:14px}
.splash.t1 .sp-title{opacity:1;transform:none;letter-spacing:.3em;margin-left:.3em}.splash.t2 .sp-by{opacity:1}
/* Kopfzeile Handy */
.mright{display:none}
.mmenu[hidden]{display:none!important}
@media (max-width:820px){
 .bar{flex-wrap:nowrap;justify-content:space-between;padding-block:10px;margin-inline:calc(50% - 50vw);padding-inline:calc(50vw - 50% + 2px);margin-top:calc(-1 * env(safe-area-inset-top,0px));padding-top:calc(10px + env(safe-area-inset-top,0px));border-radius:0}
 .bar .nav,.bar .clock,#jvOpen,#lockNow{display:none!important}
 .logo{font-size:0;gap:8px}.logo b{font-size:15px}
 .mright{display:flex;align-items:center;gap:10px}
 .mclock{display:flex;flex-direction:column;align-items:flex-end;line-height:1.05;font-family:var(--font-mono)}
 .mclock small{white-space:nowrap;font-size:9.5px;letter-spacing:.14em;color:var(--muted);text-transform:uppercase}
 .mclock b{font-family:var(--font-display);font-size:19px;color:var(--cyan);text-shadow:0 0 10px rgba(95,225,214,.45);font-weight:600}
}
.mbtn{width:42px;height:42px;border-radius:50%;border:1px solid var(--line-hi);background:rgba(95,225,214,.06);display:grid;place-items:center;padding:0;cursor:pointer}
.burger{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px}
.burger i{display:block;width:16px;height:1.5px;background:var(--cyan);transition:transform .25s ease,opacity .2s}
.burger.x i:nth-child(1){transform:translateY(5.5px) rotate(45deg)}.burger.x i:nth-child(2){opacity:0}.burger.x i:nth-child(3){transform:translateY(-5.5px) rotate(-45deg)}
/* Menü über den ganzen Bildschirm */
.mmenu{position:fixed;inset:0;z-index:70;display:flex;flex-direction:column;gap:14px;padding:calc(12px + env(safe-area-inset-top,0px)) 18px calc(18px + env(safe-area-inset-bottom,0px));overflow-y:auto;
 background:radial-gradient(ellipse at 50% 0%,rgba(95,225,214,.10),transparent 60%),var(--bg,#02070b);opacity:0;transform:scale(1.03);transition:opacity .25s ease,transform .25s ease}
.mmenu.on{opacity:1;transform:none}
.mhead{display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid var(--line)}
.mlogo{display:flex;align-items:center;gap:8px}.mlogo b{font-family:var(--font-display);letter-spacing:.16em;font-size:15px;color:var(--fg)}
.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;flex:1;align-content:start}
.mgrid a{display:flex;flex-direction:column;justify-content:space-between;gap:14px;min-height:84px;padding:14px;border:1px solid var(--line);color:var(--fg);text-decoration:none;font-family:var(--font-mono);font-size:13px;letter-spacing:.16em;text-transform:uppercase;background:rgba(95,225,214,.03);transition:border-color .2s,background .2s}
.mgrid a small{color:var(--muted);font-size:10.5px}
.mgrid a:active{background:rgba(95,225,214,.12)}
.mgrid a[aria-current=page]{border-color:var(--cyan);color:var(--cyan);box-shadow:inset 3px 0 0 var(--cyan),0 0 18px -8px var(--cyan)}
.mgrid a.malfred{border-color:var(--line-hi);color:var(--cyan)}
.mrow{display:flex;justify-content:flex-end}
.volbox{display:flex;flex-direction:column;gap:10px;padding:12px 0;border-top:1px solid var(--line)}
.vol{display:grid;grid-template-columns:110px 1fr 48px;align-items:center;gap:10px;font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.vol b{color:var(--cyan);font-weight:500;text-align:right}
.vol input{-webkit-appearance:none;appearance:none;height:3px;background:var(--line-hi);border-radius:3px;outline:none}
.vol input::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--bg,#02070b);border:2px solid var(--cyan);box-shadow:0 0 10px var(--cyan)}
.vol input::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--bg,#02070b);border:2px solid var(--cyan)}
/* Start: Alfred schläft, bis man antippt (nur wenn Ton an) */
.sp-wake{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);opacity:0;transition:opacity .6s ease;position:absolute;bottom:18%}
.splash.wait .sp-wake{opacity:1;animation:breathe 2.4s ease-in-out infinite}
.splash.wait .sp-eye{animation:breathe 2.4s ease-in-out infinite}
@keyframes breathe{0%,100%{opacity:.55}50%{opacity:1}}
</style>"""
fonts = src[src.index('<link rel="preconnect"'):src.index("<style>")]
head = ('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<title>Krogstad</title><meta name="theme-color" content="#02070b"><link rel="manifest" href="manifest.webmanifest">'
        '<link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">' + fonts)
html = head + style + extra + "</head><body>\n" + body + "<script>" + js + "</script></body></html>"
assert "kiliankrogstad1@" not in html
(R / "index.html").write_text(html, encoding="utf-8")
print("index.html", len(html))
