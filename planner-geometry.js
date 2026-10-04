import {actualSize} from './my-items-data.js';
import {elevation,mountType} from './placement-data.js';
import {wallPartsFor} from './house-geometry.js';
import {footprint} from './furniture.js';
const EPS=1e-6;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
export function furnitureCorners(f,exact=false){const size=mountType(f)==='wall'?actualSize(f):[f.width/100,f.height/100,f.depth/100],a=f.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),w=size[0]/2,d=size[2]/2;
 return (exact?footprint(f):[[-w,-d],[w,-d],[w,d],[-w,d]]).map(([x,z])=>[f.x+x*c-z*s,f.z+x*s+z*c]);}
export function wallSolids(house,height=0.001,bottom=0){const solids=[];
 for(const wall of house.walls){const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],len=Math.hypot(dx,dz),u=[dx/len,dz/len],n=[-u[1],u[0]],half=house.defaults.wallThickness/2;
  for(const p of wallPartsFor(house,wall)){if(p.bottom>=height-EPS||p.bottom+p.height<=bottom+EPS)continue;const a=[wall.a[0]+u[0]*p.start,wall.a[1]+u[1]*p.start],b=[a[0]+u[0]*p.length,a[1]+u[1]*p.length];
   solids.push({wall:wall.id,u,n,a,b,length:p.length,half,polygon:[[a[0]+n[0]*half,a[1]+n[1]*half],[b[0]+n[0]*half,b[1]+n[1]*half],[b[0]-n[0]*half,b[1]-n[1]*half],[a[0]-n[0]*half,a[1]-n[1]*half]]});
  }
 }return solids;
}
function penetration(a,b){let overlap=Infinity;for(const poly of [a,b])for(let i=0;i<poly.length;i++){const e=sub(poly[(i+1)%poly.length],poly[i]),l=Math.hypot(...e),n=[-e[1]/l,e[0]/l],pa=a.map(p=>dot(p,n)),pb=b.map(p=>dot(p,n)),depth=Math.min(Math.max(...pa)-Math.min(...pb),Math.max(...pb)-Math.min(...pa));if(depth<=EPS)return 0;overlap=Math.min(overlap,depth);}return overlap;}
function score(f,solids){const poly=furnitureCorners(f);return solids.reduce((sum,s)=>sum+penetration(poly,s.polygon),0);}
export function wallPenetration(f,house){return score(f,wallSolids(house,elevation(f)+actualSize(f)[1],elevation(f)));}
function radius(f,axis){const size=mountType(f)==='wall'?actualSize(f):[f.width/100,f.height/100,f.depth/100],a=f.rotation*Math.PI/180;return Math.abs(dot([Math.cos(a),Math.sin(a)],axis))*size[0]/2+Math.abs(dot([-Math.sin(a),Math.cos(a)],axis))*size[2]/2;}
export function snapToWall(f,house,threshold=.1){const solids=wallSolids(house,elevation(f)+actualSize(f)[1],elevation(f));let best=null;
 for(const s of solids){const rel=sub([f.x,f.z],s.a),along=dot(rel,s.u),ru=radius(f,s.u);if(along+ru<EPS||along-ru>s.length-EPS)continue;
  const signed=dot(rel,s.n),side=signed>=0?1:-1,gap=Math.abs(signed)-s.half-radius(f,s.n);if(gap<-.025||gap>threshold)continue;
  const next={...f,x:f.x-s.n[0]*side*gap,z:f.z-s.n[1]*side*gap};if(score(next,solids)>EPS)continue;
  if(!best||Math.abs(gap)<best.distance)best={...next,snapped:true,distance:Math.abs(gap),wall:s.wall,angle:Math.atan2(s.u[1],s.u[0])*180/Math.PI};
 }return best??{...f,snapped:false};
}
export function moveFurniture(f,target,house,{snap=true}={}){const solids=wallSolids(house,elevation(f)+actualSize(f)[1],elevation(f)),bounds=house.bounds,
 x=Math.max(bounds.minX,Math.min(bounds.maxX,target.x)),z=Math.max(bounds.minZ,Math.min(bounds.maxZ,target.z)),dx=x-f.x,dz=z-f.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.035));let current={...f},blocked=false;
 for(let i=0;i<steps;i++){const prior=score(current,solids),allowed=c=>{const next=score(c,solids);return next<=EPS||(prior>EPS&&next<prior-EPS);},next={...current,x:current.x+dx/steps,z:current.z+dz/steps};
  if(allowed(next)){current=next;continue;}blocked=true;
  const sx={...current,x:next.x},sz={...current,z:next.z};if(allowed(sx))current=sx;else if(allowed(sz))current=sz;else break;
 }
 const final=snap?snapToWall(current,house):current;return {x:final.x,z:final.z,snapped:!!final.snapped,blocked};
}
const alignTypes=new Set(['bed','singleBed','desk','lDesk','fridge','washer','wardrobe','storage','tvCabinet','lowCabinet','dresser','bookcase','openShelf','sideboard','shoeCabinet','entryCabinet','applianceCabinet','modularWardrobe','countertop','basin','bathVanity','toilet','hood','mirror','shower','wallCabinet']);
// Preserve an existing wall contact when changing dimensions only. Explicit
// position/rotation edits continue to use the normal nearest-wall placement.
export function keepWallContact(before,after,house){
 if(mountType(before)!=='wall'||mountType(after)!=='wall'||Math.hypot(before.x-after.x,before.z-after.z)>EPS||Math.abs(before.rotation-after.rotation)>EPS)return after;
 const snap=snapToWall(before,house,.02);if(!snap.snapped)return after;
 const a=snap.angle*Math.PI/180,n=[-Math.sin(a),Math.cos(a)],wall=house.walls.find(w=>w.id===snap.wall),side=dot(sub([snap.x,snap.z],wall.a),n)>=0?1:-1,delta=radius(after,n)-radius(before,n);
 return {...after,x:snap.x+n[0]*side*delta,z:snap.z+n[1]*side*delta};
}
export function finishPlacement(f,house){const snap=snapToWall(f,house);if(!snap.snapped||(mountType(f)!=='wall'&&!alignTypes.has(f.type)))return {x:snap.x,z:snap.z,rotation:f.rotation,snapped:snap.snapped};
 let rotation=((snap.angle+Math.round((f.rotation-snap.angle)/90)*90)%360+360)%360;
 // Rotation changes the projected depth. Keep the same contacted wall face.
 const solid=wallSolids(house,elevation(f)+actualSize(f)[1],elevation(f)).find(s=>s.wall===snap.wall&&Math.abs(Math.atan2(s.u[1],s.u[0])*180/Math.PI-snap.angle)<EPS);
 if(!solid)return {x:snap.x,z:snap.z,rotation:f.rotation,snapped:true};
 const side=dot(sub([snap.x,snap.z],solid.a),solid.n)>=0?1:-1;
 if(mountType(f)==='wall'||['modularWardrobe','countertop','basin','bathVanity','toilet','hood','mirror','shower','wallCabinet'].includes(f.type))rotation=(Math.atan2(-solid.n[0]*side,solid.n[1]*side)*180/Math.PI+360)%360;
 const turned={...f,x:snap.x,z:snap.z,rotation},delta=radius(turned,solid.n)-radius(f,solid.n);
 turned.x+=solid.n[0]*side*delta;turned.z+=solid.n[1]*side*delta;
 if(wallPenetration(turned,house)>EPS)return {x:snap.x,z:snap.z,rotation:f.rotation,snapped:true};
 return {x:turned.x,z:turned.z,rotation,snapped:true};
}
export function measurementEdges(house,furniture){const edges=[];const add=(poly,kind)=>poly.forEach((a,i)=>edges.push({a,b:poly[(i+1)%poly.length],kind}));for(const s of wallSolids(house))add(s.polygon,'牆面');for(const f of furniture)add(furnitureCorners(f,true),'家具');return edges;}
export function snapMeasure(point,edges,{anchor=null,axis='free',shift=false,threshold=.12}={}){let p=[point.x,point.z];if(anchor&&(shift||axis!=='free')){const horizontal=axis==='x'||(axis==='free'&&Math.abs(p[0]-anchor.x)>=Math.abs(p[1]-anchor.z));axis=horizontal?'x':'z';p[horizontal?1:0]=horizontal?anchor.z:anchor.x;}
 let best={x:p[0],z:p[1],kind:axis==='free'?'任意點':'軸向鎖定'},bestDistance=threshold;
 const consider=(q,kind,priority=0)=>{if(anchor&&axis!=='free'&&Math.abs(q[axis==='x'?1:0]-p[axis==='x'?1:0])>EPS)return;const distance=Math.hypot(q[0]-p[0],q[1]-p[1]);if(distance<bestDistance+priority){bestDistance=distance;best={x:q[0],z:q[1],kind};}};
 for(const e of edges){const d=sub(e.b,e.a),l=dot(d,d);let t=Math.max(0,Math.min(1,dot(sub(p,e.a),d)/l));
  if(anchor&&axis!=='free'){const fixed=axis==='x'?1:0;if(Math.abs(d[fixed])>EPS){t=(p[fixed]-e.a[fixed])/d[fixed];if(t>=0&&t<=1)consider([e.a[0]+d[0]*t,e.a[1]+d[1]*t],e.kind);}else if(Math.abs(e.a[fixed]-p[fixed])<EPS)consider([e.a[0]+d[0]*t,e.a[1]+d[1]*t],e.kind);}
  else consider([e.a[0]+d[0]*t,e.a[1]+d[1]*t],e.kind);
 }
 for(const e of edges)for(const q of [e.a,e.b])if(Math.hypot(q[0]-p[0],q[1]-p[1])<=threshold)consider(q,e.kind+'端點',.025);
 return best;
}
export const measurementDistance=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
export const formatDistance=m=>m<1?`${Number((m*100).toFixed(1))} cm`:`${m.toFixed(2)} m`;
