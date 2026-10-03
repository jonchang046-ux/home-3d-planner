import {catalog,resolveType} from './furniture.js';
import {actualSize} from './my-items-data.js';
import {elevation,mountType} from './placement-data.js';
export {elevation,mountType} from './placement-data.js';
const EPS=1e-6,angle=r=>r*Math.PI/180,norm=r=>(r%360+360)%360;
export const ceilingHeight=house=>house.ceilingHeight??house.defaults.wallHeight;
export function localPoint(parent,x,z){const a=angle(parent.rotation),dx=x-parent.x,dz=z-parent.z;return {x:dx*Math.cos(a)+dz*Math.sin(a),z:-dx*Math.sin(a)+dz*Math.cos(a)};}
export function worldPoint(parent,x,z){const a=angle(parent.rotation);return {x:parent.x+x*Math.cos(a)-z*Math.sin(a),z:parent.z+x*Math.sin(a)+z*Math.cos(a)};}
export function actualCorners(f){const [w,,d]=actualSize(f);return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z])=>worldPoint(f,x,z));}
export function supportSurfaces(parent){const def=catalog[resolveType(parent.type)];if(parent.supportEnabled===false)return [];
 let zones=def.support??(parent.supportEnabled?[{id:'top',x:0,z:0,w:1,d:1,h:1}]:[]);
 if(parent.type==='countertop'&&parent.kitchen?.sink)zones=[{id:'left',x:-.4,z:0,w:.2,d:1,h:1},{id:'right',x:.4,z:0,w:.2,d:1,h:1}];
 // Imported models have been centered and grounded by fittedModel. sourceSize is measured
 // after axis correction; contain/stretch use the exact same size calculation as rendering.
 const [w,h,d]=actualSize(parent);return zones.map(s=>({...s,parentInstanceId:parent.id,height:elevation(parent)+h*s.h,bounds:{minX:(s.x-s.w/2)*w,maxX:(s.x+s.w/2)*w,minZ:(s.z-s.d/2)*d,maxZ:(s.z+s.d/2)*d}}));
}
export function fitsSurface(child,parent,surface){const b=surface.bounds;return actualCorners(child).every(p=>{const q=localPoint(parent,p.x,p.z);return q.x>=b.minX-EPS&&q.x<=b.maxX+EPS&&q.z>=b.minZ-EPS&&q.z<=b.maxZ+EPS;});}
export function descendants(items,id){const found=new Set();let pending=[id];while(pending.length){const next=pending.pop();for(const f of items)if(f.supportParentId===next&&f.id!==id&&!found.has(f.id)){found.add(f.id);pending.push(f.id);}}return found;}
export function findSupport(child,items,house,preferred){const excluded=descendants(items,child.id);excluded.add(child.id);const matches=[];
 for(const parent of items){if(excluded.has(parent.id)||(preferred&&parent.id!==preferred))continue;for(const surface of supportSurfaces(parent))if(fitsSurface(child,parent,surface)&&surface.height+actualSize(child)[1]<=ceilingHeight(house)+EPS)matches.push({parent,surface});}
 return matches.sort((a,b)=>b.surface.height-a.surface.height)[0]??null;
}
export function detach(f,wall=false){delete f.supportParentId;delete f.supportOffset;delete f.supportSurfaceId;f.mountType=wall?'wall':'floor';if(!wall)f.y=0;}
export function attach(child,parent,surface){child.mountType='surface';child.supportParentId=parent.id;child.supportSurfaceId=surface.id;child.supportOffset={...localPoint(parent,child.x,child.z),rotation:norm(child.rotation-parent.rotation)};child.y=surface.height;}
export function resolvePlacements(items,house){const byId=new Map(items.map(f=>[f.id,f])),done=new Set(),visiting=new Set(),warnings=[];
 function visit(f){if(done.has(f.id))return;if(visiting.has(f.id)){detach(f);warnings.push('支撐循環已解除');return;}visiting.add(f.id);
  if(f.supportParentId){const parent=byId.get(f.supportParentId);if(!parent||parent===f){detach(f);warnings.push('支撐物不存在，已落回地板');}else{visit(parent);if(f.supportParentId){const s=supportSurfaces(parent).find(s=>s.id===(f.supportSurfaceId??'top'));if(f.supportOffset){Object.assign(f,worldPoint(parent,f.supportOffset.x,f.supportOffset.z));f.rotation=norm(parent.rotation+f.supportOffset.rotation);}if(s&&fitsSurface(f,parent,s)&&s.height+actualSize(f)[1]<=ceilingHeight(house)+EPS)attach(f,parent,s);else{detach(f);warnings.push('支撐面不足或超過天花板，已落回地板');}}}}
  else if(mountType(f)==='surface'){detach(f);warnings.push('未指定支撐物，已落回地板');}
  visiting.delete(f.id);done.add(f.id);
 }for(const f of items)visit(f);return [...new Set(warnings)];
}
export function limitHeight(f,house){const limit=ceilingHeight(house);let changed=false;
 if(f.type==='modularWardrobe'&&f.height/100+elevation(f)>limit){f.height=Math.max(1,Math.floor((limit-elevation(f)-.01)*100));changed=true;}
 if(elevation(f)+actualSize(f)[1]>limit){f.y=Math.max(0,limit-actualSize(f)[1]);changed=true;}
 return changed;
}
export function updatePlacement(items,id,patch,house,{autoSupport=false,parentId}={}){const f=items.find(f=>f.id===id);if(!f)return [];
 Object.assign(f,patch);const warnings=[];
 if(mountType(f)==='wall'){detach(f,true);}else if(patch.mountType==='floor'){detach(f);}else if(autoSupport||parentId){const hit=findSupport(f,items,house,parentId);if(hit)attach(f,hit.parent,hit.surface);else{detach(f);if(parentId)warnings.push('物件外框未完整落在有效檯面內，已放回地板');}}
 else if(f.supportParentId){const parent=items.find(x=>x.id===f.supportParentId),surface=parent&&supportSurfaces(parent).find(s=>s.id===(f.supportSurfaceId??'top'));if(surface&&fitsSurface(f,parent,surface))attach(f,parent,surface);else detach(f);}
 if(limitHeight(f,house))warnings.push('高度已限制在天花板下');return [...warnings,...resolvePlacements(items,house)];
}
export function deletePlacement(items,id,house){const next=items.filter(f=>f.id!==id);for(const f of next)if(f.supportParentId===id)detach(f);resolvePlacements(next,house);return next;}
