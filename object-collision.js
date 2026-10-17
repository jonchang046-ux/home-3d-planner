import {actualSize} from './my-items-data.js';
import {elevation} from './placement-data.js';
const EPS=1e-6;
// Conservative oriented outer boxes, matching the size editor. Height uses the
// rendered GLB size, so a fitted model's top agrees with its support surface.
export function objectBox(f){const a=(f.rotation??0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 const w=f.width/200,d=f.depth/200;
 return {points:[[-w,-d],[w,-d],[w,d],[-w,d]].map(([x,z])=>[f.x+x*c-z*s,f.z+x*s+z*c]),bottom:elevation(f),top:elevation(f)+actualSize(f)[1]};
}
export function objectOverlap(a,b){const A=objectBox(a),B=objectBox(b);let depth=Math.min(A.top-B.bottom,B.top-A.bottom);if(depth<=EPS)return 0;
 for(const p of [A.points,B.points])for(let i=0;i<2;i++){const dx=p[i+1][0]-p[i][0],dz=p[i+1][1]-p[i][1],length=Math.hypot(dx,dz),axis=[-dz/length,dx/length],project=q=>q[0]*axis[0]+q[1]*axis[1],pa=A.points.map(project),pb=B.points.map(project);
 const overlap=Math.min(Math.max(...pa)-Math.min(...pb),Math.max(...pb)-Math.min(...pa));if(overlap<=EPS)return 0;depth=Math.min(depth,overlap);
 }return depth;
}
const geometry=f=>[f.x,f.z,f.y??0,f.rotation,f.width,f.depth,f.height,JSON.stringify(f.model??null)].join('|');
// Existing layouts are never repaired automatically. An edit can reduce or
// preserve a legacy intersection, but cannot introduce/increase an intersection.
export function collisionRegressions(before,after){const old=new Map(before.map(f=>[f.id,f])),changed=new Set(after.filter(f=>!old.has(f.id)||geometry(f)!==geometry(old.get(f.id))).map(f=>f.id)),hits=[];
 for(let i=0;i<after.length;i++)for(let j=i+1;j<after.length;j++){const a=after[i],b=after[j];if(!changed.has(a.id)&&!changed.has(b.id))continue;
 if(objectOverlap(a,b)>(old.has(a.id)&&old.has(b.id)?objectOverlap(old.get(a.id),old.get(b.id)):0)+EPS)hits.push([a,b]);
 }return hits;
}
export function movingGroup(f,items){const original=items.find(x=>x.id===f.id)??f,ids=new Set([f.id]);let grew=true;while(grew){grew=false;for(const item of items)if(ids.has(item.supportParentId)&&!ids.has(item.id)){ids.add(item.id);grew=true;}}
 return {members:[f,...items.filter(x=>ids.has(x.id)&&x.id!==f.id).map(x=>({...x,x:x.x+f.x-original.x,z:x.z+f.z-original.z,y:elevation(x)+elevation(f)-elevation(original)}))],others:items.filter(x=>!ids.has(x.id))};
}
export function groupOverlaps(f,items){const {members,others}=movingGroup(f,items),scores=new Map();for(const a of members)for(const b of others){const depth=objectOverlap(a,b);if(depth>EPS)scores.set(`${a.id}|${b.id}`,depth);}return scores;}
export const noWorseOverlap=(before,after)=>[...after].every(([id,depth])=>depth<=(before.get(id)??0)+EPS);
