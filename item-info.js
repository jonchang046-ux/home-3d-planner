// Instance metadata lives on planner_furniture.data.itemInfo. The row ID/home ID,
// membership policies and revision remain authoritative; name is furniture.name.
export const itemCategories={furniture:'家具',appliance:'家電',bathroom:'衛浴',kitchen:'廚房',lighting:'照明',other:'其他'};
export const itemStatuses={planning:'規劃中',purchased:'已購買',installed:'已安裝',retired:'已淘汰'};
const limits={brand:100,model:100,source:200,notes:2000};
export function suggestedCategory(f){
  if(['toilet','basin','wallBasin','bathVanity','mirror','shower','showerScreen'].includes(f.type))return 'bathroom';
  if(['countertop','hob','hood','kitchenSink','wallCabinet'].includes(f.type))return 'kitchen';
  if(['television','fridge','washer','topWasher'].includes(f.type))return 'appliance';
  return f.type==='custom'?'other':'furniture';
}
export function emptyItemInfo(f){return {version:1,category:suggestedCategory(f),status:'planning',brand:'',model:'',purchasePrice:null,currency:'TWD',purchaseDate:null,installDate:null,source:'',notes:''};}
const dateOK=v=>v===null||(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='1900-01-01'&&v<='9999-12-31'&&Number.isFinite(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v);
export function validItemInfo(v){return !!v&&typeof v==='object'&&!Array.isArray(v)&&v.version===1&&Object.hasOwn(itemCategories,v.category)&&Object.hasOwn(itemStatuses,v.status)&&v.currency==='TWD'&&Object.entries(limits).every(([k,max])=>typeof v[k]==='string'&&v[k].length<=max)&&(v.purchasePrice===null||(Number.isFinite(v.purchasePrice)&&v.purchasePrice>=0&&v.purchasePrice<=100000000))&&dateOK(v.purchaseDate)&&dateOK(v.installDate);}
// Unknown metadata must not invalidate the whole scene or get silently replaced.
export const canEditItemInfo=f=>f.itemInfo===undefined||validItemInfo(f.itemInfo);
export function parseItemInfo(input,f){
  if(!canEditItemInfo(f))throw Error('此物品資訊格式尚不支援，原資料已保留。請更新網頁後重試。');
  const name=String(input.name??'').trim();if(!name||name.length>60)throw Error('物品名稱請填寫 1–60 個字。');
  const info={...(f.itemInfo??emptyItemInfo(f)),category:input.category,status:input.status};
  for(const [key,max] of Object.entries(limits)){info[key]=String(input[key]??'').trim();if(info[key].length>max)throw Error(`${key==='notes'?'備註':'文字欄位'}過長，請縮短內容。`);}
  const price=String(input.purchasePrice??'').trim();info.purchasePrice=price===''?null:Number(price);
  if(price!==''&&(!/^\d+(\.\d{1,2})?$/.test(price)||!Number.isFinite(info.purchasePrice)||info.purchasePrice>100000000))throw Error('價格請填 0–100,000,000 元，最多兩位小數；也可以留白。');
  for(const key of ['purchaseDate','installDate'])info[key]=input[key]||null;
  if(!validItemInfo(info))throw Error('請檢查分類、狀態與日期（1900 年以後的有效日期）。');
  return {name,itemInfo:info};
}
export const itemInfoSignature=f=>JSON.stringify([f.name,f.itemInfo??null]);
