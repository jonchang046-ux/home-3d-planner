import {validItem,referencedAssets,uid} from './my-items-data.js';
const DB='my-home-assets',VERSION=1;let opening;
function db(){if(!opening)opening=new Promise((resolve,reject)=>{const r=indexedDB.open(DB,VERSION);r.onupgradeneeded=()=>{r.result.createObjectStore('items',{keyPath:'id'});r.result.createObjectStore('assets',{keyPath:'id'});};r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=null;};resolve(r.result);};r.onerror=()=>{opening=null;reject(r.error);};r.onblocked=()=>reject(Error('請關閉其他分頁後重試物品資料庫'));});return opening;}
async function read(store,key){const d=await db();return new Promise((resolve,reject)=>{const r=key===undefined?d.transaction(store).objectStore(store).getAll():d.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function assetIds(){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('assets').objectStore('assets').getAllKeys();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function write(action){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(['items','assets'],'readwrite');t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error??Error('儲存已取消'));try{action(t);}catch(e){t.abort();reject(e);}});}
let cloudStore=null;
let retainedAssets=()=>new Set();
export const setRetainedAssets=reader=>{retainedAssets=reader;};
export const setCloudStore=store=>{cloudStore=store;};
export const localItems=()=>read('items');
export const localAsset=id=>read('assets',id);
export const listItems=()=>cloudStore?cloudStore.listItems():localItems();
export const getAsset=id=>cloudStore?cloudStore.getAsset(id):localAsset(id);
export async function saveItem(item,assets=[]){if(cloudStore)return cloudStore.saveItem(item,assets);if(!validItem(item))throw Error('物品資料不完整或尺寸不在 10–500 cm');const known=new Set(await assetIds());assets.forEach(a=>known.add(a.id));if(referencedAssets(item).some(id=>!known.has(id)))throw Error('圖片或模型遺失，請重新匯入');await write(t=>{for(const a of assets)t.objectStore('assets').put(a);t.objectStore('items').put({...item,updatedAt:new Date().toISOString()});});}
export async function deleteItem(id){if(cloudStore)return cloudStore.deleteItem(id);await write(t=>t.objectStore('items').delete(id));await collectAssets();}
export async function collectAssets(){
  if(cloudStore)return;
  // 場景仍有快照使用模型時保留 binary；不以目前面板快取判斷。
  let scene;try{scene=JSON.parse(localStorage.getItem('my-home-studio:v1')??'{"furniture":[]}');if(!Array.isArray(scene.furniture))return;}catch{return;}
  const items=await listItems(),used=new Set([...items.flatMap(referencedAssets),...retainedAssets()]);for(const f of scene.furniture)if(f.model?.assetId)used.add(f.model.assetId);
  const unused=(await assetIds()).filter(id=>!used.has(id));if(unused.length)await write(t=>unused.forEach(id=>t.objectStore('assets').delete(id)));
}
export async function imageAsset(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('圖片請使用 JPG、PNG 或 WebP');if(file.size>20*1024*1024)throw Error('單張原圖請小於 20 MB');let bitmap;try{bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bitmap,0,0,c.width,c.height);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.85));if(!blob)throw Error('圖片轉換失敗');return {id:uid(),kind:'image',name:file.name,mime:blob.type,blob};}finally{bitmap?.close();}}
async function base64(blob){const bytes=new Uint8Array(await blob.arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
export async function exportItems(){const items=await listItems(),ids=new Set(items.flatMap(referencedAssets)),assets=[];for(const id of ids){const a=await getAsset(id);if(!a)throw Error('有圖片或模型遺失，無法製作完整備份');assets.push({id:a.id,kind:a.kind,name:a.name,mime:a.mime,data:await base64(a.blob)});}const backup=new Blob([JSON.stringify({format:'my-home-items',version:1,exportedAt:new Date().toISOString(),items,assets})],{type:'application/json'});if(backup.size>150*1024*1024)throw Error('完整備份超過本版 150 MB 上限，請先縮減大型模型');return backup;}
export async function importItems(file,validateModel){
  if(file.size>150*1024*1024)throw Error('備份超過 150 MB，請使用較小的備份');const data=JSON.parse(await file.text());if(data.format!=='my-home-items'||data.version!==1||!Array.isArray(data.items)||!Array.isArray(data.assets)||data.items.length>500||data.assets.length>4500||!data.items.every(validItem))throw Error('備份格式不符');
  const map=new Map(),assets=[];for(const a of data.assets){if(typeof a.id!=='string'||map.has(a.id)||!['image','model'].includes(a.kind)||typeof a.data!=='string'||a.data.length>36*1024*1024||typeof a.name!=='string'||typeof a.mime!=='string')throw Error('備份資產格式不符');const bytes=Uint8Array.from(atob(a.data),c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:a.mime});const id=uid();map.set(a.id,id);assets.push({id,kind:a.kind,name:a.name,mime:a.mime,blob});}
  const itemIds=new Set();for(const i of data.items){if(itemIds.has(i.id)||referencedAssets(i).some(id=>!map.has(id)))throw Error('備份有重複物品或缺少資產');itemIds.add(i.id);}
  // 所有內容先驗證，再以單一 transaction 寫入；匯入一律新增副本，不覆蓋本機。
  for(const a of assets)if(a.kind==='image'){if(!['image/jpeg','image/png','image/webp'].includes(a.mime))throw Error('圖片格式不支援');const image=await createImageBitmap(a.blob);image.close();}
  const items=[];for(const old of data.items){const i={...old,id:uid(),images:old.images.map(id=>map.get(id)),model:{...old.model}};if(i.model.assetId){i.model.assetId=map.get(i.model.assetId);const a=assets.find(a=>a.id===i.model.assetId);if(a.kind!=='model')throw Error('模型資產類型不符');i.model.sourceSize=await validateModel(a.blob,i.model);}if(i.images.some(id=>assets.find(a=>a.id===id).kind!=='image'))throw Error('圖片資產類型不符');items.push(i);}
  if(cloudStore){await cloudStore.importItems(items,assets);return items.length;}
  const used=new Set(items.flatMap(referencedAssets));await write(t=>{for(const a of assets)if(used.has(a.id))t.objectStore('assets').put(a);for(const i of items)t.objectStore('items').put(i);});return items.length;
}
