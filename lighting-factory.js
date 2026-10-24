import * as THREE from './vendor/three.module.js';
import {trackGeometry,roundLightGeometry} from './lighting.js';
export function createLighting(house){const root=new THREE.Group();root.name='天花燈具';
 for(const s of trackGeometry(house)){const group=new THREE.Group();group.name='軌道燈';group.userData.fixtureId=s.id;group.userData.roomId=s.roomId;
 const metal=new THREE.MeshStandardMaterial({color:s.color,roughness:.5,metalness:.45}),lens=new THREE.MeshStandardMaterial({color:s.lightColor,emissive:s.lightColor,emissiveIntensity:.7,roughness:.3});
 for(const r of s.rails){const mesh=new THREE.Mesh(new THREE.BoxGeometry(r.length,s.railHeight,s.railWidth),metal);mesh.name='燈軌';mesh.position.set((r.a[0]+r.b[0])/2,s.railCenterY,(r.a[1]+r.b[1])/2);mesh.rotation.y=-Math.atan2(r.b[1]-r.a[1],r.b[0]-r.a[0]);group.add(mesh);}
 const bodyGeo=new THREE.CylinderGeometry(s.headRadius,s.headRadius,s.headHeight,12),stemGeo=new THREE.CylinderGeometry(s.headRadius*.25,s.headRadius*.25,s.stemHeight,8),lensGeo=new THREE.CylinderGeometry(s.headRadius*.82,s.headRadius*.82,.003,12);
 for(const l of s.lamps){const head=new THREE.Group();head.name='軌道燈頭';head.userData.fixtureId=s.id;head.position.set(l.x,s.headCenterY,l.z);const body=new THREE.Mesh(bodyGeo,metal);body.name='燈筒';const stem=new THREE.Mesh(stemGeo,metal);stem.name='燈座';stem.position.y=(s.headHeight+s.stemHeight)/2;const face=new THREE.Mesh(lensGeo,lens);face.name='暖白燈面';face.position.y=-s.headHeight/2+.001;head.add(body,stem,face);group.add(head);}
 root.add(group);
 }
 for(const s of roundLightGeometry(house)){const group=new THREE.Group();group.name=s.name??(s.kind==='recessed'?'圓形崁燈':'吸頂燈');group.userData.fixtureId=s.id;group.userData.roomId=s.roomId;group.userData.kind=s.kind;group.userData.brand=s.brand;group.userData.model=s.model;group.userData.colorTemperatureK=s.colorTemperatureK;group.userData.powerW=s.powerW;group.position.set(s.x,s.top-s.height/2,s.z);
 const body=new THREE.Mesh(new THREE.CylinderGeometry(s.diameter/2,s.diameter/2,s.height-.003,24),new THREE.MeshStandardMaterial({color:s.color,roughness:.65}));body.name='燈框';body.position.y=.0015;const face=new THREE.Mesh(new THREE.CylinderGeometry(s.diameter*.45,s.diameter*.45,.003,24),new THREE.MeshStandardMaterial({color:s.lightColor,emissive:s.lightColor,emissiveIntensity:.6,roughness:.4}));face.name='4000K 燈面';face.position.y=-s.height/2+.0015;group.add(body,face);root.add(group);
 }return root;
}
