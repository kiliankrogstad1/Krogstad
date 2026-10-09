/* ---------- App-Start: Alfred öffnet die Augen ---------- */
(function splash(){const sp=document.getElementById("splash");if(!sp)return;
  const rm=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const done=()=>{if(!sp.isConnected)return;sp.classList.add("out");setTimeout(()=>{sp.remove();const p=document.getElementById("lockPw");const lk=document.getElementById("lock");if(p&&lk&&!lk.hidden)p.focus()},650)};
  if(window.__skipSplash||sessionStorage.getItem("kg_splash")){sp.remove();return}
  try{sessionStorage.setItem("kg_splash","1")}catch(e){}
  sp.addEventListener("click",done);
  const T=rm?[0,100,200,300,1400]:[350,1450,2050,2650,4300];
  setTimeout(()=>sp.classList.add("open"),T[0]);
  setTimeout(()=>sp.classList.add("t1"),T[1]);
  setTimeout(()=>sp.classList.add("t2"),T[2]);
  setTimeout(()=>{const h=document.getElementById("spHello"),s="Willkommen, Herr Krogstad.";sp.classList.add("t3");if(typeof eyeHappy==="function")eyeHappy(1600);
    if(rm){h.textContent=s;return}let i=0;const ty=()=>{h.textContent=s.slice(0,++i);if(i<s.length)setTimeout(ty,38)};ty()},T[3]);
  setTimeout(done,T[4])})();

/* ---------- Kopfzeile Handy: Uhr, Alfred-Auge, Menü ---------- */
(function mobileBar(){const bar=document.querySelector(".bar"),nav=document.getElementById("nav");if(!bar||!nav)return;
  const mc=el("span","mclock");mc.id="mclock";const ab=el("button","mbtn");ab.type="button";ab.setAttribute("aria-label","Alfred starten");const ae=el("canvas","eye");ae.dataset.size="24";ab.appendChild(ae);
  const bb=el("button","mbtn burger");bb.type="button";bb.setAttribute("aria-label","Menü");bb.setAttribute("aria-expanded","false");bb.append(el("i"),el("i"),el("i"));
  const right=el("div","mright");right.append(mc,ab,bb);bar.insertBefore(right,bar.children[1]||null);
  const mm=el("div","mmenu");mm.id="mmenu";const grid=el("div","mgrid");
  nav.querySelectorAll("a").forEach((a,i)=>{const b=el("a",null);b.href=a.getAttribute("href");b.append(el("small",null,String(i+1).padStart(2,"0")),el("span",null,a.textContent));grid.appendChild(b)});
  const row=el("div","mrow");const lk=el("button","btn","Sperren");lk.type="button";lk.onclick=()=>{close();window.lockApp&&window.lockApp()};row.append(lk);mm.append(grid,row);bar.after(mm);
  const open=()=>{mm.classList.add("on");bb.setAttribute("aria-expanded","true");bb.classList.add("x");mark()},close=()=>{mm.classList.remove("on");bb.setAttribute("aria-expanded","false");bb.classList.remove("x")};
  const mark=()=>grid.querySelectorAll("a").forEach(a=>a.setAttribute("aria-current",a.getAttribute("href")===(location.hash||"#home")?"page":"false"));
  bb.onclick=()=>mm.classList.contains("on")?close():open();grid.addEventListener("click",e=>{if(e.target.closest("a"))close()});addEventListener("hashchange",()=>{close();mark()});
  ab.onclick=()=>{close();const j=document.getElementById("jvOpen");j&&j.click()};
  const W=["So","Mo","Di","Mi","Do","Fr","Sa"];const tick=()=>{const n=new Date();mc.textContent="";mc.append(el("small",null,W[n.getDay()]+" "+String(n.getDate()).padStart(2,"0")+"."+String(n.getMonth()+1).padStart(2,"0")+"."),el("b",null,String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0")))};tick();setInterval(tick,15000)})();
