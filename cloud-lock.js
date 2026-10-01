// One editor per origin prevents two tabs replacing the same pending-write cache.
export function createEditorLock(manager=globalThis.navigator?.locks){
 let release,held=false;
 return {
  get held(){return held;},
  async acquire(){if(held)return true;if(!manager)throw Error('此瀏覽器不支援安全的多分頁鎖定，請更新瀏覽器後使用雲端配置');
   return new Promise((resolve,reject)=>{manager.request('home-planner:cloud-editor',{ifAvailable:true},async lock=>{if(!lock){resolve(false);return;}held=true;resolve(true);await new Promise(r=>{release=r;});held=false;release=null;}).catch(reject);});
  },
  release(){release?.();held=false;}
 };
}
