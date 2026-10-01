import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createItemModel,disposeModel} from './item-models.js';
export function createItemPreview(container){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;container.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','物品 3D 預覽，拖曳旋轉、捏合縮放');
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.01,100),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;scene.add(new THREE.HemisphereLight(0xffffff,0x7c8772,2.5));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(-3,6,5);scene.add(sun);
  let model,token=0,dead=false,frame,extent=1,center=.5;
  function reset(){controls.target.set(0,center,0);camera.position.set(extent*1.4,center+extent,extent*1.8);controls.update();}
  const ro=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});ro.observe(container);
  function animate(){if(dead)return;frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();
  return {reset,async update(item,blob){const ticket=++token,g=await createItemModel(item,blob);if(dead||ticket!==token){disposeModel(g);return;}if(model){scene.remove(model);disposeModel(model);}model=g;scene.add(model);const b=new THREE.Box3().setFromObject(g,true),size=b.getSize(new THREE.Vector3());extent=Math.max(size.x,size.y,size.z,.2);center=size.y/2;reset();},dispose(){dead=true;token++;cancelAnimationFrame(frame);ro.disconnect();controls.dispose();disposeModel(model);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
