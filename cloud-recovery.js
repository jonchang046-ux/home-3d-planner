import {validFurniture} from './furniture.js';
import {validItem,validModel,referencedAssets} from './my-items-data.js';
export function recoveryCopies(data,owner,home,current,makeId=()=>crypto.randomUUID()){
 if(data?.format!=='home-cloud-recovery'||data.owner!==owner||data.bundle?.home!==home)throw Error('此備份不屬於目前帳號與房屋');
 const desired=data.bundle.desired,fs=desired?.furniture,items=desired?.items;
 if(!Array.isArray(fs)||!Array.isArray(items)||fs.length+current.furniture.length>200||items.length+current.items.length>500)throw Error('備份格式不符，或還原後超過 200 件家具／500 件物品上限');
 if(!fs.every(f=>validFurniture(f)&&(!f.model||validModel(f.model)))||!items.every(validItem))throw Error('備份有無效尺寸或模型設定');
 const available=new Set(current.assets.map(a=>a.id));
 if([...fs,...items].flatMap(referencedAssets).some(id=>!available.has(id)))throw Error('備份包含雲端已清除或尚未上傳的圖片／模型；請先匯入含 binary 的 My Items 完整備份');
 const ids=new Map(items.map(i=>[i.id,makeId()]));
 return {items:items.map(i=>({...structuredClone(i),id:ids.get(i.id),name:(i.name+'（還原）').slice(0,60),updatedAt:new Date().toISOString()})),furniture:fs.map(f=>({...structuredClone(f),id:makeId(),name:(f.name+'（還原）').slice(0,60),...(ids.has(f.libraryItemId)?{libraryItemId:ids.get(f.libraryItemId)}:{})}))};
}
