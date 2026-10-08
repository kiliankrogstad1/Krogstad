"""Baut rohdaten.json aus einem Datenordner (vom Abgleich-Job befüllt):
  todos/*.json goals/*.json tasks/*.json habits/<JJJJ-MM-TT>.json absences/*.json youtube/latest.json youtube/videos.json
  briefings/*.json  calendar.json (list_events-Antwort)  gmail.json (search_threads-Antwort)  arena.json  bitpanda.json
Aufruf: python3 tools/assemble.py <ordner> rohdaten.json"""
import sys, os, json, glob, datetime as dt

def lade(p, d=None):
    try: return json.load(open(p, encoding="utf-8"))
    except Exception: return d

def sammlung(ordner, name):
    out = []
    for f in sorted(glob.glob(os.path.join(ordner, name, "*.json"))):
        x = lade(f, {}) or {}; x.setdefault("id", os.path.basename(f)[:-5]); out.append(x)
    return out

def main(ordner, ziel):
    heute = dt.datetime.now(dt.timezone(dt.timedelta(hours=2))).date().isoformat()
    cal = lade(os.path.join(ordner, "calendar.json"), {}) or {}
    events = [e for e in cal.get("events", []) if e.get("status") != "cancelled"]
    events = [{k: e.get(k) for k in ("id", "summary", "start", "end", "location")} for e in events]
    gm = lade(os.path.join(ordner, "gmail.json"), {}) or {}
    mails = []
    for t in gm.get("threads", [])[:20]:
        m = (t.get("messages") or [{}])[0]
        mails.append(dict(subject=m.get("subject", ""), from_=m.get("sender", ""), date=(m.get("date") or "")[:16], snippet=(m.get("snippet") or "")[:140]))
    for m in mails: m["from"] = m.pop("from_")
    habits = lade(os.path.join(ordner, "habits", heute + ".json"), {}) or {}
    br = sorted(glob.glob(os.path.join(ordner, "briefings", heute + "-*.json")))
    briefing = None
    if br:
        b = lade(br[-1], {}) or {}; briefing = dict(datum=heute, text=b.get("text", ""))
    absences = {os.path.basename(f)[:-5]: lade(f, {}) for f in glob.glob(os.path.join(ordner, "absences", "*.json"))}
    raw = dict(stand=dt.datetime.now(dt.timezone.utc).isoformat()[:16] + "Z", events=events, mails=mails,
               todos=sammlung(ordner, "todos"), goals=sammlung(ordner, "goals"), tasks=sammlung(ordner, "tasks"),
               habits={k: v for k, v in habits.items() if isinstance(v, bool)}, habits_heute_datum=heute, absences=absences, briefing=briefing,
               youtube=lade(os.path.join(ordner, "youtube", "latest.json")), videos=lade(os.path.join(ordner, "youtube", "videos.json")),
               arena=lade(os.path.join(ordner, "arena.json")), bitpanda=lade(os.path.join(ordner, "bitpanda.json")))
    json.dump(raw, open(ziel, "w", encoding="utf-8"), ensure_ascii=False)
    print("rohdaten:", len(events), "Termine,", len(mails), "Mails,", len(raw["todos"]), "To-dos")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
