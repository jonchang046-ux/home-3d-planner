import {cloudConfig as config} from './cloud-config.js';
const SESSION='home-cloud:session:'+config.projectRef;
let refreshing;
export const readSession=()=>{try{return JSON.parse(localStorage.getItem(SESSION));}catch{return null;}};
function storeSession(s){if(!s?.access_token||!s.user?.id)throw Error('登入回應不完整');s.expires_at??=Math.floor(Date.now()/1000)+s.expires_in;localStorage.setItem(SESSION,JSON.stringify(s));return s;}
export function clearSession(){localStorage.removeItem(SESSION);}
export async function request(path,{method='GET',body,auth=true,blob=false,headers={}}={}){
 if(config.url!==`https://${config.projectRef}.supabase.co`||config.projectRef!=='fpzuumflfmzclphqoaij'||!config.publishableKey.startsWith('sb_publishable_'))throw Error('雲端專案設定不符，已停止連線');
 let token;if(auth){const s=await session();if(!s)throw Error('請先登入');token=s.access_token;}
 const binary=body instanceof Blob;
 const r=await fetch(config.url+path,{method,headers:{apikey:config.publishableKey,...(token?{Authorization:`Bearer ${token}`} :{}),...(body&&!binary?{'Content-Type':'application/json'}:{}),...headers},body:body?(binary?body:JSON.stringify(body)):undefined,signal:AbortSignal.timeout(60000)});
 if(!r.ok){let detail;try{detail=await r.json();}catch{}const error=Error(detail?.message||detail?.msg||detail?.error_description||`雲端連線失敗 (${r.status})`);error.code=detail?.code;error.status=r.status;throw error;}
 if(blob)return r.blob();if(r.status===204)return null;const text=await r.text();return text?JSON.parse(text):null;
}
export async function session(){let s=readSession();if(!s)return null;if(s.expires_at*1000>Date.now()+60000)return s;
 if(!refreshing){const refresh=async()=>{const latest=readSession();if(!latest)return null;if(latest.expires_at*1000>Date.now()+60000)return latest;return storeSession(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,body:{refresh_token:latest.refresh_token}}));};refreshing=(navigator.locks?navigator.locks.request(SESSION,refresh):refresh()).finally(()=>{refreshing=null;});}return refreshing;
}
export async function sendLink(email){return request('/auth/v1/otp?redirect_to='+encodeURIComponent(location.origin+location.pathname),{method:'POST',auth:false,body:{email,create_user:false}});}
export async function signInPassword(email,password){return storeSession(await request('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email,password}}));}
export async function verifyCode(email,token){return storeSession(await request('/auth/v1/verify',{method:'POST',auth:false,body:{email,token,type:'email'}}));}
export async function acceptLink(){const p=new URLSearchParams(location.hash.slice(1));if(p.get('error_description')){history.replaceState(null,'',location.pathname+location.search);throw Error(p.get('error_description'));}if(!p.has('access_token'))return;
 const token=p.get('access_token'),refresh=p.get('refresh_token');history.replaceState(null,'',location.pathname+location.search);
 const user=await request('/auth/v1/user',{auth:false,headers:{Authorization:`Bearer ${token}`}});
 storeSession({access_token:token,refresh_token:refresh,user,expires_in:Number(p.get('expires_in')||3600)});
}
export async function signOut(){try{await request('/auth/v1/logout?scope=local',{method:'POST'});}catch{/* Local sign-out still completes when offline. */}finally{clearSession();}}
export async function readRows(kind){const rows=[];for(let offset=0;;offset+=500){const page=await request(`/rest/v1/planner_${kind}?select=*&order=id&limit=500&offset=${offset}`);rows.push(...page);if(page.length<500)return rows;if(offset>100000)throw Error('雲端紀錄超過此版本讀取上限');}}
export const writeRows=(home,changes,create=false)=>request('/rest/v1/rpc/planner_write',{method:'POST',body:{p_home:home,p_changes:changes,p_create:create}});
export async function uploadAsset(asset,owner){const path=`${owner}/${asset.id}`;
 try{await request(`/storage/v1/object/${config.bucket}/${path}`,{method:'POST',body:asset.blob,headers:{'Content-Type':asset.mime||'application/octet-stream'}});}catch(e){if(!['Duplicate','23505'].includes(e.code)&&e.status!==409)throw e;}
 return {id:asset.id,name:asset.name,kind:asset.kind,mime:asset.mime,path,size:asset.blob.size};
}
export const downloadAsset=meta=>request(`/storage/v1/object/authenticated/${config.bucket}/${meta.path}`,{blob:true});
export const unusedAssets=(retire=false)=>request('/rest/v1/rpc/planner_unused_assets',{method:'POST',body:{p_retire:retire}});
export const deleteUnusedAssets=paths=>request(`/storage/v1/object/${config.bucket}`,{method:'DELETE',body:{prefixes:paths}});
