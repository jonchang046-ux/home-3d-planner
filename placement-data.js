// Persisted instance fields. Omitted fields retain the legacy floor placement.
export const mountTypes=['floor','surface','wall'];
export const wardrobeStyles=['double','multi','sliding'];
const finite=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
export function validPlacement(f){return (f.y===undefined||finite(f.y,0,10))&&
 (f.mountType===undefined||mountTypes.includes(f.mountType))&&
 (f.objectKind===undefined||['furniture','fixture'].includes(f.objectKind))&&
 (f.supportParentId===undefined||f.supportParentId===null||typeof f.supportParentId==='string'&&f.supportParentId.length<100)&&
 (f.supportOffset===undefined||f.supportOffset===null||['x','z','rotation'].every(k=>finite(f.supportOffset[k],-3600,3600)))&&
 (f.supportSurfaceId===undefined||f.supportSurfaceId===null||typeof f.supportSurfaceId==='string'&&f.supportSurfaceId.length<100)&&
 (f.supportEnabled===undefined||typeof f.supportEnabled==='boolean')&&
 (f.wardrobe===undefined||f.wardrobe&&wardrobeStyles.includes(f.wardrobe.style)&&/^#[a-f0-9]{6}$/i.test(f.wardrobe.doorColor))&&
 (f.kitchen===undefined||f.kitchen&&typeof f.kitchen.sink==='boolean'&&[2,3].includes(f.kitchen.burners));}
export const elevation=f=>f.y??0;
export const mountType=f=>f.mountType??'floor';
