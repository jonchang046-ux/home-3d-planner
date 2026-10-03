import {fixtureBuilders} from './fixture-factory.js';
// 所有部件生成於 1 × 1 × 1 的一致外框，再整組以 cm → m 縮放。
// 地面 y=0、最高點 y=1；前方 +z。沒有任何家具幾何留在 scene.js。
import * as THREE from './vendor/three.module.js';
import {catalog,resolveType} from './furniture.js';

function assembly(f){
  const group=new THREE.Group(),materials={
    main:new THREE.MeshStandardMaterial({color:f.color,roughness:.8}),
    pale:new THREE.MeshStandardMaterial({color:'#f0ece2',roughness:.95}),
    textile:new THREE.MeshStandardMaterial({color:'#d7d4c8',roughness:.95}),
    wood:new THREE.MeshStandardMaterial({color:'#77614b',roughness:.8}),
    metal:new THREE.MeshStandardMaterial({color:'#586364',roughness:.45,metalness:.35}),
    dark:new THREE.MeshStandardMaterial({color:'#273139',roughness:.65}),
    glass:new THREE.MeshStandardMaterial({color:'#637b83',roughness:.22,metalness:.25}),
  };
  for(const [role,m]of Object.entries(materials))m.name=role;
  function mesh(name,geometry,x,y,z,role){const m=new THREE.Mesh(geometry,materials[role]);m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
  function b(name,w,h,d,x=0,y=h/2,z=0,role='main'){return mesh(name,new THREE.BoxGeometry(w,h,d),x,y,z,role);}
  function c(name,rx,rz,h,x,y,z,role='metal'){const m=mesh(name,new THREE.CylinderGeometry(1,1,1,12),x,y,z,role);m.scale.set(rx,h,rz);return m;}
  function disk(name,rx,ry,depth,x,y,z,role){const geo=new THREE.CylinderGeometry(1,1,1,24);geo.rotateX(Math.PI/2);const m=mesh(name,geo,x,y,z,role);m.scale.set(rx,ry,depth);return m;}
  function legs(height=.88,spreadX=.43,spreadZ=.4,role='wood'){for(const x of [-spreadX,spreadX])for(const z of [-spreadZ,spreadZ])b('支腳',.05,height,.07,x,height/2,z,role);}
  function handle(x,y,z=.493){b('把手',.12,.017,.014,x,y,z,'metal');}
  return {g:group,b,c,disk,legs,handle,f,materials};
}
function bed(a,single=false){const {b,legs}=a;legs(.12,.41,.39);b('床架',1,.25,.945,0,.235,.0275);b('床頭板',1,.89,.055,0,.555,-.4725);b('床墊',.94,.17,.89,0,.445,.01,'pale');b('被面',.93,.025,.54,0,.5425,.18,'textile');for(const x of single?[0]:[-.235,.235])b('枕頭',single?.7:.39,.045,.16,x,.5525,-.3,'pale');}
function sofa(a,seats=3,l=false){const {b,legs}=a;if(l){for(const [x,z]of [[-.4,-.4],[.4,-.4],[-.4,0],[.15,.4],[.4,.4]])b('沙發腳',.05,.11,.07,x,.055,z,'wood');}else legs(.11,.4,.4);const d=l?.55:1,z=l?-.225:0;
  b('主座底框',1,.27,d,0,.245,z);b('靠背',1,.62,.16,0,.69,-.42);
  const seatWidth=(l?.76:.81)/seats,left=l?-.455:-.405;
  for(let i=0;i<seats;i++)b('座墊',seatWidth-.012,.16,l?.37:.76,left+seatWidth*(i+.5),.46,l?-.175:.025);
  b('左扶手',.085,.55,d,-.4575,.385,z);b('右扶手',.085,.55,1,.4575,.385,0);
  if(l){b('貴妃椅底框',.4,.27,.45,.3,.245,.275);b('貴妃椅長座墊',.3,.16,.83,.2925,.46,.04);}
}
function table(a,{shelf=false,drawer=false}={}){const {b,legs,handle}=a;legs(.92);b('桌面',1,.08,1,0,.96,0);if(shelf)b('下層置物板',.9,.045,.85,0,.25,0);if(drawer){b('抽屜',.32,.25,.82,.3,.795,0);handle(.3,.79,.423);}}
function lDesk({b}){b('主桌面',1,.08,.55,0,.96,-.225);b('延伸桌面',.4,.08,.45,.3,.96,.275);for(const [x,z]of [[-.445,-.43],[-.445,-.02],[.425,-.43],[.425,.425],[.155,.425]])b('桌腳',.06,.92,.06,x,.46,z,'metal');b('側支撐',.055,.2,.43,.44,.7,.23);}
function chair(a,office=false){const {b,c}=a;
  if(!office){a.legs(.48,.41,.4);b('座面',1,.09,1,0,.515,0);b('椅背',1,.44,.09,0,.78,-.455);return;}
  c('升降支架',.05,.05,.35,0,.29,0);c('椅腳輪盤',.14,.14,.055,0,.10,0);
  for(let i=0;i<5;i++){const angle=i*2*Math.PI/5;const x=Math.sin(angle)*.22,z=Math.cos(angle)*.22;const spoke=b('五星腳',.055,.04,.44,x,.08,z,'metal');spoke.rotation.y=angle;const wheel=c('腳輪',.044,.044,.08,Math.sin(angle)*.43,.04,Math.cos(angle)*.43,'dark');}
  b('座面',1,.09,1,0,.48,0);b('椅背支架',.075,.52,.04,0,.67,-.43,'metal');b('椅背',.84,.42,.105,0,.79,-.4475);for(const x of [-.46,.46]){b('扶手支架',.035,.17,.04,x,.59,.04,'metal');b('扶手',.08,.04,.5,x,.695,0);}
}
function cabinet(a,{drawers=0,doors=2,base=.08}={}){const {b,handle,legs}=a;legs(base,.42,.39);b('櫃體背板',1,1-base,.05,0,(1+base)/2,-.475);b('頂板',1,.05,1,0,.975,0);b('底板',1,.05,1,0,base+.025,0);for(const x of [-.475,.475])b('櫃側板',.05,.90-base,1,x,(base+1)/2,0);
  if(drawers){const height=(.9-base)/drawers;for(let i=0;i<drawers;i++){const y=base+.05+height*(i+.5);b('抽屜面',.89,height-.014,.89,0,y,.022);handle(0,y);}}
  else for(let i=0;i<doors;i++){const w=.9/doors,x=-.45+w*(i+.5);b('門片',w-.014,.88-base,.04,x,(base+1)/2,.46);b('門片把手',.022,.095,.027,x+(i%2===0?w*.31:-w*.31),.52,.4865,'metal');}
}
function shelf(a,open=false){const {b}=a;
  if(open){for(const x of [-.48,.48])for(const z of [-.47,.47])b('層架立柱',.04,1,.06,x,.5,z,'metal');}
  else {for(const x of [-.475,.475])b('書櫃側板',.05,1,1,x,.5,0);b('背板',.9,1,.035,0,.5,-.4825);}
  for(const y of [.025,.2625,.5,.7375,.975])b('層板',1,.05,1,0,y,0);
  if(!open){for(let i=0;i<4;i++)b('示意書冊',.065,.15,.44,-.3+i*.085,.3625,-.18,i%2?'pale':'textile');}
}
function television({b}){b('螢幕外框',1,.84,.20,0,.58,-.33);b('螢幕',.954,.77,.012,0,.585,-.224,'dark');b('螢幕反光',.18,.025,.008,.32,.90,-.216,'glass');b('螢幕支架',.09,.14,.15,0,.11,-.30,'metal');b('電視底座',.62,.04,1,0,.02,0,'metal');}
function fridge({b,handle}){b('冰箱機身',1,1,.92,0,.5,-.04);b('上層冷凍門',.96,.285,.06,0,.8325,.45);b('下層冷藏門',.96,.645,.06,0,.3475,.45);b('上門把手',.03,.15,.025,-.36,.8,.4875,'metal');b('下門把手',.03,.26,.025,-.36,.53,.4875,'metal');b('底部散熱口',.78,.025,.012,0,.043,.487,'dark');}
function washer(a){const {b,disk,f}=a;b('洗衣機機身',1,1,.90,0,.5,-.05);b('操作面板',.96,.15,.055,0,.9,.425,'pale');b('洗劑抽屜',.29,.06,.025,-.27,.9,.465);b('面板顯示',.18,.047,.014,.24,.91,.473,'dark');
  const r=Math.min(f.width*.34,f.height*.28),rx=r/f.width,ry=r/f.height;
  disk('洗衣門外圈',rx,ry,.075,0,.46,.455,'metal');disk('洗衣門內圈',rx*.83,ry*.83,.020,0,.46,.484,'dark');disk('洗衣門玻璃',rx*.65,ry*.65,.006,0,.46,.497,'glass');
}
function vanity(a){const {b,legs,handle}=a;legs(.53);b('梳妝桌面',1,.04,1,0,.55,0);b('梳妝抽屜',.85,.13,.84,0,.445,.04);handle(0,.45,.47);b('鏡框',.64,.4,.065,0,.8,-.42);b('鏡面',.57,.34,.012,0,.8,-.3805,'glass');b('鏡架',.04,.13,.04,0,.61,-.43,'metal');}
function applianceCabinet(a){const {b,handle}=a;shelf(a,true);b('下櫃門片',.9,.22,.045,0,.155,.46);handle(0,.16);b('電器置物背板',.92,.95,.04,0,.5,-.48);b('上櫃門片',.9,.20,.045,0,.8675,.46);handle(0,.855);}
function dryingRack({b}){for(const x of [-.44,.44]){b('立柱',.035,.96,.035,x,.52,0);b('落地橫腳',.09,.04,1,x,.02,0,'metal');}b('掛衣橫桿',1,.035,.035,0,.9825,0);b('底部連桿',.88,.025,.035,0,.15,0,'metal');for(const x of [-.18,.14]){b('衣架上橫條',.22,.018,.02,x,.87,0,'wood');const l=b('衣架斜桿',.02,.085,.02,x-.046,.909,0,'wood');l.rotation.z=-.7;const r=b('衣架斜桿',.02,.085,.02,x+.046,.909,0,'wood');r.rotation.z=.7;b('衣架掛鉤',.012,.034,.02,x,.96,0,'metal');}}
const builders={
  ...fixtureBuilders,
  bed:a=>bed(a),singleBed:a=>bed(a,true),sofa:(a,c)=>sofa(a,c.seats),lSofa:a=>sofa(a,2,true),lounge:a=>sofa(a,1),
  table:a=>table(a),desk:a=>table(a,{drawer:true}),coffee:a=>table(a,{shelf:true}),side:a=>table(a,{shelf:true}),lDesk,
  chair:a=>chair(a),officeChair:a=>chair(a,true),wardrobe:a=>cabinet(a,{base:0}),cabinet:a=>cabinet(a),
  console:a=>{cabinet(a,{doors:3,base:.16});},drawers:a=>cabinet(a,{drawers:a.f.height>65?4:2}),
  sideboard:a=>cabinet(a,{doors:3}),entryCabinet:a=>cabinet(a,{doors:2,base:.18}),
  shoeCabinet:a=>{cabinet(a,{drawers:3});for(const y of [.33,.64,.92])a.b('鞋櫃通風條',.66,.01,.005,0,y,.4975,'dark');},
  bookcase:a=>shelf(a),openShelf:a=>shelf(a,true),television,fridge,washer,vanity,applianceCabinet,dryingRack,
  custom:a=>a.b('自訂物件',1,1,1),
};
export function createFurnitureModel(f){
  const type=resolveType(f.type),definition=catalog[type],a=assembly(f);builders[definition.model](a,definition);
  const root=new THREE.Group();root.name=definition.label;root.userData.furnitureId=f.id;root.userData.type=type;
  a.g.scale.set(f.width/100,f.height/100,f.depth/100);
  const used=new Set();a.g.traverse(o=>{if(o.material)used.add(o.material);});
  for(const m of Object.values(a.materials))if(!used.has(m))m.dispose();
  root.add(a.g);return root;
}
