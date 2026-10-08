"""Baut index.html aus src/ (CSS + Markup + JS in einer Datei)."""
import pathlib
S = pathlib.Path(__file__).parent.parent / "src"
fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Figtree:wght@400;500;600;700&display=swap">'
head = ('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<title>Krogstad</title><meta name="theme-color" content="#02070b"><link rel="manifest" href="manifest.webmanifest">'
        '<link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">' + fonts)
js = "\n".join((S / f).read_text(encoding="utf-8") for f in ["routine.js", "eye.js", "briefing.js", "main.js", "graph.js"])
html = head + (S / "style.css").read_text(encoding="utf-8") + (S / "extra.css").read_text(encoding="utf-8") + "</head><body>" + (S / "body.html").read_text(encoding="utf-8") + "<script>" + js + "</script></body></html>"
(S.parent / "index.html").write_text(html, encoding="utf-8")
print("index.html", len(html))
