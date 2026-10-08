/* ---------- Core: Graph wie Obsidian (aus Krogstad-Online übernommen) ---------- */
let CUR="";
const CORE=(()=>{
const G={nodes:new Map(),links:[],score:0,cam:{x:0,y:0,k:1},tgt:{x:0,y:0,k:1},hover:null,drag:null,pan:null,pointers:new Map(),pinch:null,moved:false,alpha:1};
const cv=document.getElementById("nexus"),cx=cv.getContext("2d");const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const short=(s,n)=>{s=String(s||"");return s.length>n?s.slice(0,n-1)+"…":s};
function addNode(map,id,o){const old=G.nodes.get(id);const near=o.near?map.get(o.near):null;const bx=near?near.x:0,by=near?near.y:0,sp=near?40:160;const n=Object.assign({id,x:old?old.x:bx+(Math.random()-.5)*sp,y:old?old.y:by+(Math.random()-.5)*sp,vx:old?old.vx:0,vy:old?old.vy:0,fixed:old?old.fixed:false},o);map.set(id,n);return n}
function drawNexusData(){if(!S.habits)S.habits={};const day=sod(new Date());const defs=habitDefs(),h=S.habits||{};const hd=defs.filter(d=>h[d.id]).length;
  const gd=S.goals.filter(g=>g.done).length,open=S.todos.filter(t=>!t.done).length,ev=evOn(day).length;
  const parts=[hd/defs.length,S.goals.length?gd/S.goals.length:0,S.todos.length?1-open/S.todos.length:0];G.score=Math.round(parts.reduce((a,b)=>a+b,0)/parts.length*100);
  const M=new Map(),L=[];const link=(a,b,w)=>{if(M.has(a)&&M.has(b))L.push({a,b,w:w||1})};
  const core=addNode(M,"core",{type:"core",label:"Kilian",c:"--cyan",r:30});core.x=G.nodes.get("core")?G.nodes.get("core").x:0;core.y=G.nodes.get("core")?G.nodes.get("core").y:0;
  const hubs=[["heute","Heute",ev+" Termine","--red"],["todos","To-dos",open+" offen","--amber"],["woche","Kalender","30 Tage","--violet"],["mails","Nachrichten",S.mails?S.mails.length+" Mails":"Gmail","--cyan"],
    ["ziele","Ziele",gd+"/"+S.goals.length+" · "+hd+"/"+defs.length+" Habits","--green"],["youtube","YouTube",(S.yt?S.yt.subs:0)+" Abos","--red"],["heute#training","Training","Rudern · Gym","--blue"],["finanzen","Finanzen",S.bitpanda?Math.round(S.bitpanda.total_chf)+" CHF":"–","--violet"]];
  hubs.forEach(([v,l,s,c],i)=>{const n=addNode(M,"hub:"+v,{type:"hub",label:l,sub:s,c,view:v,r:11});if(!G.nodes.has("hub:"+v)){const a=-Math.PI/2+i/hubs.length*Math.PI*2;n.x=Math.cos(a)*140;n.y=Math.sin(a)*120}link("core","hub:"+v,1)});
  // Heute: Routine-Blöcke + Termine
  for(const x of items(day)){if(x.title==="Mittag")continue;const id="day:"+x.title+hm(x.start);addNode(M,id,{type:"leaf",label:(x.allDay?"":hm(x.start)+" ")+x.title,c:x.c,near:"hub:heute",view:"heute",r:4});link("hub:heute",id);
    if(x.kind==="gym")link("hub:heute#training",id,.5);if(/Vorkurs/.test(x.title))link("hub:woche",id,.5)}
  // Kalender: nächste Termine
  const now=new Date(),lim=addDays(sod(now),30);
  S.events.filter(e=>{const s=new Date(e.start.dateTime||e.start.date);return s>addDays(sod(now),1)&&s<lim}).slice(0,10).forEach(e=>{const s=new Date(e.start.dateTime||e.start.date);const id="ev:"+(e.id||e.summary+s);
    addNode(M,id,{type:"leaf",label:WD[s.getDay()]+" "+s.getDate()+"."+(s.getMonth()+1)+". "+short(e.summary,26),c:isCourse(e)?"--violet":"--red",near:"hub:woche",view:"woche",r:4});link("hub:woche",id)});
  // To-dos
  for(const t of S.todos){const id="todo:"+t.id;addNode(M,id,{type:"leaf",label:short(t.title,34),c:t.prio==="hoch"?"--amber":t.prio==="niedrig"?"--blue":"--green",near:"hub:todos",view:"todos",r:t.done?3:5,done:!!t.done});link("hub:todos",id);
    if(/video|youtube|meme/i.test(t.title))link("hub:youtube",id,.4);if(/crogstad|infomaniak/i.test(t.title))link("hub:finanzen",id,.2);if(/geburtstag/i.test(t.title))link("hub:woche",id,.3)}
  // Ziele + Habits + Claude-Aufgaben
  for(const g of S.goals){const id="goal:"+g.id;addNode(M,id,{type:"leaf",label:short(g.title,30),c:"--green",near:"hub:ziele",view:"ziele",r:5,done:!!g.done});link("hub:ziele",id);if(/gym/i.test(g.title))link("hub:heute#training",id,.5)}
  for(const d of defs){const id="habit:"+d.id;addNode(M,id,{type:"leaf",label:d.t,c:"--cyan",near:"hub:ziele",view:"ziele",r:3.5,done:!!h[d.id]});link("hub:ziele",id);if(d.id==="gym")link("hub:heute#training",id,.4)}
  for(const t of S.tasks.slice(0,6)){const id="task:"+t.id;addNode(M,id,{type:"leaf",label:"Claude: "+short(t.title,28),c:"--cyan",near:"hub:ziele",view:"ziele",r:3.5,done:t.status==="fertig"});link("hub:ziele",id,.6);link("core",id,.15)}
  // Mails
  (S.mails||[]).slice(0,8).forEach(m=>{const id="mail:"+(m.tid||m.subject+m.date);addNode(M,id,{type:"leaf",label:short((m.from||m.sender||"").replace(/<.*>/,"").trim(),18)+": "+short(m.subject,24),c:"--cyan",near:"hub:mails",view:"mails",r:3.5});link("hub:mails",id)});
  // YouTube
  if(S.yt){[["yt:subs",S.yt.subs+" Abonnenten"],["yt:views",(S.yt.views||0).toLocaleString("de-CH")+" Aufrufe"],["yt:goal","Ziel "+(S.yt.goalSubs||1000)+" Abos"]].forEach(([id,l])=>{addNode(M,id,{type:"leaf",label:l,c:"--red",near:"hub:youtube",view:"youtube",r:4});link("hub:youtube",id)})}
  addNode(M,"fin:konto",{type:"leaf",label:S.bitpanda?"Bitpanda "+Math.round(S.bitpanda.total_chf)+" CHF":"Bitpanda (kein Auszug)",c:"--violet",near:"hub:finanzen",view:"finanzen",r:S.bitpanda?5:3});link("hub:finanzen","fin:konto");
  if(S.arena){const A=S.arena,p=((A.team_chf||0)/(A.team_start_chf||1000)-1)*100;addNode(M,"fin:arena",{type:"leaf",label:"Bot-Arena "+(p>=0?"+":"")+p.toFixed(1)+" %",c:p>=0?"--green":"--red",near:"hub:finanzen",view:"finanzen",r:5});link("hub:finanzen","fin:arena")}
  addNode(M,"fin:screen",{type:"leaf",label:"Bildschirmzeit (nicht verbunden)",c:"--blue",near:"hub:ziele",view:"ziele",r:3});link("hub:ziele","fin:screen");
  G.nodes=M;G.links=L;G.alpha=Math.max(G.alpha,.6);
  const lg=document.getElementById("legend");lg.textContent="";
  [["Habits",defs.length?hd/defs.length:0,hd+"/"+defs.length],["Ziele",S.goals.length?gd/S.goals.length:0,gd+"/"+S.goals.length],["To-dos",S.todos.length?1-open/S.todos.length:0,(S.todos.length-open)+"/"+S.todos.length]].forEach(([k,v,t])=>{const r=el("div");const m=el("div","meter");const b=el("b");b.style.width=Math.round(v*100)+"%";m.appendChild(b);r.append(el("span",null,k.toUpperCase()),m,el("span",null,t));lg.appendChild(r)});
  document.getElementById("nexusMeta").textContent=G.nodes.size+" Knoten · "+G.links.length+" Verbindungen · "+("Stand "+relativ(BUNDLE.stand));if(reduce)settle()}
function step(){const N=[...G.nodes.values()],a=G.alpha;if(a<.003)return;
  for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++){const p=N[i],q=N[j];let dx=q.x-p.x,dy=q.y-p.y,d2=dx*dx+dy*dy||.01;if(d2>90000)continue;
    const str=(p.type==="leaf"&&q.type==="leaf"?220:(p.type==="hub"&&q.type==="hub")?4200:(p.type==="core"||q.type==="core")?2600:700)/d2*a;const d=Math.sqrt(d2);dx/=d;dy/=d;p.vx-=dx*str;p.vy-=dy*str;q.vx+=dx*str;q.vy+=dy*str}
  for(const l of G.links){const p=G.nodes.get(l.a),q=G.nodes.get(l.b);const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||.01;
    const rest=p.type==="core"&&q.type==="hub"?130:q.type==="leaf"&&p.type==="hub"?55:120;const f=(d-rest)/d*.06*a*l.w;p.vx+=dx*f;p.vy+=dy*f;q.vx-=dx*f;q.vy-=dy*f}
  for(const n of N){if(n.type==="core"){n.vx=n.vy=0;n.x*=.9;n.y*=.9;continue}n.vx-=n.x*.002*a;n.vy-=n.y*.002*a;
    if(G.drag&&G.drag.node===n){n.vx=n.vy=0;continue}n.vx*=.82;n.vy*=.82;n.x+=n.vx;n.y+=n.vy}
  G.alpha*=.992}
function settle(){for(let i=0;i<300;i++)step();frame(0)}
function neigh(n){const s=new Set([n.id]);for(const l of G.links){if(l.a===n.id)s.add(l.b);if(l.b===n.id)s.add(l.a)}return s}
let loopOn=false;function startLoop(){if(reduce){settle();return}if(loopOn)return;loopOn=true;requestAnimationFrame(frame)}
function frame(ts){if(CUR!=="core"){loopOn=false;return}const dpr=window.devicePixelRatio||1,w=cv.clientWidth,h=cv.clientHeight;if(!w){loopOn=false;return}
  if(cv.width!==Math.round(w*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}if(!reduce)step();
  {const e=reduce?1:.16;G.cam.x+=(G.tgt.x-G.cam.x)*e;G.cam.y+=(G.tgt.y-G.cam.y)*e;G.cam.k+=(G.tgt.k-G.cam.k)*e}
  const t=reduce?0:ts/1000,k=G.cam.k,ox=w/2+G.cam.x,oy=h/2+G.cam.y;cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,w,h);
  const toS=n=>[ox+n.x*k,oy+n.y*k];const hv=G.hover?neigh(G.hover):null;const fg=css("--fg"),mono=css("--font-mono");
  // ambient ring around core
  const core=G.nodes.get("core");if(core){const[cxs,cys]=toS(core);cx.strokeStyle=css("--line-hi");cx.lineWidth=1;cx.globalAlpha=.6;cx.beginPath();cx.arc(cxs,cys,170*k,0,Math.PI*2);cx.stroke();
    for(let q=0;q<48;q++){const a=q/48*Math.PI*2+t*.02,r0=170*k,len=q%4?3:7;cx.beginPath();cx.moveTo(cxs+Math.cos(a)*r0,cys+Math.sin(a)*r0);cx.lineTo(cxs+Math.cos(a)*(r0+len),cys+Math.sin(a)*(r0+len));cx.stroke()}cx.globalAlpha=1}
  for(const l of G.links){const p=G.nodes.get(l.a),q=G.nodes.get(l.b);const[x1,y1]=toS(p),[x2,y2]=toS(q);const on=hv&&hv.has(p.id)&&hv.has(q.id)&&(p===G.hover||q===G.hover);
    cx.strokeStyle=css(q.type==="leaf"?q.c:p.type==="core"?q.c:p.c)||fg;cx.globalAlpha=hv?(on?.9:.06):(l.w<1?.18:.35);cx.lineWidth=on?1.6:1;cx.beginPath();cx.moveTo(x1,y1);cx.lineTo(x2,y2);cx.stroke()}
  cx.globalAlpha=1;
  for(const n of G.nodes.values()){if(n.type==="core")continue;const[x,y]=toS(n);const col=css(n.c);const dim=hv&&!hv.has(n.id);cx.globalAlpha=dim?.15:1;
    if(n.type==="hub"){const rad=(G.hover===n?14:11)*Math.min(1.4,Math.max(.8,k));cx.save();cx.translate(x,y);cx.rotate(Math.PI/6);cx.shadowColor=col;cx.shadowBlur=G.hover===n?18:8;cx.beginPath();for(let s=0;s<6;s++){const aa=s/6*Math.PI*2;cx.lineTo(Math.cos(aa)*rad,Math.sin(aa)*rad)}cx.closePath();cx.fillStyle=css("--panel-2");cx.fill();cx.strokeStyle=col;cx.lineWidth=1.5;cx.stroke();cx.restore();
      cx.fillStyle=col;cx.beginPath();cx.arc(x,y,3.5,0,Math.PI*2);cx.fill();cx.fillStyle=fg;cx.font="600 10.5px "+mono;cx.textAlign="center";cx.fillText(n.label.toUpperCase(),x,y+rad+14);cx.fillStyle=col;cx.font="500 9.5px "+mono;cx.fillText(n.sub,x,y+rad+26)}
    else{const rr=n.r*Math.min(1.6,Math.max(.8,k))*(G.hover===n?1.5:1);cx.shadowColor=col;cx.shadowBlur=n.done?0:6;cx.fillStyle=n.done?css("--dim"):col;cx.beginPath();cx.arc(x,y,rr,0,Math.PI*2);cx.fill();cx.shadowBlur=0;
      if(n.done){cx.strokeStyle=col;cx.lineWidth=1;cx.beginPath();cx.arc(x,y,rr+1.5,0,Math.PI*2);cx.stroke()}
      if(k>1.35||(hv&&hv.has(n.id))){cx.fillStyle=n.done?css("--dim"):css("--muted");cx.font="500 9.5px "+mono;cx.textAlign="center";cx.fillText(n.label,x,y+rr+11)}}
    cx.globalAlpha=1}
  if(core){const[X,Y]=toS(core);const sc=Math.min(1.3,Math.max(.7,k));const cy=css("--cyan");cx.save();cx.translate(X,Y);cx.scale(sc,sc);cx.shadowColor=cy;cx.shadowBlur=14;
    const ring=(r,wid,segs,gap,rot,al)=>{cx.lineWidth=wid;cx.strokeStyle=cy;cx.globalAlpha=al;for(let q=0;q<segs;q++){const a0=rot+q/segs*Math.PI*2,a1=a0+Math.PI*2/segs-gap;cx.beginPath();cx.arc(0,0,r,a0,a1);cx.stroke()}cx.globalAlpha=1};
    ring(58,2,24,.08,t*.25,.35);ring(50,6,8,.18,-t*.4,.55);ring(41,1.5,60,.05,t*.1,.4);
    cx.lineWidth=5;cx.globalAlpha=.25;cx.beginPath();cx.arc(0,0,33,0,Math.PI*2);cx.stroke();cx.globalAlpha=1;
    cx.strokeStyle=css("--amber");cx.shadowColor=css("--amber");cx.beginPath();cx.arc(0,0,33,-Math.PI/2,-Math.PI/2+Math.PI*2*G.score/100);cx.stroke();
    /* Zahl und Auge: das Auge formt sich zur Zahl (9 s Zahl, 6 s Auge); bei Aktivität/Stimmung bleibt das Auge */
    const cyc=(t%15),want=EYE.busy||EYE.rm||EYE.ang>.05||EYE.hap>.05?1:(cyc>9?1:0);G.eyeF=(G.eyeF||0)+(want-(G.eyeF||0))*.045;const ef=G.eyeF;
    cx.shadowBlur=0;drawEye(cx,30,t,1,{f:1-ef,text:String(G.score)});
    cx.fillStyle=css("--muted");cx.font="500 8.5px "+mono;cx.textAlign="center";cx.fillText(ef>.5?"ALFRED":"ALFRED · TAGESSCORE",0,76);cx.restore()}
  if(G.hover&&G.hover.type==="leaf"){const[x,y]=toS(G.hover);const txt=G.hover.label;cx.font="500 11px "+mono;const tw=cx.measureText(txt).width+16;let bx=Math.min(w-tw-6,Math.max(6,x-tw/2)),by=y-34;
    cx.fillStyle="rgba(2,9,16,.92)";cx.strokeStyle=css(G.hover.c);cx.lineWidth=1;cx.beginPath();cx.rect(bx,by,tw,20);cx.fill();cx.stroke();cx.fillStyle=fg;cx.textAlign="left";cx.fillText(txt,bx+8,by+14)}
  if(!reduce)requestAnimationFrame(frame);else loopOn=false}
/* Interaktion: Knoten ziehen, Hintergrund verschieben, Rad/Pinch zoomen, Tippen öffnet */
function world(ev){const r=cv.getBoundingClientRect();return{sx:ev.clientX-r.left,sy:ev.clientY-r.top,x:(ev.clientX-r.left-cv.clientWidth/2-G.cam.x)/G.cam.k,y:(ev.clientY-r.top-cv.clientHeight/2-G.cam.y)/G.cam.k}}
function pick(p){let best=null,bd=1e9;for(const n of G.nodes.values()){const rad=(n.type==="core"?40:n.type==="hub"?18:Math.max(9,n.r+5))/G.cam.k;const d=Math.hypot(n.x-p.x,n.y-p.y);if(d<rad&&d<bd){bd=d;best=n}}return best}
cv.addEventListener("pointerdown",ev=>{cv.setPointerCapture(ev.pointerId);G.pointers.set(ev.pointerId,world(ev));G.moved=false;
  if(G.pointers.size===2){const[a,b]=[...G.pointers.values()];G.pinch={d:Math.hypot(a.sx-b.sx,a.sy-b.sy),k:G.cam.k};G.drag=null;G.pan=null;return}
  const p=world(ev),n=pick(p);if(n&&n.type!=="core"){G.drag={node:n,id:ev.pointerId};G.alpha=Math.max(G.alpha,.4)}else G.pan={sx:p.sx,sy:p.sy,cx:G.cam.x,cy:G.cam.y,core:n};startLoop()});
cv.addEventListener("pointermove",ev=>{const p=world(ev);if(G.pointers.has(ev.pointerId))G.pointers.set(ev.pointerId,p);
  if(G.pinch&&G.pointers.size===2){const[a,b]=[...G.pointers.values()];G.cam.k=G.tgt.k=Math.min(3,Math.max(.5,G.pinch.k*Math.hypot(a.sx-b.sx,a.sy-b.sy)/G.pinch.d));G.moved=true;return}
  if(G.drag){G.drag.node.x=p.x;G.drag.node.y=p.y;G.moved=true;G.alpha=Math.max(G.alpha,.3);return}
  if(G.pan){const dx=p.sx-G.pan.sx,dy=p.sy-G.pan.sy;if(Math.abs(dx)+Math.abs(dy)>4)G.moved=true;const nx=G.pan.cx+dx,ny=G.pan.cy+dy,t=performance.now(),dt=Math.max(8,t-(G.pan.t||t-16));G.pan.vx=(nx-G.cam.x)/dt;G.pan.vy=(ny-G.cam.y)/dt;G.pan.t=t;G.cam.x=G.tgt.x=nx;G.cam.y=G.tgt.y=ny;return}
  const n=pick(p);G.hover=n&&n.type!=="core"?n:null;cv.style.cursor=n?"pointer":"grab";if(reduce)frame(0)});
function up(ev){const p=world(ev);G.pointers.delete(ev.pointerId);if(G.pointers.size<2)G.pinch=null;
  if(!G.moved){const n=pick(p);if(n){if(n.type==="core")(location.hash="alfred");else if(n.view)location.hash=n.view.split("#")[0]}}
  if(G.pan&&G.moved&&!reduce&&performance.now()-(G.pan.t||0)<80){const c=v=>Math.max(-220,Math.min(220,(v||0)*140));G.tgt.x+=c(G.pan.vx);G.tgt.y+=c(G.pan.vy)}
  G.drag=null;G.pan=null}
cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",ev=>{G.pointers.delete(ev.pointerId);G.drag=null;G.pan=null;G.pinch=null});
cv.addEventListener("pointerleave",()=>{G.hover=null});
cv.addEventListener("wheel",ev=>{ev.preventDefault();const r=cv.getBoundingClientRect();const mx=ev.clientX-r.left-cv.clientWidth/2,my=ev.clientY-r.top-cv.clientHeight/2;
  const m=ev.deltaMode===1?16:1,dy=ev.deltaY*m;if(!ev.ctrlKey&&Math.abs(ev.deltaX)>0){G.tgt.x-=ev.deltaX*m;G.tgt.y-=dy;startLoop();if(reduce)frame(0);return}const k0=G.tgt.k,k1=Math.min(3,Math.max(.5,k0*Math.exp(-dy*.0015)));
  G.tgt.x=mx-(mx-G.tgt.x)*k1/k0;G.tgt.y=my-(my-G.tgt.y)*k1/k0;G.tgt.k=k1;startLoop();if(reduce)frame(0)},{passive:false});
cv.addEventListener("keydown",ev=>{if(ev.key==="Enter")(location.hash="alfred");if(ev.key==="+")G.tgt.k=Math.min(3,G.tgt.k*1.15);if(ev.key==="-")G.tgt.k=Math.max(.5,G.tgt.k/1.15);if(ev.key==="0"){G.tgt={x:0,y:0,k:1}}if(reduce)frame(0)});
document.getElementById("graphReset").onclick=()=>{G.tgt={x:0,y:0,k:1};G.alpha=1;startLoop()};
return {show(){drawNexusData();G.alpha=1;startLoop()}}})();
