const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,canonical(v[k])])):v;
export const sameScene=(a,b)=>JSON.stringify(canonical({...a,roomMaterials:a.roomMaterials??{}}))===JSON.stringify(canonical({...b,roomMaterials:b.roomMaterials??{}}));
export function createHistory(initial,limit=60){let states=[structuredClone(initial)],cursor=0;
 return {record(next){if(sameScene(states[cursor],next))return false;states=states.slice(0,cursor+1);states.push(structuredClone(next));if(states.length>limit+1)states.shift();cursor=states.length-1;return true;},
 undo(){if(cursor===0)return null;return structuredClone(states[--cursor]);},redo(){if(cursor===states.length-1)return null;return structuredClone(states[++cursor]);},
 reset(next){states=[structuredClone(next)];cursor=0;},get canUndo(){return cursor>0;},get canRedo(){return cursor<states.length-1;},get length(){return states.length-1;},
 assetIds(){return new Set(states.flatMap(s=>s.furniture.map(f=>f.model?.assetId).filter(Boolean)));}};
}
