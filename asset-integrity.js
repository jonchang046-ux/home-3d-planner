// Asset IDs identify immutable uploads. Runtime loading status is never stored here.
export async function checksum(blob){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function verifyAsset(asset,meta){
 if(!(asset?.blob instanceof Blob))return false;
 if(meta.size!==undefined&&asset.blob.size!==meta.size)return false;
 if(meta.sha256&&await checksum(asset.blob)!==meta.sha256)return false;
 return true;
}
export function protectModelIntent(furniture,items,previous=[]){
 const library=new Map(items.map(i=>[i.id,i])),prior=new Map(previous.map(f=>[f.id,f]));
 return furniture.map(f=>{
  const copy=structuredClone(f),item=library.get(f.libraryItemId),old=prior.get(f.id);
  // The library owns asset selection; instance dimensions, tint and fitting remain editable.
  const canonical=item?.model??old?.model;
  if(canonical){
   if(canonical.assetId===copy.model?.assetId&&canonical.kind===copy.model?.kind)copy.model={...copy.model,assetId:canonical.assetId,kind:canonical.kind};
   else copy.model=structuredClone(canonical);
  }
  return copy;
 });
}
