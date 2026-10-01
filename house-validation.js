export function validateHouse(c){
 const fail=()=>{throw Error('私人格局資料不完整，未開啟編輯器');},number=n=>typeof n==='number'&&Number.isFinite(n),point=p=>Array.isArray(p)&&p.length===2&&p.every(number);
 if(!c||c.version!==1||!c.defaults||!c.bounds)fail();
 if(!['minX','maxX','minZ','maxZ'].every(k=>number(c.bounds[k]))||c.bounds.minX>=c.bounds.maxX||c.bounds.minZ>=c.bounds.maxZ)fail();
 if(!['wallThickness','wallHeight','doorHeight','windowSill','windowHeight','floorThickness'].every(k=>number(c.defaults[k])))fail();
 for(const key of ['rooms','balcony','walls','doors','windows','measurements','assumptions'])if(!Array.isArray(c[key])||c[key].length>1000)fail();
 for(const r of [...c.rooms,...c.balcony])if(typeof r.id!=='string'||typeof r.name!=='string'||!Array.isArray(r.polygon)||r.polygon.length<3||!r.polygon.every(point)||!point(r.label))fail();
 for(const w of c.walls)if(typeof w.id!=='string'||!point(w.a)||!point(w.b))fail();
 for(const o of [...c.doors,...c.windows])if(!c.walls.some(w=>w.id===o.wall)||!number(o.offset)||!number(o.width)||o.offset<0||o.width<=0)fail();
 return c;
}
