import { beasts } from "./beast-illustrations";
import { heroSprite, getHeroFrame } from "./hero-sprites";
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
 // Arena gate silhouettes: energy barricades reveal where combat locks the road.
 if(e.arenaActive&&e.gate<3){
   const gateX=[1640,3570,5160][e.gate]!-e.cam+65;
   if(gateX>-40&&gateX<W+40){
     for(let k=0;k<12;k++){
       const xx=gateX+Math.sin(e.time*5+k)*3;
       rect(g,xx,297+k*18,8,16,k%2===0?"#6ff7ff83":"#ffac5392");
     }
     glow(g,gateX,406,105,"#8cffff",.4);
     txt(g,"ARENA LOCK",gateX-12,289,13,"#b9f9ff","center");
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

function armoredLimb(g:G, x:number, y:number, angle:number, leg:boolean, glowing:string, elbow=0) {
 g.save();g.translate(x,y);g.rotate(angle);
 if(leg){
   poly(g,[-10,0,10,-2,13,24,5,33,-11,30,-14,20],"#25354d");
   poly(g,[-8,4,7,3,9,21,-6,25],"#7e899f");
   line(g,[-8,12,8,13],"#dec18b",2);
   g.translate(1,29);g.rotate(elbow);
   poly(g,[-10,-3,9,-5,13,20,23,23,23,31,-18,31],"#253045");
   poly(g,[-7,1,7,-1,9,18,-10,21],"#6a8c9e");
   line(g,[-15,26,19,26],"#e7bb79",3);
 }else{
   poly(g,[-12,-7,10,-8,14,17,5,24,-15,19,-17,8],"#36435a");
   poly(g,[-12,-5,9,-7,13,7,0,14,-14,9],"#b59577");
   poly(g,[-14,-4,-4,-14,13,-9,15,2,2,9],"#d8af75");
   g.translate(2,21);g.rotate(elbow);
   poly(g,[-10,-3,9,-4,12,19,-9,21],"#2a3c54");
   poly(g,[-7,-1,7,-2,10,15,-8,17],"#8496a7");
   line(g,[-9,13,10,13],glowing,3);
   poly(g,[-11,18,13,18,15,25,-11,26],"#c2a076");
 }
 g.restore();
}
// Actual artwork asset renderer: preserves the illustrated character's anatomy,
// rather than drawing a body out of geometric limbs. Uses gameplay-specific poses.
function illustratedWarrior(g:G,e:ArenaEngine,time:number) {
 const p=e.player;
 const running=e.motion>.14,dashing=p.dash>0,air=p.z>8,attacking=p.attack>0,shooting=p.shoot>0;
 const frame=getHeroFrame({running,dashing,air,attacking,shooting,attack:p.attack,time});
 const drawW=150, drawH=150;
 // Prevent the old bouncy 'toddle' animation. Baseline remains grounded.
 const bob=running?Math.sin(e.gait*2)*.22:Math.sin(time*2)*.12;
 g.save();g.translate(0,bob);
 if(dashing)g.rotate(-.065);
 if(air)g.rotate(-.035);
 // Each artwork frame is a complete character silhouette; no detached body parts.
 if(frame.source&&frame.source.complete&&frame.source.naturalWidth>0) {
   g.imageSmoothingEnabled=true;g.imageSmoothingQuality="high";
   if(frame.rect){
     const r=frame.rect;
     g.drawImage(frame.source,r.x,r.y,r.w,r.h,-drawW*.51,-drawH*.93,drawW,drawH);
   }else{
     g.drawImage(frame.source,-drawW*.51,-drawH*.93,drawW,drawH);
   }
 } else if(heroSprite.complete&&heroSprite.naturalWidth>0) {
   g.drawImage(heroSprite,-drawW*.51,-drawH*.93,drawW,drawH);
 }
 if(shooting){
    const muzzleX=drawW*.37,muzzleY=-drawH*.53;
    glow(g,muzzleX,muzzleY,36,"#ffe89b",.55);
    line(g,[muzzleX,muzzleY,muzzleX+37,muzzleY-4],"#ffdc74",4);
 }
 if(attacking){
   const alpha=Math.max(0,Math.min(1,p.attack/.37));
   const a=-1.55+(1-alpha)*2.45;
   g.save();g.globalCompositeOperation="screen";
   for(let k=0;k<3;k++){
     g.strokeStyle=["#38bfff","#9eefff","#f3ffff"][k]!;
     g.lineWidth=8-k*2;g.globalAlpha=.43-k*.11;
     g.beginPath();g.arc(15,-drawH*.49,91+k*7,a-.22,a+.45);g.stroke();
   }g.restore();
 }
 if(dashing){
   glow(g,-44,-drawH*.48,35,"#62eaff",.25);
 }
 g.restore();
}
function warrior(g:G,e:ArenaEngine,time:number) {
 const p=e.player,beast=p.beastTime>0;
 const moving=e.motion>0.1, gait=e.gait, stride=Math.sin(gait), back=Math.cos(gait);
 const swinging=p.attack>0, attackPhase=swinging?1-p.attack/.37:0;
 const dash=p.dash>0,air=p.z>8, shooting=p.shoot>0;
 const accelerate=Math.min(1,e.motion), bob=moving?Math.abs(stride)*2.6*accelerate:Math.sin(time*2.5)*.9;
 g.save();
 // Dust/trails and motion afterimages are gameplay-state driven, not static illustrations.
 if(dash||e.motion>.8){
   for(let k=0;k<(dash?4:2);k++){
     const trailX=p.x-p.face*(16+k*(dash?17:9)),trailY=p.y-p.z-47;
     g.save();g.globalAlpha=(dash?.17:.07)*(1-k*.18);
     glow(g,trailX,trailY,30,"#5adcfb",.7);
     line(g,[trailX-12,trailY-19,trailX+7,trailY-28],"#74edff",dash?6:2);
     g.restore();
   }
 }
 g.translate(p.x,p.y-p.z);g.scale(p.face,1);
 ellipse(g,0,p.z-1,beast?38:20,beast?10:6,"#05061793");
 if(p.inv>0&&Math.floor(time*17)%2)g.globalAlpha=.73;
 if(p.shield>0){
   g.strokeStyle="#78f5ff";g.lineWidth=3;g.beginPath();g.ellipse(0,-55,beast?65:41,beast?92:61,0,0,Math.PI*2);g.stroke();
   for(let k=0;k<6;k++){const theta=time*2+k*Math.PI/3;glow(g,Math.cos(theta)*38,-55+Math.sin(theta)*55,14,"#69eaff",.4)}
 }
 if(beast){
   beastDraw(g,e,time);g.restore();return;
 }
 if(heroSprite.complete&&heroSprite.naturalWidth>0){
   illustratedWarrior(g,e,time);g.restore();return;
 }
 const jumpLean=air?-.2:0, attackLean=swinging?.13:0;
 const leaning=dash?-.4:jumpLean+attackLean+(moving?.06:0);
 g.translate(0,-bob);g.rotate(leaning);
 const cape=Math.sin(time*(moving?14:5))*5*(moving?1.2:.5)-e.motion*5;
 // Silhouette: distinctive storm-blue split cape on the character's back.
 for(let layer=0;layer<3;layer++){
   const drift=cape*(layer+1)/3;
   poly(g,[-13,-72,-25,-77,-50-drift,-60+layer*5,-65-drift*(1.3+layer*.12),-19+layer*4,
      -45-drift,-3+layer*6,-20,-27],["#0e2544","#27617f","#46add5"][layer]!);
 }
 for(let k=0;k<5;k++)line(g,[-20-k*4,-52+k*6,-37-k*6-cape,-31+k*6],
   k%2?"#40e1f7":"#7ec4de",1.4);
 // Legs move independently with bend in running, braced stance on melee.
 const lAngle=air?-.62:moving?stride*.6*accelerate:swinging?-.35:0;
 const rAngle=air?.62:moving?-stride*.6*accelerate:swinging?.42:0;
 armoredLimb(g,-10,-29,lAngle,true,"#74dfff",air?-.7:Math.max(0,stride)*-.33);
 armoredLimb(g,11,-30,rAngle,true,"#74dfff",air?.6:Math.max(0,-stride)*-.33);
 // Coat tails layered over animated knees.
 poly(g,[-21,-53,19,-55,23,-21,5,-26,-12,-16,-25,-25],"#30283e");
 poly(g,[-15,-52,-5,-55,-9,-21,-23,-13,-24,-25],"#59445c");
 poly(g,[11,-51,22,-50,31,-20,13,-26],"#6d4769");
 for(let k=0;k<4;k++)line(g,[-22+k*10,-38,-23+k*11,-20],"#d3a378",1);
 // Main cuirass / sharp armor plates and glowing signature chest rune.
 poly(g,[-23,-71,-8,-84,14,-79,27,-57,14,-31,-17,-33,-27,-52],"#192a44");
 poly(g,[-18,-72,-8,-78,17,-75,21,-55,13,-39,-13,-38,-23,-56],"#637b93");
 poly(g,[-11,-70,10,-73,16,-48,6,-38,-14,-47],"#1f344b");
 for(let k=0;k<4;k++)poly(g,[-19+k*11,-47,-10+k*11,-43,-10+k*11,-39,-19+k*11,-43],"#b6a28c");
 poly(g,[-5,-64,2,-74,10,-63,1,-48],"#eab97b");
 glow(g,1,-62,23,"#51f6ff",.38);
 poly(g,[-3,-64,1,-70,5,-63,1,-55],"#9efbff");
 line(g,[-11,-80,9,-81,23,-67],"#edbd86",2.4);
 // Back arm protects the chest while the dominant arm moves with attacks.
 armoredLimb(g,-18,-70,moving?-stride*.25:-.1,false,"#52e9ff",.3);
 // Distinct partially unmasked hero with one asymmetric horned mask and visible hair.
 poly(g,[-16,-83,-11,-103,6,-110,19,-99,19,-81,7,-73,-11,-77],"#28243b");
 for(let k=0;k<8;k++)poly(g,[-18+k*4,-98,-18+k*5,-112-(k%3)*5,(-18+k*4)+7,-98],
   k%2?"#4a3661":"#231c38");
 poly(g,[-13,-97,5,-106,18,-96,15,-84,0,-77,-14,-84],"#c5a38c");
 poly(g,[-16,-94,-5,-108,3,-111,5,-91,-5,-82],"#d4b7a3");
 poly(g,[-17,-99,-22,-122,-5,-104],"#f0d3a4");
 poly(g,[7,-104,16,-126,18,-99],"#e6c89e");
 poly(g,[-13,-100,-1,-111,8,-99,4,-89,-11,-86],"#34354e");
 line(g,[-11,-95,2,-99],"#f5d7a8",2);
 poly(g,[-13,-91,1,-96,4,-91,-9,-87],"#17283b");
 rect(g,-10,-93,15,3,"#3de6ff");rect(g,7,-92,5,2,"#8ef5ff");
 line(g,[8,-102,10,-95,8,-84],"#e7b66f",2);
 // Shoulder plates and torn cowl.
 poly(g,[-23,-78,-25,-88,-7,-91,0,-78,-9,-69],"#d5a671");
 poly(g,[-19,-80,-16,-87,-8,-84,-11,-76],"#85ddf2");
 poly(g,[8,-80,17,-89,30,-79,27,-67,15,-65],"#8e99af");
 line(g,[13,-84,25,-78],"#edc68c",2.5);
 poly(g,[-17,-84,3,-85,17,-80,4,-77,-10,-75],"#254e71");
 // Two weapons: left-hand magic blade and right-hand modular gun.
 const swingAngle=swinging?(-2.0+attackPhase*3.1):air?.2:moving?stride*.25:-.22;
 armoredLimb(g,20,-72,shooting?-.35:swinging?swingAngle:Math.sin(gait+1)*.22,false,"#8bf8ff",-.18);
 // A sword is clearly attached to the dominant arm and traces a broad slash arc.
 g.save();g.translate(28,-44);g.rotate(swinging?swingAngle-.26:air?-.8:1.0);
 rect(g,-4,-2,10,7,"#d7a36c");
 poly(g,[1,1,3,-13,8,-43,12,-55,16,-40,15,-8,8,2],"#d7eff5");
 poly(g,[8,-37,12,-51,12,-16,9,-7],"#34e8ff");
 line(g,[0,-12,17,-10],"#f6c67e",4);
 glow(g,11,-25,19,"#55dfff",swinging?.44:.14);
 g.restore();
 // Gun arm carries the currently equipped gun and recoils on every shot.
 g.save();g.translate(19,-59);
 const recoil=shooting?5*Math.sin(time*42):0;
 g.rotate(swinging?-.25:shooting?-.07:0);
 poly(g,[0,-9,27-recoil,-7,32-recoil,1,23-recoil,6,-1,5],"#364358");
 poly(g,[4,-7,28-recoil,-7,29-recoil,-3,5,-3],"#e5b779");
 const barrel=e.weapon===3?54:e.weapon===5?52:e.weapon===2?42:40;
 rect(g,18-recoil,-5,barrel-15,5,e.weapon===4?"#b85b3e":"#a5b4be");
 rect(g,barrel-9-recoil,-7,9,9,"#15283f");
 rect(g,barrel-6-recoil,-5,7,4,e.weapon===4?"#ffa451":"#5bebff");
 if(e.weapon===5){poly(g,[18,-10,44,-10,56,-3,45,4,18,4],"#7d747e");rect(g,48,-6,6,6,"#fff2a8")}
 if(e.weapon===3){line(g,[19,-9,barrel+1,-9],"#6eebff",3);glow(g,barrel,-3,15,"#5ee6ff",.45)}
 if(e.weapon===2){poly(g,[20,-8,48,-7,52,0,19,2],"#7b7f90")}
 if(e.weapon===4){glow(g,barrel,-3,18,"#ff7d35",.5)}
 if(shooting){glow(g,barrel,-3,38,"#ffdf82",.75);poly(g,[barrel,-10,barrel+26,-4,barrel+14,4,barrel+27,14,barrel,6],"#ffd777")}
 g.restore();
 // Strike animation: winding silhouette, distinct impact frame and follow-through.
 if(swinging){
   const progress=Math.min(1,Math.max(0,attackPhase));
   const center=-1.2+progress*2.7;
   g.save();g.globalCompositeOperation="screen";
   for(let k=0;k<4;k++){
     const rad=81+k*8;
     g.beginPath();g.arc(15,-66,rad,center-.35,center+.5);
     g.lineWidth=9-k*2;g.strokeStyle=["#4af9ff","#94fbff","#f2ffff","#1ca6d0"][k]!;
     g.globalAlpha=1-k*.2;g.stroke();
   }
   for(let k=0;k<7;k++){
     const an=center-.2+k*.11,x=15+Math.cos(an)*90,y=-66+Math.sin(an)*90;
     ellipse(g,x,y,3,3,k%2?"#fdfcff":"#68eaff");
   }
   g.restore();
 }
 if(air){
   for(let k=0;k<4;k++)line(g,[-34-k*4,-15+k*8,-51-k*4,-11+k*8],"#6fdaf480",2);
 }
 g.restore();
}

function beastDraw(g:G,e:ArenaEngine,t:number){
 const p=e.player,bob=Math.sin(t*7)*2,flash=p.attack>0,blast=p.shoot>0;
 const locomotion=e.motion,step=Math.sin(e.gait),landing=p.z>0;
 const illustration=beasts[e.beastForm];
 if(illustration?.complete&&illustration.naturalWidth>0){
   const form=e.beastForm;
   const widths=[277,320,236,290], heights=[215,247,241,260], w=widths[form]!,h=heights[form]!;
   const aura=["#ff8f3e","#46e5ff","#be8dff","#d875ff"][form]!;
   g.save();
   g.translate(0,Math.sin(t*6)*2-Math.abs(step)*locomotion*4);
   if(p.dash>0)g.rotate(-.08);
   if(landing)g.rotate(-.04);
   g.rotate(Math.sin(e.gait)*locomotion*(form===0?.012:form===1?.026:.038));
   // Subtle squash and stretch sells the walk cycle while retaining a detailed
   // fully illustrated silhouette, rather than reassembling blocky geometry.
   g.scale(1+Math.cos(e.gait)*.025*locomotion,1+Math.sin(e.gait)*.022*locomotion);
   const y=-h*.89;
   glow(g,0,-h*.54,h*.51,aura,.18);
   if(flash){
     g.save();g.globalAlpha=.55;g.globalCompositeOperation="screen";
     for(let k=0;k<3;k++){
       g.beginPath();g.arc(form===1?120:98,-h*.51,76+k*13,-1.2+k*.09,1.1+k*.08);
       g.lineWidth=10-k*2;g.strokeStyle=aura;g.stroke();
     }
     g.restore();
   }
   g.drawImage(illustration,-w*.52,y,w,h);
   if(blast){
     const fromX=form===1?133:form===0?125:form===3?134:98,yy=form===1?-h*.61:form===3?-h*.64:-h*.5;
     glow(g,fromX,yy,54,aura,.63);
     line(g,[fromX,yy,fromX+65,yy-9,fromX+126,yy+Math.sin(t*33)*5],aura,13);
     line(g,[fromX,yy,fromX+145,yy-2],"#fff4dd",3);
     for(let k=0;k<7;k++)ellipse(g,fromX+30+k*18,yy+Math.sin(t*13+k)*12,3,2,k%2?"#fff5db":aura);
   }
   if(locomotion>.65&&p.z===0){
     for(let k=0;k<3;k++)ellipse(g,-w*.2+k*13,Math.sin(t*15+k)*4,5,2,form===0?"#fc924b":"#b2c5ef");
   }
   g.restore();return;
 }
 g.save();g.translate(0,bob-Math.abs(step)*locomotion*6);
 if(p.dash>0)g.rotate(-.10);
 if(landing)g.rotate(-.06);
 const fur=(a:string)=>a;
 if(e.beastForm===0){
  // INFERNO HOUND — low-slung six-foot hellhound, four paws, molten chest,
  // heavy bone jaws and streaming fire-fur. Not an upright wolf recolor.
  g.scale(1.25,1.25);glow(g,0,-63,110,"#ff6b23",.3);
  line(g,[-37,-40,-77,-53+Math.sin(t*9)*7,-104,-81+Math.sin(t*8)*10],"#54242a",20);
  line(g,[-40,-40,-76,-58+Math.sin(t*9)*8,-107,-85+Math.sin(t*8)*9],"#ff762b",9);
  for(let leg=0;leg<4;leg++){
   const x=-43+leg*29,m=Math.sin(e.gait+leg*2.3)*7*locomotion;
   poly(g,[x-11,-42,x+5,-42,x+12,-16+m,x+4,0,x-12,0,x-17,-13+m],"#291e2d");
   poly(g,[x-12,-39,x+5,-39,x+10,-17+m,x-6,-19+m],"#653c35");
   for(let k=0;k<3;k++)poly(g,[x-14+k*7,-2,x-11+k*7,8,x-8+k*7,-2],"#fff0c7");
  }
  poly(g,[-65,-70,-45,-102,-8,-113,37,-100,61,-75,53,-45,-44,-40],"#35242b");
  poly(g,[-47,-85,-20,-107,39,-90,48,-57,-37,-48],"#68372f");
  for(let k=0;k<17;k++){let x=-44+k*5.5;poly(g,[x,-87,x+2,-108-(k%4)*11+Math.sin(t*14+k)*3,x+9,-86],k%3===0?"#ffdf65":k%2?"#ff6b23":"#a02c1d")}
  poly(g,[2,-89,31,-104,52,-94,68,-73,65,-58,17,-63],"#48272b");
  poly(g,[43,-81,69,-78,89,-64,85,-55,62,-53,38,-66],"#46262c");
  poly(g,[51,-62,91,-60,83,-48,56,-54],"#1c1321");
  for(let k=0;k<5;k++)poly(g,[60+k*6,-57,63+k*6,-47,66+k*6,-56],"#fff3c8");
  for(let side of [-1,1]){poly(g,[side*26,-93,side*30,-127,side*42,-109,side*38,-87],"#d5b28a")}
  ellipse(g,57,-78,6,4,"#ffde70");ellipse(g,59,-79,3,2,"#fff");
  ellipse(g,85,-66,4,3,"#ff8d35");
  for(let k=0;k<12;k++){const x=-34+k*10,y=-121-(k%4)*12+Math.sin(t*16+k)*5;ellipse(g,x,y,3+k%2,5,"#ffb842")}
  if(flash){glow(g,76,-57,90,"#ff771e",.55);line(g,[58,-78,145,-98,121,-28],"#ffb344",8)}
  if(blast){glow(g,96,-58,78,"#ffcc5a",.75);poly(g,[85,-64,158,-95,132,-51,180,-42,93,-47],"#ff9e2a");poly(g,[87,-61,140,-77,128,-53,159,-46,96,-52],"#fff6b0")}
 }else if(e.beastForm===1){
  // STORM DRAKE — long-necked reptile with separate snout, paired membrane
  // wings, forked lightning tail, rows of scales and taloned rear legs.
  g.scale(1.2,1.2);glow(g,0,-100,110,"#53d8ff",.24);
  line(g,[-31,-62,-90,-94+Math.sin(t*5)*7,-119,-67],"#326076",19);
  poly(g,[-116,-69,-133,-73,-121,-86,-140,-93,-105,-84],"#a1f3ff");
  for(const side of [-1,1]){
   const w=Math.sin(t*4)*7+Math.sin(e.gait*.8)*19*locomotion;
   poly(g,[-14,-89,side*71,-205+w,side*118,-155+w,side*108,-61,side*44,-79],side===1?"#2c7285":"#23475c");
   poly(g,[-5,-92,side*65,-184+w,side*94,-139+w,side*89,-88,side*28,-82],"#3e9aab");
   for(let k=1;k<5;k++){const tx=side*(30+k*17),ty=-99-k*16+w;line(g,[0,-89,tx,ty],"#83d7e0",2)}
   for(let k=0;k<3;k++)poly(g,[side*(36+k*23),-112+w,side*(47+k*23),-132+w,side*(47+k*23),-109+w],"#22677e");
  }
  // Long serpentine body and spine.
  poly(g,[-58,-94,-34,-126,11,-132,43,-112,54,-61,-42,-48],"#2b5369");
  poly(g,[-40,-113,19,-124,48,-103,43,-66,-31,-66],"#44849a");
  for(let k=0;k<10;k++)poly(g,[-38+k*8,-117,-34+k*8,-138-(k%3)*5,-27+k*8,-115],k%2?"#b7f2ff":"#60d8ec");
  for(let side of [-1,1]){
   const x=side*31;
   poly(g,[x-12,-68,x+14,-67,x+20,-21,x+10,1,x-10,1,x-18,-18],"#244e62");
   for(let k=0;k<3;k++)poly(g,[x-7+k*9,-2,x-2+k*9,11,x+3+k*9,-2],"#d1f9fd");
  }
  // Actual extended reptile neck leading to distinct draconic head and jaws.
  poly(g,[18,-106,31,-166,47,-201,64,-199,57,-156,48,-107],"#2d617b");
  poly(g,[30,-156,45,-196,57,-183,47,-150],"#5caabb");
  poly(g,[44,-194,59,-215,84,-204,105,-182,91,-171,62,-172],"#326c80");
  poly(g,[79,-188,119,-184,136,-175,128,-164,92,-165,75,-170],"#488ba1");
  poly(g,[81,-168,133,-163,119,-151,89,-158],"#193a52");
  for(let k=0;k<7;k++)poly(g,[95+k*5,-163,98+k*5,-153,101+k*5,-162],"#f9ffff");
  poly(g,[56,-201,52,-238,68,-214,72,-194],"#c4eafa");
  poly(g,[77,-198,91,-230,91,-195,89,-190],"#caeeff");
  ellipse(g,87,-190,5,4,"#e4f9fe");ellipse(g,89,-190,2,2,"#072a47");
  for(let k=0;k<7;k++)rect(g,-33+k*12,-98+(k%2)*9,4,9,"#81ddeb");
  if(flash){glow(g,91,-152,92,"#72dcff",.48);line(g,[79,-156,156,-112,183,-156],"#bafaff",7)}
  if(blast){glow(g,132,-173,100,"#74e8ff",.65);line(g,[128,-175,175,-196,150,-162,214,-180,188,-146,238,-166],"#e5ffff",7);line(g,[130,-172,192,-170,165,-138,215,-150],"#66baff",4)}
 }else if(e.beastForm===2){
  // MOONFANG — bipedal dire werewolf, oversized furred shoulders and
  // swept-back ears, humanoid claws and a distinct wolf's muzzle.
  g.scale(1.23,1.23);g.rotate(step*locomotion*.045);glow(g,0,-95,94,"#c8b2ff",.25);
  for(let leg of [-1,1]){
   const x=leg*20;
   poly(g,[x-15,-70,x+11,-71,x+20,-28,x+8,-17,x+17,0,x-20,0,x-25,-13],"#2c2a42");
   poly(g,[x-14,-56,x+10,-62,x+15,-29,x-19,-33],"#615b81");
   for(let k=0;k<3;k++)poly(g,[x-16+k*10,0,x-12+k*10,10,x-8+k*10,0],"#fff3e5");
  }
  for(let k=0;k<12;k++){let x=-40+k*7;poly(g,[x,-136,x+4,-151-(k%3)*13+Math.sin(t*13+k)*2,x+9,-129],k%2?"#d7cbeb":"#686086")}
  poly(g,[-51,-126,-23,-159,20,-160,59,-126,43,-70,-40,-73],"#302d4b");
  poly(g,[-41,-136,-15,-155,22,-150,45,-114,31,-82,-30,-82],"#655c81");
  poly(g,[-24,-125,-1,-135,22,-125,17,-91,-19,-91],"#27243b");
  for(let k=0;k<5;k++)line(g,[-13+k*7,-126,-9+k*7,-91],"#ada0c7",2);
  // Arms that curl outward, tipped with long ebony claws.
  for(let side of [-1,1]){
   const x=side*39;
   poly(g,[x-side*7,-133,x+side*20,-122,x+side*25,-80,x+side*18,-38,x-side*3,-45,x-side*11,-82],"#4a435f");
   poly(g,[x+side*3,-127,x+side*17,-115,x+side*20,-86,x+side*3,-88],"#81779f");
   for(let j=0;j<4;j++){const xx=x+side*(13+j*4);poly(g,[xx,-46+j*2,xx+side*5,-16+j*3,xx+side*9,-42+j*2],"#e8e0ff")}
  }
  // Tall furry neck, pointed ears and separately protruding wolf muzzle.
  poly(g,[-30,-151,-22,-183,-10,-169,13,-174,26,-186,30,-150,17,-128,-20,-132],"#40364f");
  poly(g,[-25,-168,-29,-207,-9,-185],"#756c97");
  poly(g,[17,-177,30,-215,35,-160],"#b5abce");
  poly(g,[-19,-174,0,-187,22,-172,23,-145,-16,-145],"#81769f");
  poly(g,[10,-159,37,-163,57,-150,49,-135,17,-139],"#54475c");
  poly(g,[23,-141,51,-140,48,-126,23,-136],"#1c192a");
  for(let j=0;j<4;j++)poly(g,[26+j*6,-138,29+j*6,-128,32+j*6,-138],"#ffffff");
  ellipse(g,17,-167,6,4,"#fef3b9");ellipse(g,20,-167,3,2,"#ff5d91");
  ellipse(g,51,-150,4,4,"#292034");
  if(flash){glow(g,80,-85,80,"#e1c7ff",.5);line(g,[52,-122,114,-112,88,-45],"#d6b7ff",8)}
  if(blast){glow(g,65,-151,76,"#b9a3ff",.65);line(g,[47,-151,157,-147],"#ded4ff",7)}
 }else{
  // ARCANE TITAN — reptilian kaiju silhouette, huge dorsal spines,
  // upright thick tail, claws, dinosaur head, and atomic-violet mouth beam.
  g.scale(1.42,1.42);g.rotate(step*locomotion*.028);glow(g,0,-93,122,"#c565ff",.3);
  line(g,[-31,-42,-87,-26+Math.sin(t*4)*7,-137,-56+Math.sin(t*4)*10],"#3a274e",33);
  line(g,[-35,-44,-90,-30+Math.sin(t*4)*7,-126,-54+Math.sin(t*4)*10],"#745080",13);
  for(let leg of [-1,1]){
   const x=leg*23;
   poly(g,[x-20,-65,x+13,-70,x+22,-25,x+12,0,x-23,0,x-27,-25],"#30283d");
   poly(g,[x-18,-53,x+11,-60,x+18,-26,x-19,-26],"#705a7b");
   for(let k=0;k<4;k++)poly(g,[x-22+k*12,0,x-18+k*12,10,x-13+k*12,0],"#e2c2ee");
  }
  // Massive dinosaur torso with bony back crests.
  poly(g,[-55,-76,-51,-132,-12,-166,28,-156,50,-118,51,-58],"#392d4b");
  poly(g,[-33,-139,8,-159,41,-125,38,-65,-34,-66],"#6e547e");
  for(let k=0;k<8;k++){const y=-148+k*13,x=-29-k*2;poly(g,[x,y,x-28-k*2,y-15,x-9,y+13],k%2?"#e2b1ff":"#a76fd7")}
  for(let k=0;k<6;k++)rect(g,-14+k*8,-111+k%2*3,3,20,"#cd8cf5");
  // Thick upright reptile neck and broad toothy dinosaur skull.
  poly(g,[3,-144,16,-189,39,-213,66,-196,60,-157,38,-135],"#403050");
  poly(g,[22,-194,37,-220,68,-222,94,-202,98,-184,58,-178],"#765486");
  poly(g,[57,-190,102,-195,123,-183,117,-173,63,-169],"#493156");
  poly(g,[62,-172,122,-170,116,-151,66,-160],"#20152c");
  for(let j=0;j<7;j++)poly(g,[71+j*7,-170,76+j*7,-157,80+j*7,-170],"#fce4ff");
  for(let k=0;k<3;k++)poly(g,[28+k*10,-206,31+k*10,-233,40+k*10,-210],"#dc9bff");
  ellipse(g,72,-200,6,4,"#fbdbff");ellipse(g,74,-200,3,2,"#ff4aed");
  // Striking forearms, short but massive talons.
  for(let side of [-1,1]){
   const x=side*34;
   poly(g,[x-11,-119,x+13,-125,x+22,-84,x+44,-64,x+38,-48,x+11,-58,x-9,-89],"#503b63");
   for(let j=0;j<3;j++)poly(g,[x+32+j*5,-56+j*2,x+49+j*7,-49+j*2,x+39+j*5,-47+j*2],"#f0bfff");
  }
  for(let k=0;k<11;k++){const x=-37+k*11,y=-162-(k%3)*9;star(g,x,y,2.8,"#dc86ff")}
  if(flash){glow(g,112,-152,98,"#da7aff",.5);line(g,[88,-144,163,-112,132,-53],"#f8adff",10)}
  if(blast){glow(g,122,-175,128,"#f89aff",.7);poly(g,[114,-184,230,-204,248,-169,135,-162],"#b96af6");line(g,[128,-174,241,-181],"#fff5ff",8)}
 }
 g.restore();
}

function structure(g:G,o:ArenaEngine["props"][number],t:number){
 if(!o.alive)return;
 g.save();g.translate(o.x,o.y);
 const w=o.w,h=o.h;
 ellipse(g,0,0,w*.62,10,"#05081494");
 if(o.kind==="tree"){
  // Layered old-world tree with illuminated leaves and a thick walkable branch.
  poly(g,[-16,-12,-23,-h*.9,-8,-h-32,17,-h-15,16,-10],"#31263d");
  poly(g,[-7,-20,-14,-h*.85,0,-h-13,6,-22],"#594156");
  for(let k=0;k<7;k++){
   const x=-54+k*19,y=-h-18+(k%2)*13+Math.sin(t*1.6+k)*2;
   ellipse(g,x,y,28,22,k%3===0?"#265a50":k%3===1?"#37715d":"#214f4c");
   ellipse(g,x-5,y-5,17,10,"#4e9779");
  }
  line(g,[-w*.5,-h-2,w*.48,-h-2],"#987d5e",10);
  line(g,[-w*.44,-h-8,w*.43,-h-8],"#c6a475",3);
  for(let k=0;k<5;k++)glow(g,-39+k*18,-h-27+(k%2)*6,8,k%2?"#c3ff91":"#58ffdf",.28);
  txt(g,"TREE PLATFORM",0,-h-45,10,"#b5f6c8","center");
 }else if(o.kind==="tower"){
  // Stone gate/watchtower with battlements and a reachable upper ledge.
  poly(g,[-w*.44,0,-w*.44,-h+9,w*.44,-h+9,w*.44,0],"#494457");
  poly(g,[-w*.45,0,-w*.45,-h+9,-w*.3,-h+6,-w*.3,0],"#302b41");
  for(let k=0;k<5;k++)rect(g,-w*.43+k*16,-h-9,12,19,k%2?"#777184":"#625c72");
  rect(g,-w*.48,-h,w*.96,8,"#9a8c9c");
  line(g,[-w*.42,-h+2,w*.42,-h+2],"#c9b4bb",3);
  poly(g,[-12,0,-12,-35,-8,-48,8,-48,12,-35,12,0],"#171426");
  rect(g,-20,-h+20,16,16,"#211e31");rect(g,5,-h+20,16,16,"#211e31");
  for(let k=0;k<6;k++)line(g,[-w*.42,-h+18+k*15,w*.42,-h+18+k*15],"#8a7a8855",1);
  txt(g,"WATCHTOWER",0,-h-21,10,"#e8cce0","center");
 }else{
  // Bustable Alchemist shop — roof, window glow, sigils and lanterns.
  poly(g,[-w*.48,0,-w*.48,-h+20,w*.48,-h+20,w*.48,0],"#4d374c");
  poly(g,[-w*.48,0,-w*.48,-h+18,-w*.22,-h+10,-w*.22,0],"#30283f");
  poly(g,[-w*.58,-h+22,-w*.32,-h-20,w*.32,-h-20,w*.58,-h+22],"#634760");
  poly(g,[-w*.44,-h+1,0,-h-40,w*.44,-h+1],"#916479");
  for(let k=0;k<11;k++)line(g,[-w*.42+k*9,-h+8,-w*.28+k*9,-h-8],"#c28b88",2);
  rect(g,-w*.45,-h+20,w*.9,6,"#9a7286");
  rect(g,-w*.34,-h+34,20,25,"#161b35");rect(g,w*.13,-h+34,23,27,"#191a32");
  glow(g,-w*.25,-h+47,22,"#69edff",.38);glow(g,w*.25,-h+47,22,"#ffcb78",.3);
  rect(g,-15,-32,30,32,"#241628");rect(g,-10,-27,21,27,"#4a2f51");
  rect(g,-6,-24,13,16,"#e9b976");
  ellipse(g,0,-h+10,18,18,"#28233f");
  ellipse(g,0,-h+10,13,13,"#70dcf3");
  txt(g,"✦",0,-h+16,16,"#fff6c4","center");
  for(let k=0;k<3;k++){const y=-h+30+k*19;line(g,[-w*.47,y,w*.47,y],"#debcad55",1)}
  glow(g,-w*.5,-h+20,18,"#f7d075",.4);
  txt(g,"ALCHEMIST SHOP",0,-h-45,12,"#ffe4ad","center");
  txt(g,"BREAK FOR RARE LOOT",0,-h-29,9,"#b0f5ff","center");
 }
 // Roof/perch accent shows where jump landings work.
 line(g,[-w*.39,-h,w*.39,-h],o.kind==="shop"?"#fff1af":"#a3e9db",3);
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
 const color=d.kind==="shield"?"#78f9ff":d.kind==="weapon"?"#ffe36c":d.kind==="heal"?"#7dffae":d.kind==="magic"?"#c39bff":d.kind==="bomb"?"#ff7c6b":d.kind==="energy"?"#f8a4ff":"#ffbd82";
 const y=d.y-26+Math.sin(t*6+d.x)*5;
 glow(g,d.x,y,30,color,.5);ellipse(g,d.x,d.y,17,4,"#00000070");
 poly(g,[d.x,y-18,d.x+14,y,d.x,y+17,d.x-14,y],color);
 ellipse(g,d.x,y,6,7,"#ffffff");
 const glyph=d.kind==="shield"?"S":d.kind==="weapon"?"W":d.kind==="heal"?"+":d.kind==="ammo"?"A":d.kind==="magic"?"M":d.kind==="bomb"?"B":"E";
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
  txt(g,"SPACE JUMP / CLIMB  •  E RANDOM BEAST  •  L MAGIC  •  F BOMB",W/2,418,14,"#bbd1e5","center");
  txt(g,"BEAST FORM IS RANDOM EVERY TIME  •  F: ARCANE BOMB",W/2,448,12,"#e6c2a9","center");
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
 for(const o of e.props)if(o.alive&&o.x>e.cam-180&&o.x<e.cam+W+180)entities.push({y:o.y,draw:()=>structure(g,o,e.time)});
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
 txt(g,"MAGIC "+e.magicCharges+"  BOMBS "+e.bombs,W-22,95,11,"#e4bfff","right");
 if(e.arenaActive)txt(g,"ARENA "+(e.gate+1)+"/3 • CLEAR ALL ENEMIES",W/2,88,13,"#fff0b3","center");
 if(e.encounterActive)txt(g,"FOES "+e.enemies.filter(n=>n.alive).length+"/6 • CLEAR ROAD",W/2,88,13,"#fff1b2","center");
 if(!e.arenaActive&&!e.encounterActive&&e.state==="play")txt(g,"EXPLORATION • FIND LOOT",W/2,88,13,"#acf8d2","center");
 const progress=clamp(p.x/e.world,0,1);
 rect(g,425,12,206,8,"#1e2637");rect(g,425,12,206*progress,8,"#ef995e");
 for(let x=0;x<4;x++)rect(g,425+x*67,11,2,10,"#b8c6d6");
 txt(g,PAL[e.stageAt(p.x)]!.name,528,40,12,"#e5ebf7","center");
 const boss=e.enemies.find(x=>x.alive&&x.kind==="boss");
 if(boss){rect(g,230,H-45,500,28,"#0c091acc");txt(g,"VOID COLOSSUS",480,H-29,12,"#ffd6f5","center");rect(g,250,H-24,460,9,"#24102f");rect(g,250,H-24,460*Math.max(0,boss.hp/boss.max),9,"#db67e8")}
 if(e.combo>2)txt(g,e.combo+" HIT COMBO!",W-24,125,20,"#ffcc7b","right");
 if(e.annT>0){rect(g,255,109,450,35,"#131626de");txt(g,e.announce,W/2,133,17,"#ffe3a8","center")}
 // Upgrade/selection hints
 txt(g,"EXPLORE BETWEEN FIGHTS • BREAK SHOPS • CLIMB ROOFS & TREES • F: BOMB",W/2,H-11,12,"#b6cce1","center");
 overlay(g,e);
 g.restore();
}
