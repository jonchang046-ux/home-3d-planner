import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {createFurnitureModel} from './furniture-factory.js';
import {getAsset} from './my-items-store.js';
import {itemTypes} from './my-items-data.js';
const cache=new Map();
export function disposeModel(group){const geometries=new Set(),materials=new Set(),textures=new Set();group?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.dispose();});}
function jsonFrom(data,kind){if(kind==='gltf')return JSON.parse(new TextDecoder().decode(data));const v=new DataView(data);if(v.byteLength<20||v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==v.byteLength||v.getUint32(16,true)!==0x4e4f534a)throw Error('不是有效的 GLB 2.0');const len=v.getUint32(12,true);if(len+20>v.byteLength)throw Error('GLB 檔案損壞');return JSON.parse(new TextDecoder().decode(new Uint8Array(data,20,len)).trim());}
export async function parseModel(blob,kind){
  if(kind==='future-ai-generated')kind='glb';
  if(blob.size>25*1024*1024)throw Error('模型請小於 25 MB');if(!['glb','gltf'].includes(kind))throw Error('請使用 GLB 或內嵌資源的 GLTF');
  const data=await blob.arrayBuffer(),json=jsonFrom(data,kind);if(json.asset?.version!=='2.0')throw Error('只支援 glTF 2.0');
  for(const a of [...(json.buffers??[]),...(json.images??[])])if(a.uri&&!a.uri.startsWith('data:'))throw Error('請匯出單一 GLB，或圖片與 buffer 全部內嵌的 GLTF；不讀取外部網址');
  if((json.extensionsRequired??[]).some(x=>['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'].includes(x)))throw Error('此模型含壓縮格式，請重新匯出未使用 Draco／Meshopt／KTX2 的 GLB');
  if((json.accessors??[]).some(a=>a.count>1500000)||(json.buffers??[]).some(b=>b.byteLength>80*1024*1024))throw Error('模型解壓後過大，請先簡化');
  const modelURLs=new Set(),manager=new THREE.LoadingManager();manager.setURLModifier(url=>{if(url.startsWith('blob:')){modelURLs.add(url);return url;}if(url.startsWith('data:'))return url;throw Error('模型含外部資源，請改用內嵌 GLB');});
  const loader=new GLTFLoader(manager);let gltf;try{gltf=await loader.parseAsync(kind==='gltf'?JSON.stringify(json):data,'');}finally{modelURLs.forEach(u=>URL.revokeObjectURL(u));}const root=gltf.scene;
  let triangles=0,unsupported=false;root.traverse(o=>{if(o.isSkinnedMesh||o.isInstancedMesh)unsupported=true;if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
  if(unsupported||triangles>500000){disposeModel(root);throw Error(unsupported?'此版匯入靜態家具；請先將骨架／實例化模型轉為一般網格':'模型超過 50 萬三角形，請先簡化');}
  root.traverse(o=>{if(o.isLight||o.isCamera)o.visible=false;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return root;
}
function cloneOwned(template){const root=template.clone(true),materials=new Map(),geometries=new Map(),textures=new Map();root.traverse(o=>{if(o.geometry){if(!geometries.has(o.geometry))geometries.set(o.geometry,o.geometry.clone());o.geometry=geometries.get(o.geometry);}if(o.material){const copy=m=>{if(!materials.has(m)){const c=m.clone();for(const key of Object.keys(c))if(c[key]?.isTexture){const original=c[key];if(!textures.has(original)){const texture=original.clone();texture.userData.sharedImage=true;textures.set(original,texture);}c[key]=textures.get(original);}materials.set(m,c);}return materials.get(m);};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);}});return root;}
export function normalizedModel(template,model){const root=new THREE.Group();root.add(cloneOwned(template));root.rotation.set(THREE.MathUtils.degToRad(model.rotationX??0),THREE.MathUtils.degToRad(model.rotationY??0),0);const wrapper=new THREE.Group();wrapper.add(root);wrapper.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(wrapper,true),size=box.getSize(new THREE.Vector3());if(size.toArray().some(n=>!Number.isFinite(n)||n<=1e-9)){disposeModel(wrapper);throw Error('模型缺少有效的立體外框');}root.position.set(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);return {root:wrapper,size:size.toArray()};}
export function fittedModel(template,f){const {root,size}=normalizedModel(template,f.model),target=[f.width/100,f.height/100,f.depth/100],scales=target.map((n,i)=>n/size[i]);if(f.model.scaleMode==='stretch')root.scale.fromArray(scales);else root.scale.setScalar(Math.min(...scales));
  // 原模型材質保留；只有使用者改色後才套用 tint，貼圖仍然保留。
  if(f.model.tint)root.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])if(m.color)m.color.set(f.color);});return root;
}
export async function validateModel(blob,model){const template=await parseModel(blob,model.kind);let normalized;try{normalized=normalizedModel(template,model);return normalized.size;}finally{disposeModel(normalized?.root);disposeModel(template);}}
export async function templateFor(id,kind){if(!cache.has(id)){const pending=getAsset(id).then(a=>{if(!a)throw Error('模型檔案遺失，暫以簡化外觀顯示');return parseModel(a.blob,kind);});cache.set(id,pending);pending.catch(()=>cache.delete(id));}return cache.get(id);}
export function itemFallback(item){return createFurnitureModel({...item,type:itemTypes[item.itemType??item.type]?.fallback??item.type});}
export async function createItemModel(item,blob){if(!item.model?.assetId)return itemFallback(item);const template=blob?await parseModel(blob,item.model.kind):await templateFor(item.model.assetId,item.model.kind);try{return fittedModel(template,item);}finally{if(blob)disposeModel(template);}}
export function releaseCache(){for(const promise of cache.values())promise.then(disposeModel).catch(()=>{});cache.clear();}
export function pruneModelCache(ids){const used=new Set(ids);for(const [id,promise]of cache)if(!used.has(id)){cache.delete(id);promise.then(disposeModel).catch(()=>{});}}
