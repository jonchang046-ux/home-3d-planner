// Pure transformations shared by migration, synchronization and tests.
export const kinds=['furniture','items','settings','assets'];
export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function stableId(id,map,make=()=>crypto.randomUUID()){if(uuidPattern.test(id))return id;return map[id]??(map[id]=make());}
export function migrateIds(state,items,assets,map,make){const id=x=>stableId(x,map,make),model=m=>m?{...m,...(m.assetId?{assetId:id(m.assetId)}:{})}:m;
 return {state:{...state,furniture:state.furniture.map(f=>({...f,id:id(f.id),...(f.supportParentId?{supportParentId:id(f.supportParentId)}:{}),...(f.libraryItemId?{libraryItemId:id(f.libraryItemId)}:{}),...(f.model?{model:model(f.model)}:{})}))},items:items.map(i=>({...i,id:id(i.id),images:i.images.map(id),model:model(i.model)})),assets:assets.map(a=>({...a,id:id(a.id)}))};
}
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,canonical(v[k])])):v;
export function changesFor(kind,desired,baseline){const changes=[],next=new Map(desired.map(d=>[d.id,d]));for(const d of desired){const old=baseline.find(r=>r.id===d.id);if(!old||old.deleted||JSON.stringify(canonical(old.data))!==JSON.stringify(canonical(d)))changes.push({kind,id:d.id,revision:old?.revision??0,data:d,deleted:false});}for(const old of baseline)if(!old.deleted&&!next.has(old.id))changes.push({kind,id:old.id,revision:old.revision,data:old.data,deleted:true});return changes;}
export function applyResults(rows,results){const next=structuredClone(rows);for(const {kind,row}of results){const index=next[kind].findIndex(r=>r.id===row.id);if(index<0)next[kind].push(row);else next[kind][index]=row;}return next;}
export const liveData=rows=>rows.filter(r=>!r.deleted).map(r=>r.data);
