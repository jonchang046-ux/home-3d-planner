import {actualSize} from './my-items-data.js';
import {catalog,resolveType,footprint} from './furniture.js';
import {houseConfig as house,allRooms,wallParts,openings} from './house-config.js';
const NS='http://www.w3.org/2000/svg';
const el=(name,attrs={},text)=>{const n=document.createElementNS(NS,name);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;};
export function createPlan(svg,{onSelect,onMove,onMoveEnd,isMoving}){
  let state,selected,scale=1,drag=null;
  function fit(){const b=house.bounds,cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2,w=(b.maxX-b.minX+1.1)/scale,h=(b.maxZ-b.minZ+2.1)/scale;svg.setAttribute('viewBox',`${cx-w/2} ${cz-h/2} ${w} ${h}`);}
  function point(e){const p=new DOMPoint(e.clientX,e.clientY);return p.matrixTransform(svg.getScreenCTM().inverse());}
  function render(s,id){state=s;selected=id;svg.replaceChildren();fit();
    const defs=el('defs'),pattern=el('pattern',{id:'grid',width:.5,height:.5,patternUnits:'userSpaceOnUse'});pattern.append(el('path',{d:'M .5 0 H 0 V .5',fill:'none',stroke:'#697857', 'stroke-width':.008,opacity:.13}));defs.append(pattern);svg.append(defs);
    for(const room of allRooms){svg.append(el('polygon',{points:room.polygon.map(p=>p.join(',')).join(' '),fill:room.kind==='stairs'||room.kind==='balcony'?'#d4d5c7':s.floorColor,stroke:'#969d82','stroke-width':.015}));svg.append(el('polygon',{points:room.polygon.map(p=>p.join(',')).join(' '),fill:'url(#grid)'}));}
    for(const wall of house.walls){const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
      for(const p of wallParts(wall).filter(p=>p.bottom===0)){svg.append(el('line',{x1:wall.a[0]+ux*p.start,y1:wall.a[1]+uz*p.start,x2:wall.a[0]+ux*(p.start+p.length),y2:wall.a[1]+uz*(p.start+p.length),stroke:'#53614d','stroke-width':house.defaults.wallThickness,'stroke-linecap':'square'}));}
      for(const o of openings(wall)){const x=wall.a[0]+ux*o.offset,z=wall.a[1]+uz*o.offset,w=o.width,g=el('g',{transform:`translate(${x},${z}) rotate(${Math.atan2(dz,dx)*180/Math.PI})`});if(o.kind==='door'){g.append(el('path',{d:o.sliding?`M 0 0 H ${w}`:`M 0 0 V ${w} M 0 ${w} A ${w} ${w} 0 0 0 ${w} 0`,fill:'none',stroke:'#889276','stroke-width':.022}));}else{g.append(el('rect',{x:0,y:-.042,width:w,height:.084,fill:'#cce0de',stroke:'#749b96','stroke-width':.018}));}svg.append(g);}
    }
    const stairs=house.stairs;for(let i=0;i<stairs.steps;i++)svg.append(el('line',{x1:stairs.x,y1:stairs.z+i*stairs.depth/stairs.steps,x2:stairs.x+stairs.width,y2:stairs.z+i*stairs.depth/stairs.steps,stroke:'#9caa92','stroke-width':.035}));
    for(const room of allRooms){svg.append(el('text',{x:room.label[0],y:room.label[1],class:'plan-label'},room.name));svg.append(el('text',{x:room.label[0],y:room.label[1]+.18,class:'plan-label plan-hint'},room.hint));}
    for(const f of s.furniture){const w=f.width/100,d=f.depth/100,g=el('g',{transform:`translate(${f.x},${f.z}) rotate(${f.rotation})`,class:'plan-furniture',tabindex:0,role:'button','aria-label':`選取 ${f.name}`,'data-id':f.id});
      const def=catalog[resolveType(f.type)],attrs={class:'furniture-footprint',fill:f.color,'fill-opacity':f.model?.assetId ? .22 : 1,stroke:f.id===id?'#cc772d':'#617055','stroke-width':f.id===id?.055:.025};g.append(def.footprint?el('polygon',{...attrs,points:footprint(f).map(p=>p.join(',')).join(' ')}):el('rect',{...attrs,x:-w/2,y:-d/2,width:w,height:d,rx:Math.min(.045,w*.05,d*.05)}));
      if(!f.model?.assetId&&['bed','singleBed'].includes(def.model))g.append(el('rect',{x:-w*.42,y:-d*.42,width:w*.84,height:d*.2,rx:.04,fill:'#f6f1e6',opacity:.85}));
      if(!f.model?.assetId&&def.model==='sofa')g.append(el('path',{d:`M ${-w*.4} ${-d*.3} H ${w*.4} M 0 ${-d*.3} V ${d*.4}`,stroke:'#fff7','stroke-width':.04,fill:'none'}));
      if(f.model?.assetId){const a=actualSize(f);g.append(el('rect',{class:'model-footprint',x:-a[0]/2,y:-a[2]/2,width:a[0],height:a[2],fill:f.color,stroke:'#35553f','stroke-dasharray':'.06 .035','stroke-width':.025,'pointer-events':'none'}));}
      const frontX=def.footprint?w*.3:0;g.append(el('path',{d:`M ${frontX-w*.07} ${d*.4} L ${frontX} ${d*.47} L ${frontX+w*.07} ${d*.4}`,stroke:'#405440',opacity:.8,'stroke-width':.018,fill:'none','pointer-events':'none'}));
      g.append(el('text',{x:0,y:d/2+.15,transform:`rotate(${-f.rotation},0,${d/2+.15})`},f.name));
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(f.id);}});svg.append(g);
    }
    svg.append(el('line',{x1:0,y1:11.55,x2:1,y2:11.55,stroke:'#56674c','stroke-width':.025}));svg.append(el('text',{x:1.1,y:11.59,class:'measure'},'1 m · 比例示意'));
  }
  svg.addEventListener('pointerdown',e=>{const target=e.target.closest('[data-id]');if(!target)return;const id=target.getAttribute('data-id');if(isMoving()&&id===selected){const p=point(e),f=state.furniture.find(f=>f.id===id);drag={id,dx:f.x-p.x,dz:f.z-p.y};svg.setPointerCapture(e.pointerId);e.preventDefault();}else onSelect(id);});
  svg.addEventListener('pointermove',e=>{if(!drag)return;const p=point(e);onMove(drag.id,p.x+drag.dx,p.y+drag.dz);});
  const end=()=>{if(drag){drag=null;onMoveEnd();}};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);svg.addEventListener('lostpointercapture',end);
  return {render,reset(){scale=1;fit();},zoom(f){scale=Math.max(.65,Math.min(2.5,scale*f));fit();}};
}
