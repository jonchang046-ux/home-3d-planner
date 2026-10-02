import {acceptLink,readSession,session,request,sendLink,verifyCode,signInPassword,signOut,cloudStage} from './cloud-api.js';
import {setHouse} from './house-config.js';
const dialog=document.querySelector('#cloud-dialog');let busy=false,started=false;
const freeze=()=>{document.querySelector('main').inert=true;document.querySelector('.toolbar').inert=true;document.querySelector('.segmented').inert=true;};freeze();
function gate(){dialog.innerHTML='<h2>登入我的家</h2><p class="inline-note">格局為私人資料，登入後才會載入。請使用已設定的帳號。</p><form id="private-login"><label>Email<input name="email" type="email" autocomplete="email" required></label><label>密碼<input name="password" type="password" autocomplete="current-password" required></label><button class="primary block-button">登入並開啟</button></form><details><summary>使用登入信或驗證碼</summary><button id="private-link" class="block-button">寄送登入信</button><form id="private-code"><label>驗證碼<input name="token" required autocomplete="one-time-code" inputmode="numeric"></label><button class="block-button">驗證並開啟</button></form></details><button id="private-retry" class="block-button">重新載入私人格局</button><button id="private-logout" class="block-button">登出</button><p id="private-message" role="status"></p>';
 const q=s=>dialog.querySelector(s),email=()=>q('[name=email]').value.trim();
 const run=async fn=>{if(busy)return;busy=true;dialog.querySelectorAll('button,input').forEach(e=>e.disabled=true);try{await fn();}catch(e){q('#private-message').textContent=e.message;q('#private-message').className='error';}finally{busy=false;dialog.querySelectorAll('button,input').forEach(e=>e.disabled=false);}};
 q('#private-login').onsubmit=e=>{e.preventDefault();const address=email(),password=q('[name=password]').value;q('[name=password]').value='';run(async()=>{await signInPassword(address,password);await start();});};
 q('#private-link').onclick=()=>run(async()=>{await sendLink(email());q('#private-message').textContent='已寄送登入信，請到信箱開啟。';});
 q('#private-code').onsubmit=e=>{e.preventDefault();const address=email(),token=q('[name=token]').value;run(async()=>{await verifyCode(address,token);await start();});};
 q('#private-retry').onclick=()=>run(start);q('#private-logout').onclick=()=>run(async()=>{await signOut();location.reload();});
 dialog.addEventListener('cancel',e=>{if(!started)e.preventDefault();});if(!dialog.open)dialog.showModal();
 document.querySelector('#cloud-button').onclick=()=>{if(!dialog.open)dialog.showModal();};
}
async function start(){if(started)return;const current=await cloudStage('session_established',session);if(!current){console.warn('[home-cloud]','session_missing');throw Error('請先登入');}
 const homes=await cloudStage('home_read',()=>request('/rest/v1/planner_homes?select=id,owner_id,name'));
 if(!homes.length){console.warn('[home-cloud]','membership_missing');throw Error('登入成功，但帳號尚未加入共享的家。請由屋主確認成員權限；不需要重新建立空白房屋。');}
 const rows=await cloudStage('geometry_read',()=>request('/rest/v1/planner_geometry?select=home_id,config'));
 const allowed=rows.filter(r=>homes.some(h=>h.id===r.home_id)),key=`home-cloud:selected-home:${current.user.id}`,selected=localStorage.getItem(key);
 const geometry=allowed.find(r=>r.home_id===selected)??(allowed.length===1?allowed[0]:null);
 if(!geometry)throw Error(allowed.length>1?'帳號可使用多個私人格局，請先確認目前要使用的家。':'登入成功且已取得房屋權限，但私人格局尚未載入；請確認格局資料與讀取權限。');
 if(readSession()?.user?.id!==current.user.id)throw Error('帳號已變更，請重新整理');setHouse(geometry.config);localStorage.setItem(key,geometry.home_id);if(dialog.open)dialog.close();await import('./app.js');started=true;}
gate();try{await acceptLink();if(readSession())await start();}catch(e){document.querySelector('#private-message').textContent=e.message;}
