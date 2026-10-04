import {houseConfig} from './house-config.js';
import {validPlacement} from './placement-data.js';
// 家具庫 V2：資料與尺寸只在此定義；geometry 在 furniture-factory.js。
export const categories=[{id:'living',label:'客廳'},{id:'bedroom',label:'臥室'},{id:'study',label:'書房'},{id:'dining',label:'餐廚'},{id:'entry',label:'生活／玄關'},{id:'bathroom',label:'浴室設備'},{id:'builtIn',label:'固定櫃體／衣櫃'},{id:'kitchen',label:'廚房設備'},{id:'other',label:'其他'}];
const item=(label,category,model,width,depth,height,color='#b29878',extra={})=>({label,category,model,width,depth,height,color,...extra});
// 俯視 x/z 歸一化占地；L 型延伸在 +x 側，前方為 +z。
export const L_FOOTPRINT=[[-.5,-.5],[.5,-.5],[.5,.5],[.1,.5],[.1,.05],[-.5,.05]];
export const catalog = {
  sofa2:item('雙人沙發','living','sofa',160,85,82,'#879783',{seats:2}),
  sofa:item('三人沙發','living','sofa',220,90,85,'#879783',{seats:3}),
  lSofa:item('L 型沙發','living','lSofa',260,160,85,'#879783',{footprint:L_FOOTPRINT,note:'俯視右側為貴妃椅；寬、深是最大外框。'}),
  loungeChair:item('單人休閒椅','living','lounge',78,85,85,'#ba9c7b'),
  coffeeTable:item('茶几','living','coffee',100,55,42),
  sideTable:item('邊几','living','side',45,45,52),
  television:item('電視','living','television',123,25,76,'#363e42'),
  tvCabinet:item('電視櫃','living','console',160,40,50),
  lowCabinet:item('矮櫃','living','cabinet',100,40,75),
  singleBed:item('單人床','bedroom','singleBed',105,188,95,'#aebbad'),
  bed:item('雙人床','bedroom','bed',150,188,100,'#b8a88f'),
  nightstand:item('床頭櫃','bedroom','drawers',45,40,50),
  wardrobe:item('衣櫃','bedroom','wardrobe',120,60,200,'#d1c6b3'),
  dresser:item('斗櫃','bedroom','drawers',80,45,100),
  vanity:item('梳妝台','bedroom','vanity',90,45,135,'#c5bba8'),
  desk:item('書桌','study','desk',120,60,75,'#aa8057'),
  lDesk:item('L 型書桌','study','lDesk',160,140,75,'#aa8057',{footprint:L_FOOTPRINT,note:'俯視右側延伸桌面；寬、深是最大外框。'}),
  officeChair:item('辦公椅','study','officeChair',65,65,110,'#63726c'),
  bookcase:item('書櫃','study','bookcase',90,30,180),
  openShelf:item('開放層架','study','openShelf',90,35,150,'#858c7b'),
  table:item('餐桌','dining','table',140,80,75,'#b78b60'),
  chair:item('餐椅','dining','chair',45,48,82,'#899685'),
  sideboard:item('餐邊櫃','dining','sideboard',120,40,85),
  fridge:item('冰箱','dining','fridge',70,70,175,'#d4d9d6'),
  applianceCabinet:item('電器櫃','dining','applianceCabinet',80,45,180,'#cbbba2'),
  shoeCabinet:item('鞋櫃','entry','shoeCabinet',80,35,110),
  entryCabinet:item('玄關櫃','entry','entryCabinet',100,40,90),
  washer:item('洗衣機','entry','washer',60,60,85,'#d9ddda'),
  dryingRack:item('曬衣架','entry','dryingRack',120,55,150,'#82928e'),
  toilet:item('馬桶','bathroom','toilet',38,68,76,'#ecece5',{objectKind:'fixture'}),
  basin:item('獨立洗手台','bathroom','basin',55,45,85,'#ecece5',{objectKind:'fixture'}),
  wallBasin:item('壁掛洗手台','bathroom','wallBasin',55,45,24,'#ecece5',{objectKind:'fixture',mountType:'wall',y:.61,note:'預設底部離地 61 cm、整體高 24 cm，頂部約 85 cm；均為一般設備預設。'}),
  bathVanity:item('浴櫃＋洗手盆','bathroom','bathVanity',80,50,90,'#b7aa95',{objectKind:'fixture',note:'高度含水龍頭；檯面在整體高度的 80%。左右側檯面可承載小物。'}),
  mirror:item('壁掛鏡子','bathroom','mirror',60,3,80,'#b5aa94',{objectKind:'fixture',mountType:'wall',y:1.1}),
  shower:item('淋浴花灑','bathroom','shower',25,35,110,'#bec8c8',{objectKind:'fixture',mountType:'wall',y:1}),
  showerScreen:item('玻璃淋浴隔間','bathroom','showerScreen',90,4,200,'#839b9d',{objectKind:'fixture'}),
  modularWardrobe:item('頂天立地衣櫃','builtIn','modularWardrobe',180,60,270,'#d1c6b3',{objectKind:'fixture',wardrobe:{style:'multi',doorColor:'#d1c6b3'}}),
  countertop:item('流理台下櫃','kitchen','countertop',180,60,85,'#c3b59d',{objectKind:'fixture',kitchen:{sink:false,burners:2}}),
  hob:item('瓦斯爐','kitchen','hob',70,45,8,'#52595a',{objectKind:'fixture',kitchen:{sink:false,burners:2},note:'放入後可拖到完整包覆爐具外框的檯面，或指定支撐物。'}),
  hood:item('抽油煙機','kitchen','hood',90,50,65,'#c0c7c7',{objectKind:'fixture',mountType:'wall',y:1.55}),
  kitchenSink:item('檯上水槽','kitchen','kitchenSink',60,45,25,'#c2cbca',{objectKind:'fixture'}),
  wallCabinet:item('廚房上櫃','kitchen','wallCabinet',90,35,70,'#c3b59d',{objectKind:'fixture',mountType:'wall',y:1.6}),
  custom:item('自訂物件','other','custom',30,30,60,'#a2b4a0',{note:'以真實尺寸的方盒表示；可命名為空氣清淨機等物品。'}),
};
const top=[{id:'top',x:0,z:0,w:1,d:1,h:1}];
for(const type of ['tvCabinet','lowCabinet','nightstand','dresser','wardrobe','modularWardrobe','desk','table','coffeeTable','sideTable','sideboard','shoeCabinet','entryCabinet','bookcase','openShelf','countertop','wallCabinet'])catalog[type].support=top;
catalog.lDesk.support=[{id:'back',x:0,z:-.225,w:1,d:.55,h:1},{id:'return',x:.3,z:.275,w:.4,d:.45,h:1}];
catalog.bathVanity.support=[{id:'left',x:-.41,z:0,w:.18,d:1,h:.8},{id:'right',x:.41,z:0,w:.18,d:1,h:.8}];
const legacyTypes={tv:'tvCabinet',cabinet:'wardrobe',storage:'wardrobe'};
export function resolveType(type){return Object.hasOwn(catalog,type)?type:Object.hasOwn(legacyTypes,type)?legacyTypes[type]:'custom';}
export function normalizeFurniture(f){
  if(!f||typeof f.type!=='string')return f;
  const type=resolveType(f.type);
  return type===f.type?f:{...f,type,...(type==='custom'?{originalType:f.type}:{})};
}
export function footprint(f){return (catalog[resolveType(f.type)].footprint??[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]).map(([x,z])=>[x*f.width/100,z*f.depth/100]);}
export function newFurniture(type,overrides={}) {
  type=resolveType(type);const c=catalog[type];
  return {id:globalThis.crypto?.randomUUID?.()??`f-${Date.now()}-${Math.random()}`,name:c.label,width:c.width,depth:c.depth,height:c.height,color:c.color,x:houseConfig.rooms.find(r=>r.kind==='living').label[0],z:houseConfig.rooms.find(r=>r.kind==='living').label[1],rotation:0,y:c.y??0,mountType:c.mountType??'floor',objectKind:c.objectKind??'furniture',...(c.wardrobe?{wardrobe:{...c.wardrobe}}:{}),...(c.kitchen?{kitchen:{...c.kitchen}}:{}),...overrides,type:resolveType(overrides.type??type)};
}
export function defaults(){return structuredClone(houseConfig.defaultScene);}
export function validFurniture(f){return f&&typeof f.id==='string'&&f.id.length<100&&Object.hasOwn(catalog,f.type)&&typeof f.name==='string'&&f.name.length>0&&f.name.length<=60&&/^#[0-9a-f]{6}$/i.test(f.color)&&['width','depth','height'].every(k=>Number.isFinite(f[k])&&f[k]>=1&&f[k]<=500)&&['x','z','rotation'].every(k=>Number.isFinite(f[k]))&&f.x>=-5&&f.x<=15&&f.z>=-5&&f.z<=20&&Math.abs(f.rotation)<=3600&&validPlacement(f);}
