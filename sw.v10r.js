// Only v10r app assets; never user photos, other index versions or both wasm variants.
const CACHE='photo-cull-v10r-face-1';
const BASE=['./index.v10r.html','./vendor/v10/tasks-vision/vision_bundle.mjs'];
const MODEL='./vendor/v10/face_landmarker.task';
const ALL=[...BASE,MODEL,...['vision_wasm_internal','vision_wasm_nosimd_internal'].flatMap(n=>['./vendor/v10/tasks-vision/wasm/'+n+'.js','./vendor/v10/tasks-vision/wasm/'+n+'.wasm'])];
const absolute=p=>new URL(p,self.location.href).href;
// url -> promise that settles when the background cache.put for that url has finished.
const inflight=new Map();
// v10o: on a miss the network response goes to the caller immediately (body streams to the
// page byte by byte) while a clone is written to the cache in the background. `keepAlive`
// receives the background promise so the SW stays alive until the cache write ends.
async function cachedFetch(request,keepAlive) {
 const key=typeof request==='string'?request:new URL(request.url).origin+new URL(request.url).pathname;
 const url=absolute(key),cache=await caches.open(CACHE),hit=await cache.match(url);
 if(hit)return hit;
 if(inflight.has(url)){
  await inflight.get(url).catch(()=>{});
  const again=await cache.match(url);
  if(again)return again;
 }
 const job=(async()=>{const r=await fetch(url);if(!r.ok)throw Error('Asset fetch '+r.status);return {r,put:cache.put(url,r.clone())};})();
 const bg=job.then(x=>x.put).finally(()=>{if(inflight.get(url)===bg)inflight.delete(url);});
 inflight.set(url,bg);
 if(keepAlive)keepAlive(bg.catch(()=>{}));
 return (await job).r;
}
// Await the background write too (install / precache must mean "in the cache").
async function cachedFetchStored(p){let bg;const r=await cachedFetch(p,x=>{bg=x;});if(bg)await bg;return r;}
self.addEventListener('install',e=>e.waitUntil(cachedFetchStored('./index.v10r.html').then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('message',e=>{
 if(e.data?.type!=='v10r-face-assets')return;
 const name=e.data.simd?'vision_wasm_internal':'vision_wasm_nosimd_internal';
 const files=[MODEL,'./vendor/v10/tasks-vision/wasm/'+name+'.js','./vendor/v10/tasks-vision/wasm/'+name+'.wasm'];
 e.waitUntil(Promise.all(files.map(p=>cachedFetchStored(p))).then(()=>e.ports[0]?.postMessage({ok:true})).catch(err=>e.ports[0]?.postMessage({ok:false,error:String(err)})));
});
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=='GET'||url.origin!==self.location.origin||!ALL.some(p=>new URL(absolute(p)).pathname===url.pathname))return;
 // Extend lifetime synchronously; settles when the background cache write ends, or right
 // after the response when nothing is written (cache hit / error).
 let settle,bgSeen=false;e.waitUntil(new Promise(res=>{settle=res;}));
 e.respondWith(cachedFetch(url.origin+url.pathname,bg=>{bgSeen=true;bg.then(settle);})
  .then(r=>{if(!bgSeen)settle();return r;},err=>{settle();throw err;}));
});
