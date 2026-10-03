export const floorPresets={wood:{label:'木地板',color:'#c6aa83'},lightTile:{label:'淺色磁磚',color:'#e0ddd3'},darkTile:{label:'深色磁磚',color:'#696f71'},stone:{label:'石材',color:'#b6b3a8'},concrete:{label:'水泥',color:'#a3a6a2'},solid:{label:'純色',color:'#c6aa83'}};
export function validRoomMaterials(value){return value===undefined||(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length<=100&&Object.entries(value).every(([id,m])=>id.length<100&&m&&Object.hasOwn(floorPresets,m.preset)&&/^#[a-f0-9]{6}$/i.test(m.color)));}
export function roomMaterial(state,room){return state.roomMaterials?.[room.id]??{preset:'solid',color:['balcony','stairs'].includes(room.kind)?'#c7cdbd':state.floorColor};}
// Small, deterministic vector pattern. No network textures or random rebuilds.
export function drawFloorPattern(ctx,preset,color,size=128){ctx.fillStyle=color;ctx.fillRect(0,0,size,size);ctx.strokeStyle='rgba(35,40,30,.14)';ctx.lineWidth=1;
 if(preset==='wood'){for(let i=0;i<4;i++){const y=i*size/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);const x=i%2?size*.7:size*.25;ctx.moveTo(x,y);ctx.lineTo(x,y+size/4);ctx.stroke();}ctx.strokeStyle='rgba(255,255,255,.11)';for(let i=0;i<16;i++){ctx.beginPath();ctx.moveTo(0,i*8+3);ctx.lineTo(size,i*8+4);ctx.stroke();}}
 else if(preset==='lightTile'||preset==='darkTile'){ctx.strokeStyle='rgba(250,248,239,.35)';ctx.strokeRect(.5,.5,size-1,size-1);}
 else if(preset==='stone'){ctx.strokeStyle='rgba(255,255,255,.23)';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(i*50-25,0);ctx.bezierCurveTo(i*40,40,i*60-35,70,i*45+25,size);ctx.stroke();}}
 else if(preset==='concrete'){for(let i=0;i<140;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.06)':'rgba(30,35,30,.05)';ctx.fillRect((i*37)%size,(i*61)%size,2,2);}}
}
