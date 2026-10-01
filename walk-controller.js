import * as THREE from 'three';
import {WALK,createCollision} from './walk-collision.js';

// 一個 renderer、一個動畫迴圈。只有啟用時才註冊輸入，停用以 AbortController 一次清除。
export class WalkController {
  constructor(canvas,joystick,{onHint=()=>{}}={}){
    this.canvas=canvas;this.joystick=joystick;this.knob=joystick.querySelector('span');this.onHint=onHint;
    this.camera=new THREE.PerspectiveCamera(WALK.fov,1,.04,80);this.camera.rotation.order='YXZ';
    this.enabled=false;this.keys=new Set();this.stick={x:0,y:0};this.yaw=0;this.pitch=0;this.position=null;
  }
  get snapshot(){return {enabled:this.enabled,x:this.camera.position.x,y:this.camera.position.y,z:this.camera.position.z,yaw:this.yaw,pitch:this.pitch,fov:this.camera.fov,locked:document.pointerLockElement===this.canvas};}
  setFurniture(furniture){this.collision=createCollision(furniture);}
  sync(){this.camera.position.set(this.position.x,WALK.eyeHeight,this.position.z);this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');}
  reset(){const p=this.collision.findSpawn();if(!p)return false;this.clearInput();this.position=p;this.yaw=0;this.pitch=0;this.sync();return true;}
  clearInput(){
    this.keys.clear();this.stick={x:0,y:0};
    for(const [element,id] of [[this.canvas,this.look?.id],[this.joystick,this.stickId]])if(id!==undefined&&element.hasPointerCapture(id))element.releasePointerCapture(id);
    this.look=null;this.stickId=undefined;this.knob.style.transform='translate(0px,0px)';
  }
  activate(furniture){
    if(this.enabled)return true;
    this.setFurniture(furniture);
    if(!this.position||!this.collision.canStand(this.position.x,this.position.z)){if(!this.reset())return false;}
    this.enabled=true;this.clearInput();this.sync();this.events=new AbortController();const opts={signal:this.events.signal};
    const on=(el,type,fn,extra={})=>el.addEventListener(type,fn,{...opts,...extra});
    const editable=e=>e.target.closest?.('input,select,textarea,[contenteditable=true]');
    on(document,'keydown',e=>{if(editable(e))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(e.code)){e.preventDefault();if(document.pointerLockElement===this.canvas||this.mouseFallback)this.keys.add(e.code);}if(e.code==='Escape'){this.clearInput();if(document.pointerLockElement===this.canvas)document.exitPointerLock();}});
    on(document,'keyup',e=>this.keys.delete(e.code));
    on(window,'blur',()=>{this.clearInput();if(document.pointerLockElement===this.canvas)document.exitPointerLock();});
    on(document,'visibilitychange',()=>{if(document.hidden)this.clearInput();});
    on(document,'pointerlockchange',()=>{this.clearInput();if(document.pointerLockElement!==this.canvas)this.onHint('已解除滑鼠鎖定，點擊畫面繼續漫遊');});
    on(document,'pointerlockerror',()=>{if(!this.enabled)return;this.mouseFallback=true;this.onHint('瀏覽器未允許鎖定：可按住滑鼠拖曳轉頭，WASD 移動');});
    on(document,'mousemove',e=>{if(document.pointerLockElement===this.canvas)this.turn(e.movementX,e.movementY,.0022);});
    on(this.canvas,'click',e=>{
      if(e.pointerType==='touch'||this.lastPointer==='touch'||document.pointerLockElement===this.canvas)return;
      try{const result=this.canvas.requestPointerLock?.();result?.then(()=>{if(!this.enabled&&document.pointerLockElement===this.canvas)document.exitPointerLock();}).catch(()=>{if(this.enabled){this.mouseFallback=true;this.onHint('可按住滑鼠拖曳轉頭，WASD 移動');}});if(!this.canvas.requestPointerLock)this.mouseFallback=true;}catch{this.mouseFallback=true;}
    });
    on(this.canvas,'pointerdown',e=>{this.lastPointer=e.pointerType;if(this.look||document.pointerLockElement===this.canvas)return;if(e.pointerType==='touch'||e.button===0){this.look={id:e.pointerId,x:e.clientX,y:e.clientY};this.canvas.setPointerCapture(e.pointerId);e.preventDefault();}});
    on(this.canvas,'pointermove',e=>{if(this.look?.id!==e.pointerId||document.pointerLockElement===this.canvas)return;this.turn(e.clientX-this.look.x,e.clientY-this.look.y,e.pointerType==='touch'?.004:.0022);this.look.x=e.clientX;this.look.y=e.clientY;e.preventDefault();});
    const endLook=e=>{if(this.look?.id===e.pointerId)this.look=null;};
    for(const type of ['pointerup','pointercancel','lostpointercapture'])on(this.canvas,type,endLook);
    on(this.joystick,'pointerdown',e=>{if(this.stickId!==undefined)return;this.stickId=e.pointerId;this.joystick.setPointerCapture(e.pointerId);this.updateStick(e);e.preventDefault();});
    on(this.joystick,'pointermove',e=>{if(e.pointerId===this.stickId){this.updateStick(e);e.preventDefault();}});
    const endStick=e=>{if(e.pointerId!==this.stickId)return;this.stickId=undefined;this.stick={x:0,y:0};this.knob.style.transform='translate(0px,0px)';};
    for(const type of ['pointerup','pointercancel','lostpointercapture'])on(this.joystick,type,endStick);
    // 僅限漫遊畫布／搖桿，不能阻止頁面上其他 UI 的正常操作。
    for(const el of [this.canvas,this.joystick])for(const type of ['touchmove','gesturestart','gesturechange','wheel','contextmenu'])on(el,type,e=>e.preventDefault(),{passive:false});
    return true;
  }
  updateStick(e){const b=this.joystick.getBoundingClientRect(),radius=b.width*.32;let x=(e.clientX-b.left-b.width/2)/radius,y=(e.clientY-b.top-b.height/2)/radius;const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}this.stick={x:Math.abs(x)<.08?0:x,y:Math.abs(y)<.08?0:y};this.knob.style.transform=`translate(${x*radius}px,${y*radius}px)`;}
  turn(dx,dy,sensitivity){this.yaw-=dx*sensitivity;this.pitch=Math.max(-1.35,Math.min(1.35,this.pitch-dy*sensitivity));this.sync();}
  update(dt){
    if(!this.enabled)return;const k=this.keys;
    let right=Number(k.has('KeyD')||k.has('ArrowRight'))-Number(k.has('KeyA')||k.has('ArrowLeft'))+this.stick.x;
    let forward=Number(k.has('KeyW')||k.has('ArrowUp'))-Number(k.has('KeyS')||k.has('ArrowDown'))-this.stick.y;
    const length=Math.hypot(right,forward);if(!length)return;if(length>1){right/=length;forward/=length;}
    const distance=WALK.speed*Math.min(Math.max(dt,0),.05),sin=Math.sin(this.yaw),cos=Math.cos(this.yaw);
    this.position=this.collision.move(this.position,(right*cos-forward*sin)*distance,(-right*sin-forward*cos)*distance);this.sync();
  }
  deactivate(){
    if(!this.enabled)return;this.enabled=false;this.events.abort();this.clearInput();this.mouseFallback=false;
    if(document.pointerLockElement===this.canvas)document.exitPointerLock();
  }
}
