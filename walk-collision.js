// 純幾何運算：牆段直接使用渲染器同一個 wallParts，沒有第二套格局。
import {houseConfig,allRooms,wallParts} from './house-config.js';
export const WALK = Object.freeze({eyeHeight:1.64,bodyHeight:1.74,radius:.20,fov:70,speed:1.1,step:.04});
export function insidePolygon(x,z,polygon){
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [ax,az]=polygon[i],[bx,bz]=polygon[j];
    if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
  }return inside;
}
export function circleHitsBox(x,z,r,b){
  const dx=x-b.x,dz=z-b.z,lx=dx*b.cos+dz*b.sin,lz=-dx*b.sin+dz*b.cos;
  const qx=Math.max(Math.abs(lx)-b.hx,0),qz=Math.max(Math.abs(lz)-b.hz,0);
  return qx*qx+qz*qz<r*r-1e-10;
}
export function createCollision(furniture=[],house=houseConfig,rooms=allRooms){
  const obstacles=[];
  for(const wall of house.walls){
    const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz),cos=dx/length,sin=dz/length;
    // 門楣高於人的頭頂，不封住門洞；窗下牆與陽台矮牆仍阻擋。
    for(const p of wallParts(wall))if(p.bottom<WALK.bodyHeight&&p.bottom+p.height>.05){
      const t=p.start+p.length/2;obstacles.push({id:wall.id,x:wall.a[0]+cos*t,z:wall.a[1]+sin*t,hx:p.length/2,hz:house.defaults.wallThickness/2,cos,sin});
    }
  }
  for(const f of furniture){const angle=f.rotation*Math.PI/180;obstacles.push({id:f.id,x:f.x,z:f.z,hx:f.width/200,hz:f.depth/200,cos:Math.cos(angle),sin:Math.sin(angle)});}
  const floors=rooms.filter(r=>r.kind!=='stairs');
  function onFloor(x,z){return floors.some(r=>insidePolygon(x,z,r.polygon));}
  function canStand(x,z,r=WALK.radius){
    if(!Number.isFinite(x)||!Number.isFinite(z)||!onFloor(x,z))return false;
    if(obstacles.some(b=>circleHitsBox(x,z,r,b)))return false;
    // 使用地板聯集，房間之間不出現虛構邊界；排除梯間及未建模的落差。
    for(let i=0;i<24;i++){const a=i*Math.PI/12;if(!onFloor(x+Math.cos(a)*r,z+Math.sin(a)*r))return false;}
    return true;
  }
  function move(position,dx,dz){
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/WALK.step)),sx=dx/steps,sz=dz/steps;
    let {x,z}=position;
    // 細分移動並逐軸滑牆，避免低 FPS 或對角線穿角。
    for(let i=0;i<steps;i++){if(canStand(x+sx,z))x+=sx;if(canStand(x,z+sz))z+=sz;}
    return {x,z};
  }
  function findSpawn(){
    const preferred=[...floors].sort((a,b)=>priority(a)-priority(b));
    function priority(r){return r.id==='living'?0:r.id==='dining'?1:r.kind==='balcony'?3:2;}
    function usable(x,z){return canStand(x,z,.24)&&[[.35,0],[-.35,0],[0,.35],[0,-.35]].filter(([dx,dz])=>{const p=move({x,z},dx,dz);return Math.hypot(p.x-x-dx,p.z-z-dz)<.01;}).length>=2;}
    for(const room of preferred){
      if(usable(...room.label))return {x:room.label[0],z:room.label[1]};
      const xs=room.polygon.map(p=>p[0]),zs=room.polygon.map(p=>p[1]);
      for(let z=Math.min(...zs)+.25;z<Math.max(...zs);z+=.25)for(let x=Math.min(...xs)+.25;x<Math.max(...xs);x+=.25)
        if(insidePolygon(x,z,room.polygon)&&usable(x,z))return {x,z};
    }return null;
  }
  return {canStand,move,findSpawn,obstacles};
}
