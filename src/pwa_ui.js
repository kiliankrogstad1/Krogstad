const APP_VER="3.1";
(function(){const f=document.getElementById("lockForm");if(f){const v=el("div","appver","Krogstad App "+APP_VER);f.appendChild(v)}})();
/* ---------- App-Start: immer beim Core beginnen ---------- */
if(!window.__skipSplash&&location.hash&&location.hash!=="#home"){try{history.replaceState(null,"",location.pathname+"#home")}catch(e){location.hash="home"}if(typeof route==="function")route()}

/* ---------- Vollbild beim Start (installierte App am PC) ---------- */
const KFS={want(){return LS.get("fs",true)&&matchMedia("(display-mode: standalone), (display-mode: minimal-ui), (display-mode: window-controls-overlay)").matches&&matchMedia("(pointer: fine)").matches&&!!document.documentElement.requestFullscreen},
  go(){if(KFS.want()&&!document.fullscreenElement)document.documentElement.requestFullscreen({navigationUI:"hide"}).catch(()=>{})},
  ctl(box){if(!box)return;const r=el("label","vol fsrow");const c=el("input");c.type="checkbox";c.checked=LS.get("fs",true);c.onchange=()=>{LS.set("fs",c.checked);if(c.checked)KFS.go();else if(document.fullscreenElement)document.exitFullscreen()};
    r.append(el("span",null,"Vollbild (PC)"),c,el("b",null,"F11"));box.appendChild(r)}};
addEventListener("pointerdown",()=>KFS.go(),{once:true,capture:true});

/* ---------- App-Start: Alfred öffnet die Augen ---------- */
(function splash(){const sp=document.getElementById("splash");if(!sp)return;
  const rm=matchMedia("(prefers-reduced-motion: reduce)").matches;let started=false;
  const done=()=>{if(!sp.isConnected||sp.classList.contains("out"))return;sp.classList.add("out");KAudio.music();setTimeout(()=>{sp.remove();const p=document.getElementById("lockPw");const lk=document.getElementById("lock");if(p&&lk&&!lk.hidden)p.focus()},650)};
  if(window.__skipSplash||sessionStorage.getItem("kg_splash")){sp.remove();return}
  try{sessionStorage.setItem("kg_splash","1")}catch(e){}
  const run=()=>{if(started)return;started=true;sp.classList.remove("wait");
    const T=rm?[0,100,200,300,1400]:[250,1350,1950,2550,4300];
    setTimeout(()=>{sp.classList.add("open");KAudio.fx.eyeOpen()},T[0]);
    setTimeout(()=>sp.classList.add("t1"),T[1]);
    setTimeout(()=>sp.classList.add("t2"),T[2]);
    setTimeout(()=>{const h=document.getElementById("spHello"),s="Willkommen, Herr Krogstad.";if(!h)return;sp.classList.add("t3");eyeHappy(1600);
      if(rm){h.textContent=s;return}let i=0;const ty=()=>{if(!h.isConnected)return;h.textContent=s.slice(0,++i);if(i<s.length)setTimeout(ty,38)};ty()},T[3]);
    setTimeout(done,T[4])};
  sp.addEventListener("click",()=>{if(!started){KFS.go();KAudio.unlock();setTimeout(run,KFS.want()?350:60)}else done()});
  /* Mit Ton: Der Browser erlaubt Klang erst nach einer Berührung → Alfred wartet geschlossen, bis Sie antippen. */
  if(KFS.want()){sp.classList.add("wait")}else if(KAudio.wants()&&!KAudio.running()){KAudio.unlock();setTimeout(()=>{if(started)return;if(KAudio.running())run();else sp.classList.add("wait")},150)}else run()})();

/* ---------- Kopfzeile Handy: Uhr, Alfred-Auge, Menü (Vollbild) ---------- */
(function mobileBar(){const bar=document.querySelector(".bar"),nav=document.getElementById("nav");if(!bar||!nav)return;
  const mc=el("span","mclock");mc.id="mclock";const ab=el("button","mbtn");ab.type="button";ab.setAttribute("aria-label","Alfred starten");const ae=el("canvas","eye");ae.dataset.size="24";ab.appendChild(ae);
  const bb=el("button","mbtn burger");bb.type="button";bb.setAttribute("aria-label","Menü öffnen");bb.append(el("i"),el("i"),el("i"));
  const right=el("div","mright");right.append(mc,ab,bb);bar.insertBefore(right,bar.children[1]||null);
  const mm=el("div","mmenu");mm.id="mmenu";mm.setAttribute("role","dialog");mm.setAttribute("aria-label","Menü");mm.hidden=true;
  const head=el("div","mhead");const lg=el("div","mlogo");const le=el("canvas","eye");le.dataset.size="22";lg.append(le,el("b",null,"KROGSTAD"));
  const xb=el("button","mbtn burger x");xb.type="button";xb.setAttribute("aria-label","Menü schliessen");xb.append(el("i"),el("i"),el("i"));head.append(lg,xb);
  const grid=el("div","mgrid");nav.querySelectorAll("a").forEach((a,i)=>{const b=el("a",null);b.href=a.getAttribute("href");const ic=a.querySelector("svg");const top=el("div","mt");top.append(el("small",null,String(i+1).padStart(2,"0")));if(ic){const c=ic.cloneNode(true);c.setAttribute("class","ico mi");top.appendChild(c)}b.append(top,el("span",null,a.textContent.trim()));grid.appendChild(b)});
  const alf=el("a","malfred");alf.href="#";alf.append(el("small",null,"◉"),el("span",null,"Alfred starten"));grid.appendChild(alf);
  const vb=el("div","volbox");const foot=el("div","mrow");const lk=el("button","btn","Sperren");lk.type="button";lk.onclick=()=>{close();window.lockApp&&window.lockApp()};foot.append(lk);
  mm.append(head,grid,vb,foot);document.body.appendChild(mm);
  const mark=()=>grid.querySelectorAll("a[href^='#']:not(.malfred)").forEach(a=>a.setAttribute("aria-current",a.getAttribute("href")===(location.hash||"#home")?"page":"false"));
  const open=()=>{KAudio.ctl(vb);KFS.ctl(vb);mark();mm.hidden=false;requestAnimationFrame(()=>mm.classList.add("on"));document.body.style.overflow="hidden";KAudio.fx.menu(true)};
  const close=()=>{if(mm.hidden)return;mm.classList.remove("on");document.body.style.overflow="";setTimeout(()=>{mm.hidden=true},260);KAudio.fx.menu(false)};
  bb.onclick=open;xb.onclick=close;grid.addEventListener("click",e=>{const a=e.target.closest("a");if(!a)return;if(a===alf){e.preventDefault();close();const j=document.getElementById("jvOpen");j&&j.click();return}close()});
  addEventListener("keydown",e=>{if(e.key==="Escape")close()});addEventListener("hashchange",mark);
  ab.onclick=()=>{const j=document.getElementById("jvOpen");j&&j.click()};
  const W=["So","Mo","Di","Mi","Do","Fr","Sa"];const tick=()=>{const n=new Date();mc.textContent="";mc.append(el("small",null,W[n.getDay()]+" "+String(n.getDate()).padStart(2,"0")+"."+String(n.getMonth()+1).padStart(2,"0")+"."),el("b",null,String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0")))};tick();setInterval(tick,15000)})();
KAudio.ctl(document.getElementById("volSec"));KFS.ctl(document.getElementById("volSec"));

/* Briefing antippen → gross lesen, ✕ → zurück */
(function(){const b=document.getElementById("brief");if(!b)return;b.title="Antippen zum Vergrössern";b.addEventListener("click",()=>{if(document.querySelector(".zoomview"))return;
  const z=el("div","zoomview");const x=el("button","zx","✕");x.type="button";x.setAttribute("aria-label","Schliessen");const k=document.getElementById("briefKind");
  z.append(x,el("div","zt","// Alfred · "+(k?k.textContent:"Briefing")),el("div","zb",b.textContent));document.body.appendChild(z);document.body.style.overflow="hidden";
  x.onclick=()=>{z.remove();document.body.style.overflow=""}})})();
