function slotInfo(now){const h=now.getHours();const slot=h<11?"morgen":h<14?"mittag":h<18?"nachmittag":"abend";
  const greet={morgen:"Guten Morgen, Sir.",mittag:"Guten Mittag, Sir.",nachmittag:"Guten Nachmittag, Sir.",abend:"Guten Abend, Sir."}[slot];
  const kinds=[];if(now.getMonth()===0&&now.getDate()===1)kinds.push("jahr");if(now.getDate()===1)kinds.push("monat");if(now.getDay()===1&&slot==="morgen")kinds.push("woche");
  return{slot,greet,kinds,key:ymd(now)+"-"+slot}}
function localBriefing(now){const {slot,greet,kinds}=slotInfo(now);const day=sod(now);const it=items(day);const lines=[greet];
  if(kinds.includes("jahr"))lines.push("Ein gutes neues Jahr "+now.getFullYear()+", Sir. Ein neues Kapitel für Crogstad und den Kanal.");
  if(kinds.includes("monat")){const n=S.events.filter(e=>{const s=new Date(e.start.dateTime||e.start.date);return s.getMonth()===now.getMonth()}).length;lines.push("Willkommen im "+MON[now.getMonth()]+". "+n+" Termine sind für diesen Monat eingetragen.")}
  if(kinds.includes("woche")){let ev=0,cr=0,gym=0;for(let i=0;i<7;i++){const d=addDays(day,i);ev+=evOn(d).filter(e=>!isCourse(e)).length;if(evOn(d).some(isCourse))cr++;if(items(d).some(x=>x.kind==="gym"))gym++}
    lines.push("Ihre Woche: "+ev+" Termine, "+cr+" Abende Vorkurs, "+gym+" Gym-Einheiten geplant.")}
  const ev=it.filter(x=>x.kind==="ev"),up=it.filter(x=>x.start>now&&!x.allDay&&x.kind!=="r"||(x.start>now&&x.title.startsWith("Arbeit")));
  const open=S.todos.filter(t=>!t.done),hi=open.filter(t=>t.prio==="hoch");
  if(slot!=="abend"){
    lines.push(ev.length?"Heute "+ev.length+" Termin"+(ev.length>1?"e":"")+": "+ev.map(x=>(x.allDay?"":hm(x.start)+" ")+x.title).join(", ")+".":"Heute keine Termine im Kalender.");
    const gym=it.find(x=>x.kind==="gym");if(gym)lines.push(gym.title+" um "+hm(gym.start)+" ist eingeplant.");
    if(hi.length)lines.push("Mit hoher Priorität offen: "+hi.map(t=>t.title).join(", ")+".");
    if(S.mails&&S.mails.length)lines.push(S.mails.length+" ungelesene Mails warten im Posteingang.");
    lines.push("Zu Bett um "+routine(day).bed+", dann sind es "+fmtH(sleepH(day))+" Schlaf.");
  }else{
    const today=ymd(now),doneT=S.todos.filter(t=>t.done&&t.doneAt===today),defs=habitDefs(),h=S.habits||{},hd=defs.filter(d=>h[d.id]);
    lines.push(doneT.length?"Heute erledigt: "+doneT.map(t=>t.title).join(", ")+".":"Heute wurde keine Aufgabe abgehakt.");
    lines.push("Habits: "+hd.length+" von "+defs.length+(hd.length<defs.length?" – offen: "+defs.filter(d=>!h[d.id]).map(d=>d.t).join(", "):" – vollständig, ausgezeichnet")+".");
    if(open.length)lines.push("Noch offen: "+open.slice(0,4).map(t=>t.title).join(", ")+(open.length>4?" und weitere":"")+".");
    const tm=items(addDays(day,1)).filter(x=>x.kind==="ev");if(tm.length)lines.push("Morgen: "+tm.map(x=>(x.allDay?"":hm(x.start)+" ")+x.title).join(", ")+".");
    lines.push("Ich wünsche Ihnen einen schönen Abend, Sir.")}
  return lines.join("\n")}
function contextText(){const base=sod(new Date());const days=[0,1,2,3,4,5,6].map(i=>{const d=addDays(base,i);return WDL[d.getDay()]+" "+ymd(d)+": "+(routine(d).fer?"["+routine(d).fer+"] ":"")+(absentOn(d)?"[ABWESEND: "+absentOn(d).reason+"] ":"")+items(d).map(x=>(x.allDay?"":hm(x.start)+" ")+x.title+(x.off?" (entfällt)":"")).join(", ")}).join("\n");
  const today=ymd(new Date());
  return "WOCHE:\n"+days+"\n\nTO-DOS: "+S.todos.map(t=>t.title+" ["+(t.prio||"mittel")+(t.done?", erledigt"+(t.doneAt===today?" heute":""):"")+"]").join("; ")+"\nZIELE: "+S.goals.map(g=>g.title+(g.done?" (erledigt)":"")).join("; ")+
  "\nHABITS HEUTE: "+habitDefs().map(d=>d.t+((S.habits||{})[d.id]?" ✓":" offen")).join("; ")+"\nCLAUDE-AUFGABEN: "+S.tasks.map(t=>t.title+" ("+t.status+")").join("; ")+
  (S.mails?"\nUNGELESENE MAILS: "+S.mails.length+" – "+S.mails.slice(0,5).map(m=>m.subject).join("; "):"")+
  (S.bitpanda?"\nBITPANDA-DEPOT (Stand "+S.bitpanda.stand+"): "+S.bitpanda.total_chf+" CHF – "+(S.bitpanda.positionen||[]).filter(p=>p.wert>=1).map(p=>p.name+" "+p.wert).join(", "):"")+(S.arena?"\nBOT-ARENA (Spielgeld): Team "+S.arena.team_chf+" CHF (Start "+S.arena.team_start_chf+"), Bots: "+(S.arena.bots||[]).filter(b=>b.aktiv).map(b=>b.name+" "+b.rendite+"%").join(", "):"")+(S.yt?"\nYOUTUBE: "+S.yt.subs+" Abos, "+S.yt.views+" Aufrufe, Ziel "+(S.yt.goalSubs||1000)+" Abos bis Januar 2027":"")}
const ALFRED="Du bist Alfred, der persönliche Butler-Assistent von Kilian Krogstad (Lehrling Mediamatiker bei Bosch Zuchwil, Ruder-Trainer, YouTube-Kanal MrKrogi über Hearts of Iron IV, Gründer von Crogstad). Sprich ihn mit 'Sir' und 'Sie' an, ruhig, loyal, mit trockenem Humor, knapp. Deutsch, Schweizer Schreibweise ohne ß. Erfinde keine Fakten, nutze nur die Daten unten.";
