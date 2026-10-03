import {readRows,writeRows,uploadAsset,downloadAsset,readSession,unusedAssets,deleteUnusedAssets} from './cloud-api.js';
import {recoveryCopies} from './cloud-recovery.js';
import {kinds,changesFor,applyResults,liveData,migrateIds,stableId} from './cloud-data.js';
import {cacheAssets,cachedAsset} from './cloud-cache.js';
import {setCloudStore,localItems,localAsset} from './my-items-store.js';
import {referencedAssets,validItem,validModel} from './my-items-data.js';
import {validFurniture} from './furniture.js';
import {setStorageOwner,save,STORAGE_KEY} from './storage.js';
import {validRoomMaterials} from './room-materials.js';

export function createCloudSync({getState,setState,status,changed,isEditing}){
 let owner,bundle,timer,running,active=false,conflict=false,epoch=0;
 const key=()=>`home-cloud:bundle:${owner}`;
 const empty=()=>Object.fromEntries(kinds.map(k=>[k,[]]));
 function cache(){localStorage.setItem(key(),JSON.stringify(bundle));}
 function assertOwner(){if(!owner||readSession()?.user.id!==owner)throw Error('帳號已變更，請重新整理後再操作');}
 function pending(){if(!bundle)return [];return kinds.flatMap(k=>changesFor(k,bundle.desired[k],bundle.rows[k]));}
 function sceneState(){const setting=bundle.desired.settings[0];if(!setting)throw Error('雲端房屋缺少配色資料');if(!validRoomMaterials(setting.roomMaterials))throw Error('房間地板資料格式不符，保留目前配置');return {version:1,wallColor:setting.wallColor,floorColor:setting.floorColor,roomMaterials:setting.roomMaterials??{},furniture:bundle.desired.furniture};}
 function validate(rows){for(const r of rows.furniture)if(!r.deleted&&(!validFurniture(r.data)||(r.data.model&&!validModel(r.data.model))))throw Error('雲端家具資料格式不符，保留目前配置');for(const r of rows.items)if(!r.deleted&&!validItem(r.data))throw Error('雲端物品格式不符，保留目前配置');const settings=liveData(rows.settings);if(settings.length!==1||![settings[0].wallColor,settings[0].floorColor].every(c=>/^#[a-f0-9]{6}$/i.test(c)))throw Error('雲端配色資料不完整');}
 async function fetchHome(){assertOwner();const homes=await readRows('homes'),selected=localStorage.getItem(`home-cloud:selected-home:${owner}`);if(selected&&!homes.some(h=>h.id===selected))throw Error('已登入，但已無法取得所選共享房屋的權限；目前修改仍保留');if(!homes.length)return null;if(!selected&&homes.length>1)throw Error('帳號有多個家，請先從私人登入入口選擇');const home=homes.find(h=>h.id===selected)??homes[0],rows=empty();for(const kind of kinds)rows[kind]=(await readRows(kind)).filter(r=>r.home_id===home.id);validate(rows);assertOwner();return {home:home.id,homeOwner:home.owner_id??owner,rows,desired:Object.fromEntries(kinds.map(k=>[k,liveData(rows[k])])),idMap:{},uploads:[]};}
 function activate(){active=true;setStorageOwner(owner);setCloudStore(store);setState(structuredClone(sceneState()));save(getState());status(pending().length?'尚有待同步修改':'已載入雲端配置');changed();}
 async function inspect(){owner=readSession()?.user.id;if(!owner)return null;const cloud=await fetchHome();return cloud?{count:cloud.desired.furniture.length,items:cloud.desired.items.length}:null;}
 async function useCloud(){const cloud=await fetchHome();if(!cloud)throw Error('雲端仍是空白，請先上傳本機配置');bundle=cloud;cache();activate();}
 async function resume(){owner=readSession()?.user.id;if(!owner)return false;let cached;try{cached=JSON.parse(localStorage.getItem(key()));}catch{}if(!cached||localStorage.getItem('home-cloud:active-owner')!==owner)return false;const selected=localStorage.getItem(`home-cloud:selected-home:${owner}`);if(selected&&selected!==cached.home)throw Error('此裝置保有另一個家的暫存資料，請先匯出備份再切換，未覆蓋資料');bundle=cached;validate(bundle.rows);activate();await refresh();return true;}
 async function migrate(){assertOwner();if(await fetchHome())throw Error('雲端已有配置，已停止上傳，請改用雲端資料');const items=await localItems(),state=structuredClone(getState());
  const ids=new Set([...items.flatMap(referencedAssets),...state.furniture.flatMap(referencedAssets)]),assets=[];
  for(const id of ids){const a=await localAsset(id);if(!a)throw Error('本機有圖片或模型遺失，未上傳配置');assets.push(a);}
  // Persist the mapping before uploading so retries never generate duplicate IDs.
  const migrationKey=`home-cloud:migration:${owner}`,plan=JSON.parse(localStorage.getItem(migrationKey)||'null')??{home:crypto.randomUUID(),idMap:{}};
  const migrated=migrateIds(state,items,assets,plan.idMap);localStorage.setItem(migrationKey,JSON.stringify(plan));
  localStorage.setItem(`home-cloud:local-backup:${Date.now()}`,localStorage.getItem(STORAGE_KEY)||JSON.stringify(state));
  await cacheAssets(owner,migrated.assets);status('正在上傳圖片與模型…');
  const metadata=[];for(const a of migrated.assets)metadata.push(await uploadAsset(a,owner));
  const desired={furniture:migrated.state.furniture,items:migrated.items,settings:[{id:plan.home,wallColor:state.wallColor,floorColor:state.floorColor,roomMaterials:state.roomMaterials??{}}],assets:metadata};
  const changes=kinds.flatMap(k=>changesFor(k,desired[k],[]));const result=await writeRows(plan.home,changes,true);
  bundle={home:plan.home,rows:applyResults(empty(),result),desired,idMap:plan.idMap,uploads:[]};cache();activate();status('已上傳並切換雲端配置');
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(()=>flush().catch(()=>{}),900);}
 function capture(){if(!active)return false;assertOwner();const s=getState();for(const f of s.furniture){f.id=stableId(f.id,bundle.idMap);if(f.supportParentId)f.supportParentId=stableId(f.supportParentId,bundle.idMap);}bundle.desired.furniture=structuredClone(s.furniture);bundle.desired.settings=[{...bundle.desired.settings[0],id:bundle.home,wallColor:s.wallColor,floorColor:s.floorColor,...(Object.keys(s.roomMaterials??{}).length||bundle.desired.settings[0]?.roomMaterials?{roomMaterials:structuredClone(s.roomMaterials??{})}:{})}];epoch++;cache();save(s);status(conflict?'資料有衝突，修改已保留在此裝置':'待同步…',conflict);if(!conflict)schedule();return true;}
 async function flush(){if(!active)return;if(running)return running;assertOwner();if(conflict)throw Error('請先處理同步衝突');clearTimeout(timer);
  // Assign the in-flight promise before its body runs, including no-change refreshes.
  running=Promise.resolve().then(async()=>{try{status('儲存中…');for(const id of [...bundle.uploads]){const a=await cachedAsset(owner,id);if(!a)throw Error('待上傳檔案遺失，請保留本頁');const meta=await uploadAsset(a,bundle.homeOwner??owner,bundle.home);bundle.desired.assets=bundle.desired.assets.filter(m=>m.id!==id).concat(meta);bundle.uploads=bundle.uploads.filter(x=>x!==id);cache();}
   const changes=pending();if(changes.length){const result=await writeRows(bundle.home,changes);assertOwner();bundle.rows=applyResults(bundle.rows,result);cache();}
   status(pending().length?'待同步…':'已儲存至雲端');if(pending().length)schedule();
  }catch(e){conflict=e.code==='40001'||e.message.includes('revision_conflict');status(conflict?'同步衝突，點「雲端」處理':'同步失敗，修改已保留；連線後重試',true);changed();throw e;}finally{running=null;}});return running;
 }
 async function refresh(){if(!active)return;assertOwner();const before=epoch;try{await flush();if(pending().length||isEditing()||epoch!==before)return;const cloud=await fetchHome();if(!cloud)throw Error('雲端房屋暫時無法取得');if(pending().length||isEditing()||epoch!==before)return;bundle={...cloud,idMap:bundle.idMap};cache();setState(structuredClone(sceneState()));save(getState());status('已同步雲端最新配置');}catch(e){status(conflict?'同步衝突，點「雲端」處理':'同步失敗，保留目前配置',true);}}
 async function resolveCloud(){if(running)await running.catch(()=>{});localStorage.setItem(`${key()}:conflict-backup:${Date.now()}`,JSON.stringify(bundle));await useCloud();conflict=false;}
 const store={
  listItems:async()=>{assertOwner();return structuredClone(bundle.desired.items);},
  getAsset:async id=>{assertOwner();const cached=await cachedAsset(owner,id);if(cached)return cached;const meta=bundle.desired.assets.find(a=>a.id===id);if(!meta)return null;const a={...meta,blob:await downloadAsset(meta)};assertOwner();await cacheAssets(owner,[a]);return a;},
  saveItem:async(item,assets=[])=>{assertOwner();if(!validItem(item))throw Error('物品資料格式不符');await cacheAssets(owner,assets);for(const id of referencedAssets(item))if(!assets.some(a=>a.id===id)&&!bundle.desired.assets.some(a=>a.id===id)&&!bundle.uploads.includes(id))throw Error('圖片或模型遺失');bundle.uploads=[...new Set([...bundle.uploads,...assets.map(a=>a.id)])];bundle.desired.items=bundle.desired.items.filter(i=>i.id!==item.id).concat({...item,updatedAt:new Date().toISOString()});epoch++;cache();status('物品已暫存，待同步…');schedule();},
  deleteItem:async id=>{assertOwner();if(bundle.desired.furniture.some(f=>f.libraryItemId===id))throw Error('空間仍有這個物品的副本；請先刪除副本，再刪除物品庫紀錄');bundle.desired.items=bundle.desired.items.filter(i=>i.id!==id);epoch++;cache();schedule();},
  importItems:async(items,assets)=>{assertOwner();await cacheAssets(owner,assets);bundle.uploads=[...new Set([...bundle.uploads,...assets.map(a=>a.id)])];bundle.desired.items.push(...items);epoch++;cache();schedule();}
 };
 function stop(){clearTimeout(timer);active=false;setCloudStore(null);setStorageOwner(null);}
 function backup(){return new Blob([JSON.stringify({format:'home-cloud-recovery',owner,bundle,state:getState()},null,2)],{type:'application/json'});}
 async function restoreBackup(file){assertOwner();if(!active||conflict)throw Error('請先載入雲端版本，再將備份還原成副本');if(file.size>20*1024*1024)throw Error('救援備份請小於 20 MB');const data=JSON.parse(await file.text());await flush();if(pending().length||bundle.uploads.length)throw Error('請等目前修改同步完成');const fresh=await fetchHome();if(!fresh)throw Error('無法取得雲端房屋');const copies=recoveryCopies(data,owner,bundle.home,fresh.desired);localStorage.setItem(`${key()}:before-restore:${Date.now()}`,JSON.stringify(bundle));bundle={...fresh,idMap:bundle.idMap};bundle.desired.furniture.push(...copies.furniture);bundle.desired.items.push(...copies.items);epoch++;cache();setState(structuredClone(sceneState()));save(getState());schedule();return copies.furniture.length;}
 async function cleanupAssets(confirm=false){assertOwner();if(!active||conflict)throw Error('請先完成同步與衝突處理');await flush();if(pending().length||bundle.uploads.length)throw Error('請等所有修改上傳完成');const candidates=await unusedAssets(confirm,bundle.home);if(confirm&&candidates.length){await deleteUnusedAssets(candidates.map(a=>a.path));await refresh();}return candidates;}
 return {inspect,resume,useCloud,migrate,capture,flush,refresh,resolveCloud,stop,backup,restoreBackup,cleanupAssets,get active(){return active;},get conflict(){return conflict;},get pending(){return pending().length+(bundle?.uploads.length??0);}};
}
