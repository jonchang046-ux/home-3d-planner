// Shared architectural geometry. No private room coordinates are stored here.
const EPS=1e-7;
export function openingsFor(house,wall){return [...house.doors.filter(o=>o.wall===wall.id).map(o=>({...o,kind:'door',bottom:0,top:house.defaults.doorHeight})),...house.windows.filter(o=>o.wall===wall.id).map(o=>({...o,kind:'window',bottom:house.defaults.windowSill,top:house.defaults.windowSill+house.defaults.windowHeight}))].sort((a,b)=>a.offset-b.offset);}
function projection(w,p){const dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;return {length,ux,uz,t:(p[0]-w.a[0])*ux+(p[1]-w.a[1])*uz,distance:Math.abs((p[0]-w.a[0])*uz-(p[1]-w.a[1])*ux)};}
function endpointCap(house,wall,point){const own=projection(wall,point);for(const other of house.walls){if(other===wall)continue;const p=projection(other,point);if(p.distance>EPS||p.t<-EPS||p.t>p.length+EPS||Math.abs(own.ux*p.ux+own.uz*p.uz)>EPS)continue;if(openingsFor(house,other).some(o=>o.bottom===0&&p.t>o.offset+EPS&&p.t<o.offset+o.width-EPS))continue;return house.defaults.wallThickness/2;}return 0;}
export function wallPartsFor(house,wall){const length=projection(wall,wall.b).length,height=wall.height??house.defaults.wallHeight,parts=[];let cursor=0;
 for(const o of openingsFor(house,wall)){if(o.offset>cursor)parts.push({start:cursor,length:o.offset-cursor,bottom:0,height});if(o.bottom>0)parts.push({start:o.offset,length:o.width,bottom:0,height:o.bottom});if(o.top<height)parts.push({start:o.offset,length:o.width,bottom:o.top,height:height-o.top});cursor=o.offset+o.width;}
 if(cursor<length)parts.push({start:cursor,length:length-cursor,bottom:0,height});
 const startCap=endpointCap(house,wall,wall.a),endCap=endpointCap(house,wall,wall.b);
 return parts.map(p=>{const a=Math.abs(p.start)<EPS?startCap:0,b=Math.abs(p.start+p.length-length)<EPS?endCap:0;return {...p,start:p.start-a,length:p.length+a+b};});
}
export function topologyIssues(house){const issues=[];for(const wall of house.walls){const len=projection(wall,wall.b).length;let end=0;for(const o of openingsFor(house,wall)){if(o.offset<end-EPS||o.offset<0||o.width<=0||o.offset+o.width>len+EPS)issues.push({kind:'invalid-opening',wall:wall.id});end=o.offset+o.width;}
 for(const other of house.walls){if(other===wall)continue;for(const point of [other.a,other.b]){const p=projection(wall,point);if(p.distance>EPS||p.t<-EPS||p.t>len+EPS)continue;for(const o of openingsFor(house,wall))if(o.bottom===0&&p.t>o.offset+EPS&&p.t<o.offset+o.width-EPS)issues.push({kind:'wall-end-inside-opening',wall:wall.id,adjoining:other.id});}}
 }return issues;}
