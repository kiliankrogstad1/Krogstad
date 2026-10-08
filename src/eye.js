/* ---------- Alfreds Auge ---------- */
/* Stimmungen: blau neutral · orange arbeitet · grün zufrieden · rot wütend */
const EYE={busy:0,ang:0,angT:0,hap:0,hapUntil:0,shake:0,c:[70,175,255],gx:0,gy:0,tx:0,ty:0,next:0,rm:matchMedia("(prefers-reduced-motion: reduce)").matches};
const EC={blue:[70,175,255],orange:[255,150,55],green:[70,230,125],red:[255,50,50]};
const lerp3=(a,b,f)=>a.map((v,i)=>v+(b[i]-v)*f);
function eyeBusy(on){EYE.busy=Math.max(0,EYE.busy+(on?1:-1))}
function eyeAnger(l){EYE.angT=Math.max(0,Math.min(1,l));if(l>0)EYE.shake=1}
function eyeHappy(ms){EYE.hapUntil=performance.now()+(ms||1800)}
function eyeTick(now){const E=EYE;
  E.ang+=(E.angT-E.ang)*.08;E.hap+=((now<E.hapUntil?1:0)-E.hap)*.1;E.shake*=.9;
  let tgt=E.ang>.02?(E.ang<.5?lerp3(EC.blue,EC.orange,E.ang*2):lerp3(EC.orange,EC.red,(E.ang-.5)*2)):E.busy?EC.orange:EC.blue;
  if(E.hap>.02)tgt=lerp3(tgt,EC.green,E.hap);E.c=lerp3(E.c,tgt,.08);
  if(!E.rm&&now>E.next){const r=E.busy||E.ang>.6?.35:Math.random()<.25?0:.95*Math.sqrt(Math.random()),a=Math.random()*Math.PI*2;E.tx=Math.cos(a)*r;E.ty=Math.sin(a)*r*.75;E.next=now+(E.ang>.6?180+Math.random()*250:E.busy?350+Math.random()*500:1100+Math.random()*2200)}
  E.gx+=(E.tx-E.gx)*.12;E.gy+=(E.ty-E.gy)*.12}
/* num: {f:0..1 Anteil Zahl, text} – das Auge formt sich zur Zahl */
function drawEye(c,R,t,alpha,num){const E=EYE,[cr,cg,cb]=E.c,col=a=>"rgba("+Math.round(cr)+","+Math.round(cg)+","+Math.round(cb)+","+a+")",
    act=Math.max(E.busy?1:0,E.ang),nf=num?num.f:0,ef=1-nf;
  c.save();c.globalAlpha=alpha==null?1:alpha;if(E.shake>.02&&!E.rm)c.translate(Math.sin(t*70)*E.shake*R*.09,0);
  /* Gehäuse */
  const hg=c.createLinearGradient(-R,-R,R,R);hg.addColorStop(0,"#21363f");hg.addColorStop(.5,"#0b171c");hg.addColorStop(1,"#1a2c33");
  c.fillStyle=hg;c.beginPath();c.arc(0,0,R,0,Math.PI*2);c.fill();
  c.lineWidth=Math.max(1,R*.03);c.strokeStyle=col(.6);c.beginPath();c.arc(0,0,R*.97,0,Math.PI*2);c.stroke();
  if(R>12){c.strokeStyle=col(.35);c.lineWidth=Math.max(1,R*.025);for(let i=0;i<12;i++){const a=i/12*Math.PI*2+t*.05;c.beginPath();c.moveTo(Math.cos(a)*R*.86,Math.sin(a)*R*.86);c.lineTo(Math.cos(a)*R*.92,Math.sin(a)*R*.92);c.stroke()}}
  /* Linse */
  const L=R*.78;c.save();c.beginPath();c.arc(0,0,L,0,Math.PI*2);c.clip();
  const lg=c.createRadialGradient(0,0,L*.1,0,0,L);lg.addColorStop(0,"#06121a");lg.addColorStop(1,"#010508");c.fillStyle=lg;c.fillRect(-L,-L,2*L,2*L);
  const tr=E.ang>.6&&!E.rm?L*.03*E.ang:0,ix=(E.gx*L*.32+(Math.random()-.5)*tr)*ef,iy=(E.gy*L*.32+(Math.random()-.5)*tr)*ef,
    pulse=1+(act>.05?Math.sin(t*(6+E.ang*8))*.06*act:Math.sin(t*1.3)*.02);
  const gR=L*.75*pulse*(.45+.55*ef);const glow=c.createRadialGradient(ix,iy,0,ix,iy,gR);glow.addColorStop(0,col(1*ef+.35*nf));glow.addColorStop(.45,col(.7*ef+.2*nf));glow.addColorStop(.75,col(.25));glow.addColorStop(1,col(0));
  c.fillStyle=glow;c.globalCompositeOperation="lighter";c.beginPath();c.arc(ix,iy,gR,0,Math.PI*2);c.fill();c.globalCompositeOperation="source-over";
  /* Blenden-Segmente: öffnen sich nach aussen, wenn die Zahl erscheint */
  c.strokeStyle=col(.9-.55*nf);c.lineWidth=Math.max(1,L*.07*(1-.4*nf));const rot=t*(.4+act*2.2+E.ang*3),sr=L*(.42+.46*nf)*pulse;for(let i=0;i<6;i++){const a0=rot+i/6*Math.PI*2;c.beginPath();c.arc(ix,iy,sr,a0,a0+Math.PI*2/6-.3-.25*nf);c.stroke()}
  const pr=L*(.17-.07*E.ang)*ef;if(pr>.3){c.fillStyle="#02080c";c.beginPath();c.arc(ix,iy,pr,0,Math.PI*2);c.fill();c.fillStyle=col(1);c.beginPath();c.arc(ix,iy,Math.max(.6,L*(.07-.025*E.ang)*ef),0,Math.PI*2);c.fill()}
  if(nf>.02&&num){const fs=Math.min(24,L*.95)*(.35+.65*nf);c.globalAlpha=(alpha==null?1:alpha)*Math.min(1,nf*1.4);c.shadowColor=col(1);c.shadowBlur=12;c.fillStyle="#eafcff";c.font="700 "+fs.toFixed(1)+"px "+(getComputedStyle(document.documentElement).getPropertyValue("--font-display")||"sans-serif");c.textAlign="center";c.textBaseline="middle";c.fillText(num.text,0,1);c.shadowBlur=0;c.globalAlpha=alpha==null?1:alpha}
  /* Wut: Lid senkt sich schräg · Freude: Unterlid hebt sich */
  if(E.ang>.03){const a=E.ang,y=-L+a*L*.62,tilt=a*.32;c.fillStyle="#0b171c";c.beginPath();c.moveTo(-L-2,-L-2);c.lineTo(L+2,-L-2);c.lineTo(L+2,y+Math.tan(tilt)*L);c.lineTo(-L-2,y-Math.tan(tilt)*L);c.closePath();c.fill();
    c.strokeStyle=col(.85);c.lineWidth=Math.max(1,L*.05);c.beginPath();c.moveTo(-L,y-Math.tan(tilt)*L);c.lineTo(L,y+Math.tan(tilt)*L);c.stroke()}
  if(E.hap>.03){const h=E.hap;c.fillStyle="#0b171c";c.beginPath();c.ellipse(0,L*(1.95-.75*h),L*1.3,L*1.05,0,0,Math.PI*2);c.fill();c.strokeStyle=col(.85);c.lineWidth=Math.max(1,L*.05);c.beginPath();c.ellipse(0,L*(1.95-.75*h),L*1.3,L*1.05,0,Math.PI*1.15,Math.PI*1.85);c.stroke()}
  c.restore();
  /* Glanz */
  c.fillStyle="rgba(255,255,255,.16)";c.beginPath();c.ellipse(-L*.38,-L*.42,L*.2,L*.1,-.7,0,Math.PI*2);c.fill();
  c.restore()}
(function eyeLoop(){const t0=performance.now();function f(now){eyeTick(now);for(const cv of document.querySelectorAll("canvas.eye")){if(!cv.offsetParent)continue;const sz=+cv.dataset.size||48,dpr=window.devicePixelRatio||1;
    if(cv.width!==Math.round(sz*dpr)){cv.width=Math.round(sz*dpr);cv.height=Math.round(sz*dpr);cv.style.width=cv.style.height=sz+"px"}
    const c=cv.getContext("2d");c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,sz,sz);c.translate(sz/2,sz/2);drawEye(c,sz/2-1,(now-t0)/1000)}
  requestAnimationFrame(f)}requestAnimationFrame(f)})();

