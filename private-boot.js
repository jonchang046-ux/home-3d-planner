import {acceptLink,readSession,session,request,sendLink,verifyCode,signInPassword,signOut} from './cloud-api.js';
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
async function start(){if(started)return;const current=await session();if(!current)throw Error('請先登入');const rows=await request('/rest/v1/planner_geometry?select=home_id,config&limit=2');if(rows?.length!==1)throw Error('尚未設定私人格局，請先在原本電腦的本機版完成上傳。');if(readSession()?.user?.id!==current.user.id)throw Error('帳號已變更，請重新整理');setHouse(rows[0].config);await import('./app.js');started=true;if(dialog.open)dialog.close();}
gate();try{await acceptLink();if(readSession())await start();}catch(e){document.querySelector('#private-message').textContent=e.message;}
