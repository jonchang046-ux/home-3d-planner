// Instance metadata lives on planner_furniture.data.itemInfo. The row ID/home ID,
// membership policies and revision remain authoritative; name is furniture.name.
import {dateOrdinal} from './item-dates.js';
export const itemCategories={furniture:'家具',appliance:'家電',bathroom:'衛浴',kitchen:'廚房',lighting:'照明',other:'其他'};
export const itemStatuses={planning:'規劃中',purchased:'已購買',installed:'已安裝',retired:'已淘汰'};
const limits={brand:100,model:100,source:200,notes:2000};
const detailLimits={serialNumber:120,orderNumber:120,receiptNotes:1000,serviceContact:500};
export function suggestedCategory(f){
  if(['toilet','basin','wallBasin','bathVanity','mirror','shower','showerScreen'].includes(f.type))return 'bathroom';
  if(['countertop','hob','hood','kitchenSink','wallCabinet'].includes(f.type))return 'kitchen';
  if(['television','fridge','washer','topWasher'].includes(f.type))return 'appliance';
  return f.type==='custom'?'other':'furniture';
}
export function emptyItemInfo(f){return {version:1,category:suggestedCategory(f),status:'planning',brand:'',model:'',purchasePrice:null,currency:'TWD',purchaseDate:null,installDate:null,source:'',notes:'',warrantyStartDate:null,warrantyEndDate:null,warrantyMonths:null,serialNumber:'',orderNumber:'',receiptNotes:'',manualUrl:'',productUrl:'',serviceContact:''};}
const dateOK=v=>v===null||(typeof v==='string'&&v>='1900-01-01'&&dateOrdinal(v)!==null);
export function validItemUrl(value){
  if(typeof value!=='string'||value.length>2000)return false;
  if(value==='')return true;
  if(/\s/.test(value))return false;
  try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!!url.hostname&&!url.username&&!url.password;}catch{return false;}
}
const optional=(v,key,validate)=>!Object.hasOwn(v,key)||validate(v[key]);
export function validItemInfo(v){
  return !!v&&typeof v==='object'&&!Array.isArray(v)&&v.version===1&&Object.hasOwn(itemCategories,v.category)&&Object.hasOwn(itemStatuses,v.status)&&v.currency==='TWD'&&Object.entries(limits).every(([k,max])=>typeof v[k]==='string'&&v[k].length<=max)&&(v.purchasePrice===null||(Number.isFinite(v.purchasePrice)&&v.purchasePrice>=0&&v.purchasePrice<=100000000))&&dateOK(v.purchaseDate)&&dateOK(v.installDate)
    &&Object.entries(detailLimits).every(([key,max])=>optional(v,key,value=>typeof value==='string'&&value.length<=max))
    &&['warrantyStartDate','warrantyEndDate'].every(key=>optional(v,key,dateOK))
    &&optional(v,'warrantyMonths',value=>value===null||(Number.isInteger(value)&&value>=1&&value<=1200))
    &&['manualUrl','productUrl'].every(key=>optional(v,key,validItemUrl))
    &&!(v.warrantyStartDate&&v.warrantyEndDate&&v.warrantyStartDate>v.warrantyEndDate);
}
// Unknown metadata must not invalidate the whole scene or get silently replaced.
export const canEditItemInfo=f=>f.itemInfo===undefined||validItemInfo(f.itemInfo);
export function parseItemInfo(input,f){
  if(!canEditItemInfo(f))throw Error('此物品資訊格式尚不支援，原資料已保留。請更新網頁後重試。');
  const name=String(input.name??'').trim();if(!name||name.length>60)throw Error('物品名稱請填寫 1–60 個字。');
  const info={...emptyItemInfo(f),...f.itemInfo,category:input.category,status:input.status};
  for(const [key,max] of Object.entries(limits)){info[key]=String(input[key]??'').trim();if(info[key].length>max)throw Error(`${key==='notes'?'備註':'文字欄位'}過長，請縮短內容。`);}
  const price=String(input.purchasePrice??'').trim();info.purchasePrice=price===''?null:Number(price);
  if(price!==''&&(!/^\d+(\.\d{1,2})?$/.test(price)||!Number.isFinite(info.purchasePrice)||info.purchasePrice>100000000))throw Error('價格請填 0–100,000,000 元，最多兩位小數；也可以留白。');
  for(const key of ['purchaseDate','installDate'])info[key]=input[key]||null;
  if(!validItemInfo(info))throw Error('請檢查分類、狀態與日期（1900 年以後的有效日期）。');
  return {name,itemInfo:info};
}
// Detailed editing extends the same version-1 payload. The quick editor above
// deliberately changes only its own fields, preserving extra/future metadata.
export function parseItemDetails(input,f){
  const patch=parseItemInfo(input,f),info=patch.itemInfo;
  for(const [key,max] of Object.entries(detailLimits)){
    info[key]=String(input[key]??'').trim();
    if(info[key].length>max)throw Error('詳細資訊欄位過長，請縮短內容。');
  }
  for(const key of ['warrantyStartDate','warrantyEndDate'])info[key]=input[key]||null;
  const months=String(input.warrantyMonths??'').trim();info.warrantyMonths=months===''?null:Number(months);
  if(months!==''&&(!/^\d+$/.test(months)||!Number.isInteger(info.warrantyMonths)||info.warrantyMonths<1||info.warrantyMonths>1200))throw Error('保固月數請填 1–1200 的整數，也可以留白。');
  for(const key of ['manualUrl','productUrl']){
    info[key]=String(input[key]??'').trim();
    if(!validItemUrl(info[key]))throw Error('相關連結請填完整的 http:// 或 https:// 網址（最多 2000 字），也可以留白。');
  }
  if(info.warrantyStartDate&&info.warrantyEndDate&&info.warrantyStartDate>info.warrantyEndDate)throw Error('保固到期日不能早於保固開始日。');
  if(!validItemInfo(info))throw Error('請檢查保固日期（1900 年以後的有效日期）與詳細資訊。');
  return patch;
}
export const itemInfoSignature=f=>JSON.stringify([f.name,f.itemInfo??null]);
