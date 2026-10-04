import {request,readSession} from './cloud-api.js';
import {dateOrdinal,localDateString} from './item-dates.js';
export const maintenanceTypes={repair:'維修',maintenance:'保養',cleaning:'清潔',part_replacement:'零件更換',other:'其他'};
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export function newMaintenance(){return {id:crypto.randomUUID(),type:'maintenance',date:localDateString(),title:'',description:'',cost:null,service_provider:'',next_service_date:null,revision:0};}
export function parseMaintenance(input,record){
 const result={id:record.id,revision:record.revision,...Object.fromEntries(['type','date','title','description','service_provider'].map(k=>[k,String(input[k]??'').trim()]))};
 if(!uuid(result.id)||!Object.hasOwn(maintenanceTypes,result.type))throw Error('請選擇紀錄類型。');
 for(const [key,max] of [['title',120],['description',2000],['service_provider',200]])if(result[key].length>max)throw Error('紀錄內容過長，請縮短文字。');
 if(!result.title)throw Error('請填寫紀錄標題。');
 if(dateOrdinal(result.date)===null||result.date<'1900-01-01')throw Error('請填寫有效紀錄日期。');
 const price=String(input.cost??'').trim();result.cost=price===''?null:Number(price);
 if(price!==''&&(!/^\d+(\.\d{1,2})?$/.test(price)||!Number.isFinite(result.cost)||result.cost>100000000))throw Error('費用請填 0–100,000,000 元，最多兩位小數，或留白。');
 result.next_service_date=input.next_service_date||null;
 if(result.next_service_date&&(dateOrdinal(result.next_service_date)===null||result.next_service_date<result.date))throw Error('下次保養日期不能早於本次紀錄日期。');
 return result;
}
const scope=()=>readSession()?.user?.id;
function assertScope(actor){if(!actor||actor!==scope())throw Error('登入帳號已變更，請重新整理後再試。');}
export async function listMaintenance(itemId){
 if(!uuid(itemId))throw Error('物件尚未完成雲端同步。');const actor=scope();assertScope(actor);const rows=[];
 for(let offset=0;;offset+=500){const page=await request(`/rest/v1/planner_item_maintenance?item_id=eq.${itemId}&select=*&order=date.desc,id.desc&limit=500&offset=${offset}`);assertScope(actor);if(!Array.isArray(page))throw Error('維修紀錄回應格式不符。');rows.push(...page);if(page.length<500)return rows;if(offset>=100000)throw Error('紀錄超過讀取上限。');}
}
export async function writeMaintenance(itemId,record,deleting=false){
 if(!uuid(itemId)||!uuid(record.id))throw Error('物件 ID 不完整，請重新整理。');const actor=scope();assertScope(actor);
 const result=await request('/rest/v1/rpc/planner_maintenance_write',{method:'POST',body:{p_item:itemId,p_record:record,p_expected_revision:record.revision??0,p_delete:deleting}});assertScope(actor);
 if(!result||result.id!==record.id||(!deleting&&result.item_id!==itemId))throw Error('維修紀錄儲存回應不符，請重新讀取紀錄確認。');return result;
}
