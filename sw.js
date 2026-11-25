const V='zgm-v3',LIB='zgm-lib',SHELL=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
const MIME={json:'application/json',wasm:'application/wasm',txt:'text/plain',model:'application/octet-stream',bin:'application/octet-stream',onnx:'application/octet-stream'};
function idbGet(k){return new Promise(res=>{try{const r=indexedDB.open('zgm',1);r.onupgradeneeded=()=>r.result.createObjectStore('r');
 r.onsuccess=()=>{try{const q=r.result.transaction('r').objectStore('r').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)}catch(e){res(null)}};r.onerror=()=>res(null)}catch(e){res(null)}})}
async function rootDir(){const h=await idbGet('folder');
 if(h){try{if((await h.queryPermission({mode:'read'}))==='granted')return h}catch(e){}return null}
 try{return await navigator.storage.getDirectory()}catch(e){return null}}
async function serveLocal(req,u){
 try{const root=await rootDir();if(!root)return new Response('folder locked',{status:503});
  const rel=decodeURIComponent(u.pathname.split('/zserve/')[1]||'').replace('/resolve/main/','/'),parts=rel.split('/').filter(Boolean);
  let d=await root.getDirectoryHandle('models');for(let i=0;i<parts.length-1;i++)d=await d.getDirectoryHandle(parts[i]);
  const name=parts[parts.length-1],f=await(await d.getFileHandle(name)).getFile(),ext=name.split('.').pop().toLowerCase();
  const h={'content-type':MIME[ext]||'application/octet-stream','accept-ranges':'bytes','access-control-allow-origin':'*','cache-control':'no-store'};
  const rg=req.headers.get('range');
  if(rg){const m=/bytes=(\d*)-(\d*)/.exec(rg);if(m){let a=m[1]?+m[1]:0,b=m[2]?+m[2]:f.size-1;b=Math.min(b,f.size-1);h['content-range']='bytes '+a+'-'+b+'/'+f.size;h['content-length']=String(b-a+1);return new Response(f.slice(a,b+1),{status:206,headers:h})}}
  h['content-length']=String(f.size);return new Response(f,{headers:h})}
 catch(err){return new Response('not found',{status:404})}}
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('zgm-')&&k!==V&&k!==LIB).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(u.pathname.indexOf('/zserve/')>=0&&(r.method==='GET'||r.method==='HEAD')){e.respondWith(serveLocal(r,u));return}
 if(r.method!=='GET')return;
 if(/generativelanguage\.googleapis\.com|anthropic\.com|huggingface\.co|raw\.githubusercontent\.com/.test(u.host))return;
 if(u.origin===location.origin){
  e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r).then(m=>m||caches.match('./index.html'))));return}
 if(/cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u.host)){
  e.respondWith(caches.open(LIB).then(async c=>{const m=await c.match(r);if(m)return m;try{const res=await fetch(r);if(res.ok||res.type==='opaque')c.put(r,res.clone());return res}catch(err){return Response.error()}}))}
});
