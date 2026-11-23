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
    { action: "up", label: "▲", x: 13, y: 54 },
    { action: "down", label: "▼", x: 13, y: 80 },
    { action: "left", label: "◀", x: 4, y: 68 },
    { action: "right", label: "▶", x: 21, y: 68 },
    { action: "jump", label: "JUMP", x: 68, y: 66 },
    { action: "melee", label: "CLAW", x: 82, y: 70 },
    { action: "shoot", label: "FIRE", x: 88, y: 49 },
    { action: "dash", label: "DASH", x: 54, y: 75 },
    { action: "special", label: "BLAST", x: 75, y: 30 },
    { action: "transform", label: "BEAST", x: 87, y: 13 },
    { action: "nextWeapon", label: "GUN", x: 4, y: 20 },
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
  const tip = document.createElement("div");
  tip.textContent = "ROTATE YOUR PHONE TO LANDSCAPE";
  Object.assign(tip.style, { position: "fixed", inset: "0", background: "#070b22ee", display: "none", alignItems: "center", justifyContent: "center",
    color: "#ffd374", font: "bold 18px system-ui", zIndex: "7", textAlign: "center", padding: "24px", pointerEvents: "none" });
  document.body.appendChild(tip);
  function orientation() { tip.style.display = window.innerHeight > window.innerWidth ? "flex" : "none"; }
  window.addEventListener("resize", orientation); orientation();
}
