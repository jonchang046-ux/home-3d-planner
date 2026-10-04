// Normalized low-poly fixtures. Front is +z; bounds are [-.5,.5] × [0,1] × [-.5,.5].
import * as THREE from './vendor/three.module.js';
function carcass(a,top=1){const {b}=a;b('櫃體',1,top-.08,.94,0,(top+.04)/2,-.03);b('櫃頂',1,.02,1,0,top-.01,0);b('踢腳板',.92,.06,.88,0,.03,0,'dark');}
function panels(a,top=1){const {b,f}=a,style=f.wardrobe?.style??'multi',count=style==='double'?2:Math.max(2,Math.min(10,Math.ceil(f.width/(style==='sliding'?90:60)))),w=.96/count;
 a.materials.door=new THREE.MeshStandardMaterial({color:f.wardrobe?.doorColor??f.color,roughness:.8});a.materials.door.name=f.wardrobe?'door':'main';
 for(let i=0;i<count;i++){const x=-.48+w*(i+.5),z=style==='sliding'&&i%2?.445:.47;b('門板',w-.007,top-.1,.03,x,(top+.06)/2,z,'door');b('門把',.012,.11,.012,x+w*.3,top*.53,z+.021,'metal');}
 if(style==='sliding')for(const y of [.07,top-.02])b('滑門軌道',.97,.018,.015,0,y,.49,'metal');
}
function basin(a,y=.75){const {b,c}=a;c('洗手盆',.5,.5,.16,0,y-.08,0,'pale');c('盆內凹面',.39,.35,.008,0,y+.001,.03,'dark');b('水龍頭立柱',.055,1-y,.065,.22,(1+y)/2,-.34,'metal');b('出水口',.07,.035,.27,.22,.965,-.21,'metal');}
function toilet(a){const {b,c,g,materials}=a;c('馬桶底座',.31,.36,.12,0,.06,.03,'main');c('馬桶支柱',.23,.27,.32,0,.22,.04,'main');
 const body=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),materials.main);body.name='馬桶本體';body.scale.set(.5,.23,.4);body.position.set(0,.37,.1);g.add(body);
 c('馬桶圈',.5,.4,.045,0,.58,.1,'pale');c('馬桶內口',.34,.26,.006,0,.605,.13,'dark');b('水箱',.84,.47,.20,0,.745,-.4);b('水箱蓋',.88,.03,.22,0,.985,-.39,'pale');b('沖水按鈕',.12,.007,.05,.2,.996,-.38,'metal');}
function modularWardrobe(a){carcass(a);panels(a);}
function countertop(a){carcass(a,.96);panels(a,.96);a.b('檯面',1,.04,1,0,.98,0,'pale');if(a.f.kitchen?.sink){a.b('內嵌水槽邊',.58,.012,.7,0,.986,0,'metal');a.b('水槽凹面',.5,.008,.58,0,.995,0,'dark');}}
function hob(a){const {b,c}=a;b('爐面',1,.35,1,0,.175,0);const count=a.f.kitchen?.burners??2;for(let i=0;i<count;i++){const x=(i-(count-1)/2)*(.7/(count-1));c('燃燒器',.12,.19,.18,x,.47,-.09,'metal');c('爐心',.07,.10,.06,x,.59,-.09,'dark');b('爐架橫桿',.27,.10,.035,x,.95,-.09,'dark');b('爐架縱桿',.025,.10,.48,x,.95,-.09,'dark');c('旋鈕',.042,.058,.17,x,.46,.35,'metal');}}
function hood(a){const {b}=a;b('集煙罩',1,.28,1,0,.19,0);b('底部進氣濾網',.87,.05,.88,0,.025,0,'dark');b('煙道',.42,.7,.4,0,.65,-.3);for(const x of [-.22,0,.22])b('進氣線',.02,.012,.66,x,.006,0,'metal');}
export const fixtureBuilders={toilet,
 wallBasin:a=>{a.b('掛牆盆外殼',1,.56,1,0,.28,0);a.b('洗手盆邊',1,.08,1,0,.58,0,'pale');a.c('盆內口',.36,.32,.008,0,.624,.05,'dark');a.b('掛牆支架',.7,.08,.15,0,.04,-.425,'metal');a.b('水龍頭',.055,.38,.07,.22,.81,-.34,'metal');a.b('出水口',.07,.035,.27,.22,.9825,-.21,'metal');},
 basin:a=>{a.c('洗手台底座',.22,.27,.08,0,.04,0,'main');a.c('洗手台立柱',.14,.2,.62,0,.35,-.04,'main');basin(a,.8);},
 bathVanity:a=>{carcass(a,.78);panels(a,.78);a.b('浴櫃檯面',1,.04,1,0,.78,0,'pale');a.c('盆內凹面',.27,.32,.008,0,.801,.03,'dark');a.b('水龍頭',.06,.2,.06,.24,.9,-.33,'metal');a.b('出水口',.06,.03,.25,.24,.985,-.21,'metal');},
 mirror:a=>{a.b('鏡框',1,1,1);a.b('鏡面',.92,.94,.025,0,.5,.4875,'glass');},
 shower:a=>{a.b('淋浴背座',.3,1,.04,0,.5,-.48);a.b('升降桿',.05,.88,.07,0,.49,-.42,'metal');a.b('花灑頂盤',1,.08,1,0,.96,0,'metal');a.b('混水控制',.72,.06,.22,0,.09,-.25,'metal');a.b('蓮蓬頭',.2,.16,.08,.3,.45,-.28,'dark');a.b('軟管示意',.025,.34,.035,.25,.24,-.23,'metal');},
 showerScreen:a=>{const {b,materials}=a;materials.clear=new THREE.MeshStandardMaterial({color:'#b7d4d6',transparent:true,opacity:.25,roughness:.12,depthWrite:false});materials.clear.name='clear';b('玻璃',.95,.96,.3,0,.5,0,'clear');for(const x of [-.48,.48])b('隔間邊框',.04,1,1,x,.5,0);for(const y of [.02,.98])b('隔間橫框',1,.04,1,0,y,0,'metal');},
 modularWardrobe,countertop,hob,hood,
 kitchenSink:a=>{a.b('水槽外殼',1,.58,1,0,.29,0);a.b('水槽內口',.82,.01,.76,0,.584,.04,'dark');a.b('水龍頭',.05,.42,.08,.2,.79,-.38,'metal');a.b('出水口',.05,.06,.4,.2,.97,-.2,'metal');},
 wallCabinet:a=>{carcass(a);panels(a);},
};
