// Architectural defaults only; coordinates always come from the private room polygon.
export function defaultStructures(house){const balcony=[...(house.balcony??[])].sort((a,b)=>Math.min(...a.polygon.map(p=>p[1]))-Math.min(...b.polygon.map(p=>p[1])))[0];return balcony?[{id:'upper-balcony-cover',kind:'balconyCover',roomId:balcony.id,roofThickness:.08,barThickness:.022,barSpacing:.14,color:'#626c68',status:'預設：屋頂底面沿用樓高；厚度 8 cm、鐵件 2.2 cm、間距 14 cm，均待實測'}]:[];}
export function withStructures(house){if(house.structures===undefined)house.structures=defaultStructures(house);return house;}
export function structureGeometry(house){return (house.structures??defaultStructures(house)).filter(s=>s.kind==='balconyCover').flatMap(s=>{const room=[...house.rooms,...house.balcony].find(r=>r.id===s.roomId);if(!room)return [];
 const height=house.ceilingHeight??house.defaults.wallHeight,edges=[];
 for(let i=0;i<room.polygon.length;i++){const a=room.polygon[i],b=room.polygon[(i+1)%room.polygon.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.001)continue;const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const walls=house.walls.filter(w=>{const vx=w.b[0]-w.a[0],vz=w.b[1]-w.a[1],l=Math.hypot(vx,vz);return Math.abs((mid[0]-w.a[0])*vz-(mid[1]-w.a[1])*vx)/l<.01&&Math.abs(dx*vz-dz*vx)/(length*l)<.01&&(mid[0]-w.a[0])*vx+(mid[1]-w.a[1])*vz>=-.01&&(mid[0]-w.a[0])*vx+(mid[1]-w.a[1])*vz<=l*l+.01;});
  if(walls.some(w=>(w.height??house.defaults.wallHeight)>=height-.1))continue;
  const bottom=Math.max(.04,...walls.map(w=>w.height??house.defaults.wallHeight));if(bottom<height)edges.push({a,b,length,bottom,top:height});
 }return [{...s,height,polygon:room.polygon,edges}];});}
