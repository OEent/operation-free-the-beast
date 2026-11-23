import { beasts } from "./beast-illustrations";

const LABELS=["Inferno Hound","Storm Drake","Moonfang Werebeast","Arcane Titan"];
const FILE_TESTS=[/inferno|hound|hellhound/i,/storm|drake|dragon/i,/moonfang|werewolf|werebeast/i,/arcane|titan|kaiju/i];
const DATABASE="ironfang-art-assets-v1";
const STORE="beast-skins";
let dbPromise:Promise<IDBDatabase>|undefined;
function db(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DATABASE,1);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  return dbPromise;
}
async function put(key:string,blob:Blob){
  const database=await db();
  return new Promise<void>((resolve,reject)=>{
    const tx=database.transaction(STORE,"readwrite");
    tx.objectStore(STORE).put(blob,key);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function get(key:string){
  const database=await db();
  return new Promise<Blob|undefined>((resolve,reject)=>{
    const tx=database.transaction(STORE,"readonly");
    const q=tx.objectStore(STORE).get(key);
    q.onsuccess=()=>resolve(q.result as Blob|undefined);
    q.onerror=()=>reject(q.error);
  });
}
async function clear(){
  const database=await db();
  return new Promise<void>((resolve,reject)=>{
    const tx=database.transaction(STORE,"readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
const activeUrls=new Map<number,string>();
async function swapImage(index:number,blob:Blob) {
  const url=URL.createObjectURL(blob);
  const image=new Image();
  image.src=url;
  try{await image.decode()}
  catch(err){URL.revokeObjectURL(url);throw err}
  if(!image.naturalWidth||!image.naturalHeight){URL.revokeObjectURL(url);throw Error("Invalid sprite")}
  const old=activeUrls.get(index);
  beasts[index]=image;activeUrls.set(index,url);
  if(old)URL.revokeObjectURL(old);
}
export async function restoreBeastArt(){
  try{
    const existing=await Promise.all(LABELS.map((_,i)=>get(String(i))));
    for(let i=0;i<existing.length;i++)if(existing[i])await swapImage(i,existing[i]!);
    return existing.filter(Boolean).length;
  }catch(err){console.warn("Optional custom art not available",err);return 0}
}
export function installBeastArtPicker(isMenu:()=>boolean){
  const input=document.createElement("input");input.type="file";
  input.multiple=true;input.accept="image/png,image/webp,image/jpeg";
  input.style.display="none";document.body.appendChild(input);
  const panel=document.createElement("div");
  panel.setAttribute("aria-label","HD Beast Art importer");
  Object.assign(panel.style,{
    position:"fixed",bottom:"10px",right:"10px",zIndex:"10",
    display:"flex",gap:"6px",alignItems:"center",
    font:"bold 11px system-ui",color:"#fff",pointerEvents:"auto",
  });
  const button=document.createElement("button");
  button.type="button";button.textContent="★ LOAD HD BEAST ART";
  Object.assign(button.style,{
    padding:"9px 12px",borderRadius:"9px",border:"1px solid #9bebff",
    background:"linear-gradient(100deg,#172c52,#48326d)",color:"#fff",
    boxShadow:"0 0 12px #55baff66",font:"bold 11px system-ui",cursor:"pointer",
  });
  button.addEventListener("click",()=>{
    alert("Select the 4 PNG or WebP beast files from the IRONFANG art pack. The game remembers them on this device. Names should include inferno, storm, moonfang, or titan.");
    input.click();
  });
  const reset=document.createElement("button");reset.type="button";reset.textContent="RESET ART";
  Object.assign(reset.style,{padding:"9px 8px",borderRadius:"9px",border:"1px solid #93b1c3",
    background:"#12172c",color:"#b8d9ec",font:"bold 10px system-ui",cursor:"pointer"});
  reset.addEventListener("click",async()=>{
    if(!confirm("Restore the built-in beast illustrations and clear custom beast files on this device?"))return;
    await clear();location.reload();
  });
  const msg=document.createElement("span");msg.setAttribute("role","status");msg.style.maxWidth="170px";
  panel.append(button,reset,msg);document.body.appendChild(panel);
  input.addEventListener("change",async()=>{
    const files=Array.from(input.files??[]);
    let count=0;
    for(const file of files){
      const idx=FILE_TESTS.findIndex(test=>test.test(file.name));
      if(idx<0||!file.type.startsWith("image/"))continue;
      if(file.size>15*1024*1024){msg.textContent="File too large: "+file.name;continue}
      try{
        await swapImage(idx,file);await put(String(idx),file);count++;
      }catch(err){console.warn("Image load failed",file.name,err);msg.textContent="Couldn't read "+file.name}
    }
    if(count){msg.textContent=count+"/4 art skins loaded!";
      setTimeout(()=>{msg.textContent=""},4500);
    }else if(!msg.textContent)msg.textContent="Use files named inferno, storm, moonfang and titan.";
    input.value="";
  });
  let lastVisibility="";
  const tick=()=>{
    const display=isMenu()?"flex":"none";
    if(display!==lastVisibility){panel.style.display=display;lastVisibility=display}
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return panel;
}
