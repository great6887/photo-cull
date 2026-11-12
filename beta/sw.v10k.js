// Only v10k app assets; never user photos, other index versions or both wasm variants.
const CACHE='photo-cull-v10k-face-1';
const BASE=['./index.v10k.html','./vendor/v10/tasks-vision/vision_bundle.mjs'];
const MODEL='./vendor/v10/face_landmarker.task';
const ALL=[...BASE,MODEL,...['vision_wasm_internal','vision_wasm_nosimd_internal'].flatMap(n=>['./vendor/v10/tasks-vision/wasm/'+n+'.js','./vendor/v10/tasks-vision/wasm/'+n+'.wasm'])];
const absolute=p=>new URL(p,self.location.href).href;
const inflight=new Map();
async function cachedFetch(request) {
 const key=typeof request==='string'?request:new URL(request.url).origin+new URL(request.url).pathname;
 const url=absolute(key),cache=await caches.open(CACHE),hit=await cache.match(url);
 if(hit)return hit;
 if(!inflight.has(url)) inflight.set(url,(async()=>{const r=await fetch(url);if(!r.ok)throw Error('Asset fetch '+r.status);await cache.put(url,r.clone());return r;})().finally(()=>inflight.delete(url)));
 return (await inflight.get(url)).clone();
}
self.addEventListener('install',e=>e.waitUntil(cachedFetch('./index.v10k.html').then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('message',e=>{
 if(e.data?.type!=='v10k-face-assets')return;
 const name=e.data.simd?'vision_wasm_internal':'vision_wasm_nosimd_internal';
 const files=[MODEL,'./vendor/v10/tasks-vision/wasm/'+name+'.js','./vendor/v10/tasks-vision/wasm/'+name+'.wasm'];
 e.waitUntil(Promise.all(files.map(p=>cachedFetch(p))).then(()=>e.ports[0]?.postMessage({ok:true})).catch(err=>e.ports[0]?.postMessage({ok:false,error:String(err)})));
});
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=='GET'||url.origin!==self.location.origin||!ALL.some(p=>new URL(absolute(p)).pathname===url.pathname))return;
 e.respondWith(cachedFetch(url.origin+url.pathname));
});
