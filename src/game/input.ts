export type Action = "left" | "right" | "up" | "down" | "jump" | "melee" | "shoot" | "special" | "dash" | "transform" | "pause" | "start" | "menu" | "restart" | "nextWeapon" | "nextBeast" | "bomb";
const KEYMAP: Record<string, Action> = {
  KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
  KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down",
  Space: "jump", KeyJ: "melee", KeyZ: "melee", KeyK: "shoot", KeyX: "shoot", KeyL: "special", KeyC: "special",
  ShiftLeft: "dash", ShiftRight: "dash", KeyE: "transform", KeyP: "pause", Escape: "menu", Enter: "start", KeyR: "restart", KeyQ: "nextWeapon", Digit1: "nextBeast", Digit2: "nextBeast", Digit3: "nextBeast", Digit4: "nextBeast", KeyB: "nextBeast", KeyF: "bomb",
};
export class Input {
  private kb = new Set<Action>();
  private latched = new Set<Action>();
  touch = new Set<Action>();
  private pad = new Set<Action>();
  private cur = new Set<Action>();
  private prev = new Set<Action>();
  anyPress = false;
  // Continuous analog displacement, independent of discrete keyboard actions.
  analogX = 0;
  analogY = 0;
  private padX = 0;
  private padY = 0;
  setAnalog(x:number,y:number) { const length=Math.hypot(x,y);this.analogX=Math.abs(x)<.035?0:x/Math.max(1,length);this.analogY=Math.abs(y)<.035?0:y/Math.max(1,length); }
  axes(){if(Math.hypot(this.analogX,this.analogY)>.04)return {x:this.analogX,y:this.analogY};const x=this.padX,y=this.padY;if(Math.hypot(x,y)>.14)return {x,y};const dx=(this.down('right')?1:0)-(this.down('left')?1:0),dy=(this.down('down')?1:0)-(this.down('up')?1:0);const length=Math.max(1,Math.hypot(dx,dy));return {x:dx/length,y:dy/length};}
  private onDown = (e: KeyboardEvent) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    if (e.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    e.preventDefault();
    this.kb.add(a); this.latched.add(a); this.anyPress = true;
  };
  private onUp = (e: KeyboardEvent) => { const a = KEYMAP[e.code]; if (a) this.kb.delete(a); };
  private onBlur = () => {this.kb.clear();this.setAnalog(0,0);};
  attach() {
    window.addEventListener("keydown", this.onDown);
    window.addEventListener("keyup", this.onUp);
    window.addEventListener("blur", this.onBlur);
  }
  detach() {
    window.removeEventListener("keydown", this.onDown);
    window.removeEventListener("keyup", this.onUp);
    window.removeEventListener("blur", this.onBlur);
  }
  press(a: Action) { this.touch.add(a); this.latched.add(a); this.anyPress = true; }
  release(a: Action) { this.touch.delete(a); }
  poll() {
    this.pad.clear();this.padX=0;this.padY=0;
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const b = (i: number) => !!gp.buttons[i]?.pressed;
      const ax = gp.axes[0] ?? 0, ay = gp.axes[1] ?? 0;
      if(Math.hypot(ax,ay)>.14){this.padX=ax;this.padY=ay;}
      if (ax < -0.4 || b(14)) this.pad.add("left");
      if (ax > 0.4 || b(15)) this.pad.add("right");
      if (ay < -0.5 || b(12)) this.pad.add("up");
      if (ay > 0.5 || b(13)) this.pad.add("down");
      if (b(0)) this.pad.add("jump");
      if (b(2)) this.pad.add("melee");
      if (b(1) || b(7)) this.pad.add("shoot");
      if (b(3)) this.pad.add("special");
      if (b(5)) this.pad.add("dash");
      if (b(4)) this.pad.add("transform");
      if (b(9)) { this.pad.add("pause"); this.pad.add("start"); }
      if (b(8)) this.pad.add("menu");
    }
    this.cur = new Set<Action>([...this.kb, ...this.touch, ...this.pad, ...this.latched]);
    if (this.pad.size) this.anyPress = true;
  }
  endStep() { this.prev = this.cur; this.latched.clear(); }
  down(a: Action) { return this.cur.has(a); }
  pressed(a: Action) { return this.cur.has(a) && !this.prev.has(a); }
}