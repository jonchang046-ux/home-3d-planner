import {maintenanceTypes,newMaintenance,parseMaintenance,listMaintenance,writeMaintenance} from './maintenance-data.js';
import {maintenanceSummary,displayDate} from './item-dates.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createMaintenanceUI({isCloud,prepareWrite,toast}){
 const drafts=new Map();let busy=0;
 async function renderSummary(node,itemId){
  if(!node)return;if(!isCloud()){node.textContent='維修／保養紀錄：登入雲端配置後查看';return;}
  node.textContent='正在讀取維修／保養紀錄…';
  try{const rows=await listMaintenance(itemId);if(node.isConnected){const s=maintenanceSummary(rows);node.textContent=s.latestDate?`最近維修／保養：${displayDate(s.latestDate)}`:'尚無已完成的維修／保養紀錄';}}
  catch{if(node.isConnected)node.textContent='紀錄暫時無法載入，請至詳細資料重試';}
 }
 async function mount(container,itemId){
  const token=Symbol();container._maintenanceToken=token;
  const live=()=>container.isConnected&&container._maintenanceToken===token;
  if(!isCloud()){container.innerHTML='<p class="inline-note">維修／保養紀錄需使用雲端配置。登入後再新增紀錄。</p>';return;}
  container.innerHTML='<p class="inline-note">正在讀取維修／保養紀錄…</p>';
  let rows=[];
  function message(text){if(live()){const error=container.querySelector('.maintenance-error');error.hidden=false;error.textContent=text;}}
  function draw(){
   if(!live())return;const dates=maintenanceSummary(rows);
   const next=dates.nextDate?`下次保養：${displayDate(dates.nextDate)}`:dates.overdueDate?`下次保養：已逾期｜${displayDate(dates.overdueDate)}（紀錄預定日）`:'下次保養：未設定';
   container.innerHTML=`<p class="maintenance-next">${esc(next)}</p><p class="inline-note">紀錄依日期由新到舊排列。下次保養取最近的未來日期；已完成或取消的預定日可編輯該筆紀錄清除。</p><p class="maintenance-error error" role="alert" hidden></p><div class="button-row"><button type="button" id="maintenance-add">＋ 新增紀錄</button><button type="button" id="maintenance-reload">重新讀取</button></div><div class="maintenance-list">${rows.map(r=>`<article class="maintenance-record"><div class="maintenance-record-head"><b>${esc(r.title)}</b><span>${displayDate(r.date)}</span></div><p>${maintenanceTypes[r.type]??'其他'}${r.cost!==null?` · NT$ ${Number(r.cost).toLocaleString('zh-TW')}`:''}${r.service_provider?' · '+esc(r.service_provider):''}</p>${r.description?`<p class="maintenance-description">${esc(r.description)}</p>`:''}${r.next_service_date?`<small>預定下次：${displayDate(r.next_service_date)}</small>`:''}<div class="button-row"><button type="button" data-maintenance-edit="${esc(r.id)}">編輯</button><button type="button" class="danger" data-maintenance-delete="${esc(r.id)}">刪除</button></div></article>`).join('')||'<p class="empty">還沒有紀錄，可從第一次安裝、維修或保養開始。</p>'}</div><div class="maintenance-editor"></div>`;
   container.querySelector('#maintenance-reload').onclick=()=>{if(!busy)load();};
   container.querySelector('#maintenance-add').onclick=()=>{if(busy)return;if(drafts.has(itemId)){message('請先儲存或捨棄目前草稿，再新增紀錄。');return;}edit(newMaintenance());};
   container.querySelectorAll('[data-maintenance-edit]').forEach(b=>b.onclick=()=>{if(busy)return;if(drafts.has(itemId)){message('請先儲存或捨棄目前草稿，再編輯其他紀錄。');return;}edit(rows.find(r=>r.id===b.dataset.maintenanceEdit));});
   container.querySelectorAll('[data-maintenance-delete]').forEach(b=>b.onclick=async()=>{
    if(busy)return;const r=rows.find(r=>r.id===b.dataset.maintenanceDelete);
    if(drafts.has(itemId)){message('請先儲存或捨棄草稿，再刪除紀錄。');return;}
    if(!confirm(`刪除「${r.title}」這筆紀錄？此紀錄刪除後無法復原。`))return;
    busy++;b.disabled=true;
    try{await prepareWrite(itemId);await writeMaintenance(itemId,r,true);rows=rows.filter(x=>x.id!==r.id);draw();toast('紀錄已從雲端刪除');}
    catch(e){message(e.code==='40001'?'紀錄已被其他裝置修改，請重新讀取後再決定是否刪除。':e.message);}
    finally{busy--;b.disabled=false;}
   });
   if(drafts.has(itemId))edit(drafts.get(itemId).record);
  }
  function edit(record){
   if(!record||!live())return;let draft=drafts.get(itemId);if(!draft){draft={record:structuredClone(record),values:{...record}};drafts.set(itemId,draft);}
   const v=draft.values,slot=container.querySelector('.maintenance-editor');
   const date=(name,label)=>`<label>${label}<input type="date" name="${name}" min="1900-01-01" max="9999-12-31" value="${esc(v[name])}"></label>`;
   slot.innerHTML=`<form id="maintenance-form"><h4>${draft.record.revision?'編輯紀錄':'新增紀錄'}</h4><label>類型<select name="type">${Object.entries(maintenanceTypes).map(([k,l])=>`<option value="${k}" ${v.type===k?'selected':''}>${l}</option>`).join('')}</select></label>${date('date','紀錄日期')}<label>標題<input name="title" maxlength="120" required value="${esc(v.title)}"></label><label>內容<textarea name="description" maxlength="2000" rows="3">${esc(v.description)}</textarea></label><label>費用（NT$）<input name="cost" type="number" min="0" max="100000000" step=".01" inputmode="decimal" value="${esc(v.cost)}"></label><label>服務店家／人員<input name="service_provider" maxlength="200" value="${esc(v.service_provider)}"></label>${date('next_service_date','下次保養日期（可留白）')}<p class="error maintenance-form-error" role="alert" hidden></p><div class="button-row"><button type="button" id="maintenance-discard">捨棄草稿</button><button type="submit" class="primary">儲存紀錄</button></div></form>`;
   const form=slot.querySelector('form');form.elements.date.required=true;
   const remember=()=>{draft.values=Object.fromEntries(new FormData(form));};form.oninput=remember;form.onchange=remember;
   slot.querySelector('#maintenance-discard').onclick=()=>{if(busy)return;drafts.delete(itemId);draw();};
   form.onsubmit=async e=>{e.preventDefault();if(busy)return;const error=form.querySelector('.maintenance-form-error');error.hidden=true;
    try{remember();const value=parseMaintenance(draft.values,draft.record);busy++;for(const el of form.elements)el.disabled=true;
     await prepareWrite(itemId);const saved=await writeMaintenance(itemId,value);drafts.delete(itemId);rows=[saved,...rows.filter(r=>r.id!==saved.id)].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));draw();toast('紀錄已儲存至雲端');
    }catch(e){if(form.isConnected){error.hidden=false;error.textContent=e.code==='40001'?'這筆紀錄已更新，草稿仍保留。請先複製草稿內容，捨棄草稿並重新讀取，再開啟最新紀錄編輯。':e.message;}else toast('紀錄未完成儲存，草稿仍保留。');}
    finally{if(busy)busy--;for(const el of form.elements)el.disabled=false;}
   };
  }
  async function load(){try{rows=await listMaintenance(itemId);draw();}catch(e){if(live()){container.innerHTML='<p class="error" role="alert"></p><button type="button" class="block-button">重試讀取</button>';container.querySelector('p').textContent=e.message;container.querySelector('button').onclick=load;}}}
  await load();
 }
 return {mount,renderSummary,get dirty(){return busy>0||drafts.size>0;},forget:id=>drafts.delete(id),clear:()=>drafts.clear(),prune:objects=>{const ids=new Set(objects.map(f=>f.id));for(const id of drafts.keys())if(!ids.has(id))drafts.delete(id);}};
}
