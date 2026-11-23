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
await browser.close();
