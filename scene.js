import {templateFor,fittedModel,disposeModel,pruneModelCache} from './item-models.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {houseConfig as house,allRooms,wallParts,openings} from './house-config.js';
import {createFurnitureModel} from './furniture-factory.js';
import {WalkController} from './walk-controller.js';
import {roomMaterial,drawFloorPattern} from './room-materials.js';
import {formatDistance,measurementDistance} from './planner-geometry.js';
export function createScene(container,{onSelect,onMove,onMoveStart=()=>{},onMoveEnd,onMoveCancel=()=>{},isMoving,onWalkHint,onAssetError=()=>{},getMeasurement=()=>({active:false}),onMeasure=()=>{},onMeasurePreview=()=>{}}){
  const scene=new THREE.Scene(),renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  container.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','3D 房屋模型');renderer.domElement.tabIndex=0;
  const camera=new THREE.PerspectiveCamera(38,1,.1,160),controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.1;controls.maxPolarAngle=Math.PI/2-.06;controls.minDistance=3;controls.maxDistance=55;controls.target.set(3.9,0,5.1);
  const walk=new WalkController(renderer.domElement,document.querySelector('#walk-joystick'),{onHint:onWalkHint});
  const ceiling=new THREE.Group(),indoorLight=new THREE.AmbientLight(0xfff8ec,.7);ceiling.visible=false;indoorLight.visible=false;scene.add(ceiling,indoorLight);
  const hemisphere=new THREE.HemisphereLight(0xffffff,0x7b816e,2.6);scene.add(hemisphere);
  const sun=new THREE.DirectionalLight(0xfff9e9,3.0);sun.position.set(-3,16,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-15;sun.shadow.camera.right=15;sun.shadow.camera.top=15;sun.shadow.camera.bottom=-15;sun.shadow.bias=-.0006;sun.shadow.normalBias=.035;scene.add(sun);
  const building=new THREE.Group(),furnishings=new THREE.Group(),labels=new THREE.Group(),measures=new THREE.Group();scene.add(building,furnishings,labels,measures);
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  let state,selected=null,lowWalls=true,showLabels=true,drag=null,down=null,active=true,needsFit=true,walking=false;
  const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.84,metalness:0});
  function box(parent,w,h,d,x,y,z,color){const m=new THREE.Mesh(new THREE.BoxGeometry(Math.max(w,.001),Math.max(h,.001),Math.max(d,.001)),typeof color==='string'?mat(color):color);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function clear(group){disposeModel(group);group.clear();}
  function label(room){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(251,249,239,.84)';ctx.beginPath();ctx.roundRect(8,8,240,48,14);ctx.fill();ctx.font='500 29px system-ui';ctx.fillStyle='#4c6453';ctx.textAlign='center';ctx.fillText(room.name,128,43);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));s.position.set(room.label[0],.1,room.label[1]);s.scale.set(1.16,.29,1);s.renderOrder=4;labels.add(s);}
  function architecture(){clear(building);clear(labels);clear(ceiling);
    for(const room of allRooms){const shape=new THREE.Shape(room.polygon.map(p=>new THREE.Vector2(p[0],-p[1]))),geo=new THREE.ExtrudeGeometry(shape,{depth:house.floor.thickness,bevelEnabled:false});geo.rotateX(-Math.PI/2);const surface=roomMaterial(state,room),material=mat(surface.color);
      if(surface.preset!=='solid'){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;drawFloorPattern(canvas.getContext('2d'),surface.preset,surface.color);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1/1.2,1/1.2);material.color.set('#ffffff');material.map=texture;}
      const mesh=new THREE.Mesh(geo,material);mesh.userData.roomId=room.id;mesh.position.y=-house.floor.thickness;mesh.receiveShadow=true;building.add(mesh);label(room);
      if(!['balcony','stairs'].includes(room.kind)){const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);const material=mat('#eeeae1');material.side=THREE.DoubleSide;const roof=new THREE.Mesh(g,material);roof.position.y=house.ceilingHeight;ceiling.add(roof);}
      // 薄縫只是視覺材質，不改變幾何尺寸。
      const points=room.polygon.map(p=>new THREE.Vector3(p[0],.005,p[1]));points.push(points[0].clone());building.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#9d9f87',transparent:true,opacity:.35})));
    }
    for(const wall of house.walls){const length=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]),ux=(wall.b[0]-wall.a[0])/length,uz=(wall.b[1]-wall.a[1])/length,height=lowWalls&&!walking?Math.min(.72,wall.height??house.defaults.wallHeight):(wall.height??house.defaults.wallHeight);
      for(const p of wallParts(wall)){const top=Math.min(height,p.bottom+p.height);if(top<=p.bottom)continue;const mesh=box(building,p.length,top-p.bottom,house.defaults.wallThickness,wall.a[0]+ux*(p.start+p.length/2),(top+p.bottom)/2,wall.a[1]+uz*(p.start+p.length/2),state.wallColor);mesh.rotation.y=-Math.atan2(uz,ux);}
      for(const o of openings(wall)){
        const x=wall.a[0]+ux*(o.offset+o.width/2),z=wall.a[1]+uz*(o.offset+o.width/2);
        if(o.kind==='door'){const threshold=box(building,o.width,.015,.13,x,.01,z,'#b99d75');threshold.rotation.y=-Math.atan2(uz,ux);}
        else if(!lowWalls||walking){const glass=box(building,o.width,o.top-o.bottom,.024,x,(o.top+o.bottom)/2,z,new THREE.MeshStandardMaterial({color:'#accbc8',transparent:true,opacity:.35,roughness:.2}));glass.rotation.y=-Math.atan2(uz,ux);}
      }
    }
    const st=house.stairs;for(let i=0;i<st.steps;i++){const d=st.depth/st.steps;box(building,st.width,(i+1)*st.rise,d,st.x+st.width/2,(i+1)*st.rise/2,st.z+i*d+d/2,'#c0c5b7');}
    labels.visible=showLabels&&!walking;ceiling.visible=walking;
  }
  const failedAssets=new Set();
  const modelKey=f=>JSON.stringify([f.type,f.width,f.depth,f.height,f.color,f.model]);
  function makeFurniture(f,reused){const g=reused??createFurnitureModel(f),w=f.width/100,d=f.depth/100;
    g.position.set(f.x,0,f.z);g.rotation.y=-THREE.MathUtils.degToRad(f.rotation);furnishings.add(g);
    g.userData.modelKey=modelKey(f);
    if(f.model?.assetId&&!reused){const fallback=g.children[0];g.userData.modelStatus='loading';templateFor(f.model.assetId,f.model.kind).then(template=>{if(g.parent!==furnishings)return;const model=fittedModel(template,f);g.remove(fallback);disposeModel(fallback);g.add(model);g.userData.modelStatus='loaded';}).catch(error=>{if(g.parent!==furnishings)return;g.userData.modelStatus='fallback';if(!failedAssets.has(f.model.assetId)){failedAssets.add(f.model.assetId);onAssetError(error.message+'；保留原尺寸的簡化外觀');}});}
    if(f.id===selected){const points=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2],[-w/2,-d/2]].map(([x,z])=>new THREE.Vector3(x,.025,z));const edge=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#d57627',depthTest:false}));edge.renderOrder=5;edge.userData.editorOnly=true;edge.visible=!walking;g.add(edge);const helper=new THREE.BoxHelper(g,0xd57627);helper.material.transparent=true;helper.material.opacity=.55;helper.userData.editorOnly=true;helper.visible=!walking;furnishings.add(helper);}
  }
  function render(s,id,architectureChanged=false){const first=!state;pruneModelCache(s.furniture.map(f=>f.model?.assetId).filter(Boolean));state=s;selected=id;if(first||architectureChanged)architecture();// 匯入模型僅在外觀／尺寸變更時重建；移動與旋轉保留既有網格，避免拖曳閃回 fallback。
    const reusable=new Map(),byId=new Map(state.furniture.map(f=>[f.id,f]));for(const g of [...furnishings.children]){const f=byId.get(g.userData.furnitureId);if(f&&g.userData.modelKey===modelKey(f)){for(const child of [...g.children])if(child.userData.editorOnly){g.remove(child);disposeModel(child);}furnishings.remove(g);reusable.set(f.id,g);}}
    clear(furnishings);for(const f of state.furniture)makeFurniture(f,reusable.get(f.id));if(walking)walk.setFurniture(state.furniture);}
  function positionPointer(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);}
  function groundPoint(e){positionPointer(e);return ray.ray.intersectPlane(ground,new THREE.Vector3());}
  function pick(e){positionPointer(e);for(const hit of ray.intersectObjects(furnishings.children,true)){let o=hit.object;while(o&&!o.userData.furnitureId)o=o.parent;if(o)return o.userData.furnitureId;}return null;}
  function endPointer(e,cancel=false){if(walking||!down||down.pointer!==e.pointerId)return;const gesture=down;down=null;
    if(drag){drag=null;if(cancel)onMoveCancel();else if(gesture.moved)onMoveEnd(gesture.id);else{onMoveCancel();onSelect(gesture.id);}}
    else if(gesture.measure&&!cancel&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<8){const p=groundPoint(e);if(p)onMeasure({x:p.x,z:p.z},e.shiftKey);}
    controls.enabled=!isMoving()&&!getMeasurement().active;
    if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
  }
  renderer.domElement.addEventListener('pointerdown',e=>{if(walking||e.button!==0)return;
    if(down&&down.pointer!==e.pointerId){const old=down;endPointer({pointerId:old.pointer},true);return;}
    const measuring=getMeasurement().active,id=measuring?null:isMoving()?selected:pick(e);if(!id&&!measuring)return;
    down={x:e.clientX,y:e.clientY,id,pointer:e.pointerId,moved:false,measure:measuring};controls.enabled=false;e.preventDefault();e.stopImmediatePropagation();renderer.domElement.setPointerCapture(e.pointerId);
    if(id){const p=groundPoint(e),f=state.furniture.find(f=>f.id===id);if(p&&f){onMoveStart(id);drag={id,dx:f.x-p.x,dz:f.z-p.z};}}
  },true);
  renderer.domElement.addEventListener('pointermove',e=>{if(walking)return;if(down&&down.pointer!==e.pointerId)return;
    const p=groundPoint(e);if(getMeasurement().active){if(p)onMeasurePreview({x:p.x,z:p.z},e.shiftKey);return;}
    if(!drag||!p)return;if(!down.moved&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<5)return;down.moved=true;onMove(drag.id,p.x+drag.dx,p.z+drag.dz);
  });
  renderer.domElement.addEventListener('pointerup',e=>endPointer(e));
  renderer.domElement.addEventListener('pointercancel',e=>endPointer(e,true));
  renderer.domElement.addEventListener('lostpointercapture',e=>endPointer(e,true));
  function renderMeasurement(){clear(measures);const m=getMeasurement();measures.visible=m.active&&!walking;if(!m.active||!m.a)return;const points=[m.a,m.b??m.preview].filter(Boolean);
    for(const p of points){const marker=new THREE.Mesh(new THREE.SphereGeometry(.035,10,6),new THREE.MeshBasicMaterial({color:0xb74a2f,depthTest:false}));marker.position.set(p.x,.05,p.z);marker.renderOrder=10;measures.add(marker);}
    if(points.length===2){const [a,b]=points,line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p.x,.045,p.z))),new THREE.LineBasicMaterial({color:0xb74a2f,depthTest:false}));line.renderOrder=10;measures.add(line);
      const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#fff8ed';ctx.fillRect(0,0,256,64);ctx.fillStyle='#8d3826';ctx.font='bold 30px system-ui';ctx.textAlign='center';ctx.fillText(formatDistance(measurementDistance(a,b)),128,43);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false}));label.position.set((a.x+b.x)/2,.12,(a.z+b.z)/2);label.scale.set(.95,.24,1);label.renderOrder=11;measures.add(label);
    }
  }
  function reset(top=false){
    controls.target.set(3.9,0,5.1);const aspect=container.clientWidth/Math.max(container.clientHeight,1);let distance=Math.max(21,17/Math.max(aspect,.4));
    const direction=top?new THREE.Vector3(0,1,.001):new THREE.Vector3(7,12,14).normalize(),b=house.bounds;
    // 依投影後的外框自動留白，直向手機也能完整看到雙陽台。
    for(let i=0;i<12;i++){camera.position.copy(controls.target).addScaledVector(direction,distance);camera.lookAt(controls.target);camera.updateMatrixWorld();let fits=true;
      for(const x of [b.minX,b.maxX])for(const z of [b.minZ,b.maxZ])for(const y of [0,lowWalls?.72:house.defaults.wallHeight]){const p=new THREE.Vector3(x,y,z).project(camera);if(Math.abs(p.x)>.86||Math.abs(p.y)>.85)fits=false;}
      if(fits)break;distance*=1.08;
    }controls.update();
  }
  function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();walk.camera.aspect=w/h;walk.camera.updateProjectionMatrix();renderer.setSize(w,h);if(needsFit){reset();needsFit=false;}}
  new ResizeObserver(resize).observe(container);resize();
  let previousTime=performance.now();
  function animate(time=performance.now()){requestAnimationFrame(animate);const dt=(time-previousTime)/1000;previousTime=time;if(!active||document.hidden)return;if(walking)walk.update(dt);else controls.update();renderer.render(scene,walking?walk.camera:camera);}animate();
  function setWalk(value){
    if(walking===value)return true;
    if(value){
      if(!walk.activate(state.furniture))return false;
      // 清掉尚未結束的 Orbit 阻尼，但保持使用者切換當下的取景。
      const position=camera.position.clone(),target=controls.target.clone(),damping=controls.enableDamping;
      controls.enableDamping=false;controls.update();camera.position.copy(position);controls.target.copy(target);controls.update();controls.enableDamping=damping;
      walking=true;controls.enabled=false;
    }else{walk.deactivate();walking=false;controls.enabled=!isMoving();}
    drag=null;down=null;architecture();renderMeasurement();indoorLight.visible=value;renderer.shadowMap.enabled=!value;scene.background=value?new THREE.Color('#e8e5da'):null;
    hemisphere.intensity=value?1.5:2.6;sun.intensity=value?.8:3;renderer.toneMapping=value?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;renderer.toneMappingExposure=value?.9:1;
    furnishings.traverse(o=>{if(o.userData.editorOnly)o.visible=!value;});resize();return true;
  }
  return {render,reset,setWalk,renderMeasurement,setMeasuring(){controls.enabled=!walking&&!isMoving()&&!getMeasurement().active;renderMeasurement();},resetWalk:()=>walk.reset(),get walkPose(){return walk.snapshot;},get orbitPose(){return {position:camera.position.toArray(),target:controls.target.toArray(),enabled:controls.enabled,ceiling:ceiling.visible};},zoom(f){camera.position.sub(controls.target).multiplyScalar(1/f).add(controls.target);controls.update();},setActive(v){active=v;if(v)resize();},setMoving(v){controls.enabled=!v&&!walking&&!getMeasurement().active;},setWalls(v){lowWalls=v;architecture();},setLabels(v){showLabels=v;labels.visible=v&&!walking;},get lowWalls(){return lowWalls;},get showLabels(){return showLabels;},canvas:renderer.domElement};
}
