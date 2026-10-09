const C="krogstad-v11";const SHELL=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL.map(s=>new Request(s,{cache:"reload"})))));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.hostname==="api.anthropic.com")return;
  const same=u.origin===location.origin,key=same?new Request(u.pathname):e.request;
  // Netz zuerst und immer frisch beim Server nachfragen (kein 10-min-Browser-Cache), sonst Cache – so funktioniert die App offline
  const net=same?fetch(u.href,{cache:"no-cache",credentials:"same-origin"}):fetch(e.request);
  e.respondWith(net.then(r=>{if(r&&(r.ok||r.type==="opaque")){const cp=r.clone();caches.open(C).then(c=>c.put(key,cp))}return r}).catch(()=>caches.match(key).then(r=>r||caches.match("index.html"))))});
