import * as THREE from './vendor/three.module.js';
import {trackGeometry,roundLightGeometry} from './lighting.js';
import {lightSettings,electricLightColor} from './scene-settings.js';
export function lightGroups(house){const groups=new Map(),est=house.lightSimulation?.estimatedLumens??{},add=(roomId,x,z,y,lumens)=>{const g=groups.get(roomId)??{roomId,x:0,z:0,y:Infinity,lumens:0};g.x+=x*lumens;g.z+=z*lumens;g.y=Math.min(g.y,y);g.lumens+=lumens;groups.set(roomId,g);};
 for(const s of trackGeometry(house))for(const l of s.lamps)add(s.roomId,l.x,l.z,s.headCenterY-s.headHeight/2-.02,s.lumens??est.track??550);
 for(const s of roundLightGeometry(house))add(s.roomId,s.x,s.z,s.top-s.height-.02,s.lumens??(s.kind==='recessed'?(est.recessed??700):s.model==='D40'?(est.d40??3000):s.model==='D20'?(est.d20??900):(est.ceiling??1200)));
 return [...groups.values()].map(g=>({...g,x:g.x/g.lumens,z:g.z/g.lumens}));
}
export function createLightSimulation(house,scene,{shadowSize=512}={}){const root=new THREE.Group();root.name='模擬光源';const indoor=new THREE.Group(),natural=new THREE.Group();indoor.name='室內4000K光源';natural.name='自然光';root.add(indoor,natural);scene.add(root);
 const hemi=new THREE.HemisphereLight(0xe8f1ff,0x71604d,.4),bounce=new THREE.AmbientLight(electricLightColor,.06);root.add(hemi,bounce);
 const spot=(parent,x,y,z,tx,tz,color,power)=>{const l=new THREE.SpotLight(color,1,10,1.3,.65,2);l.position.set(x,y,z);l.target.position.set(tx,.5,tz);l.power=power*(house.lightSimulation?.renderScale??.006);l.castShadow=true;l.shadow.mapSize.set(shadowSize,shadowSize);l.shadow.bias=-.0003;l.shadow.normalBias=.025;l.shadow.camera.near=.05;l.shadow.camera.far=12;parent.add(l,l.target);return l;};
 for(const g of lightGroups(house)){const l=spot(indoor,g.x,g.y,g.z,g.x,g.z,electricLightColor,g.lumens);l.userData.roomId=g.roomId;}
 const balconies=[...(house.balcony??[])].sort((a,b)=>Math.min(...a.polygon.map(p=>p[1]))-Math.min(...b.polygon.map(p=>p[1])));
 const sides=[];for(const [i,r]of balconies.entries()){const minZ=Math.min(...r.polygon.map(p=>p[1])),maxZ=Math.max(...r.polygon.map(p=>p[1])),x=(Math.min(...r.polygon.map(p=>p[0]))+Math.max(...r.polygon.map(p=>p[0])))/2,z=(minZ+maxZ)/2,east=i===0;
  const l=spot(natural,x,(house.ceilingHeight??2.8)*.72,z,x,z+(east?2.2:-2.2),0xe5efff,0);l.userData.side=east?'east':'west';sides.push(l);}
 function apply(state,fixtures){const setting=lightSettings(state),day=setting.daylight==='day',config=house.lightSimulation??{};natural.visible=day;indoor.visible=setting.lightsOn;hemi.intensity=day?.9:.025;bounce.intensity=setting.lightsOn?.65:.003;
  for(const l of sides)l.power=(config.daylightLumens??12000)*(l.userData.side==='east'?(config.eastTransmission??.25):(config.westTransmission??1))*(config.renderScale??.006);
  fixtures?.traverse(o=>{if(o.isMesh&&o.material?.emissive){o.material.emissiveIntensity=setting.lightsOn?.7:0;}});
  scene.background=day?null:new THREE.Color('#101722');return {daylight:setting.daylight,lightsOn:setting.lightsOn,eastFactor:config.eastTransmission??.25,westFactor:config.westTransmission??1,indoorSources:lightGroups(house).length};
 }
 return {root,apply,indoor,natural};
}
