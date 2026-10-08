const TZ="Europe/Zurich", WD=["So","Mo","Di","Mi","Do","Fr","Sa"], WDL=["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
const MON=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const S={events:[],calLoaded:false,calError:null,sel:0,mOff:0,todos:[],tasks:[],goals:[],habits:null,yt:null,db:null,mails:null,mailError:null,mcp:null,smp:undefined,absent:{}};
const pad=n=>String(n).padStart(2,"0"), ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()), hm=d=>pad(d.getHours())+":"+pad(d.getMinutes());
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x}, at=(d,s)=>{const[h,m]=s.split(":").map(Number);const x=new Date(d);x.setHours(h,m,0,0);return x};
const sod=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
const evOn=day=>{const k=ymd(day);return S.events.filter(e=>e.start?.date?e.start.date===k:e.start?.dateTime?ymd(new Date(e.start.dateTime))===k:false)};
const isCourse=e=>/BM-Vorkurs/i.test(e.summary||"");
/* Schulferien BBZ Biel (Ferienplan 2024–2028) + Feiertage */
const FERIEN=[["2026-09-21","2026-10-11","Herbstferien"],["2026-12-21","2027-01-10","Winterferien"],["2027-04-05","2027-04-25","Frühlingsferien"],["2027-07-05","2027-08-15","Sommerferien"],["2027-09-27","2027-10-17","Herbstferien"],["2027-12-27","2028-01-09","Winterferien"]];
const SCHULFREI={"2027-03-26":"Karfreitag","2027-03-29":"Ostermontag","2027-05-06":"Auffahrt","2027-05-07":"Auffahrtsbrücke","2027-05-17":"Pfingstmontag"};
const SCHULKURZ={"2027-03-25":"16:00"};
/* Feiertage Kanton Solothurn (Arbeit) – plus übliche Ruhetage */
const FEIERTAG={"2026-11-01":"Allerheiligen","2026-12-25":"Weihnachten","2026-12-26":"Stephanstag","2027-01-01":"Neujahr","2027-01-02":"Berchtoldstag","2027-03-26":"Karfreitag","2027-03-29":"Ostermontag","2027-05-06":"Auffahrt","2027-05-17":"Pfingstmontag","2027-05-27":"Fronleichnam","2027-08-01":"Bundesfeiertag","2027-08-15":"Mariä Himmelfahrt","2027-11-01":"Allerheiligen","2027-12-25":"Weihnachten","2027-12-26":"Stephanstag","2028-01-01":"Neujahr","2028-01-02":"Berchtoldstag","2028-04-14":"Karfreitag","2028-04-17":"Ostermontag","2028-05-25":"Auffahrt","2028-06-05":"Pfingstmontag","2028-06-15":"Fronleichnam","2028-08-01":"Bundesfeiertag","2028-08-15":"Mariä Himmelfahrt","2028-11-01":"Allerheiligen"};
const HALBTAG={"2028-05-01":["12:00","1. Mai · ab Mittag frei"]};
/* Betriebsferien Bosch: Ferien beziehen */
const BETRIEBSFERIEN=[["2026-12-24","2027-01-01"],["2027-12-24","2028-01-01"]];
const ferien=day=>{const k=ymd(day);const f=FERIEN.find(([a,b])=>k>=a&&k<=b);return f?f[2]:(SCHULFREI[k]||null)};
const absentOn=day=>S.absent[ymd(day)]||null;
const isCancelled=e=>/^ABGESAGT/i.test(e.summary||"");
const pDate=k=>{const[y,m,d]=String(k).split("-").map(Number);return new Date(y,m-1,d)};

/* ---------- Routine ---------- */
function routine(day){const dow=day.getDay(),k=ymd(day),course=evOn(day).some(e=>isCourse(e)&&!isCancelled(e)),b=[];let wake,bed;
  const fer=ferien(day),abs=absentOn(day),schoolDay=dow===4&&!fer,fei=schoolDay?null:FEIERTAG[k],bf=!schoolDay&&BETRIEBSFERIEN.some(([a,z])=>k>=a&&k<=z),half=HALBTAG[k],work=[1,2,3,5].includes(dow)||(dow===4&&!!fer);
  if(fei&&dow>0&&dow<6){wake="07:00";bed="22:00";b.push({s:"09:00",t:"Feiertag · "+fei,sub:"frei (Solothurn)",c:"--green"})}
  else if(bf&&dow>0&&dow<6){wake="07:00";bed="22:00";b.push({s:"09:00",t:"Ferien · Betriebsferien Bosch",sub:"Ferientag bezogen",c:"--green"})}
  else if(work&&half){wake="06:00";bed="22:00";b.push({s:"07:00",e:half[0],t:"Arbeit Bosch",sub:half[1],c:"--blue"})}
  else if(work){wake=course?"06:30":"06:00";const ws=course?"07:30":"07:00",we=course?"16:30":"16:00";
    b.push({s:ws,e:"12:00",t:"Arbeit Bosch",sub:dow===4?fer+" · Arbeitstag statt Schule":"Gleitzeit · Start 06:00–09:00",c:"--blue"},{s:"12:00",e:"13:00",t:"Mittag",c:"--dim"},{s:"13:00",e:we,t:"Arbeit Bosch",c:"--blue"});
    if(dow===2)b.push({s:"16:15",e:"17:30",t:"Gym · Beine",sub:"Self-Gym Zuchwil",c:"--amber",gym:1});
    if(dow===5)b.push({s:"16:15",e:"17:30",t:"Gym · Rücken & Schultern",sub:"Self-Gym Zuchwil",c:"--amber",gym:1});
    bed=course?"22:30":"22:00";
  }else if(dow===4){wake="06:30";b.push({s:"07:29",t:"Zug ab Flumenthal",sub:"via Solothurn nach Biel",c:"--cyan"},{s:"08:30",e:SCHULKURZ[k]||"17:00",t:"Berufsschule",sub:"BBZ/CFP Biel"+(SCHULKURZ[k]?" · Unterrichtsende "+SCHULKURZ[k]:""),c:"--cyan"});bed=course?"22:30":"22:00"}
  else if(dow===6){wake="07:00";bed="23:00"}
  else{wake="07:00";bed="22:00";b.push({s:"10:00",e:"11:30",t:"Gym · Arme & Rest",sub:"Bizeps, Trizeps, Brust",c:"--amber",gym:1})}
  if(abs){for(const x of b)x.off=1;b.push({s:"08:00",t:(abs.reason||"Krank")+" · erholen",sub:abs.note||"Tag freigeräumt",c:"--red",sick:1})}
  b.unshift({s:wake,t:"Aufstehen",c:"--violet"});b.push({s:bed,t:"Ins Bett",c:"--violet",bed:1});return{b,wake,bed,course,fer,fei,abs,bf}}
function items(day){const r=routine(day);const it=r.b.map(x=>({start:at(day,x.s),end:x.e?at(day,x.e):null,title:x.t,sub:x.sub,c:x.c,kind:x.gym&&!x.off?"gym":"r",bed:x.bed,off:x.off,sick:x.sick}));
  for(const e of evOn(day)){const cx=isCancelled(e),pend=r.abs&&!cx&&!isCourse(e);if(e.start.date){it.push({start:sod(day),title:e.summary||"Termin",sub:"ganztägig",c:"--red",kind:"ev",allDay:1,off:cx,ev:e,pend});continue}
    it.push({start:new Date(e.start.dateTime),end:e.end?.dateTime?new Date(e.end.dateTime):null,title:e.summary||"Termin",sub:e.location||"",c:isCourse(e)?"--violet":"--red",kind:"ev",off:cx||(r.abs&&isCourse(e)),ev:e,pend})}
  for(const a of it){if(a.kind!=="ev"||a.allDay||!a.end||a.off)continue;for(const b of it){if(b.kind==="ev"||!b.end||b.off)continue;if(a.start<b.end&&a.end>b.start)b.conflict=a.title}}
  return it.sort((a,b)=>a.start-b.start)}
const sleepH=day=>(at(addDays(day,1),routine(addDays(day,1)).wake)-at(day,routine(day).bed))/36e5;
const fmtH=h=>(Math.round(h*10)/10).toString().replace(".",",")+" h";
function habitDefs(){const d=new Date().getDay();const gym=[0,2,5].includes(d),sick=absentOn(new Date());return[
  {id:"gym",t:sick?"Erholen · viel trinken":gym?"Gym-Einheit":"Bewegung / Spaziergang"},{id:"schlaf",t:"Rechtzeitig ins Bett"},{id:"protein",t:"Protein hitten"},{id:"projekt",t:"30 Min Projekt (Video / Crogstad)"}]}

