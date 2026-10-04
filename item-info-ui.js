import {itemCategories,itemStatuses,emptyItemInfo,canEditItemInfo,parseItemInfo,itemInfoSignature} from './item-info.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=(list,value)=>Object.entries(list).map(([k,label])=>`<option value="${k}" ${k===value?'selected':''}>${label}</option>`).join('');
export function createItemInfoUI({getObject,isCloud,onSave,onBack,toast}){
  const drafts=new Map();
  function summary(f){const editable=canEditItemInfo(f),info=editable?(f.itemInfo??emptyItemInfo(f)):null;
    return `<section class="item-info-card" aria-label="物品資訊"><div class="item-info-heading"><b>物品資訊</b>${info?`<span class="item-status status-${info.status}">${itemStatuses[info.status]}</span>`:''}</div><strong class="item-info-name">${esc(f.name)}</strong><p>${info?`${itemCategories[info.category]}${info.brand?' · '+esc(info.brand):''}${info.model?' · '+esc(info.model):''}`:'資訊格式尚不支援，原資料已保留。'}</p>${drafts.has(f.id)?'<p class="item-draft">有尚未儲存的資訊草稿</p>':''}<button id="open-item-info" class="block-button">${drafts.has(f.id)?'繼續填寫物品資訊':f.itemInfo?'查看／編輯物品資訊':'新增物品資訊'}</button></section>`;
  }
  function open(content,f){
    if(!canEditItemInfo(f)){content.innerHTML='<p class="section-note">此物品資訊格式尚不支援，原資料與家具仍保留。請更新網頁後再試。</p><button id="item-info-back" class="block-button">返回家具調整</button>';content.querySelector('button').onclick=onBack;return;}
    let draft=drafts.get(f.id);const info=draft?.values??{...emptyItemInfo(f),...f.itemInfo,name:f.name};
    const text=(key,label,max)=>`<label>${label}<input name="${key}" maxlength="${max}" value="${esc(info[key])}" autocomplete="off"></label>`;
    content.innerHTML=`<p class="section-note">這件物品的資料，與場景中的家具一起保存。<br>除了名稱，其他資訊可以稍後再填。</p><form id="item-info-form">${text('name','物品名稱',60)}<div class="field-row two"><label>分類<select name="category">${options(itemCategories,info.category)}</select></label><label>狀態<select name="status">${options(itemStatuses,info.status)}</select></label></div>${text('brand','品牌',100)}${text('model','型號',100)}<label>購買價格（NT$）<input name="purchasePrice" type="number" inputmode="decimal" min="0" max="100000000" step="0.01" value="${esc(info.purchasePrice)}" placeholder="可留白"></label><label>購買日期<input name="purchaseDate" type="date" min="1900-01-01" max="9999-12-31" value="${esc(info.purchaseDate)}"></label><label>安裝日期<input name="installDate" type="date" min="1900-01-01" max="9999-12-31" value="${esc(info.installDate)}"></label>${text('source','購買店家／來源',200)}<label>備註<textarea name="notes" rows="4" maxlength="2000">${esc(info.notes)}</textarea></label><p class="inline-note" id="item-info-storage">${isCloud()?'儲存後同步到這個家的雲端配置。':'目前為本機模式；登入並使用雲端配置後才能同步。'}</p><p id="item-info-error" class="error" role="alert" hidden></p><div class="button-row"><button type="button" id="item-info-back">返回家具</button><button type="submit" class="primary" id="save-item-info">儲存資訊</button></div><button type="button" class="block-button" id="discard-item-info" ${draft?'':'hidden'}>捨棄未儲存草稿</button></form>`;
    const form=content.querySelector('form'),error=content.querySelector('#item-info-error'),button=content.querySelector('#save-item-info');
    form.elements.name.required=true;
    let baseline=draft?.baseline??itemInfoSignature(f);
    function remember(){draft={baseline,values:Object.fromEntries(new FormData(form))};drafts.set(f.id,draft);content.querySelector('#discard-item-info').hidden=false;}
    form.addEventListener('input',remember);form.addEventListener('change',remember);
    content.querySelector('#item-info-back').onclick=onBack;
    content.querySelector('#discard-item-info').onclick=()=>{drafts.delete(f.id);onBack();};
    form.onsubmit=async e=>{e.preventDefault();error.hidden=true;button.disabled=true;button.textContent='儲存中…';
      try{const current=getObject(f.id);if(!current)throw Error('物品已被刪除，無法儲存。');if(itemInfoSignature(current)!==baseline)throw Object.assign(Error('這件物品已更新。請先複製草稿內容，再捨棄草稿並重新開啟，避免覆蓋新資料。'),{stale:true});
        const patch=parseItemInfo(Object.fromEntries(new FormData(form)),current);
        for(const el of form.elements)el.disabled=true;
        await onSave(f.id,patch);drafts.delete(f.id);
        // A save may finish after the user moved to another object or closed the card.
        if(form.isConnected)onBack();
      }catch(e){const current=getObject(f.id);if(current&&!e.stale){baseline=itemInfoSignature(current);if(draft)draft.baseline=baseline;}if(form.isConnected){error.hidden=false;error.textContent=e.message;}else toast(e.message);}
      finally{for(const el of form.elements)el.disabled=false;button.disabled=false;button.textContent='儲存資訊';}
    };
  }
  return {summary,open,get dirty(){return drafts.size>0;},forget:id=>drafts.delete(id),clear:()=>drafts.clear(),prune:objects=>{const ids=new Set(objects.map(f=>f.id));for(const id of drafts.keys())if(!ids.has(id))drafts.delete(id);}};
}
