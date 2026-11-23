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
// Every transformation uses its own original anatomy and combat silhouette.
function beastDraw(g:G,e:ArenaEngine,t:number){
 const p=e.player,bob=Math.sin(t*7)*2,flash=p.attack>0,blast=p.shoot>0;
 g.save();g.translate(0,bob);
 const fur=(a:string)=>a;
 if(e.beastForm===0){
  // INFERNO HOUND — low-slung six-foot hellhound, four paws, molten chest,
  // heavy bone jaws and streaming fire-fur. Not an upright wolf recolor.
  g.scale(1.25,1.25);glow(g,0,-63,110,"#ff6b23",.3);
  line(g,[-37,-40,-77,-53+Math.sin(t*9)*7,-104,-81+Math.sin(t*8)*10],"#54242a",20);
  line(g,[-40,-40,-76,-58+Math.sin(t*9)*8,-107,-85+Math.sin(t*8)*9],"#ff762b",9);
  for(let leg=0;leg<4;leg++){
   const x=-43+leg*29,m=Math.sin(t*10+leg*2.3)*4;
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
   const w=Math.sin(t*6)*13;
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
  g.scale(1.23,1.23);glow(g,0,-95,94,"#c8b2ff",.25);
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
  g.scale(1.42,1.42);glow(g,0,-93,122,"#c565ff",.3);
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
  txt(g,"SPACE JUMP  •  E BEAST  •  L MAGIC  •  SHIFT DASH",W/2,418,14,"#bbd1e5","center");
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
