// Separate binary cache: the original my-home-assets database remains the migration source.
let opening;
async function db(){return opening??=new Promise((resolve,reject)=>{const r=indexedDB.open('home-cloud-binaries',1);r.onupgradeneeded=()=>r.result.createObjectStore('assets');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function cachedAsset(owner,id){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('assets').objectStore('assets').get(`${owner}/${id}`);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function cacheAssets(owner,assets){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('assets','readwrite');t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);for(const a of assets)t.objectStore('assets').put(a,`${owner}/${a.id}`);});}
