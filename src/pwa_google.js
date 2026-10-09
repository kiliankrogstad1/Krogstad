/* ---------- Google direkt: Kalender + Gmail live in der App ----------
   Anmeldung über Google (nur Kilians Konto, Zugriffsschlüssel 1 h gültig, nur im Speicher dieser Sitzung).
   Stellt dieselben Werkzeuge bereit wie Krogstad-Online (S.mcp), damit Alfred eintragen/absagen/Entwürfe kann. */
const GG=(()=>{const CLIENT_ID="";const SCOPES="https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose";
  const cid=()=>CLIENT_ID||LS.get("g_client","");let tc=null,tok=null,loading=false;
  try{const s=JSON.parse(sessionStorage.getItem("kg_gt")||"null");if(s&&s.exp>Date.now()+6e4)tok=s}catch(e){}
  const ok=()=>!!(tok&&tok.exp>Date.now()+3e4);
  const api=async(url,o={})=>{if(!ok())throw{code:"needs_reauth",message:"Google neu verbinden"};const r=await fetch(url,Object.assign({},o,{headers:Object.assign({Authorization:"Bearer "+tok.t},o.body?{"Content-Type":"application/json"}:{},o.headers||{})}));
    if(r.status===401){tok=null;sessionStorage.removeItem("kg_gt");status();throw{code:"needs_reauth",message:"Google neu verbinden"}}if(r.status===204)return{};const j=await r.json().catch(()=>({}));if(!r.ok)throw{code:"tool_error",message:(j.error&&j.error.message)||String(r.status)};return j};
  function loadGis(){return new Promise((res,rej)=>{if(window.google&&google.accounts&&google.accounts.oauth2)return res();const s=document.createElement("script");s.src="https://accounts.google.com/gsi/client";s.async=true;s.onload=()=>res();s.onerror=()=>rej(new Error("Google nicht erreichbar"));document.head.appendChild(s)})}
  async function connect(){if(!cid()){status("Client-ID fehlt (unter Ziele → Sicherheit eintragen).");return}try{await loadGis()}catch(e){status("Google nicht erreichbar (offline?)");return}
    if(!tc)tc=google.accounts.oauth2.initTokenClient({client_id:cid(),scope:SCOPES,prompt:"",callback:r=>{if(r&&r.access_token){tok={t:r.access_token,exp:Date.now()+(r.expires_in||3600)*1000};try{sessionStorage.setItem("kg_gt",JSON.stringify(tok))}catch(e){}LS.set("g_ok",1);refresh(true)}else status("Anmeldung abgebrochen.")},error_callback:e=>status("Anmeldung abgebrochen.")});
    tc.requestAccessToken({prompt:LS.get("g_ok",0)?"":"consent"})}
  const iso=d=>d.toISOString();
  async function events(){const s=addDays(sod(new Date()),-7),e=addDays(sod(new Date()),40);
    const j=await api("https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin="+encodeURIComponent(iso(s))+"&timeMax="+encodeURIComponent(iso(e)));
    return(j.items||[]).filter(x=>x.status!=="cancelled").map(x=>({id:x.id,summary:x.summary,start:x.start,end:x.end,location:x.location,description:x.description,attendees:x.attendees,status:x.status,transparency:x.transparency}))}
  const hdr=(m,n)=>(((m.payload||{}).headers||[]).find(h=>h.name.toLowerCase()===n.toLowerCase())||{}).value||"";
  async function threads(q,n){const j=await api("https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults="+(n||15)+"&q="+encodeURIComponent(q));
    const out=[];for(const t of(j.threads||[]).slice(0,n||15)){try{const d=await api("https://gmail.googleapis.com/gmail/v1/users/me/threads/"+t.id+"?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=Message-ID");
      const ms=(d.messages||[]).map(m=>({id:m.id,subject:hdr(m,"Subject"),sender:hdr(m,"From"),date:hdr(m,"Date")?new Date(hdr(m,"Date")).toISOString():null,snippet:m.snippet||"",msgid:hdr(m,"Message-ID")}));
      out.push({id:t.id,messages:ms,messageCount:ms.length,viewUrl:"https://mail.google.com/mail/u/0/#inbox/"+t.id})}catch(e){}}return{threads:out}}
  const b64u=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  /* Dieselbe Schnittstelle wie in Krogstad-Online */
  const shim={async callTool(server,tool,i){i=i||{};
      if(server==="Gmail"&&tool==="search_threads")return{payload:await threads(i.query||"",i.pageSize)};
      if(server==="Gmail"&&tool==="create_draft"){const to=(i.to||[]).join(", ");let raw="To: "+to+"\r\nSubject: =?UTF-8?B?"+btoa(unescape(encodeURIComponent(i.subject||"")))+"?=\r\nContent-Type: text/plain; charset=UTF-8\r\n";
        let threadId;if(i.replyToMessageId){try{const m=await api("https://gmail.googleapis.com/gmail/v1/users/me/messages/"+i.replyToMessageId+"?format=metadata&metadataHeaders=Message-ID");const mid=hdr(m,"Message-ID");threadId=m.threadId;if(mid)raw+="In-Reply-To: "+mid+"\r\nReferences: "+mid+"\r\n"}catch(e){}}
        raw+="\r\n"+(i.body||"");const d=await api("https://gmail.googleapis.com/gmail/v1/users/me/drafts",{method:"POST",body:JSON.stringify({message:Object.assign({raw:b64u(raw)},threadId?{threadId}:{})})});return{payload:{id:d.id,viewUrl:"https://mail.google.com/mail/u/0/#drafts"}}}
      if(server==="Google Calendar"&&tool==="list_events")return{payload:{events:await events()}};
      if(server==="Google Calendar"&&tool==="create_event"){const t=i.allDay?{start:{date:i.startTime.slice(0,10)},end:{date:i.endTime.slice(0,10)}}:{start:{dateTime:i.startTime,timeZone:TZ},end:{dateTime:i.endTime,timeZone:TZ}};
        const r=await api("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none",{method:"POST",body:JSON.stringify(Object.assign({summary:i.summary},t,i.location?{location:i.location}:{},i.description?{description:i.description}:{}))});setTimeout(()=>refresh(false),800);return{payload:{id:r.id,event:r}}}
      if(server==="Google Calendar"&&tool==="update_event"){const b={};if(i.summary!=null)b.summary=i.summary;if(i.availability)b.transparency=i.availability==="AVAILABILITY_FREE"?"transparent":"opaque";
        const r=await api("https://www.googleapis.com/calendar/v3/calendars/primary/events/"+encodeURIComponent(i.eventId)+"?sendUpdates=none",{method:"PATCH",body:JSON.stringify(b)});setTimeout(()=>refresh(false),800);return{payload:r}}
      if(server==="Google Calendar"&&tool==="delete_event"){await api("https://www.googleapis.com/calendar/v3/calendars/primary/events/"+encodeURIComponent(i.eventId)+"?sendUpdates=none",{method:"DELETE"});setTimeout(()=>refresh(false),800);return{payload:{}}}
      throw{code:"not_in_manifest",message:tool}},
    async invalidate(){},watchTool(){return()=>{}}};
  async function refresh(force){if(!ok()||loading)return;loading=true;status("Google · lädt …");
    try{S.mcp=shim;S.events=await events();S.calLoaded=true;S.calError=null;S.mails=null;await loadMails(true);
      try{S.cmails=(await threads("(to:contact@crogstad.com OR deliveredto:contact@crogstad.com) -in:sent -from:me is:unread newer_than:30d",15)).threads.map(t=>{const m=t.messages[t.messages.length-1]||{};return{tid:t.id,mid:m.id,subject:m.subject||"(ohne Betreff)",sender:m.sender||"",snippet:m.snippet||"",date:m.date,url:t.viewUrl,count:t.messageCount}})}catch(e){}
      LS.set("g_last",Date.now());renderAll();renderMails();status()}catch(e){status(e.code==="needs_reauth"?null:"Google: "+String(e.message||e).slice(0,80))}finally{loading=false}}
  /* Anzeige oben: live oder verbinden */
  function status(msg){const st=document.getElementById("stand");if(!st)return;st.textContent="";
    const base=el("span",null,"Daten "+standTxt().replace("Stand ",""));st.appendChild(base);
    if(ok()&&!msg){st.appendChild(el("span","gl"," · Google live ✓"));return}
    if(msg){st.appendChild(el("span","gl"," · "+msg));if(/lädt/.test(msg))return}
    if(!cid()&&!msg)return;const b=el("button","btn gbtn",LS.get("g_ok",0)?"Google aktualisieren":"Mit Google verbinden");b.type="button";b.onclick=()=>connect();st.appendChild(b)}
  function box(bx){if(!bx)return;bx.textContent="";bx.appendChild(el("div","ast","Google direkt (Kalender + Gmail live): "+(ok()?"verbunden ✓":cid()?"bereit – oben „Mit Google verbinden“":"Client-ID fehlt")));
    if(!CLIENT_ID){const i=el("input");i.type="text";i.placeholder="Google Client-ID (…apps.googleusercontent.com)";i.value=LS.get("g_client","");const s=el("button","btn","Client-ID speichern");s.type="button";s.onclick=()=>{LS.set("g_client",i.value.trim());tc=null;box(bx);status()};bx.append(i,s)}
    const c=el("button","btn","Jetzt verbinden");c.type="button";c.onclick=()=>connect();bx.appendChild(c)}
  setInterval(()=>{if(ok()&&!document.hidden)refresh(false)},10*60e3);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&ok()&&Date.now()-LS.get("g_last",0)>5*60e3)refresh(false)});
  return{connect,refresh,status,box,ok}})();
