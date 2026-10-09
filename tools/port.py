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
body = body[:i] + ('<section class="panel" aria-labelledby="h13">\n      <div class="ph"><h2 id="h13"><span>10</span> // Sicherheit & Alfred</h2><div class="meta">dieses Gerät</div></div>\n'
                   '      <div class="act" style="border-left-color:var(--cyan)" id="keyBox"></div>\n'
                   '      <p class="note">Sperre nach 5 min im Hintergrund oder 15 min ohne Bedienung. Falsches Passwort: 10 s · 30 s · 1 min · 5 min Wartezeit.</p>\n'
                   '      <p class="note" id="pendBox"></p>\n    </section>') + body[j:]
body = rep(body, 'Alfred schreibt auf Wunsch einen Antwort-Entwurf. Gesendet wird nie automatisch, nur gespeichert als Entwurf in Gmail.',
           'Stand vom letzten Abgleich (3× täglich). Alfred schreibt auf Wunsch einen Antwort-Entwurf zum Kopieren.')
body = rep(body, '<p class="note">Routine aus deiner Wochenvorlage', '<p class="note">App · Daten verschlüsselt, Abgleich 3× täglich · Routine aus deiner Wochenvorlage')
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
js = rep(js, 'const smp=await getSample();if(!q||!smp)return;', 'const smp=await getSample();if(!q)return;if(!smp){keyBox(document.getElementById("jvKey"));return}')
js = rep(js, ':"Verzeihung, Sir, das hat nicht geklappt."}', ':err&&err.code==="offline"?"Ich bin offline, Sir. Gespräche gehen nur mit Internet.":"Verzeihung, Sir: "+String(err&&err.message||"Fehler").slice(0,120)}')
for bad in ("claude.use(\"mcp\")", "MYMAIL", "OFF_TPL", "krogChangePw"):
    assert bad not in js or bad == 'claude.use("mcp")', bad
js = rep(js, '["finanzen","Finanzen","offen","--violet"]', '["finanzen","Finanzen",S.bitpanda?Math.round(S.bitpanda.total_chf)+" CHF":"–","--violet"]')
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
</style>"""
fonts = src[src.index('<link rel="preconnect"'):src.index("<style>")]
head = ('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<title>Krogstad</title><meta name="theme-color" content="#02070b"><link rel="manifest" href="manifest.webmanifest">'
        '<link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">' + fonts)
html = head + style + extra + "</head><body>\n" + body + "<script>" + js + "</script></body></html>"
assert "kiliankrogstad1@" not in html
(R / "index.html").write_text(html, encoding="utf-8")
print("index.html", len(html))
