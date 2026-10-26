import {wallPartsFor} from './house-geometry.js';
export const PAINT={code:'Dulux 30YY 53/124 橄欖牆灰',color:'#ccbda6',source:'https://www.dulux.com.tw/zh/%E9%A1%8F%E8%89%B2/30yy-53-124-%E6%A9%84%E6%AC%96%E7%89%86%E7%81%B0-1521851',note:'Dulux台灣官方色卡頁data-hex數值；螢幕與實漆仍可能有色差'};
export const defaultLightSettings={daylight:'day',lightsOn:true};
export const lightSettings=s=>({...defaultLightSettings,...s.lightingSettings});
export const validLightSettings=v=>v===undefined||!!v&&['day','night'].includes(v.daylight)&&typeof v.lightsOn==='boolean';
export const validWallColors=v=>v===undefined||!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length<=100&&Object.entries(v).every(([k,c])=>k.length<100&&/^#[a-f0-9]{6}$/i.test(c));
export function validHouseSceneSettings(h){const number=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
 if(h.ceilingColor!==undefined&&!/^#[a-f0-9]{6}$/i.test(h.ceilingColor))return false;
 if(h.wallFinishes!==undefined&&(!Array.isArray(h.wallFinishes)||h.wallFinishes.length>100||!h.wallFinishes.every(s=>{const w=h.walls.find(w=>w.id===s.wallId);return w&&typeof s.id==='string'&&['positive','negative'].includes(s.side)&&/^#[a-f0-9]{6}$/i.test(s.color)&&number(s.start,0,100)&&number(s.end,s.start+.001,Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1])+1e-6);})))return false;
 if(h.lightSimulation!==undefined){const s=h.lightSimulation;if(!s||!number(s.eastTransmission,0,1)||!number(s.westTransmission,0,1)||!number(s.daylightLumens,0,100000)||!s.estimatedLumens||!Object.values(s.estimatedLumens).every(n=>number(n,1,20000)))return false;}return true;
}
export function finishedWallParts(house,state,wall,parts){return parts.flatMap(p=>{const surfaces=(house.wallFinishes??[]).filter(s=>s.wallId===wall.id).map(s=>({...s,start:s.start===0?Math.min(0,p.start):s.start,end:Math.abs(s.end-Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]))<1e-7?Math.max(s.end,p.start+p.length):s.end})).filter(s=>s.start<p.start+p.length&&s.end>p.start),cuts=[...new Set([p.start,p.start+p.length,...surfaces.flatMap(s=>[Math.max(p.start,s.start),Math.min(p.start+p.length,s.end)])])].sort((a,b)=>a-b);
 return cuts.slice(1).filter((v,i)=>v-cuts[i]>1e-7).map((end,i)=>{const start=cuts[i],mid=(start+end)/2,surface=surfaces.find(s=>mid>=s.start&&mid<=s.end);return {...p,start,length:end-start,surface,color:surface?(state.wallColors?.[surface.id]??surface.color??state.wallColor):null};});});}

export const ceilingColorFor=(house,state)=>state.wallColor??house.ceilingColor??'#ffffff';

// 4000K display approximation under the existing tone mapping; not a measured chromaticity.
export const electricLightColor=0xffd8b2;

// Remove only fully covered coplanar end caps at perpendicular wall junctions.
// Keep actual wall dimensions, doors and walk collision geometry unchanged.
export function coveredWallEndFaces(house,wall,part){
 const eps=1e-6,t=house.defaults.wallThickness/2,dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
 return [0,1].filter(face=>{const at=face===0?part.start+part.length:part.start,x=wall.a[0]+ux*at,z=wall.a[1]+uz*at;
 return house.walls.some(other=>{if(other.id===wall.id)return false;const ox=other.b[0]-other.a[0],oz=other.b[1]-other.a[1],ol=Math.hypot(ox,oz),vx=ox/ol,vz=oz/ol;if(Math.abs(ux*vx+uz*vz)>eps)return false;const rx=x-other.a[0],rz=z-other.a[1],along=rx*vx+rz*vz,distance=Math.abs(rx*vz-rz*vx);if(Math.abs(distance-t)>eps)return false;
 return wallPartsFor(house,other).some(q=>along-t>=q.start-eps&&along+t<=q.start+q.length+eps&&part.bottom>=q.bottom-eps&&part.bottom+part.height<=q.bottom+q.height+eps);});});
}
