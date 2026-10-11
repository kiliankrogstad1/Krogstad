/* ================= Krogstad App (PWA) – Sperre, Datenpaket, Alfred-Anbindung =================
   Ersetzt in der Online-Version die claude.ai-Schnittstellen:
   - Daten kommen verschlüsselt (data.enc.json), entsperrt nur im Speicher mit Kilians Passwort.
   - Abhaken (To-dos, Ziele, Habits, Abwesenheit) wird auf diesem Gerät gespeichert.
   - Alfred spricht über den eigenen Anthropic-Schlüssel (verschlüsselt auf dem Gerät). */
let __unl;const UNLOCK=new Promise(r=>{__unl=r});
window.claude={use:async()=>null};
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const ub64=u=>{let s="";const a=new Uint8Array(u);for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));return btoa(s)};
const LS={get(k,d){try{const v=localStorage.getItem("kg_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("kg_"+k,JSON.stringify(v))}catch(e){}}};
let PW=null,BUNDLE=null;
async function kdfKey(pw,salt,iter){const km=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:iter,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function fetchJSON(url){const r=await fetch(url+"?t="+Date.now(),{cache:"no-store"}).catch(()=>null);
  if(!r||!r.ok){const c=await caches.match(url).catch(()=>null);if(!c)throw new Error("nicht erreichbar");return c.json()}return r.json()}
/* Schlüsseldatei: lokal geänderte Fassung (neues Passwort) gilt, bis die gleiche oder eine neuere im Repo liegt */
async function loadKeys(){const repo=await fetchJSON("keys.json"),loc=LS.get("keys_local",null);
  if(loc&&loc.pub&&repo.pub&&loc.pub.n===repo.pub.n&&(loc.geaendert||"")>(repo.geaendert||repo.erstellt||""))return loc;
  if(loc)LS.set("keys_local",null);return repo}
async function unlockData(pw){const keys=await loadKeys();const k=await kdfKey(pw,b64(keys.priv.salt),keys.priv.iter);let pk;
  try{pk=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64(keys.priv.iv)},k,b64(keys.priv.ct))}catch(e){throw new Error("PW")}
  const priv=await crypto.subtle.importKey("pkcs8",pk,{name:"RSA-OAEP",hash:"SHA-256"},false,["decrypt"]);const d=await fetchJSON("data.enc.json");
  const dk=await crypto.subtle.importKey("raw",await crypto.subtle.decrypt({name:"RSA-OAEP"},priv,b64(d.ek)),"AES-GCM",false,["decrypt"]);
  const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64(d.iv)},dk,b64(d.ct));
  const txt=d.gzip&&"DecompressionStream" in window?await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream("gzip"))).text():new TextDecoder().decode(plain);
  return JSON.parse(txt)}
async function sealLocal(name,value){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));const k=await kdfKey(PW,salt,200000);
  LS.set("sec_"+name,{salt:ub64(salt),iv:ub64(iv),ct:ub64(await crypto.subtle.encrypt({name:"AES-GCM",iv},k,new TextEncoder().encode(value)))})}
async function openLocal(name){const x=LS.get("sec_"+name,null);if(!x||!PW)return null;
  try{const k=await kdfKey(PW,b64(x.salt),200000);return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:b64(x.iv)},k,b64(x.ct)))}catch(e){return null}}
function relativ(iso){const m=(Date.now()-new Date(iso))/6e4;return m<1?"gerade eben":m<60?"vor "+Math.round(m)+" min":m<1440?"vor "+Math.round(m/60)+" h":"vor "+Math.round(m/1440)+" Tagen"}
function standTxt(){return BUNDLE?"Stand "+relativ(BUNDLE.stand)+(navigator.onLine?"":" · offline"):"lädt"}

/* ---------- Sperre ---------- */
(function lockInit(){const $=id=>document.getElementById(id);const lk=$("lock"),wrap=document.querySelector(".wrap"),f=$("lockForm"),pw=$("lockPw"),btn=$("lockBtn"),txt=$("lockTxt"),msg=$("lockMsg");
  const WAIT=[0,10e3,30e3,60e3,300e3];let opened=false,hiddenAt=0,last=Date.now(),tmr=null;
  const greet=()=>"Guten "+(new Date().getHours()<11?"Morgen":new Date().getHours()<18?"Tag":"Abend")+", Sir. Ihr Passwort bitte.";
  const tick=()=>{clearTimeout(tmr);const st=LS.get("lockst",{f:0,u:0}),r=Math.ceil((st.u-Date.now())/1000);if(r>0){msg.textContent="Bitte "+(r>=60?Math.ceil(r/60)+" min":r+" s")+" warten.";btn.disabled=true;tmr=setTimeout(tick,1000)}else{btn.disabled=false;if(/warten/.test(msg.textContent))msg.textContent=""}};
  const remember=()=>{try{sessionStorage.setItem("kg_s",JSON.stringify({p:PW,t:Date.now()}))}catch(e){}};
  const open=(data,p)=>{PW=p;BUNDLE=data;lk.hidden=true;wrap.hidden=false;pw.value="";msg.textContent="";last=Date.now();remember();loadBundle(data);if(!opened){opened=true;__unl()}route()};
  txt.textContent=greet();tick();setTimeout(()=>{if(!document.getElementById("splash"))pw.focus()},80);
  /* Neuladen (z. B. Wischen) innerhalb der Sitzung: nicht erneut fragen. Sitzung endet beim Schliessen der App. */
  try{const s=JSON.parse(sessionStorage.getItem("kg_s")||"null");if(s&&s.p&&Date.now()-s.t<15*60e3){window.__skipSplash=1;txt.textContent="Einen Moment, Sir …";eyeBusy(true);
    unlockData(s.p).then(d=>{eyeBusy(false);open(d,s.p)}).catch(()=>{eyeBusy(false);txt.textContent=greet();try{sessionStorage.removeItem("kg_s")}catch(e){}})}}catch(e){}
  f.onsubmit=async e=>{e.preventDefault();if(btn.disabled||!pw.value)return;msg.textContent="";const st=LS.get("lockst",{f:0,u:0});btn.disabled=true;eyeBusy(true);
    try{const d=await unlockData(pw.value);LS.set("lockst",{f:0,u:0});eyeBusy(false);eyeAnger(0);eyeHappy(1500);const p=pw.value;setTimeout(()=>{btn.disabled=false;open(d,p)},600)}
    catch(err){eyeBusy(false);btn.disabled=false;
      if(err.message==="PW"){st.f++;st.u=Date.now()+WAIT[Math.min(st.f,4)];LS.set("lockst",st);eyeAnger(Math.min(1,st.f/3));pw.value="";txt.textContent=(st.f===1?"Falsches Passwort.":st.f===2?"Wieder falsch, Sir.":"Sir. Ernsthaft?")+" ("+st.f+")";tick()}
      else msg.textContent="Daten nicht erreichbar ("+err.message+"). Einmal mit Internet öffnen, danach geht es auch offline."}};
  const relock=()=>{if(!lk.hidden)return;lk.hidden=false;wrap.hidden=true;const j=$("jv");if(j)j.hidden=true;PW=null;try{sessionStorage.removeItem("kg_s")}catch(e){}txt.textContent="Gesperrt. Ihr Passwort, Sir.";setTimeout(()=>pw.focus(),50)};
  window.lockApp=relock;
  document.addEventListener("visibilitychange",()=>{if(document.hidden)hiddenAt=Date.now();else if(hiddenAt&&Date.now()-hiddenAt>5*60e3)relock()});
  ["pointerdown","keydown","wheel","touchstart"].forEach(t=>addEventListener(t,()=>{last=Date.now();if(PW)remember()},{passive:true}));
  setInterval(()=>{if(lk.hidden&&Date.now()-last>15*60e3)relock()},30e3);
  $("lockNow").onclick=relock})();

/* ---------- Lokale Ablage statt Online-Datenbank ---------- */
function applyOne(c,id,o){const v={};for(const k in o)if(!k.startsWith("__"))v[k]=o[k];
  if(c==="todos"||c==="goals"){const x=(c==="todos"?S.todos:S.goals).find(t=>t.id===id);if(x)Object.assign(x,v)}
  else if(c==="habits"){if(id===ymd(new Date()))S.habits=v}
  else if(c==="absences"){if(o.__del)delete S.absent[id];else S.absent[id]=v}}
function ldbWrite(c,id,v,op){if(c==="briefings"){LS.set("brief_"+id,v);return}
  const ov=LS.get("ov",{}),k=c+"/"+id;ov[k]=op==="delete"?{__del:true}:op==="update"?Object.assign({},ov[k]&&!ov[k].__del?ov[k]:{},v):Object.assign({},v);ov[k].__at=Date.now();LS.set("ov",ov);
  applyOne(c,id,ov[k]);if(c==="todos")renderTodos();if(c==="goals")renderGoals();drawNexusData();renderPending()}
const LDB={collection(c){return{doc(id){return{
  async get(){if(c==="briefings"){const t=LS.get("brief_"+id,null)||(S.briefings||{})[id];return{exists:!!t,data:()=>(typeof t==="string"?{text:t}:t)}}return{exists:false,data:()=>null}},
  set:async v=>ldbWrite(c,id,v,"set"),update:async v=>ldbWrite(c,id,v,"update"),delete:async()=>ldbWrite(c,id,null,"delete")}}}}};
function applyLocal(){const ov=LS.get("ov",{}),cut=Date.now()-21*864e5;for(const k in ov){if((ov[k].__at||0)<cut){delete ov[k];continue}const i=k.indexOf("/");applyOne(k.slice(0,i),k.slice(i+1),ov[k])}LS.set("ov",ov)}
function renderPending(){const b=document.getElementById("pendBox");if(!b)return;const n=Object.keys(LS.get("ov",{})).length;
  b.textContent=n?n+" Änderung"+(n>1?"en":"")+" (Abhaken, Abwesenheit) liegen auf diesem Gerät. In Krogstad-Online kommen sie noch nicht automatisch an.":"Keine lokalen Änderungen."}

/* ---------- Datenpaket laden ---------- */
function loadBundle(D){S.events=(D.events||[]).filter(x=>x.status!=="cancelled");S.calLoaded=true;S.calError=null;
  S.todos=(D.todos||[]).map(x=>Object.assign({},x));S.goals=(D.goals||[]).map(x=>Object.assign({},x));
  S.tasks=(D.tasks||[]).slice().sort((a,b)=>String(b.updated||"").localeCompare(String(a.updated||""))).slice(0,30);
  S.mails=(D.mails||[]).map(m=>({tid:m.tid||"",mid:m.mid||"",subject:m.subject||"(ohne Betreff)",sender:m.sender||m.from||"",snippet:m.snippet||"",date:m.date||null,url:m.url||"https://mail.google.com/mail/u/0/#inbox",count:m.count||1}));S.mailError=null;S.cmails=(D.cmails||[]).map(m=>({tid:m.tid||"",mid:m.mid||"",subject:m.subject||"(ohne Betreff)",sender:m.sender||"",snippet:m.snippet||"",date:m.date||null,url:m.url||"https://mail.google.com/mail/u/0/#inbox",count:m.count||1}));
  S.yt=D.youtube||null;S.vids=D.videos||null;S.arena=D.arena||null;S.bitpanda=D.bitpanda||null;S.absent=Object.assign({},D.absences||{});
  S.habits=D.habits_heute_datum===ymd(new Date())?Object.assign({},D.habits||{}):{};
  S.briefings=D.briefings||(D.briefing?{[D.briefing.datum+"-x"]:D.briefing.text}:{});
  applyLocal();S.db=LDB;S.dataReady=true;
  renderAll();renderVids();renderBitpanda();renderArena();renderMails();renderPending();keyBox(document.getElementById("keyBox"));pwBox(document.getElementById("pwBox"));
  const st=document.getElementById("stand");if(st)st.textContent="Daten "+standTxt().replace("Stand ","");runBriefing(false);if(typeof GG!=="undefined"){GG.status();GG.box(document.getElementById("gBox"));if(GG.ok())GG.refresh(true)}}

/* ---------- Alfred über den eigenen Anthropic-Schlüssel ---------- */
const getSample=async()=>{const key=await openLocal("anthropic");if(!key)return null;
  /* Alfred über die Anthropic-API, mit Werkzeugen (Termin eintragen, Abwesenheit …) */
  const smp=async(p,o={})=>{if(!navigator.onLine)throw{code:"offline"};const conv=(typeof p==="string"?[{role:"user",content:p}]:p).slice();const tools=o.tools||[];
    const T=tools.map(t=>({name:t.name,description:t.description||"",input_schema:t.inputSchema||{type:"object",properties:{}}}));let all="";
    for(let k=0;k<6;k++){const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify(Object.assign({model:"claude-haiku-4-5-20251001",max_tokens:900,messages:conv},T.length?{tools:T}:{}))});
      const j=await r.json().catch(()=>({}));if(!r.ok)throw{code:r.status===429?"rate_limited":"api",message:(j.error&&j.error.message)||String(r.status)};
      const txt=(j.content||[]).filter(c=>c.type==="text").map(c=>c.text).join("");if(txt){all+=(all?"\n":"")+txt;if(o.onText)o.onText({text:all})}
      const uses=(j.content||[]).filter(c=>c.type==="tool_use");if(j.stop_reason!=="tool_use"||!uses.length)return{text:all};
      conv.push({role:"assistant",content:j.content});const res=[];
      for(const u of uses){const tl=tools.find(t=>t.name===u.name);let out;try{out=tl?await tl.execute(u.input||{}):{fehler:"unbekanntes Werkzeug"}}catch(e){out={fehler:String(e&&e.message||e)}}
        res.push({type:"tool_result",tool_use_id:u.id,content:JSON.stringify(out===undefined?{ok:true}:out)})}
      conv.push({role:"user",content:res})}
    return{text:all}};
  smp.limits=async()=>({tools:true});return smp};
async function keyBox(box){if(!box)return;box.textContent="";const k=PW?await openLocal("anthropic"):null;
  if(k){box.appendChild(el("div","ast","Anthropic-Schlüssel ist verschlüsselt auf diesem Gerät gespeichert. Alfred kann sprechen."));const x=el("button","btn","Schlüssel entfernen");x.type="button";
    x.onclick=()=>{LS.set("sec_anthropic",null);keyBox(box);keyBox(document.getElementById("jvKey"))};box.appendChild(x);if(box.id==="jvKey")box.hidden=true;return}
  if(box.id==="jvKey")box.hidden=false;
  box.appendChild(el("div","ast","Für Gespräche braucht Alfred Ihren Anthropic-Schlüssel (sk-ant-…). Er wird mit Ihrem Passwort verschlüsselt nur auf diesem Gerät gespeichert."));
  const ki=el("input");ki.type="text";ki.className="pwmask";ki.autocomplete="off";ki.placeholder="sk-ant-…";ki.setAttribute("aria-label","Anthropic-Schlüssel");
  const kb=el("button","btn","Speichern");kb.type="button";kb.onclick=async()=>{if(!/^sk-ant-/.test(ki.value.trim())){ki.focus();return}await sealLocal("anthropic",ki.value.trim());eyeHappy(1200);keyBox(document.getElementById("keyBox"));keyBox(document.getElementById("jvKey"))};
  box.append(ki,kb)}

/* ---------- Passwort ändern – passiert nur auf dem Gerät, Passwörter gehen nie an Alfred/Anthropic ---------- */
const REPO="kiliankrogstad1/Krogstad";
async function ghUpload(tok,nk){const u="https://api.github.com/repos/"+REPO+"/contents/keys.json",h={Authorization:"Bearer "+tok,Accept:"application/vnd.github+json"};
  const cur=await fetch(u+"?t="+Date.now(),{headers:h,cache:"no-store"});if(!cur.ok)throw new Error("GitHub "+cur.status);const sha=(await cur.json()).sha;
  const r=await fetch(u,{method:"PUT",headers:h,body:JSON.stringify({message:"App: Passwort geändert",content:btoa(JSON.stringify(nk)),sha})});if(!r.ok)throw new Error("GitHub "+r.status)}
async function changePassword(oldPw,newPw){const keys=await loadKeys();let pk;
  try{pk=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64(keys.priv.iv)},await kdfKey(oldPw,b64(keys.priv.salt),keys.priv.iter),b64(keys.priv.ct))}catch(e){throw new Error("PW")}
  const iter=Math.max(400000,keys.priv.iter||0),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},await kdfKey(newPw,salt,iter),pk);
  const nk=Object.assign({},keys,{priv:Object.assign({},keys.priv,{salt:ub64(salt),iv:ub64(iv),ct:ub64(ct),iter}),geaendert:new Date().toISOString()});
  /* auf dem Gerät gespeicherte Schlüssel (Anthropic, GitHub) mit dem neuen Passwort neu verschlüsseln */
  const names=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith("kg_sec_"))names.push(k.slice(7))}
  const vals={};PW=oldPw;for(const n of names){const v=await openLocal(n);if(v!=null)vals[n]=v}
  PW=newPw;for(const n in vals)await sealLocal(n,vals[n]);
  LS.set("keys_local",nk);try{sessionStorage.setItem("kg_s",JSON.stringify({p:newPw,t:Date.now()}))}catch(e){}
  let up=null;if(vals.github)up=await ghUpload(vals.github,nk).then(()=>true).catch(e=>String(e.message||e));
  return{keys:nk,up}}
function pwCard(){const d=el("div","act");d.style.borderLeftColor="var(--violet)";pwBox(d,true);return d}
async function pwBox(box,chat){if(!box)return;box.textContent="";
  const inp=(ph)=>{const i=el("input");i.type="text";i.className="pwmask";i.autocomplete="off";i.autocapitalize="off";i.spellcheck=false;i.placeholder=ph;i.setAttribute("aria-label",ph);i.style.cssText="display:block;width:100%;margin:6px 0";return i};
  box.appendChild(el("div","ast","Passwort ändern. Alfred sieht Ihre Passwörter nicht, Sir – alles bleibt auf diesem Gerät."));
  const a=inp("Jetziges Passwort"),n1=inp("Neues Passwort (mind. 10 Zeichen)"),n2=inp("Neues Passwort wiederholen"),go=el("button","jarvis-btn","Passwort ändern"),msg=el("div","ast","");
  go.type="button";go.innerHTML="<i></i>Passwort ändern";msg.setAttribute("role","status");box.append(a,n1,n2,go,msg);
  go.onclick=async()=>{const say=t=>{msg.textContent=t};
    if(!a.value||!n1.value){say("Bitte alle Felder ausfüllen.");return}
    if(n1.value.length<10){say("Mindestens 10 Zeichen, Sir. Tipp: 4–5 zufällige Wörter.");return}
    if(n1.value!==n2.value){say("Die neuen Passwörter stimmen nicht überein.");n2.value="";n2.focus();return}
    if(n1.value===a.value){say("Das ist dasselbe Passwort, Sir.");return}
    go.disabled=true;eyeBusy(true);say("Einen Moment, Sir …");
    try{const r=await changePassword(a.value,n1.value);eyeBusy(false);eyeHappy(1800);a.value=n1.value=n2.value="";box.textContent="";
      box.appendChild(el("div","ast",r.up===true?"Erledigt, Sir. Das neue Passwort gilt ab sofort – auf allen Geräten (in ca. 10 Minuten).":
        "Erledigt, Sir. Das neue Passwort gilt auf diesem Gerät."+(r.up?" Hochladen fehlgeschlagen ("+r.up+").":"")+" Auf anderen Geräten gilt das alte, bis die neue Schlüsseldatei im Repo liegt: hier herunterladen und Claude schicken – oder unten GitHub verbinden, dann geht es automatisch."));
      if(r.up!==true){const dl=el("button","btn","Schlüsseldatei herunterladen");dl.type="button";
        dl.onclick=()=>{const b=new Blob([JSON.stringify(r.keys)],{type:"application/json"}),u=URL.createObjectURL(b),l=document.createElement("a");l.href=u;l.download="keys.json";l.click();setTimeout(()=>URL.revokeObjectURL(u),2000)};box.appendChild(dl)}
      box.appendChild(el("p","note","Neu in Proton Pass speichern. Gespeicherte Alfred-Schlüssel auf anderen Geräten dort einmal neu eintragen."));if(r.up!==true)ghBox(box)}
    catch(e){eyeBusy(false);go.disabled=false;if(e.message==="PW"){eyeAnger(.7);setTimeout(()=>eyeAnger(0),2500);a.value="";a.focus();say("Das jetzige Passwort stimmt nicht, Sir.")}else say("Fehler: "+String(e.message||e).slice(0,120))}};
  if(!chat)ghBox(box)}
async function ghBox(box){const w=el("div");w.style.marginTop="10px";box.appendChild(w);const t=PW?await openLocal("github"):null;
  if(t){w.appendChild(el("p","note","GitHub verbunden: Passwort-Änderungen gehen automatisch auf alle Geräte."));const x=el("button","btn","GitHub trennen");x.type="button";x.onclick=()=>{LS.set("sec_github",null);w.remove();ghBox(box)};w.appendChild(x);return}
  w.appendChild(el("p","note","Optional: GitHub-Token (fine-grained, nur Repo Krogstad, Contents: Read and write). Dann gilt ein neues Passwort sofort auf allen Geräten."));
  const ti=el("input");ti.type="text";ti.className="pwmask";ti.autocomplete="off";ti.placeholder="github_pat_…";ti.style.cssText="display:block;width:100%;margin:6px 0";
  const s=el("button","btn","Token speichern");s.type="button";s.onclick=async()=>{const v=ti.value.trim();if(!/^(github_pat_|ghp_)/.test(v)){ti.focus();return}await sealLocal("github",v);eyeHappy(1000);w.remove();ghBox(box)};w.append(ti,s)}
