/* ---------- Live-Daten: YouTube (über die Google-Anmeldung) + Bot-Arena (über GitHub, nur Lesen) ----------
   Läuft in der App selbst: beim Entsperren, alle 10 min und beim Zurückkehren in die App.
   Fällt etwas aus, bleibt der letzte Stand aus dem Datenpaket stehen. */
const LIVE=(()=>{const CH="UCZBMUZzwB1OQs1qtirU_gwQ",AR="kiliankrogstad1/bot_arena";let busy=false,err={};
  const isoDur=s=>{const m=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s||"")||[];return(+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0)};
  const tag=t=>new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(t||new Date());
  const uhr=ms=>ms?new Intl.DateTimeFormat("de-CH",{timeZone:TZ,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(ms)):"–";
  const g=u=>GG.api("https://www.googleapis.com/youtube/v3/"+u);

  async function yt(){if(typeof GG==="undefined"||!GG.ok())return;
    const ch=((await g("channels?part=statistics,contentDetails&id="+CH)).items||[])[0];if(!ch)throw new Error("Kanal nicht gefunden");
    const st=ch.statistics,up=ch.contentDetails.relatedPlaylists.uploads;
    let ids=[],pt="";do{const p=await g("playlistItems?part=contentDetails&maxResults=50&playlistId="+up+(pt?"&pageToken="+pt:""));ids.push(...(p.items||[]).map(x=>x.contentDetails.videoId));pt=p.nextPageToken}while(pt&&ids.length<200);
    const vs=[];for(let i=0;i<ids.length;i+=50){const v=await g("videos?part=snippet,statistics,contentDetails&id="+ids.slice(i,i+50).join(","));vs.push(...(v.items||[]))}
    const now=Date.now(),prev=LS.get("yt_snap",{}),old={},snap={};((S.vids&&S.vids.videos)||[]).forEach(x=>old[x.id]=x);
    const videos=vs.map(v=>{const views=+v.statistics.viewCount||0,o=old[v.id]||{};let p=prev[v.id];
      if(!p||now-p.t>=20*60e3){const vph=p&&now>p.t?Math.max(0,Math.round((views-p.v)/((now-p.t)/36e5)*10)/10):(p?p.vph:null);p={v:views,t:now,vph}}snap[v.id]=p;
      return{id:v.id,title:v.snippet.title,date:v.snippet.publishedAt.slice(0,10),dur:v.contentDetails.duration,views,likes:+v.statistics.likeCount||0,
        comments:+v.statistics.commentCount||0,vph:p.vph!=null?p.vph:(o.vph!=null?o.vph:null),breakout:o.breakout!=null?o.breakout:null,type:isoDur(v.contentDetails.duration)<=180?"short":"long"}})
      .sort((a,b)=>b.date.localeCompare(a.date));
    LS.set("yt_snap",snap);S.vids={quelle:"YouTube live",stand:tag(),videos};
    const subs=+st.subscriberCount||0,views=+st.viewCount||0,d=tag();
    const ser=[];[...((S.yt&&S.yt.series)||[]),...LS.get("yt_series",[])].forEach(p=>{const i=ser.findIndex(q=>q.d===p.d);if(i<0)ser.push(Object.assign({},p));else if(p.views!=null)ser[i]=Object.assign({},ser[i],p)});
    const k=ser.findIndex(q=>q.d===d);if(k>=0)ser.splice(k,1);ser.push({d,subs,views});ser.sort((a,b)=>a.d.localeCompare(b.d));
    const keep=tag(new Date(now-400*864e5));LS.set("yt_series",ser.filter(p=>p.d>=keep));
    const d30=tag(new Date(now-30*864e5)),base=[...ser].reverse().find(p=>p.d<=d30)||ser[0];
    const y=Object.assign({goalSubs:1000},S.yt||{});y.subs=subs;y.views=views;y.videos=+st.videoCount||videos.length;y.videos30=videos.filter(v=>v.date>=d30).length;
    if(base&&base.d!==d){y.subsGained30=subs-base.subs;if(base.views!=null)y.viewsGained30=views-base.views}
    y.asOf=d.split("-").reverse().join(".")+" · live "+uhr(now);y.series=ser;S.yt=y;LS.set("yt_last",now)}

  async function arena(){const t=PW?await openLocal("arena"):null;if(!t)return false;
    const r=await fetch("https://api.github.com/repos/"+AR+"/contents/state/app.json?t="+Date.now(),{headers:{Authorization:"Bearer "+t,Accept:"application/vnd.github.raw+json"},cache:"no-store"});
    if(r.status===401||r.status===403||r.status===404)throw new Error("Token ungültig oder ohne Leserecht auf bot_arena");if(!r.ok)throw new Error("GitHub "+r.status);
    S.arena=await r.json();LS.set("ar_last",Date.now());return true}

  async function refresh(){if(busy||!PW||!navigator.onLine)return;busy=true;err={};
    try{await arena()}catch(e){err.arena=String(e.message||e).slice(0,80)}
    try{await yt()}catch(e){const m=String((e&&e.message)||e);if(!(e&&e.code==="needs_reauth"))err.yt=/has not been used|disabled|accessNotConfigured/i.test(m)?"YouTube-API in Google Cloud noch nicht aktiviert":/insufficient|scope|permission/i.test(m)?"Google neu verbinden (YouTube-Recht fehlt)":m.slice(0,80)}
    finally{busy=false}try{renderAll()}catch(e){}box(document.getElementById("liveBox"))}

  async function box(bx){if(!bx)return;bx.textContent="";
    bx.appendChild(el("div","ast","Live-Daten (alle 10 min, solange die App offen ist)"));
    bx.appendChild(el("div","note","YouTube: "+(err.yt?"⚠ "+err.yt:LS.get("yt_last",0)?"live ✓ "+uhr(LS.get("yt_last",0)):"kommt über „Mit Google verbinden“")));
    const has=PW&&LS.get("sec_arena",null);
    bx.appendChild(el("div","note","Bot-Arena: "+(err.arena?"⚠ "+err.arena:has?(LS.get("ar_last",0)?"live ✓ "+uhr(LS.get("ar_last",0)):"verbunden"):"GitHub-Token fehlt")));
    if(has){const x=el("button","btn","Arena-Token entfernen");x.type="button";x.onclick=()=>{LS.set("sec_arena",null);LS.set("ar_last",0);box(bx)};
      const n=el("button","btn","Jetzt aktualisieren");n.type="button";n.onclick=()=>refresh();bx.append(n,x);return}
    bx.appendChild(el("div","note","Token erstellen: GitHub → Settings → Developer settings → Fine-grained tokens → nur Repo bot_arena, Recht „Contents: Read-only“."));
    const ti=el("input");ti.type="text";ti.className="pwmask";ti.autocomplete="off";ti.placeholder="github_pat_… (nur Lesen, bot_arena)";ti.style.cssText="display:block;width:100%;margin:6px 0";
    const s=el("button","btn","Token speichern");s.type="button";s.onclick=async()=>{const v=ti.value.trim();if(!/^(github_pat_|ghp_)/.test(v)){ti.focus();return}
      await sealLocal("arena",v);ti.value="";refresh()};bx.append(ti,s)}

  setInterval(()=>{if(!document.hidden)refresh()},10*60e3);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&Date.now()-Math.max(LS.get("ar_last",0),LS.get("yt_last",0))>5*60e3)refresh()});
  addEventListener("online",()=>refresh());
  return{refresh,box,yt,arena}})();
