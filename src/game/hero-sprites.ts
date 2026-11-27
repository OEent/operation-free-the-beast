// The default hero is extracted from the player's illustrated reference art.
// Optional high-definition 4x4/8-frame sprite atlases can be imported in the game.
export const heroSprite = new Image();
heroSprite.src=new URL("./assets/hero-idle.webp",import.meta.url).href;
export const heroRunSprite = new Image();
heroRunSprite.src=new URL("./assets/hero-run.webp",import.meta.url).href;
export const heroSlashSprite = new Image();
heroSlashSprite.src=new URL("./assets/hero-slash.webp",import.meta.url).href;

let customSheet:HTMLImageElement|null=null;
const DB="ironfang-hero-sprite-v1",STORE="hero";
type Pose={running:boolean;dashing:boolean;air:boolean;attacking:boolean;shooting:boolean;attack:number;time:number};
export function getHeroFrame(p:Pose):{source:HTMLImageElement|null;rect?:{x:number;y:number;w:number;h:number}} {
 if(!customSheet?.complete||!customSheet.naturalWidth){
  if(p.attacking&&heroSlashSprite.complete&&heroSlashSprite.naturalWidth)return {source:heroSlashSprite};
  if((p.running||p.dashing||p.air)&&heroRunSprite.complete&&heroRunSprite.naturalWidth)return {source:heroRunSprite};
  return {source:heroSprite};
 }
 // User-created original atlas is a 4-column x 4-row sheet of consistent poses:
 // row 1 idle/walk, row 2 run, row 3 melee, row 4 gun/dash/transform.
 const frames=customSheet.naturalWidth/customSheet.naturalHeight;
 const cols=frames>=3.5?4:8;
 const rows=cols===4?4:1;
 const w=customSheet.naturalWidth/cols,h=customSheet.naturalHeight/rows;
 let index=0;
 if(p.shooting)index=cols===4?12:6;
 else if(p.attacking)index=cols===4?(p.attack>.18?8:9):5;
 else if(p.dashing||p.air)index=cols===4?13:7;
 else if(p.running)index=cols===4?Math.floor(p.time*12)%4+4:Math.floor(p.time*11)%4+1;
 return {source:customSheet,rect:{x:index%cols*w,y:Math.floor(index/cols)*h,w,h}};
}
function openDb():Promise<IDBDatabase>{return new Promise((ok,fail)=>{
 const r=indexedDB.open(DB,1);
 r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
 r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);
})}
async function storeHero(blob:Blob){
 const db=await openDb();return new Promise<void>((ok,fail)=>{
 const t=db.transaction(STORE,"readwrite");t.objectStore(STORE).put(blob,"sheet");
 t.oncomplete=()=>ok();t.onerror=()=>fail(t.error);
 })}
async function loadImage(blob:Blob){
 const src=URL.createObjectURL(blob);const image=new Image();image.src=src;
 await image.decode();if(image.naturalWidth<128||image.naturalHeight<40)throw Error("Image too small");
 customSheet=image; // Deliberately retained for live use.
}
export async function restoreHeroArt(){try{
 const db=await openDb();const blob=await new Promise<Blob|undefined>((ok,fail)=>{
 const r=db.transaction(STORE).objectStore(STORE).get("sheet");
 r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);
 });if(blob)await loadImage(blob)
 }catch(error){console.warn("Optional hero sprite restore",error)}
}
export function installHeroArtPicker(){
 const button=document.createElement("button");
 button.textContent="IMPORT HERO ANIMATION";button.type="button";
 Object.assign(button.style,{position:"fixed",bottom:"54px",right:"10px",zIndex:"11",
 background:"#173a58",border:"1px solid #86edff",borderRadius:"9px",padding:"9px 12px",
 color:"#fff",font:"bold 11px system-ui",cursor:"pointer"});
 button.setAttribute("aria-label","Import hero animation sheet");
 const input=document.createElement("input");input.type="file";input.accept="image/png,image/webp";input.hidden=true;
 document.body.append(button,input);
 button.onclick=()=>input.click();
 input.onchange=async()=>{const file=input.files?.[0];if(!file)return;
   try{await loadImage(file);await storeHero(file);button.textContent="HERO ANIMATION LOADED"}
   catch(error){console.warn(error);button.textContent="INVALID HERO SHEET"}};
 return {button,show:(visible:boolean)=>{button.style.display=visible?"block":"none"}};
}
