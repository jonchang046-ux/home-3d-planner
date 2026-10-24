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
export function finishedWallParts(house,state,wall,parts){return parts.flatMap(p=>{const surfaces=(house.wallFinishes??[]).filter(s=>s.wallId===wall.id&&s.start<p.start+p.length&&s.end>p.start),cuts=[...new Set([p.start,p.start+p.length,...surfaces.flatMap(s=>[Math.max(p.start,s.start),Math.min(p.start+p.length,s.end)])])].sort((a,b)=>a-b);
 return cuts.slice(1).filter((v,i)=>v-cuts[i]>1e-7).map((end,i)=>{const start=cuts[i],mid=(start+end)/2,surface=surfaces.find(s=>mid>=s.start&&mid<=s.end);return {...p,start,length:end-start,surface,color:surface?(state.wallColors?.[surface.id]??surface.color??state.wallColor):null};});});}
