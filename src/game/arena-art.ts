import type { ArenaEngine } from "./arena";

type G=CanvasRenderingContext2D;
const W=960,H=540;
const PAL=[
 {sky:"#141a37",far:"#26234a",top:"#343b63",road:"#37324a",stripe:"#9993b2",glow:"#ef8051",name:"THE SHATTERED ROAD"},
 {sky:"#092b31",far:"#133d3e",top:"#31554d",road:"#25413a",stripe:"#80b78a",glow:"#7de9c4",name:"THE WITCHFIRE MARSH"},
 {sky:"#281221",far:"#4b1a31",top:"#693244",road:"#453744",stripe:"#b2766d",glow:"#ff9655",name:"THE OBSIDIAN FORGE"}
];
const FORM_COLORS=["#ff792f","#6ee9ff","#d3c1ff","#cc7bff"];
const GUN_COLORS=["#ffd27c","#85edff","#ffbb66","#edc0ff","#ff663d","#ffa346","#a3aeff","#a0ffff"];
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
function line(g:G,pts:number[],color:string,width=1){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(pts[0]!,pts[1]!);for(let i=2;i<pts.length;i+=2)g.lineTo(pts[i]!,pts[i+1]!);g.stroke()}
function rect(g:G,x:number,y:number,w:number,h:number,c:string){g.fillStyle=c;g.fillRect(x,y,w,h)}
function ellipse(g:G,x:number,y:number,rx:number,ry:number,c:string){g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill()}
function poly(g:G,pts:number[],c:string){g.fillStyle=c;g.beginPath();g.moveTo(pts[0]!,pts[1]!);for(let i=2;i<pts.length;i+=2)g.lineTo(pts[i]!,pts[i+1]!);g.closePath();g.fill()}
function txt(g:G,t:string,x:number,y:number,size=15,color="#fff",align:CanvasTextAlign="left"){
 g.font=`900 ${size}px system-ui,sans-serif`;g.textAlign=align;g.fillStyle="#020514";g.fillText(t,x+1.5,y+2);
 g.fillStyle=color;g.fillText(t,x,y);
}
function glow(g:G,x:number,y:number,r:number,c:string,alpha=.5){
 g.save();g.globalAlpha=alpha;const grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,c);grad.addColorStop(1,"transparent");g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);g.restore();
}
function star(g:G,x:number,y:number,r:number,c:string){line(g,[x-r,y,x+r,y],c,1.5);line(g,[x,y-r,x,y+r],c,1.5)}
function background(g:G,e:ArenaEngine){
 const zone=e.stageAt(e.player.x),p=PAL[zone]!;
 const grd=g.createLinearGradient(0,0,0,350);grd.addColorStop(0,p.sky);grd.addColorStop(.75,p.far);grd.addColorStop(1,p.top);g.fillStyle=grd;g.fillRect(0,0,W,H);
 // Far mountains and distant towers scroll very slowly to create deep dimensionality.
 for(let layer=0;layer<3;layer++){
  const shift=e.cam*(.1+layer*.13),base=170+layer*38;
  for(let i=-2;i<12;i++){
   const x=i*170-(shift%170),h=75+((i*53+layer*27+20)%84);
   poly(g,[x-95,base+90,x+75,base-h,x+220,base+90],layer===0?"#14172e":layer===1?p.far:p.top);
   if(zone!==1&&layer===2){
    rect(g,x+54,base-h+23,23,h-18,zone===2?"#392a39":"#32304e");
    rect(g,x+47,base-h+12,37,14,zone===2?"#4f3542":"#484669");
    for(let k=0;k<5;k++)rect(g,x+58,base-h+35+k*19,3,7,zone===2?"#ff985d":"#b9a8e4");
   }
  }
 }
 if(zone===0){glow(g,780-e.cam*.02,110,100,"#c8a2ff",.38);ellipse(g,780-e.cam*.02,110,36,36,"#dfd5ff")}
 if(zone===1){glow(g,725-e.cam*.02,128,105,"#36ffc9",.27);ellipse(g,725-e.cam*.02,128,27,27,"#a1ffdd")}
 if(zone===2){glow(g,780-e.cam*.02,118,148,"#ff7c2a",.33);ellipse(g,780-e.cam*.02,118,45,45,"#ffb56a")}
 // Atmospheric perspective: top of road rises away from viewer.
 const road=g.createLinearGradient(0,292,0,H);road.addColorStop(0,p.road);road.addColorStop(1,zone===2?"#1d1429":"#14172d");
 rect(g,0,296,W,H-296,road as unknown as string);
 rect(g,0,292,W,7,p.stripe);rect(g,0,513,W,20,"#131624");
 for(let i=-2;i<12;i++){
  const x=i*138-(e.cam%138),w=96;
  poly(g,[x,309,x+w,309,x+w+29,505,x-27,505],i%2?"#ffffff06":"#00000015");
  line(g,[x,309,x-27,505],zone===1?"#6acaa329":"#c8b6f02c",1.3);
  rect(g,x+24,309,w-35,2,zone===2?"#fb74402a":"#ffffff19");
  // Cracked masonry and road details.
  line(g,[x+43,345,x+53,357,x+41,367],zone===2?"#ed8b6e55":"#abb0cf44",2);
  line(g,[x+76,459,x+86,469,x+82,477],zone===1?"#80cca844":"#9995b555",1.4);
 }
 // Decorative roadside props and architectural markers.
 for(let i=Math.max(0,Math.floor(e.cam/240)-2);i<Math.min(28,Math.floor((e.cam+W)/240)+3);i++){
  const world=i*240+80, x=world-e.cam;
  if(zone===1){
   const t=11+((i*7)%18);
   line(g,[x,298,x-10,240-t,x-28,222-t],"#1b2729",9);
   for(let j=0;j<5;j++)line(g,[x-10,247-j*12,x-45-j*4,225-j*15],"#163c36",12);
   glow(g,x-36,213,24,"#4de2ab",.2);
  }else{
   rect(g,x-15,235,30,60,zone===2?"#372337":"#2b2d46");
   rect(g,x-25,224,50,13,zone===2?"#614154":"#555471");
   rect(g,x-3,243,6,30,zone===2?"#ff8d52":"#c4abec");
   glow(g,x,245,22,p.glow,.38);
  }
 }
 // Floor mist / embers are deterministic sinusoids to avoid idle particle allocation.
 g.globalAlpha=.25;for(let k=0;k<15;k++){
  const x=(k*117+e.time*(zone===2?-17:12)-e.cam*.28)%1130-80;
  const y=307+k*13+Math.sin(e.time*.7+k)*8;
  ellipse(g,x,y,35,4,zone===1?"#baffd6":"#af8fd7");
 }g.globalAlpha=1;
}
function projectile(g:G,b:ArenaEngine["shots"][number],t:number){
 const c=b.friendly?(b.kind>=8?FORM_COLORS[b.kind-8]??"#ff9e4d":GUN_COLORS[b.kind]??"#ffe8aa"):"#fc646d";
 glow(g,b.x,b.y,b.radius*4,c,.6);
 line(g,[b.x-b.vx*.023,b.y-b.vy*.023,b.x,b.y],c,Math.max(2,b.radius*.8));
 ellipse(g,b.x,b.y,b.radius,b.radius*.85,c);
 ellipse(g,b.x,b.y,Math.max(2,b.radius*.35),Math.max(2,b.radius*.35),"#fff8d9");
 if(b.kind===5||b.kind===11){for(let j=0;j<3;j++)star(g,b.x+Math.cos(t*14+j*2)*12,b.y+Math.sin(t*14+j*2)*12,3,c)}
}
function soldier(g:G,e:ArenaEngine["enemies"][number],time:number){
 const brute=e.kind==="brute",caster=e.kind==="caster",runner=e.kind==="runner",boss=e.kind==="boss";
 const scale=boss?2.55:brute?1.4:runner?.86:1;
 g.save();g.translate(e.x,e.y);g.scale(e.face*scale,scale);
 const wobble=Math.sin(time*(runner?15:7)+e.id)*1.7;
 ellipse(g,0,1,19,5,"#05071488");
 if(e.flash>0)g.globalAlpha=.78;
 // Legs: dynamic, grounded, with armored shin guards.
 for(const side of [-1,1]){
  const ox=side*8,step=Math.sin(time*10+e.id+side)*3;
  poly(g,[ox-7,-20,ox+3,-20,ox+6+step,-4,ox+3+step,0,ox-7+step,-1],boss?"#393c58":"#252638");
  rect(g,ox-5+step,-8,11,5,boss?"#877190":"#61546a");
 }
 // Angular coats/carapace.
 poly(g,[-18,-55+wobble,-8,-65+wobble,12,-61+wobble,23,-28,13,-17,-13,-17,-23,-29],boss?"#44354c":brute?"#4e4152":caster?"#344c58":"#484454");
 poly(g,[-15,-51+wobble,11,-53+wobble,18,-27,-11,-30],boss?"#76618e":caster?"#517a7e":"#6b5368");
 for(let j=0;j<3;j++)rect(g,-6+j*8,-42+wobble,3,11,boss?"#f5a0ff":caster?"#7bffff":"#f6b65a");
 // Shoulder spiked armor.
 poly(g,[-20,-57,-11,-69,0,-62,-6,-48],"#82718c");
 poly(g,[10,-64,21,-69,25,-53,14,-49],boss?"#bd93c2":"#7c6f89");
 ellipse(g,1,-72+wobble,15,17,boss?"#251b33":"#2b2a3c");
 poly(g,[-12,-79,0,-89,12,-79,6,-73,-8,-72],boss?"#ba8bc4":"#857a8f");
 rect(g,-9,-76+wobble,19,5,"#100d20");
 rect(g,0,-75+wobble,8,3,boss?"#e35aff":caster?"#51fff0":"#ffb75d");
 if(boss){
  for(const side of [-1,1])poly(g,[side*8,-84,side*14,-110,side*23,-90],"#cfb0e4");
  glow(g,0,-42,21,"#ec50ff",.47);
 }
 // Weapon and attack flash.
 line(g,[14,-43,31,-41,38,-38],boss?"#e589f9":"#303345",7);
 if(e.attacking>.1){glow(g,37,-38,20,boss?"#de80ff":"#ffb36a",.55);line(g,[32,-39,48,-42],boss?"#f0c3ff":"#ffcc7a",4)}
 g.restore();
}
function warrior(g:G,e:ArenaEngine,time:number){
 const p=e.player,beast=p.beastTime>0,form=e.beastForm;
 g.save();g.translate(p.x,p.y-p.z);g.scale(p.face,1);
 const bob=Math.sin(time*9)*1.5;
 ellipse(g,0,p.z-1,beast?37:18,beast?9:6,"#06081299");
 if(p.inv>0&&Math.floor(time*18)%2)g.globalAlpha=.7;
 if(p.shield>0){g.strokeStyle="#9df6ff";g.lineWidth=3;g.beginPath();g.ellipse(0,-45,beast?53:34,beast?78:52,0,0,Math.PI*2);g.stroke();glow(g,0,-48,65,"#5bdfff",.11)}
 if(beast){beastDraw(g,e,time);g.restore();return}
 // More dimensional than the previous tiny blocky protagonist: layered armored silhouette.
 const step=Math.sin(time*11)*(Math.abs((e.input.down("right")?1:0)-(e.input.down("left")?1:0))?4:1);
 for(const [x,d] of [[-8,step],[8,-step]]){
  poly(g,[Number(x)-6,-24,Number(x)+5,-24,Number(x)+4+Number(d),-1,Number(x)-8+Number(d),-1],"#24283e");
  rect(g,Number(x)-6+Number(d),-9,13,5,"#8391a8");
 }
 poly(g,[-18,-58+bob,-2,-66+bob,14,-57+bob,20,-25,-18,-26],"#203044");
 poly(g,[-13,-56+bob,10,-56+bob,10,-28,-13,-28],"#627d8d");
 poly(g,[-6,-53+bob,4,-53+bob,9,-30,-8,-31],"#182234");
 line(g,[-3,-52,5,-37,-3,-29],"#6defff",3);
 poly(g,[-18,-56,-22,-65,-5,-70,-5,-54],"#a2b5bf");
 poly(g,[5,-55,12,-67,25,-60,20,-48],"#7b99a5");
 // Hood, faceplate and cyan eyes.
 poly(g,[-14,-70,-7,-85,10,-84,17,-69,7,-62,-9,-62],"#303747");
 poly(g,[-9,-77,12,-77,10,-64,-7,-65],"#a9b4b9");
 rect(g,-6,-72,17,4,"#091829");rect(g,3,-71,6,2,"#68faff");
 line(g,[13,-42,29,-38,36,-37],"#31415a",6);
 line(g,[23,-39,39,-39],"#e0d7a8",3);
 if(p.attack>0){glow(g,64,-45,31,"#88ffff",.25);line(g,[24,-58,95,-64+Math.sin(time*50)*12],"#e4fcff",7);line(g,[33,-53,99,-55],"#5febff",2)}
 if(p.shoot>0){glow(g,39,-39,20,"#ffe0a0",.65);ellipse(g,39,-39,8,4,"#fff6c9")}
 g.restore();
}
function beastDraw(g:G,e:ArenaEngine,t:number){
 const p=e.player,form=e.beastForm,c=FORM_COLORS[form]!,isTitan=form===3,isDrake=form===1;
 const scale=isTitan?1.43:isDrake?1.26:1.2;
 g.save();g.scale(scale,scale);
 const sway=Math.sin(t*8)*2,flare=p.attack>0?17:0;
 glow(g,0,-87,isTitan?105:83,c,.24);
 // Colossal animated tail/wings based on form.
 if(isDrake){
  for(const side of [-1,1]){
   poly(g,[side*4,-115,side*75,-168+sway,side*96,-76+sway,side*40,-98],"#234a67");
   line(g,[side*5,-115,side*76,-160,side*91,-80],"#77eaff",3);
  }
 }else{
  line(g,[-16,-50,-58,-84+sway,-102,-76+sway],c,isTitan?20:11);
  for(let k=0;k<8;k++)ellipse(g,-60-k*6,-85+sway-k%3*4,8,5,k%2?"#ffe090":c);
 }
 // Thick digitigrade legs.
 for(const side of [-1,1]){
  const x=side*18;
  poly(g,[x-17,-51,x+14,-51,x+19,-18,x+12,-6,x+22,1,x-18,1,x-9,-15],"#202037");
  poly(g,[x-15,-40,x+10,-43,x+15,-20,x-12,-19],form===2?"#59516f":"#514256");
  for(let j=0;j<3;j++)poly(g,[x-15+j*10,0,x-12+j*10,8,x-6+j*10,0],"#fff0c7");
 }
 // Giant chest, plated armor and runic heart.
 poly(g,[-43,-91,-25,-117,14,-125,46,-97,39,-48,-37,-42],form===0?"#432432":form===1?"#244d63":form===2?"#464058":"#4d385b");
 poly(g,[-28,-91,0,-113,28,-90,19,-52,-21,-52],"#82758b");
 poly(g,[-16,-89,0,-105,17,-88,13,-67,-15,-67],"#242438");
 line(g,[-15,-88,0,-74,15,-89],"#f2b87f",3);
 for(let j=0;j<5;j++){rect(g,-16+j*8,-78+(j%2)*3,3,11,c)}
 glow(g,0,-77,33,c,.5);
 // Horns, animated spines and blazing plume.
 for(let k=0;k<8;k++){
  const x=-31+k*8,h=12+(k%3)*10;
  poly(g,[x,-104,x+4,-126-h+Math.sin(t*12+k)*4,x+10,-103],k%2===0?c:"#ffe7a0");
 }
 // Skull: beast hound / wolf / drake / kaiju visually distinguishable.
 const jaw=isDrake?54:isTitan?37:45;
 poly(g,[-25,-121,-20,-149,11,-161,36,-143,32,-125],"#252139");
 poly(g,[-25,-145,-17,-158,-5,-149],form===2?"#c2b9dd":"#c6a9a7");
 poly(g,[17,-149,25,-162,38,-143],"#b8a4b9");
 poly(g,[8,-147,25,-144,jaw,-133,jaw-5,-120,17,-118],form===1?"#325c6a":"#3d3046");
 poly(g,[21,-124,jaw,-125,jaw-4,-113,24,-118],"#160b25");
 for(let k=0;k<4;k++)poly(g,[24+k*6,-122,26+k*6,-115,29+k*6,-121],"#ffebc1");
 ellipse(g,23,-141,5,3,"#fff6ae");ellipse(g,25,-141,2,2,c);
 for(let side of [-1,1])poly(g,[side*12,-152,side*18,-186,side*35,-164,side*24,-150],form===2?"#d4c9f4":"#ded3b6");
 if(isTitan){for(let k=0;k<6;k++)poly(g,[-30+k*11,-119,-23+k*11,-141,-14+k*11,-111],k%2?"#db70ff":"#a662c7")}
 // Massive flared arms / claws.
 poly(g,[18,-105,47,-103,57+flare,-82,50+flare,-53,34,-61,28,-86],"#39364b");
 poly(g,[29,-105,45,-104,52+flare,-80,38,-81],"#887b96");
 for(let k=0;k<3;k++)poly(g,[47+flare,-64+k*10,70+flare,-67+k*12,54+flare,-53+k*10],"#fff0bd");
 if(form===2){for(let k=0;k<3;k++)line(g,[35,-109-k*7,60+flare,-123-k*6],"#b8a2ff",3)}
 if(p.attack>0){glow(g,70+flare,-75,78,c,.44);line(g,[55,-110,122,-82+sway,74,-34],c,8)}
 if(p.shoot>0){glow(g,jaw+10,-124,45,c,.63);line(g,[jaw,-124,jaw+80,-120],c,7)}
 // Power aura on titan and drake.
 if(isTitan||isDrake){for(let k=0;k<9;k++){const px=Math.sin(t*3+k*3)*65,py=-55-(t*18+k*13)%150;star(g,px,py,3,c)}}
 g.restore();
}
function crateDraw(g:G,c:ArenaEngine["crates"][number],t:number){
 g.save();g.translate(c.x,c.y);
 ellipse(g,0,0,28,6,"#0204127f");
 const top=c.gold?"#bc8c4a":"#5e5f69",side=c.gold?"#76513c":"#353747";
 poly(g,[-22,-40,-10,-50,24,-50,30,-40,18,-30,-18,-30],top);
 poly(g,[-22,-40,18,-30,18,-4,-22,-12],side);
 poly(g,[18,-30,30,-40,30,-12,18,-4],c.gold?"#98683d":"#494759");
 line(g,[-20,-36,18,-26,18,-5],c.gold?"#fee28b":"#a1afbb",2);
 line(g,[-17,-9,13,-4,15,-25],c.gold?"#e6a75b":"#6d7484",2);
 rect(g,-5,-25,13,9,c.gold?"#fbe99e":"#9ca9ae");
 if(c.gold){glow(g,1,-31,32,"#ffcd60",.4);star(g,0,-29,7,"#fff5c0")}
 g.restore();
}
function pickup(g:G,d:ArenaEngine["drops"][number],t:number){
 const color=d.kind==="shield"?"#78f9ff":d.kind==="weapon"?"#ffe36c":d.kind==="heal"?"#7dffae":d.kind==="energy"?"#f8a4ff":"#ffbd82";
 const y=d.y-26+Math.sin(t*6+d.x)*5;
 glow(g,d.x,y,30,color,.5);ellipse(g,d.x,d.y,17,4,"#00000070");
 poly(g,[d.x,y-18,d.x+14,y,d.x,y+17,d.x-14,y],color);
 ellipse(g,d.x,y,6,7,"#ffffff");
 const glyph=d.kind==="shield"?"S":d.kind==="weapon"?"W":d.kind==="heal"?"+":d.kind==="ammo"?"A":"E";
 txt(g,glyph,d.x,y+5,12,"#16192e","center");
}
function overlay(g:G,e:ArenaEngine){
 if(e.state==="play")return;
 rect(g,0,0,W,H,"#030613b7");
 if(e.state==="menu"){
  txt(g,"IRONFANG",W/2,150,77,"#ffbe71","center");
  txt(g,"BEASTFIRE · ASCENSION",W/2,192,29,"#78eafa","center");
  txt(g,"THE FOUR BEASTS HAVE AWAKENED",W/2,251,21,"#f8dbbd","center");
  txt(g,"PRESS ENTER / START TO PLAY",W/2,332,25,"#fff9d5","center");
  txt(g,"WASD MOVE IN ALL FOUR DIRECTIONS  •  J MELEE  •  K FIRE  •  Q CHANGE GUN",W/2,393,14,"#bbd1e5","center");
  txt(g,"SPACE JUMP  •  E BEAST  •  L MAGIC  •  SHIFT DASH",W/2,418,14,"#bbd1e5","center");
  txt(g,"TIP: PRESS B (OR FORM ON MOBILE) TO CYCLE BETWEEN FOUR BEASTS",W/2,448,12,"#e6c2a9","center");
 }else{
  txt(g,e.state==="pause"?"PAUSED":e.state==="win"?"VICTORY! THE ROAD IS YOURS":"THE ROAD CLAIMS YOU",W/2,231,40,e.state==="win"?"#fff2a6":"#ffbb82","center");
  txt(g,"SCORE "+e.score.toLocaleString()+"  ·  KILLS "+e.kills,W/2,278,20,"#d4ecff","center");
  txt(g,e.state==="pause"?"PRESS P TO RESUME":"PRESS ENTER TO PLAY AGAIN",W/2,344,19,"#fff","center");
 }
}
export function renderArena(e:ArenaEngine,g:G){
 g.save();g.setTransform(g.getTransform().a,0,0,g.getTransform().d,0,0);
 background(g,e);
 g.save();g.translate(-e.cam+(Math.random()-.5)*e.shake,(Math.random()-.5)*e.shake*.5);
 // Entity draw order is based on road depth, so front objects conceal rear ones.
 const entities:{y:number;draw:()=>void}[]=[];
 for(const c of e.crates)if(c.alive&&c.x>e.cam-90&&c.x<e.cam+W+90)entities.push({y:c.y,draw:()=>crateDraw(g,c,e.time)});
 for(const d of e.drops)if(d.x>e.cam-90&&d.x<e.cam+W+90)entities.push({y:d.y,draw:()=>pickup(g,d,e.time)});
 for(const t of e.targets)if(t.alive&&t.x>e.cam-90&&t.x<e.cam+W+90)entities.push({y:t.y,draw:()=>{
   const bob=Math.sin(e.time*4+t.glow)*8,cy=t.y-49+bob;
   glow(g,t.x,cy,43,"#64ebff",.46);ellipse(g,t.x,t.y,20,4,"#050c1b99");
   g.save();g.translate(t.x,cy);g.rotate(e.time*.7+t.glow);
   for(let k=0;k<4;k++){g.rotate(Math.PI/2);poly(g,[-6,-25,0,-35,6,-25,5,-7,-5,-7],"#8ce5ff")}
   g.restore();ellipse(g,t.x,cy,13,13,"#2c76a2");ellipse(g,t.x,cy,7,7,"#fff6bc");
   txt(g,"HIT",t.x,cy-38,10,"#bcf7ff","center");
 }});
 for(const en of e.enemies)if(en.alive&&en.x>e.cam-90&&en.x<e.cam+W+90)entities.push({y:en.y,draw:()=>soldier(g,en,e.time)});
 entities.push({y:e.player.y,draw:()=>warrior(g,e,e.time)});
 entities.sort((a,b)=>a.y-b.y);
 for(const ent of entities)ent.draw();
 for(const b of e.shots)projectile(g,b,e.time);
 for(const p of e.particles){g.globalAlpha=clamp(p.life/p.max,0,1);glow(g,p.x,p.y,p.size*3,p.color,.23);ellipse(g,p.x,p.y,p.size,p.size,p.color)}g.globalAlpha=1;
 for(const n of e.numbers){g.globalAlpha=clamp(n.life,0,1);txt(g,n.txt,n.x,n.y,18,n.color,"center")}g.globalAlpha=1;
 g.restore();
 // HUD: top and bottom clear of mobile controls.
 const p=e.player;
 const hud=g.createLinearGradient(0,0,0,102);hud.addColorStop(0,"#080d22fa");hud.addColorStop(1,"#111a31ae");rect(g,0,0,W,103,hud as unknown as string);
 rect(g,15,12,198,73,"#101729");
 txt(g,"IRONFANG",24,33,19,"#ffce89");
 rect(g,24,42,179,14,"#242235");rect(g,24,42,179*(p.hp/p.maxHp),14,"#ff6272");txt(g,"HP "+Math.max(0,Math.ceil(p.hp))+"/"+p.maxHp,28,53,11);
 rect(g,24,64,179,10,"#202b39");rect(g,24,64,179*(p.energy/100),10,"#54eaff");
 txt(g,"MP",27,73,9,"#142030");
 txt(g,p.shield>0?"SHIELD "+p.shield:"",221,47,14,"#9af8ff");
 txt(g,e.player.beastTime>0?"BEAST "+Math.ceil(e.player.beastTime)+"s":GUN_COLORS[e.weapon]?"GUN "+(e.weapon+1):"GUN",222,26,14,"#ffecc1");
 txt(g,e.player.beastTime>0?["INFERNO HOUND","STORM DRAKE","MOONFANG","ARCANE TITAN"][e.beastForm]!:
   ["RANGER","STORM SMG","SCATTERGUN","RAIL LANCE","INFERNO","HOMING ROCKET","ARC CASTER","FROST BURST"][e.weapon]!,222,65,17,e.player.beastTime>0?FORM_COLORS[e.beastForm]!:"#e1f7ff");
 txt(g,e.player.beastTime>0?"SUPER ARMORED!":"LV "+e.weaponLevels[e.weapon]+"  AMMO "+p.ammo,222,87,13,"#ffe89d");
 txt(g,"SCORE "+e.score.toLocaleString(),W-20,30,20,"#ffdf94","right");
 txt(g,"BEST "+Math.max(e.high,e.score).toLocaleString(),W-20,52,13,"#a9b5d1","right");
 txt(g,"KILLS "+e.kills,W-20,74,14,"#8ce4fb","right");
 const progress=clamp(p.x/e.world,0,1);
 rect(g,425,12,206,8,"#1e2637");rect(g,425,12,206*progress,8,"#ef995e");
 for(let x=0;x<4;x++)rect(g,425+x*67,11,2,10,"#b8c6d6");
 txt(g,PAL[e.stageAt(p.x)]!.name,528,40,12,"#e5ebf7","center");
 const boss=e.enemies.find(x=>x.alive&&x.kind==="boss");
 if(boss){rect(g,230,H-45,500,28,"#0c091acc");txt(g,"VOID COLOSSUS",480,H-29,12,"#ffd6f5","center");rect(g,250,H-24,460,9,"#24102f");rect(g,250,H-24,460*Math.max(0,boss.hp/boss.max),9,"#db67e8")}
 if(e.combo>2)txt(g,e.combo+" HIT COMBO!",W-24,125,20,"#ffcc7b","right");
 if(e.annT>0){rect(g,255,109,450,35,"#131626de");txt(g,e.announce,W/2,133,17,"#ffe3a8","center")}
 // Upgrade/selection hints
 txt(g,"Q: SWAP GUN   B / FORM: CHANGE BEAST   E: TRANSFORM",W/2,H-11,12,"#b6cce1","center");
 overlay(g,e);
 g.restore();
}
