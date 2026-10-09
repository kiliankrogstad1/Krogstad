/* ---------- Klang: Alfreds Geräusche + ruhige Hintergrundmusik (alles live erzeugt, keine Dateien) ---------- */
const KAudio=(()=>{const A={ctx:null,sfx:null,mus:null,rev:null,on:false,last:{},set:Object.assign({music:.35,sfx:.6},LS.get("audio",{}))};
  const save=()=>LS.set("audio",A.set);
  function ctx(){if(A.ctx)return A.ctx;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;const c=new C();A.ctx=c;
    const comp=c.createDynamicsCompressor();comp.connect(c.destination);
    A.rev=c.createConvolver();const len=c.sampleRate*3,b=c.createBuffer(2,len,c.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)}A.rev.buffer=b;
    const rg=c.createGain();rg.gain.value=.5;A.rev.connect(rg);rg.connect(comp);
    A.sfx=c.createGain();A.sfx.gain.value=A.set.sfx*.9;A.sfx.connect(comp);
    A.mus=c.createGain();A.mus.gain.value=0;A.mus.connect(comp);
    document.addEventListener("visibilitychange",()=>{if(!A.ctx)return;document.hidden?A.ctx.suspend():A.ctx.resume()});return c}
  const running=()=>{const c=ctx();return !!c&&c.state==="running"};
  const unlock=()=>{const c=ctx();if(c&&c.state!=="running")c.resume();return c};
  const wants=()=>A.set.music>0||A.set.sfx>0;
  function tone(f,dur,o={}){const c=A.ctx;if(!c||c.state!=="running"||A.set.sfx<=0)return;const t=c.currentTime+(o.delay||0);
    const os=c.createOscillator(),g=c.createGain();os.type=o.type||"sine";os.frequency.setValueAtTime(f,t);if(o.f2)os.frequency.exponentialRampToValueAtTime(o.f2,t+dur);
    const v=o.vol||.2;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+(o.att||.006));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    let n=os;if(o.lp){const fl=c.createBiquadFilter();fl.type="lowpass";fl.frequency.value=o.lp;os.connect(fl);n=fl}
    n.connect(g);g.connect(A.sfx);if(o.wet){const w=c.createGain();w.gain.value=o.wet;g.connect(w);w.connect(A.rev)}os.start(t);os.stop(t+dur+.05)}
  function swoosh(dur,f1,f2,vol){const c=A.ctx;if(!c||c.state!=="running"||A.set.sfx<=0)return;const t=c.currentTime,len=c.sampleRate*dur,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;const s=c.createBufferSource();s.buffer=b;const bp=c.createBiquadFilter();bp.type="bandpass";bp.Q.value=1.2;bp.frequency.setValueAtTime(f1,t);bp.frequency.exponentialRampToValueAtTime(f2,t+dur);
    const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+dur*.35);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(bp);bp.connect(g);g.connect(A.sfx);const w=c.createGain();w.gain.value=.4;g.connect(w);w.connect(A.rev);s.start(t);s.stop(t+dur)}
  const gate=(k,ms)=>{const n=performance.now();if(n-(A.last[k]||0)<ms)return false;A.last[k]=n;return true};
  const fx={
    tap(){if(gate("tap",60))tone(1550,.045,{vol:.05,type:"sine"})},
    nav(){if(gate("nav",150)){tone(520,.12,{vol:.07,f2:780,wet:.2});swoosh(.22,500,1800,.025)}},
    eyeOpen(){swoosh(1.1,250,2600,.06);tone(196,1.2,{vol:.07,f2:392,att:.5,wet:.6,lp:1200});tone(587,1.6,{vol:.035,delay:.7,att:.3,wet:.8})},
    happy(){if(gate("happy",500)){tone(880,.5,{vol:.07,wet:.5});tone(1318.5,.7,{vol:.06,delay:.09,wet:.6})}},
    angry(){if(gate("angry",400)){tone(110,.18,{vol:.12,type:"sawtooth",lp:500});tone(98,.22,{vol:.12,type:"sawtooth",lp:450,delay:.2})}},
    think(){if(gate("think",900))tone(440,.16,{vol:.04,f2:494,wet:.3})},
    answer(){if(gate("answer",400))tone(988,.35,{vol:.05,wet:.6})},
    menu(o){swoosh(.3,o?400:1600,o?1600:400,.035)},
    unlock(){[523.3,659.3,784].forEach((f,i)=>tone(f,.6,{vol:.06,delay:i*.08,wet:.6}))}};
  /* Musik: ruhige Flächen (Am – F – C – G), dazu selten ein leiser Glockenton */
  const CH=[[110,164.8,220,261.6],[87.3,130.8,174.6,220],[130.8,196,261.6,329.6],[98,146.8,196,246.9]],BELL=[440,523.3,587.3,659.3,784,880];let ci=0,mt=null,bt=null;
  function chord(){const c=A.ctx;if(!c||!A.on)return;const t=c.currentTime,L=10;
    CH[ci++%CH.length].forEach((f,k)=>{[-4,4].forEach(dt=>{const o=c.createOscillator(),g=c.createGain(),fl=c.createBiquadFilter();o.type=k?"triangle":"sine";o.frequency.value=f;o.detune.value=dt;
      fl.type="lowpass";fl.frequency.setValueAtTime(380,t);fl.frequency.linearRampToValueAtTime(820,t+L*.5);fl.frequency.linearRampToValueAtTime(380,t+L+3);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.045/(k+1),t+3.5);g.gain.setValueAtTime(.045/(k+1),t+L-1);g.gain.linearRampToValueAtTime(0,t+L+3);
      o.connect(fl);fl.connect(g);g.connect(A.mus);const w=c.createGain();w.gain.value=.5;g.connect(w);w.connect(A.rev);o.start(t);o.stop(t+L+3.2)})});
    mt=setTimeout(chord,L*1000)}
  function bell(){const c=A.ctx;if(!c||!A.on)return;const t=c.currentTime,f=BELL[Math.floor(Math.random()*BELL.length)],o=c.createOscillator(),g=c.createGain();o.frequency.value=f;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.025,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+4);o.connect(g);g.connect(A.mus);const w=c.createGain();w.gain.value=1;g.connect(w);w.connect(A.rev);o.start(t);o.stop(t+4.1);
    bt=setTimeout(bell,5000+Math.random()*7000)}
  function music(){const c=A.ctx;if(!c||c.state!=="running")return;A.mus.gain.cancelScheduledValues(c.currentTime);A.mus.gain.linearRampToValueAtTime(A.set.music*.9,c.currentTime+2.5);
    if(A.set.music>0&&!A.on){A.on=true;chord();bt=setTimeout(bell,4000)}}
  function apply(){if(!A.ctx)return;const t=A.ctx.currentTime;A.sfx.gain.setTargetAtTime(A.set.sfx*.9,t,.05);A.mus.gain.setTargetAtTime(A.set.music*.9,t,.4);
    if(A.set.music>0&&!A.on&&running())music();if(A.set.music<=0&&A.on){A.on=false;clearTimeout(mt);clearTimeout(bt)}save();renderCtl()}
  function setVol(k,v){A.set[k]=Math.max(0,Math.min(1,Math.round(v*100)/100));apply()}
  /* Lautstärke per Satz an Alfred: „Musik auf 50 %“, „Soundeffekte leiser“, „Musik aus“ … */
  function command(q){const s=q.toLowerCase();const mu=/musik|music|hintergrund|song/.test(s),ef=/sound|effekt|töne|\bton\b|klick|geräusch/.test(s),all=/alles|audio|lautstärke|ton aus|\bstumm\b/.test(s)&&!mu&&!ef;
    if(!mu&&!ef&&!all)return null;const ks=all?["music","sfx"]:[mu&&"music",ef&&"sfx"].filter(Boolean);const D={music:.35,sfx:.6};const pct=s.match(/(\d{1,3})\s*(%|prozent)/)||s.match(/auf\s+(\d{1,3})\b/);let ok=true;
    ks.forEach(k=>{const v=A.set[k];let n=null;
      if(/leiser/.test(s))n=Math.max(.05,v*.5);else if(/lauter/.test(s))n=Math.min(1,v*1.5+.1);else if(pct)n=+pct[1]/100;
      else if(/\b(aus|stumm|stop|stoppen|ruhe|mute)\b/.test(s))n=0;else if(/\bleise\b/.test(s))n=.2;else if(/\blaut\b/.test(s))n=.9;else if(/\b(an|ein|wieder|starten?)\b/.test(s))n=D[k];
      if(n==null)ok=false;else setVol(k,n)});
    if(!ok)return null;unlock();if(A.set.music>0)music();fx.happy();
    const lab={music:"Musik",sfx:"Soundeffekte"};return ks.map(k=>lab[k]+(A.set[k]?" auf "+Math.round(A.set[k]*100)+" %":" aus")).join(", ")+", Sir."}
  /* Regler (im Menü und unter Sicherheit) */
  function ctl(box){if(!box)return;box.textContent="";[["music","Musik"],["sfx","Soundeffekte"]].forEach(([k,l])=>{const r=el("label","vol");const i=el("input");i.type="range";i.min=0;i.max=100;i.step=5;i.value=Math.round(A.set[k]*100);i.dataset.k=k;
      const v=el("b",null,Math.round(A.set[k]*100)+" %");i.oninput=()=>{unlock();setVol(k,i.value/100);v.textContent=i.value+" %"};r.append(el("span",null,l),i,v);box.appendChild(r)})}
  function renderCtl(){document.querySelectorAll(".volbox").forEach(b=>{b.querySelectorAll("input[type=range]").forEach(i=>{if(document.activeElement!==i){i.value=Math.round(A.set[i.dataset.k]*100);i.nextSibling.textContent=i.value+" %"}})})}
  /* Alfreds Gefühle hörbar machen */
  const _h=eyeHappy,_a=eyeAnger,_b=eyeBusy;
  eyeHappy=ms=>{_h(ms);fx.happy()};eyeAnger=l=>{_a(l);if(l>0)fx.angry()};eyeBusy=on=>{const was=EYE.busy;_b(on);if(on&&!was)fx.think();if(!on&&was===1)fx.answer()};
  addEventListener("pointerdown",e=>{const c=unlock();if(c&&A.set.music>0&&!A.on)setTimeout(music,50);if(e.target.closest("button,a,.chk,input[type=checkbox],label.item"))fx.tap()},{capture:true,passive:true});
  addEventListener("hashchange",()=>fx.nav());
  return{fx,unlock,running,wants,music,command,ctl,setVol}})();
