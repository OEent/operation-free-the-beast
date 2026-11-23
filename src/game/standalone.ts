import { ArenaEngine as Engine } from "./arena";
import { loadSettings } from "./storage";
import type { Action } from "./input";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const engine = new Engine(canvas, { standalone: true, settings: loadSettings() });
engine.start();

// No paid plugin / SDK required: pointer controls work in Android / iOS WebViews
// and in a mobile browser. Keyboard and controllers keep working on desktop.
const mobile = window.matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
if (mobile) {
  const buttons: { action: Action; label: string; x: number; y: number; w?: number }[] = [
    { action: "jump", label: "JUMP", x: 68, y: 68 },
    { action: "melee", label: "SLASH", x: 80, y: 70 },
    { action: "shoot", label: "FIRE", x: 88, y: 47 },
    { action: "dash", label: "DASH", x: 57, y: 76 },
    { action: "special", label: "MAGIC", x: 74, y: 28 },
    { action: "transform", label: "BEAST", x: 89, y: 12 },
    { action: "nextWeapon", label: "GUN", x: 4, y: 20 },
    { action: "bomb", label: "BOMB", x: 15, y: 20 },
    { action: "start", label: "START", x: 44, y: 6 },
    { action: "pause", label: "Ⅱ", x: 95, y: 4 },
  ];
  const layer = document.createElement("div");
  layer.setAttribute("aria-label", "Touch game controls");
  Object.assign(layer.style, { position: "fixed", inset: "0", zIndex: "5", pointerEvents: "none", touchAction: "none" });
  document.body.appendChild(layer);
  for (const spec of buttons) {
    const el = document.createElement("button");
    el.textContent = spec.label;
    el.setAttribute("aria-label", spec.action);
    el.type = "button";
    Object.assign(el.style, {
      position: "absolute", left: spec.x + "%", top: spec.y + "%",
      width: spec.w ? spec.w + "vw" : "clamp(38px, 8vw, 64px)",
      height: "clamp(34px, 11vh, 56px)",
      borderRadius: spec.action === "shoot" ? "50%" : "12px",
      border: "1px solid rgba(255,210,122,.65)",
      background: spec.action === "shoot" ? "rgba(185,59,22,.65)" : "rgba(12,19,37,.65)",
      color: "#ffebc3", font: "bold clamp(9px,1.5vw,15px) system-ui",
      boxShadow: "0 0 12px rgba(255,105,30,.14)",
      pointerEvents: "auto", touchAction: "none", userSelect: "none",
    });
    const end = (ev: PointerEvent) => { ev.preventDefault(); engine.input.release(spec.action); el.style.opacity = "1"; };
    el.addEventListener("pointerdown", ev => {
      ev.preventDefault(); el.setPointerCapture(ev.pointerId);
      engine.input.press(spec.action); el.style.opacity = ".65";
    });
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("lostpointercapture", () => engine.input.release(spec.action));
    layer.appendChild(el);
  }
  // Floating thumb joystick: grab anywhere in the left 46% of the screen.
  // Radius and dead zone are in CSS pixels, independent of resolution.
  // Capture one pointer only, so the right thumb can attack simultaneously.
  const stickZone = document.createElement("div");
  stickZone.setAttribute("aria-label","Analog movement joystick");
  Object.assign(stickZone.style,{
    position:"absolute",left:"0",top:"31%",width:"46%",height:"69%",
    pointerEvents:"auto",touchAction:"none",userSelect:"none"
  });
  const base = document.createElement("div"),knob=document.createElement("div");
  const common={position:"absolute",boxSizing:"border-box",borderRadius:"50%",
    left:"50%",top:"65%",transform:"translate(-50%,-50%)",
    pointerEvents:"none",willChange:"transform,left,top"} as const;
  Object.assign(base.style,common,{width:"clamp(92px,15vw,136px)",height:"clamp(92px,15vw,136px)",
    border:"2px solid #9ceaffb5",background:"radial-gradient(circle,#69dfff22 0%,#1b3658aa 60%,#0b1022c9 100%)",
    boxShadow:"inset 0 0 25px #76deff33,0 0 18px #40d6ff44",opacity:".58"});
  Object.assign(knob.style,common,{width:"clamp(46px,7vw,63px)",height:"clamp(46px,7vw,63px)",
    border:"2px solid #b9f8ff",background:"radial-gradient(circle at 35% 30%,#a0efff,#337bb3 40%,#102f54 78%)",
    boxShadow:"0 4px 14px #02061599,inset 0 0 9px #e5ffffa0",opacity:".92"});
  stickZone.appendChild(base);stickZone.appendChild(knob);
  layer.appendChild(stickZone);
  let activePointer:number|null=null,centerX=0,centerY=0;
  const radius=()=>Math.max(43,Math.min(63,innerWidth*.075));
  const location=(x:number,y:number)=>{
    const rect=stickZone.getBoundingClientRect();
    const left=x-rect.left,top=y-rect.top;
    for(const el of [base,knob]){el.style.left=left+"px";el.style.top=top+"px"}
  };
  const moveStick=(x:number,y:number)=>{
    const rawX=x-centerX,rawY=y-centerY,length=Math.hypot(rawX,rawY),r=radius();
    const clamped=Math.min(1,length/r);
    let dx=length?rawX/length*clamped:0,dy=length?rawY/length*clamped:0;
    // Gentle deadzone and progressive acceleration give precise lane control.
    const mag=Math.hypot(dx,dy);
    if(mag<.13){dx=0;dy=0}else{
      const smooth=(mag-.13)/.87;dx=dx/mag*smooth;dy=dy/mag*smooth;
    }
    const translateX=dx*r,translateY=dy*r;
    knob.style.transform="translate(calc(-50% + "+translateX+"px),calc(-50% + "+translateY+"px))";
    engine.input.setAnalog(dx,dy);
  };
  stickZone.addEventListener("pointerdown",ev=>{
    if(activePointer!==null)return;
    ev.preventDefault();activePointer=ev.pointerId;stickZone.setPointerCapture(ev.pointerId);
    centerX=ev.clientX;centerY=ev.clientY;location(centerX,centerY);
    base.style.opacity=".87";moveStick(centerX,centerY);
    if(engine.state==="menu")engine.input.press("start");
  });
  stickZone.addEventListener("pointermove",ev=>{
    if(ev.pointerId!==activePointer)return;
    ev.preventDefault();moveStick(ev.clientX,ev.clientY);
  });
  function stopStick(pointerId:number){
    if(pointerId!==activePointer)return;
    activePointer=null;engine.input.setAnalog(0,0);
    knob.style.transform="translate(-50%,-50%)";base.style.opacity=".55";
  }
  stickZone.addEventListener("pointerup",ev=>{ev.preventDefault();stopStick(ev.pointerId)});
  stickZone.addEventListener("pointercancel",ev=>stopStick(ev.pointerId));
  stickZone.addEventListener("lostpointercapture",ev=>stopStick(ev.pointerId));
  window.addEventListener("blur",()=>{activePointer=null;engine.input.setAnalog(0,0)});
  const tip = document.createElement("div");
  tip.textContent = "ROTATE YOUR PHONE TO LANDSCAPE";
  Object.assign(tip.style, { position: "fixed", inset: "0", background: "#070b22ee", display: "none", alignItems: "center", justifyContent: "center",
    color: "#ffd374", font: "bold 18px system-ui", zIndex: "7", textAlign: "center", padding: "24px", pointerEvents: "none" });
  document.body.appendChild(tip);
  function orientation() { tip.style.display = window.innerHeight > window.innerWidth ? "flex" : "none"; }
  window.addEventListener("resize", orientation); orientation();
}
