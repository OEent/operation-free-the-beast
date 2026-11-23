import { Input } from "./input";
import { renderArena } from "./arena-art";
import type { Settings } from "./storage";

// IRONFANG 3.0: original belt-scrolling arcade game. The legacy platform engine
// remains in engine.ts for rollback; this engine is independently playable.
const W = 960, H = 540, FLOOR_TOP = 302, FLOOR_BOTTOM = 502;
type Beast = 0|1|2|3;
type EnemyKind = "grunt"|"brute"|"runner"|"caster"|"boss";
type Loot = "shield"|"heal"|"energy"|"ammo"|"weapon"|"fury"|"magic"|"bomb";
type V = {x:number;y:number};
type Enemy = V & {id:number;kind:EnemyKind;hp:number;max:number;speed:number;cool:number;flash:number;stun:number;face:number;alive:boolean;attacking:number};
type Crate = V & {hp:number;gold:boolean;alive:boolean;secret:boolean};
type RuneTarget = V & {id:number;alive:boolean;glow:number};
export type WorldProp = V & {id:number;kind:"shop"|"tree"|"tower";w:number;h:number;hp:number;alive:boolean;climbable:boolean};
type Shot = V & {vx:number;vy:number;life:number;dmg:number;kind:number;friendly:boolean;radius:number;target?:Enemy;hits:Set<number>;pierce:boolean};
type Particle = V & {vx:number;vy:number;life:number;max:number;size:number;color:string};
type Drop = V & {kind:Loot;life:number};
type TextFX = V & {txt:string;life:number;color:string};
type Player = V & {hp:number;maxHp:number;energy:number;ammo:number;shield:number;beastTime:number;face:number;z:number;vz:number;inv:number;attack:number;attackId:number;attackChain:number;shoot:number;dash:number;special:number;stagger:number};
const FORMS=["INFERNO HOUND","STORM DRAKE","MOONFANG","ARCANE TITAN"] as const;
const ENCOUNTERS=[405,850,1200,2090,2670,3170,4050,4510,4790];
const GUNS=["RANGER","STORM SMG","SCATTERGUN","RAIL LANCE","INFERNO","HOMING ROCKET","ARC CASTER","FROST BURST"] as const;
const GUN_COST=[1,1,2,3,1,4,2,2], GUN_CD=[.18,.075,.49,.65,.065,.57,.29,.38];
const COLOR=["#ff8c33","#79e7ff","#b9b4ff","#d87aff"];
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const distance=(a:V,b:V)=>Math.hypot(a.x-b.x,a.y-b.y);
const rng=(a:number,b:number)=>a+Math.random()*(b-a);
const circle=(g:CanvasRenderingContext2D,x:number,y:number,r:number,c:string)=>{g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();};
const text=(g:CanvasRenderingContext2D,s:string,x:number,y:number,size=16,color="#fff",align:CanvasTextAlign="left")=>{g.fillStyle="#090c1b";g.font=`900 ${size}px system-ui,sans-serif`;g.textAlign=align;g.fillText(s,x+1,y+2);g.fillStyle=color;g.fillText(s,x,y);};
const box=(g:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};

export class ArenaEngine {
  canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;input=new Input();
  state:"menu"|"play"|"pause"|"dead"|"win"="menu";
  settings:Settings;
  player:Player={x:100,y:410,hp:160,maxHp:160,energy:60,ammo:240,shield:0,beastTime:0,face:1,z:0,vz:0,inv:0,attack:0,attackId:0,attackChain:0,shoot:0,dash:0,special:0,stagger:0};
  cam=0;world=6100;time=0;last=0;acc=0;raf=0;shake=0;score=0;combo=0;comboT=0;kills=0;
  enemies:Enemy[]=[];crates:Crate[]=[];targets:RuneTarget[]=[];props:WorldProp[]=[];shots:Shot[]=[];particles:Particle[]=[];drops:Drop[]=[];numbers:TextFX[]=[];
  id=0;wave=0;waveIndex=0;encounterActive=false;checkpoint=0;beastForm:Beast=0;weapon=0;arenaActive=false;arenaClears=0;
  magicCharges=0;magicStyle=0;bombs=0;lastBeast:Beast|null=null;weaponLevels=[1,1,1,1,1,1,1,1];waveTimer=1.8;
  stage=0;gate=0;bossDefeated=false;high=0;screenW=W;screenH=H;
  announce="THE CURSED ROAD AWAITS";annT=4;audio:AudioContext|null=null;muted=false;
  constructor(canvas:HTMLCanvasElement,opts:{settings:Settings;standalone?:boolean}) {
    this.canvas=canvas;this.ctx=canvas.getContext("2d")!;this.settings=opts.settings;
    try{this.high=Number(localStorage.getItem("ironfang3:high")||0)}catch{}
    this.seedStage();this.resize();
  }
  resize=()=>{
    const scale=Math.min(innerWidth/W,innerHeight/H);
    const dpr=Math.min(2,devicePixelRatio||1);
    this.canvas.width=Math.floor(W*dpr);this.canvas.height=Math.floor(H*dpr);
    this.canvas.style.width=Math.floor(W*scale)+"px";this.canvas.style.height=Math.floor(H*scale)+"px";
    this.canvas.style.imageRendering="auto";this.ctx.setTransform(dpr,0,0,dpr,0,0);
  };
  start(){
    this.input.attach();addEventListener("resize",this.resize);
    const startSound=()=>{if(!this.audio){try{this.audio=new AudioContext()}catch{}}};
    this.canvas.addEventListener("pointerdown",startSound,{once:true});
    addEventListener("keydown",startSound,{once:true});
    this.last=performance.now();
    const loop=(now:number)=>{this.raf=requestAnimationFrame(loop);const dt=Math.min(.06,(now-this.last)/1000);this.last=now;this.acc+=dt;
      let n=0;while(this.acc>=1/60&&n++<4){this.input.poll();this.update(1/60);this.input.endStep();this.acc-=1/60}
      this.render();};this.raf=requestAnimationFrame(loop);
  }
  destroy(){cancelAnimationFrame(this.raf);this.input.detach();removeEventListener("resize",this.resize);this.audio?.close()}
  sound(freq=220,d=.08,type:OscillatorType="sawtooth",gain=.035){if(this.muted||!this.audio)return;try{const o=this.audio.createOscillator(),v=this.audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,this.audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(50,freq*.65),this.audio.currentTime+d);v.gain.setValueAtTime(gain,this.audio.currentTime);v.gain.exponentialRampToValueAtTime(.0001,this.audio.currentTime+d);o.connect(v);v.connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+d)}catch{}}
  tell(s:string,t=2.6){this.announce=s;this.annT=t}
  seedStage(){
    this.crates=[];for(let i=0;i<29;i++)this.crates.push({x:260+i*194+rng(-35,35),y:330+(i%4)*44,hp:i%5===0?7:3,gold:i%5===0,secret:i%7===0,alive:true});
    this.targets=[];for(let k=0;k<9;k++)this.targets.push({id:k,x:500+k*610,y:342+(k%3)*56,alive:true,glow:k*.4});
    // Climbable roofs/branches and breakable alchemist shops; no external art assets.
    this.props=[
      ...[690,2400,4380].map((x,k)=>({id:k,kind:"shop" as const,x,y:[365,402,370][k]!,w:120,h:75,hp:12,alive:true,climbable:true})),
      ...[1050,2830,4160].map((x,k)=>({id:10+k,kind:"tree" as const,x,y:[427,368,421][k]!,w:97,h:67,hp:999,alive:true,climbable:true})),
      ...[310,1840,3710,4930].map((x,k)=>({id:20+k,kind:"tower" as const,x,y:[390,427,378,419][k]!,w:83,h:62,hp:999,alive:true,climbable:true}))
    ];
  }
  newGame(){
    this.state="play";this.player={x:100,y:410,hp:160,maxHp:160,energy:60,ammo:240,shield:0,beastTime:0,face:1,z:0,vz:0,inv:0,attack:0,attackId:0,attackChain:0,shoot:0,dash:0,special:0,stagger:0};
    this.wave=0;this.waveIndex=0;this.encounterActive=false;this.gate=0;this.checkpoint=0;this.stage=0;this.arenaActive=false;this.arenaClears=0;this.bossDefeated=false;this.score=0;this.kills=0;this.combo=0;
    this.magicCharges=0;this.magicStyle=0;this.bombs=0;this.lastBeast=null;
    this.enemies=[];this.shots=[];this.drops=[];this.particles=[];this.numbers=[];this.seedStage();this.waveTimer=1.1;this.cam=0;this.weapon=0;this.weaponLevels.fill(1);this.tell("CHAPTER I: THE SHATTERED ROAD");this.sound(400,.24);
  }
  spawn(kind:EnemyKind,x:number,y:number){
    if(this.enemies.filter(e=>e.alive).length>=6)return;
    const hp=kind==="boss"?570:kind==="brute"?68:kind==="caster"?31:kind==="runner"?26:40;
    this.enemies.push({id:++this.id,kind,x,y,hp,max:hp,speed:kind==="runner"?97:kind==="brute"?43:kind==="boss"?35:kind==="caster"?52:65,
      cool:rng(.4,1.8),flash:0,stun:0,face:-1,alive:true,attacking:0});
  }
  stageAt(x:number){return x<1950?0:x<3950?1:2}
  spawnWave(){
    const p=this.player,phase=this.stageAt(p.x);
    if(this.enemies.some(e=>e.alive))return;
    const count=[2,4,6][this.wave%3]!;
    for(let k=0;k<count;k++){
      const roll=Math.random(),kind:EnemyKind=phase===2&&roll>.7?"caster":roll>.79?"brute":roll>.52?"runner":"grunt";
      this.spawn(kind,Math.min(this.world-100,p.x+145+k*42+rng(0,35)),rng(333,470));
    }
    this.encounterActive=true;
    this.wave++;
    this.tell("ENCOUNTER "+this.wave+" — "+count+" FOES!",2.6);
    if(this.wave%3===0)this.drop(p.x+65,p.y+20,"shield");
  }
  hitProp(o:WorldProp,damage:number){
    if(!o.alive||o.kind!=="shop")return;
    o.hp-=damage;this.burst(o.x,o.y-o.h*.6,"#ffe29c",9,100);
    if(o.hp>0){this.float(o.x,o.y-o.h-12,"SHOP "+Math.ceil(o.hp),"#fff1b1");return}
    o.alive=false;this.shake=Math.max(this.shake,13);this.sound(100,.35);
    this.burst(o.x,o.y-o.h*.65,"#ffbf62",65,240);this.score+=500;
    this.drop(o.x-26,o.y,"weapon");
    this.drop(o.x+30,o.y+6,Math.random()<.55?"magic":"bomb");
    this.tell("ALCHEMIST SHOP DESTROYED — RARE LOOT!",3.5);
  }
  castBomb(){
    if(this.bombs<=0||this.player.special>0)return;
    this.bombs--;this.player.special=.55;
    const p=this.player,x=p.x+p.face*140,y=p.y;
    this.burst(x,y-30,"#ffd875",95,330);this.shake=18;this.sound(75,.4);
    for(const e of this.enemies)if(e.alive&&distance(e,{x,y})<192)this.hitEnemy(e,125,55);
    for(const c of this.crates)if(c.alive&&distance(c,{x,y})<180)this.hitCrate(c,9);
    for(const o of this.props)if(o.alive&&distance(o,{x,y})<190)this.hitProp(o,15);
    this.tell("ARCANE BOMB — BOOM!",1.7);
  }

  burst(x:number,y:number,col:string,n=12,power=180){for(let i=0;i<n;i++){const a=Math.random()*6.283;this.particles.push({x,y,vx:Math.cos(a)*rng(25,power),vy:Math.sin(a)*rng(25,power),life:rng(.2,.7),max:.7,size:rng(1,5),color:col})}}
  float(x:number,y:number,txt:string,color="#ffe08c"){this.numbers.push({x,y,txt,color,life:1.1})}
  drop(x:number,y:number,kind:Loot){this.drops.push({x,y,kind,life:12});this.burst(x,y,kind==="shield"?"#7af5ff":"#ffce6a",11,75)}
  hitEnemy(e:Enemy,dmg:number,knock=9){
    if(!e.alive)return;e.hp-=dmg;e.flash=.13;e.stun=.11;e.x+=this.player.face*knock;this.float(e.x,e.y-72,Math.ceil(dmg).toString());
    this.burst(e.x,e.y-39,e.kind==="boss"?"#f26aff":"#ffbd53",5,76);this.shake=Math.max(this.shake,dmg>20?6:2);
    if(e.hp<=0){e.alive=false;this.kills++;this.score+=e.kind==="boss"?8000:e.kind==="brute"?330:100;this.combo++;this.comboT=4;this.player.energy=clamp(this.player.energy+7,0,100);
      this.burst(e.x,e.y-28,e.kind==="boss"?"#d080ff":"#ff642f",31,210);this.sound(95,.23);
      if(e.kind==="boss"){this.bossDefeated=true;this.state="win";this.tell("THE COLOSSUS FALLS! YOU ARE LEGEND!",5);this.saveHigh()}
      else if(Math.random()<.24)this.drop(e.x,e.y,(["heal","energy","ammo","weapon","shield"] as Loot[])[Math.floor(Math.random()*5)]!);
    }
  }
  attack(){
    const p=this.player;if(p.attack>0||p.stagger>0)return;
    p.attack=.32;p.attackId++;p.attackChain=(p.attackChain+1)%3;const beast=p.beastTime>0;
    const range=beast?148:p.attackChain===2?111:93, lane=beast?115:74;
    const dmg=beast?[48,64,86,115][this.beastForm]:p.attackChain===2?30:17;
    let hits=0;
    for(const e of this.enemies)if(e.alive&&(e.x-p.x)*p.face>-28&&(e.x-p.x)*p.face<range&&Math.abs(e.y-p.y)<lane){
      this.hitEnemy(e,dmg,beast?52:25);hits++;
    }
    for(const c of this.crates)if(c.alive&&(c.x-p.x)*p.face>-25&&(c.x-p.x)*p.face<range&&Math.abs(c.y-p.y)<lane) this.hitCrate(c,beast?5:2);
    for(const o of this.props)if(o.alive&&o.kind==="shop"&&(o.x-p.x)*p.face>-55&&(o.x-p.x)*p.face<range+o.w/2&&Math.abs(o.y-p.y)<lane+24)this.hitProp(o,beast?7:3);
    if(hits>0){this.sound(beast?100:175,.18);this.shake=beast?10:4}else this.sound(300,.07,"triangle");
    this.burst(p.x+p.face*range*.7,p.y-40,beast?COLOR[this.beastForm]:"#c5f9ff",beast?17:8,90);
  }
  hitCrate(c:Crate,damage:number){
    c.hp-=damage;this.burst(c.x,c.y-25,c.gold?"#ffe06b":"#a89478",7,83);
    if(c.hp<=0){c.alive=false;this.sound(140,.17);this.score+=120;
      const reward:Loot=c.secret?"shield":c.gold?"weapon":Math.random()<.3?"energy":Math.random()<.4?"ammo":"heal";
      this.drop(c.x,c.y,reward);this.float(c.x,c.y-60,"LOOT!","#ffec96");
    }
  }
  findTarget():Enemy|undefined{
    const p=this.player;return this.enemies.filter(e=>e.alive&&Math.abs(e.y-p.y)<160&&Math.abs(e.x-p.x)<460)
    .sort((a,b)=>{const value=(e:Enemy)=>distance(e,p)+((e.x-p.x)*p.face<0?75:0);return value(a)-value(b)})[0];
  }
  fire(){
    const p=this.player;if(p.shoot>0||p.stagger>0)return;
    const beast=p.beastTime>0,g=this.weapon,level=this.weaponLevels[g]??1;
    const cost=beast?0:GUN_COST[g]??1;
    if(p.ammo<cost){this.sound(80,.08);this.tell("AMMO EMPTY — SMASH CRATES!",1.5);return}
    if(!beast)p.ammo-=cost;
    p.shoot=beast?.17:(GUN_CD[g]??.18)*(1-.08*(level-1));const tx=p.x+p.face*24,ty=p.y-44-(beast?30:0);
    const target=this.findTarget();
    const dx=target?target.x-tx:p.face*100,dy=target?target.y-35-ty:0;
    const ang=Math.atan2(dy,dx),power=beast?370:g===3?770:g===4?260:g===5?320:520;
    const pellets=beast?this.beastForm===1?3:1:g===2?6+level*2:1;
    for(let k=0;k<pellets;k++){
      const spread=(k-(pellets-1)/2)*(g===2?.09:beast?.14:0)+(g===1?rng(-.05,.05):0);
      const a=ang+spread;const dmg=beast?[21,23,30,65][this.beastForm]:[8,4,6,24,3,20,12,11][g]!;
      this.shots.push({x:tx,y:ty,vx:Math.cos(a)*power,vy:Math.sin(a)*power,life:beast?.85:g===4?.31:1.25,
        radius:beast?11:g===5?8:g===4?7:4,dmg:dmg*(1+(level-1)*.35),kind:beast?8+this.beastForm:g,
        friendly:true,target:g===2?undefined:target,hits:new Set(),pierce:beast||g===3||g===4});
    }
    this.burst(tx,ty,beast?COLOR[this.beastForm]:"#ffe08a",beast?12:4,75);this.sound(beast?110:g===5?75:300,beast?.16:.065);
  }
  special(){
    const p=this.player;if(p.special>0||(p.energy<22&&this.magicCharges<=0))return;
    const beast=p.beastTime>0,enchanted=this.magicCharges>0;
    if(enchanted){this.magicCharges--;this.magicStyle=(this.magicStyle+1)%4}
    p.special=beast?1.3:enchanted?1.7:3.5;p.energy-=enchanted?0:beast?15:22;
    const radius=beast?[210,240,170,290][this.beastForm]:enchanted?[175,205,235,280][this.magicStyle]:125;
    this.burst(p.x,p.y-40,beast?COLOR[this.beastForm]:enchanted?["#ff9c50","#75ebff","#91ffb7","#d99eff"][this.magicStyle]:"#66efff",75,290);this.shake=18;
    for(const e of this.enemies)if(e.alive&&distance(p,e)<radius)this.hitEnemy(e,beast?140:enchanted?115:45,68);
    for(const c of this.crates)if(c.alive&&distance(p,c)<radius)this.hitCrate(c,8);
    for(const o of this.props)if(o.alive&&distance(p,o)<radius)this.hitProp(o,8);
    for(const t of this.targets)if(t.alive&&distance(p,t)<radius){t.alive=false;this.drop(t.x,t.y,"shield");this.score+=550}
    this.tell(beast?["HELLFIRE NOVA!","SKYFALL TEMPEST!","LUNAR RAMPAGE!","TITAN CATACLYSM!"][this.beastForm]!:"ARCANE SHOCKWAVE!",2.2);
    this.sound(65,.45,"sawtooth",.06);
  }
  hurt(n:number,fromX:number){
    const p=this.player;if(p.inv>0||p.beastTime>0&&this.beastForm===3)return;
    if(p.shield>0){p.shield--;p.inv=.42;this.float(p.x,p.y-85,"BLOCK!","#a5faff");this.burst(p.x,p.y-42,"#71eaff",13,135);this.sound(530,.15);return}
    const amount=p.beastTime>0?Math.ceil(n*.24):n;
    p.hp-=amount;p.inv=.62;p.stagger=.18;p.x+=Math.sign(p.x-fromX)*22;this.shake=9;
    this.burst(p.x,p.y-42,"#fc6d64",17,130);this.sound(120,.18);
    if(p.hp<=0){this.state="dead";this.tell("THE ROAD CLAIMS ANOTHER... PRESS ENTER",5);this.saveHigh()}
  }
  pickup(d:Drop){
    const p=this.player;const k=d.kind;
    if(k==="heal")p.hp=Math.min(p.maxHp,p.hp+60);
    if(k==="energy"||k==="fury")p.energy=clamp(p.energy+(k==="fury"?70:35),0,100);
    if(k==="ammo")p.ammo+=90;
    if(k==="shield")p.shield=Math.min(6,p.shield+3);
    if(k==="magic"){this.magicCharges=Math.min(5,this.magicCharges+2);p.energy=clamp(p.energy+25,0,100)}
    if(k==="bomb")this.bombs=Math.min(5,this.bombs+2);
    if(k==="weapon"){this.weapon=(this.weapon+1+Math.floor(Math.random()*7))%8;this.weaponLevels[this.weapon]=Math.min(5,(this.weaponLevels[this.weapon]??1)+1);p.ammo+=42}
    this.tell(k==="weapon"?"WEAPON CACHE: "+GUNS[this.weapon]+" LV"+this.weaponLevels[this.weapon]:k==="shield"?"ARCANE SHIELD +3":k==="magic"?"MAGIC POTION — 2 ENCHANTED STRIKES":k==="bomb"?"BOMBS +2 — PRESS F":k.toUpperCase()+" COLLECTED",2);
    this.sound(660,.13,"sine");this.burst(d.x,d.y-20,k==="shield"?"#7af5ff":"#fce687",15,105);
  }
  saveHigh(){if(this.score>this.high){this.high=this.score;try{localStorage.setItem("ironfang3:high",String(this.high))}catch{}}}
  update(dt:number){
    const I=this.input;this.time+=dt;this.shake=Math.max(0,this.shake-dt*35);this.annT-=dt;
    if(this.state==="menu"){if(I.pressed("start")||I.pressed("jump"))this.newGame();return}
    if(this.state==="dead"||this.state==="win"){if(I.pressed("start")||I.pressed("restart")||I.pressed("jump"))this.newGame();return}
    if(I.pressed("pause")||I.pressed("menu")){this.state=this.state==="pause"?"play":"pause";return}
    if(this.state!=="play")return;
    const p=this.player;
    if(I.pressed("nextWeapon")){this.weapon=(this.weapon+1)%8;this.tell(GUNS[this.weapon]+" LV"+this.weaponLevels[this.weapon],1.5);this.sound(440,.06,"triangle")}
    // Beast roulette is automatic. Repeated transformations cannot repeat the same form.
    if(I.pressed("nextBeast")&&p.beastTime<=0)this.tell("BEAST ROULETTE — RANDOM ON TRANSFORM!",1.9);
    if(I.pressed("bomb"))this.castBomb();
    if(I.pressed("restart")){this.newGame();return}
    if(I.pressed("transform")&&p.energy>=40&&p.beastTime<=0){
      const options=([0,1,2,3] as Beast[]).filter(f=>f!==this.lastBeast);
      this.beastForm=options[Math.floor(Math.random()*options.length)]!;
      this.lastBeast=this.beastForm;
      p.energy-=40;p.beastTime=28;p.inv=1.8;this.shake=22;
      this.burst(p.x,p.y-50,COLOR[this.beastForm],105,340);
      this.tell("BEAST ROULETTE: "+FORMS[this.beastForm]+"!",3.5);this.sound(64,.75)
    }
    if(I.pressed("melee"))this.attack();
    if(I.down("shoot"))this.fire();
    if(I.pressed("special"))this.special();
    if(I.pressed("jump")&&p.vz===0){p.vz=440;this.sound(390,.085,"triangle")}
    p.inv=Math.max(0,p.inv-dt);p.attack=Math.max(0,p.attack-dt);p.shoot=Math.max(0,p.shoot-dt);
    p.dash=Math.max(0,p.dash-dt);p.special=Math.max(0,p.special-dt);p.stagger=Math.max(0,p.stagger-dt);
    if(p.beastTime>0)p.beastTime=Math.max(0,p.beastTime-dt);
    if(I.pressed("dash")){p.dash=.24;p.inv=Math.max(p.inv,.28);this.burst(p.x,p.y-25,"#b1e7ff",10,90)}
    const speed=p.beastTime>0?[260,225,245,180][this.beastForm]:200;
    const xs=(I.down("right")?1:0)-(I.down("left")?1:0),ys=(I.down("down")?1:0)-(I.down("up")?1:0);
    const len=Math.hypot(xs,ys)||1;let dx=xs/len,dy=ys/len;if(dx)p.face=dx>0?1:-1;
    if(p.dash>0){dx=p.face*2.8;dy=0}
    if(p.stagger<=0){p.x=clamp(p.x+dx*speed*dt,28,this.world-80);p.y=clamp(p.y+dy*speed*.77*dt,FLOOR_TOP+30,FLOOR_BOTTOM)}
    // Jump onto raised roofs, branches or watchtower platforms (one-way surfaces).
    const support=this.props.find(o=>o.alive&&o.climbable&&Math.abs(p.x-o.x)<o.w*.42&&Math.abs(p.y-o.y)<32&&Math.abs(p.z-o.h)<2);
    if(p.vz===0&&p.z>0&&!support)p.vz=-25; // step off and fall
    if(!(support&&p.vz===0)){
      const oldZ=p.z;p.z=Math.max(0,p.z+p.vz*dt);p.vz-=940*dt;
      if(p.vz<=0)for(const o of this.props){
        if(!o.alive||!o.climbable)continue;
        if(oldZ>=o.h&&p.z<=o.h&&Math.abs(p.x-o.x)<o.w*.42&&Math.abs(p.y-o.y)<32){
          p.z=o.h;p.vz=0;this.float(p.x,p.y-p.z-90,"PERCHED!","#a4edff");break;
        }
      }
      if(p.z===0)p.vz=0;
    }
    if(p.x>1950&&this.stage<1){this.stage=1;this.tell("CHAPTER II: THE WITCHFIRE MARSH",3)}
    if(p.x>3950&&this.stage<2){this.stage=2;this.tell("CHAPTER III: THE OBSIDIAN FORGE",3)}
    // Three distinct locked arenas with fair reward after clearing each battle.
    const battleX=[1640,3570,5160];
    if(this.gate<3&&!this.arenaActive&&!this.encounterActive&&p.x>battleX[this.gate]!-190){
      this.arenaActive=true;this.arenaClears++;this.waveTimer=999;
      this.tell(["RUINS ARENA — SURVIVE THE AMBUSH!","MARSH ARENA — BREAK THE HEX!","FORGE ARENA — FINAL GAUNTLET!"][this.gate]!,3.3);
      for(let k=0;k<[2,4,6][this.gate]!;k++){
        this.spawn(k%4===0?"brute":k%4===1?"caster":k%4===2?"runner":"grunt",
          p.x+140+k*35,335+(k%4)*43);
      }
      this.shake=14;this.sound(160,.35);
    }
    if(this.arenaActive){
      p.x=Math.min(p.x,battleX[this.gate]!+65);
      if(!this.enemies.some(en=>en.alive)){
        this.arenaActive=false;this.gate++;this.waveTimer=999;
        this.drop(p.x+88,385,"shield");this.drop(p.x+125,420,"weapon");
        this.player.energy=clamp(this.player.energy+40,0,100);
        this.tell("ARENA CLEARED — EXPLORE AND FIND LOOT!",3.5);this.score+=1500;this.sound(730,.32,"triangle");
        this.burst(p.x+90,390,"#ffe6a3",60,260);
      }
    }
    // After each fight the next group appears ONLY when the player advances to
    // a new checkpoint. No time-based mob spam; hard cap 2/4/6 active enemies.
    if(!this.arenaActive&&!this.encounterActive&&this.waveIndex<ENCOUNTERS.length&&p.x>=ENCOUNTERS[this.waveIndex]!) {
      this.waveIndex++;this.spawnWave();
    }
    if(this.encounterActive){
      const stop=ENCOUNTERS[this.waveIndex-1]!+150;
      p.x=Math.min(p.x,stop);
      if(!this.enemies.some(e=>e.alive)){
        this.encounterActive=false;
        this.tell("ROAD CLEAR — EXPLORE FOR TREASURE!",3.4);
        if(this.wave%2===0)this.drop(p.x+35,p.y,"energy");
      }
    }
    if(p.x>this.checkpoint+900){this.checkpoint=Math.floor(p.x/900)*900;this.drop(p.x+65,p.y,"weapon")}
    this.waveTimer-=dt;
    if(p.x>5360&&!this.arenaActive&&!this.encounterActive&&!this.bossDefeated&&!this.enemies.some(e=>e.kind==="boss"&&e.alive)){
      this.spawn("boss",Math.min(this.world-320,p.x+340),415);this.tell("THE VOID COLOSSUS AWAKENS!",4);this.shake=15;
    }
    for(const e of this.enemies){
      if(!e.alive)continue;e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);e.cool-=dt;e.attacking=Math.max(0,e.attacking-dt);
      const dist=distance(e,p),lane=Math.abs(e.y-p.y),dx=p.x-e.x,dy=p.y-e.y;e.face=dx>0?1:-1;
      if(e.stun<=0){
        if(e.kind==="caster"&&dist<330&&e.cool<=0){const a=Math.atan2(dy-35,dx);this.shots.push({x:e.x,y:e.y-45,vx:Math.cos(a)*225,vy:Math.sin(a)*225,life:2,dmg:13,kind:7,friendly:false,radius:7,hits:new Set(),pierce:false});e.cool=2.2}
        if(dist>(e.kind==="boss"?110:45)){
          const chase=e.kind==="caster"&&dist<180?-.3:1;
          const m=Math.max(1,Math.hypot(dx,dy));
          e.x+=dx/m*e.speed*chase*dt;e.y=clamp(e.y+dy/m*e.speed*.72*dt,FLOOR_TOP+30,FLOOR_BOTTOM);
        }else if(e.cool<=0&&p.z<40&&lane<(e.kind==="boss"?105:51)){
          e.cool=e.kind==="boss"?1.7:e.kind==="runner"?.85:1.35;e.attacking=.35;
          this.hurt(e.kind==="boss"?34:e.kind==="brute"?20:12,e.x);
        }
      }
    }
    // Simulated magic and bullets use x and lane-depth y in same ground coordinate system.
    for(const b of this.shots){
      if(b.friendly&&b.target?.alive&&b.kind!==3&&b.kind!==2){
        const dx=b.target.x-b.x,dy=b.target.y-35-b.y,l=Math.hypot(dx,dy);
        if(l>2){const speed=Math.hypot(b.vx,b.vy),fac=Math.min(1,dt*(b.kind===5?11:5));b.vx=b.vx*(1-fac)+dx/l*speed*fac;b.vy=b.vy*(1-fac)+dy/l*speed*fac}
      }
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      if(b.life<=0)continue;
      if(b.friendly){
        for(const e of this.enemies)if(e.alive&&!b.hits.has(e.id)&&Math.hypot(e.x-b.x,e.y-35-b.y)<(e.kind==="boss"?57:31)+b.radius){
          b.hits.add(e.id);this.hitEnemy(e,b.dmg,b.vx>0?8:-8);
          if(!b.pierce)b.life=0;
          if(b.kind===5||b.kind>=8){this.burst(b.x,b.y,COLOR[this.beastForm],17,115);for(const other of this.enemies)if(other.alive&&other!==e&&distance(other,e)<70)this.hitEnemy(other,b.dmg*.5)}
          break;
        }
        for(const c of this.crates)if(c.alive&&Math.hypot(c.x-b.x,c.y-25-b.y)<27+b.radius){this.hitCrate(c,b.dmg/5);b.life=0;break}
        for(const o of this.props)if(o.alive&&o.kind==="shop"&&Math.abs(o.x-b.x)<o.w*.48+b.radius&&Math.abs(o.y-o.h*.53-b.y)<o.h*.5+b.radius){
          this.hitProp(o,b.dmg/3);b.life=0;break;
        }
        for(const t of this.targets)if(t.alive&&Math.hypot(t.x-b.x,t.y-49-b.y)<27+b.radius){
          t.alive=false;b.life=0;this.score+=550;
          this.drop(t.x,t.y,t.id%3===0?"shield":t.id%3===1?"weapon":"fury");
          this.burst(t.x,t.y-49,"#9bf7ff",31,175);this.float(t.x,t.y-105,"PRECISION BONUS!","#fff5ab");
          this.tell("RUNE TARGET DESTROYED — BONUS REWARD!",2.4);this.sound(720,.25,"sine");
          break;
        }
      }else if(Math.hypot(p.x-b.x,p.y-p.z-38-b.y)<28+b.radius){this.hurt(b.dmg,b.x);b.life=0}
      if(Math.random()<.3)this.particles.push({x:b.x,y:b.y,vx:rng(-10,10),vy:rng(-12,12),life:.19,max:.19,size:b.kind>=8?5:2,color:b.kind>=8?COLOR[this.beastForm]:"#fff2a5"});
    }
    this.shots=this.shots.filter(b=>b.life>0&&b.x>this.cam-150&&b.x<this.cam+W+300);
    for(const d of this.drops){d.life-=dt;if(distance(d,p)<47){this.pickup(d);d.life=0}}
    this.drops=this.drops.filter(d=>d.life>0);
    for(const f of this.particles){f.x+=f.vx*dt;f.y+=f.vy*dt;f.life-=dt}
    this.particles=this.particles.filter(f=>f.life>0).slice(-700);
    for(const f of this.numbers){f.y-=25*dt;f.life-=dt}this.numbers=this.numbers.filter(f=>f.life>0);
    this.comboT-=dt;if(this.comboT<=0)this.combo=0;
    this.cam+=(clamp(p.x-W*.35,0,this.world-W)-this.cam)*Math.min(1,dt*4.4);
    if(p.x>this.world-200&&!this.bossDefeated)this.tell("DEFEAT THE VOID COLOSSUS",.3);
  }
  // Rendering is implemented in arena-art.ts, separate from simulation.
  render(){this.drawScene(this.ctx)}
  drawScene(g:CanvasRenderingContext2D){ renderArena(this,g) }
}
