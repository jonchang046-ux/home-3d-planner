import {validModel} from './my-items-data.js';
import {defaults,validFurniture,normalizeFurniture} from './furniture.js';
export const STORAGE_KEY='my-home-studio:v1';
let scope;try{const owner=globalThis.localStorage?.getItem('home-cloud:active-owner'),session=JSON.parse(globalThis.localStorage?.getItem('home-cloud:session:fpzuumflfmzclphqoaij')||'null');if(owner&&session?.user?.id===owner)scope=owner;}catch{}
export function setStorageOwner(owner){scope=owner;if(owner)localStorage.setItem('home-cloud:active-owner',owner);else localStorage.removeItem('home-cloud:active-owner');}
const currentKey=()=>scope?`home-cloud:scene:${scope}`:STORAGE_KEY;
const color=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
export function load(storage=localStorage){
  try{const raw=storage.getItem(currentKey());if(!raw)return {state:defaults(),message:'配置將儲存在此瀏覽器'};
    const s=JSON.parse(raw);if(s.version!==1||!Array.isArray(s.furniture))throw Error('格式不符');
    let migrated=false,unknown=false;
    s.furniture=s.furniture.map(f=>{const normalized=normalizeFurniture(f);if(normalized!==f)migrated=true;if(normalized?.originalType)unknown=true;return normalized;});
    if(s.furniture.length>200||!s.furniture.every(f=>validFurniture(f)&&(!f.model||validModel(f.model)))||new Set(s.furniture.map(f=>f.id)).size!==s.furniture.length||!color(s.wallColor)||!color(s.floorColor))throw Error('格式不符');
    // 只在記憶體對應類型，不因升級自動覆寫使用者的舊資料。
    return {state:s,message:unknown?'已保留配置；未識別類型以自訂物件顯示':migrated?'已恢復配置，舊家具類型已相容':'已恢復上次配置',warning:unknown};
  }catch{return {state:defaults(),message:'無法讀取舊配置，已載入預設；舊資料在下次修改前保留',warning:true};}
}
export function save(state,storage=localStorage){try{storage.setItem(currentKey(),JSON.stringify(state));return true;}catch{return false;}}
