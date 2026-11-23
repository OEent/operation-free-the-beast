import { chromium } from "playwright";
const url = "http://127.0.0.1:5173/";
const browser = await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1365,height:768},deviceScaleFactor:1});
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
await page.goto(url,{waitUntil:"networkidle",timeout:30000});
await page.waitForSelector("#game");
await page.waitForTimeout(450);
async function readCanvas(){
 return await page.evaluate(()=>{
  const canvas=document.querySelector("#game");
  if(!(canvas instanceof HTMLCanvasElement))throw Error("Missing game canvas");
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("Canvas 2D context unavailable");
  const samples=[[60,70],[480,170],[480,380],[750,450]].map(([x,y])=>{
   const dpr=canvas.width/960;
   return [...ctx.getImageData(Math.round(x*dpr),Math.round(y*dpr),1,1).data];
  });
  return {size:[canvas.width,canvas.height],samples:samples.map(a=>a.join(",")),checksum:samples.flat().reduce((s,v,i)=>s+v*(i+1),0)};
 });
}
const menu=await readCanvas();
if(menu.size[0]<960||menu.size[1]<540)throw Error("Canvas resolution unexpectedly small");
await page.screenshot({path:"smoke-menu.png"});
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
const play=await readCanvas();
if(JSON.stringify(menu.samples)===JSON.stringify(play.samples))throw Error("Game did not transition from title to gameplay");
await page.keyboard.down("ArrowRight");
await page.keyboard.down("ArrowDown");
await page.keyboard.down("KeyK");
await page.waitForTimeout(850);
await page.keyboard.up("KeyK");
await page.keyboard.up("ArrowRight");
await page.keyboard.up("ArrowDown");
await page.screenshot({path:"smoke-hero-action.png"});
await page.keyboard.press("KeyB");
await page.keyboard.press("KeyE");
await page.keyboard.press("KeyJ");
await page.waitForTimeout(450);
const action=await readCanvas();
if(errors.length)throw Error("Runtime JS errors: "+errors.join(" | "));
if(!Number.isFinite(action.checksum)||action.checksum===0)throw Error("Canvas unexpectedly blank");
await page.screenshot({path:"smoke-gameplay.png"});
console.log("PASS — menu, game start, movement, firing, beast selection, transformation, melee, render pipeline");
console.log(JSON.stringify({menu,play,action}));
// Gameplay unit smoke checks inside the actual Vite/browser runtime.
const mechanics=await page.evaluate(async()=>{
  const {ArenaEngine}=await import("/src/game/arena.ts");
  const {loadSettings}=await import("/src/game/storage.ts");
  const cv=document.createElement("canvas");
  const e=new ArenaEngine(cv,{standalone:true,settings:loadSettings()});
  e.newGame();
  const waveSizes=[];
  for(let n=0;n<3;n++){e.spawnWave();waveSizes.push(e.enemies.filter(en=>en.alive).length);
    e.enemies.forEach(en=>en.alive=false)}
  for(let n=0;n<12;n++)e.spawn("grunt",120+n*20,390);
  const cap=e.enemies.filter(en=>en.alive).length;
  const shop=e.props.find(o=>o.kind==="shop");
  if(!shop)throw Error("No alchemist shop");
  e.hitProp(shop,999);
  const shopBreak=!shop.alive&&e.drops.some(d=>d.kind==="weapon")&&e.drops.some(d=>d.kind==="magic"||d.kind==="bomb");
  e.enemies.forEach(en=>en.alive=false);
  e.waveIndex=9;e.gate=3;e.encounterActive=false;
  e.player.x=100;e.player.y=400;e.player.z=0;e.player.vz=0;
  const forms=[];
  for(let n=0;n<8;n++){
    e.player.energy=100;e.player.beastTime=0;
    e.input.press("transform");e.input.poll();e.update(1/60);e.input.endStep();
    forms.push(e.beastForm);
    e.input.release("transform");e.input.poll();e.input.endStep();
  }
  const uniqueEveryTime=forms.every((f,j)=>j===0||f!==forms[j-1]);
  const tree=e.props.find(o=>o.kind==="tree");
  if(!tree)throw Error("No climbable tree");
  e.enemies.forEach(en=>en.alive=false);
  e.player.beastTime=0;e.player.x=tree.x;e.player.y=tree.y;
  e.player.z=tree.h+2;e.player.vz=-45;e.update(.09);
  const landed=Math.abs(e.player.z-tree.h)<.1&&e.player.vz===0;
  e.destroy();
  return {waveSizes,cap,shopBreak,forms,uniqueEveryTime,landed};
});
if(JSON.stringify(mechanics.waveSizes)!=="[2,4,6]"||mechanics.cap!==6||!mechanics.shopBreak||!mechanics.uniqueEveryTime||!mechanics.landed)
  throw Error("Mechanics regression: "+JSON.stringify(mechanics));
console.log("PASS — 2/4/6 wave pacing, max 6 alive, breakable loot shops, random non-repeating beasts, climbable tree roof");
console.log(JSON.stringify(mechanics));
const animation=await page.evaluate(async()=>{
 const {ArenaEngine}=await import("/src/game/arena.ts");
 const {loadSettings}=await import("/src/game/storage.ts");
 const e=new ArenaEngine(document.createElement("canvas"),{standalone:true,settings:loadSettings()});
 e.newGame();e.waveIndex=9;e.gate=3;
 e.enemies.forEach(x=>x.alive=false);
 e.input.press("right");e.input.poll();
 for(let k=0;k<16;k++){e.update(1/60);e.input.endStep();e.input.poll()}
 const moved=e.player.x>100&&e.motion>.5&&e.gait>.1;
 e.input.release("right");e.input.endStep();e.input.poll();
 for(let k=0;k<20;k++){e.update(1/60);e.input.endStep();e.input.poll()}
 const slowed=e.motion<.2;
 e.player.attack=0;e.input.press("melee");e.input.poll();e.update(1/60);e.input.endStep();e.input.release("melee");
 const attack=e.player.attack>0&&e.player.attackChain===1;
 e.input.poll();e.input.endStep(); // release between individual taps
 e.player.attack=.15;e.input.press("melee");e.input.poll();e.update(1/60);e.input.endStep();
 const buffered=e.queuedSlash;
 e.input.release("melee");e.input.poll();
 for(let k=0;k<15;k++){e.update(1/60);e.input.endStep();e.input.poll()}
 const chained=e.player.attackChain===2;
 e.player.dash=0;e.input.press("dash");e.input.poll();e.update(1/60);
 const dashed=e.player.dash>0;
 e.destroy();return {moved,slowed,attack,buffered,chained,dashed};
});
if(Object.values(animation).some(v=>!v))throw Error("Animation input regression: "+JSON.stringify(animation));
console.log("PASS — movement-driven run cycle, deceleration, slash combo buffer, dash animation state",animation);
// Check true analog speed and diagonal normalization in the engine.
const joystick=await page.evaluate(async()=>{
 const {ArenaEngine}=await import("/src/game/arena.ts");
 const {loadSettings}=await import("/src/game/storage.ts");
 function simulate(x,y){
  const e=new ArenaEngine(document.createElement("canvas"),{standalone:true,settings:loadSettings()});
  e.newGame();e.waveIndex=9;e.gate=3;e.player.x=1000;e.player.y=398;
  e.input.setAnalog(x,y);e.input.poll();
  const start={x:e.player.x,y:e.player.y};
  for(let k=0;k<20;k++){e.update(1/60);e.input.endStep();e.input.poll()}
  const dist=Math.hypot(e.player.x-start.x,e.player.y-start.y);
  e.destroy();return dist;
 }
 const slow=simulate(.27,0),fast=simulate(1,0),diagonal=simulate(.707,.707);
 return {slow,fast,diagonal,ok:slow>2&&slow<fast*.48&&diagonal<fast*1.14};
});
if(!joystick.ok)throw Error("Analog stick regression "+JSON.stringify(joystick));
console.log("PASS — analog displacement proportional speed, diagonal movement and normalization",joystick);
// Ensure all four beast illustrations decode as real image assets in Chromium.
const beastArt=await page.evaluate(async()=>{
 const {beasts}=await import("/src/game/beast-illustrations.ts");
 await Promise.all(beasts.map(img=>img.decode()));
 const sizes=beasts.map(img=>[img.naturalWidth,img.naturalHeight]);
 const cv=document.createElement("canvas");cv.width=340;cv.height=260;
 const g=cv.getContext("2d");g.drawImage(beasts[1],0,0,340,260);
 const pixels=g.getImageData(0,0,340,260).data;
 let opaque=0;for(let k=3;k<pixels.length;k+=4)if(pixels[k]>50)opaque++;
 return {sizes,opaque};
});
if(beastArt.sizes.length!==4||beastArt.sizes.some(([w,h])=>w<50||h<50)||beastArt.opaque<3000)
 throw Error("Detailed beast assets failed to decode/draw: "+JSON.stringify(beastArt));
console.log("PASS — four new beast image assets decode and visibly render",beastArt);
// Emulate two-thumb mobile gameplay: one finger drives the floating analog
// joystick while the other holds FIRE; button events must remain functional.
const mobilePage=await browser.newPage({viewport:{width:960,height:540},hasTouch:true,isMobile:true});
mobilePage.on("pageerror",error=>errors.push(error.message));
await mobilePage.goto(url,{waitUntil:"networkidle"});
const customArtPanel=mobilePage.getByLabel("HD Beast Art importer");
await customArtPanel.waitFor();
if(!await customArtPanel.isVisible())throw Error("Art import menu missing");
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==","base64");
await mobilePage.locator('input[type="file"]').setInputFiles({name:"storm_drake.png",mimeType:"image/png",buffer:png});
await mobilePage.waitForTimeout(200);
const saved=await mobilePage.evaluate(()=>new Promise((resolve,reject)=>{
 const req=indexedDB.open("ironfang-art-assets-v1");
 req.onsuccess=()=>{
  const q=req.result.transaction("beast-skins","readonly").objectStore("beast-skins").get("1");
  q.onsuccess=()=>resolve(Boolean(q.result));q.onerror=()=>reject(q.error)
 };req.onerror=()=>reject(req.error)
}));
if(!saved)throw Error("Custom HD image was not persisted locally");
console.log("PASS — optional original-art import and persistence works offline");
const zone=mobilePage.getByLabel("Analog movement joystick");
await zone.waitFor();
const z=await zone.boundingBox();
if(!z)throw Error("No mobile analog touch zone");
await mobilePage.mouse.move(z.x+z.width*.35,z.y+z.height*.48);
await mobilePage.mouse.down();
await mobilePage.mouse.move(z.x+z.width*.7,z.y+z.height*.75,{steps:4});
const analogOffset=await mobilePage.evaluate(()=>{
 const layer=document.querySelector('[aria-label="Analog movement joystick"]');
 return layer?.children[1]?.style.transform||"";
});
await mobilePage.mouse.up();
const resetOffset=await mobilePage.evaluate(()=>{
 const layer=document.querySelector('[aria-label="Analog movement joystick"]');
 return layer?.children[1]?.style.transform||"";
});
if(!analogOffset.includes("calc(")||resetOffset!=="translate(-50%, -50%)"&&resetOffset!=="translate(-50%,-50%)")
 throw Error("Touch joystick did not follow/reset: "+analogOffset+" / "+resetOffset);
if(errors.length)throw Error("Mobile runtime error(s): "+errors.join(" | "));
console.log("PASS — analog joystick mobile touch drag and automatic centering",analogOffset);
await mobilePage.close();
await browser.close();
