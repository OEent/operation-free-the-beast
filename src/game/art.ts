/* Procedural pixel-art: original backgrounds, tiles and characters drawn with rects. */
export type G = CanvasRenderingContext2D;
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function mk(w: number, h: number): [HTMLCanvasElement, G] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  return [c, g];
}
export const px = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

export interface ZonePal {
  name: string; skyTop: string; skyMid: string; skyBot: string; far: string; farHi: string; mid: string; midHi: string;
  light: string; ground: string; groundDark: string; groundTop: string; groundTopHi: string; near: string; tint: string;
}
export const ZONES: ZonePal[] = [
  { name: "THE RUINED CITADEL", skyTop: "#070b22", skyMid: "#1c1840", skyBot: "#5a2a3c", far: "#161634", farHi: "#262650", mid: "#20203e", midHi: "#34345c",
    light: "#ff9a3a", ground: "#3e3c58", groundDark: "#26243a", groundTop: "#6a6a8c", groundTopHi: "#9a9ac0", near: "#06060f", tint: "#b8b4e0" },
  { name: "THE CURSED WOOD", skyTop: "#040e16", skyMid: "#0c2430", skyBot: "#1c4a48", far: "#0a1e24", farHi: "#123038", mid: "#0f2a2a", midHi: "#1a403c",
    light: "#5ff0e0", ground: "#33261f", groundDark: "#1c1410", groundTop: "#2f5a3a", groundTopHi: "#5a9a5a", near: "#030a08", tint: "#a0d0c8" },
  { name: "THE WAR-MACHINE FORTRESS", skyTop: "#0e0608", skyMid: "#2a0e10", skyBot: "#7a2a10", far: "#1a1012", farHi: "#2c1a1a", mid: "#261a1e", midHi: "#3e2a2c",
    light: "#ff6a1a", ground: "#3e3838", groundDark: "#221e1e", groundTop: "#6a6260", groundTopHi: "#a09890", near: "#080404", tint: "#e0b4a8" },
];

function speckle(g: G, w: number, h: number, r: () => number, n: number, color: string) {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1);
}
function wrap(fn: (ox: number) => void) { fn(0); fn(-960); fn(960); }

export interface Layers { far: HTMLCanvasElement; mid: HTMLCanvasElement; near: HTMLCanvasElement; tile: HTMLCanvasElement }

export function makeLayers(z: number): Layers {
  const P = ZONES[z]!;
  const r = rng(100 + z * 31);
  const [far, f] = mk(960, 270);
  const [mid, m] = mk(960, 270);
  const [near, n] = mk(960, 270);
  // FAR
  if (z === 0) {
    f.fillStyle = P.far; f.beginPath(); f.moveTo(0, 270);
    for (let x = 0; x <= 960; x += 16) f.lineTo(x, 170 + Math.sin(x * 0.013) * 18 + Math.sin(x * 0.041) * 8);
    f.lineTo(960, 270); f.fill();
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(r() * 960), w = 14 + Math.floor(r() * 16), h = 50 + Math.floor(r() * 70);
      wrap((o) => {
        px(f, x + o, 190 - h, w, h + 80, P.far);
        f.fillStyle = P.far; f.beginPath(); f.moveTo(x + o - 2, 190 - h); f.lineTo(x + o + w / 2, 190 - h - 24 - r() * 6); f.lineTo(x + o + w + 2, 190 - h); f.fill();
        px(f, x + o, 190 - h, 1, h, P.farHi);
        for (let k = 0; k < 3; k++) if (r() < 0.6) px(f, x + o + w / 2 - 1, 196 - h + k * 14, 2, 3, "#e0783088");
      });
    }
  } else if (z === 1) {
    for (let row = 0; row < 3; row++) {
      f.fillStyle = row === 0 ? P.farHi : row === 1 ? P.far : "#081418";
      f.beginPath(); f.moveTo(0, 270);
      for (let x = 0; x <= 960; x += 6) f.lineTo(x, 140 + row * 26 + Math.sin(x * 0.05 + row) * 6 + Math.sin(x * 0.17 + row * 3) * 4 - (Math.sin(x * 0.0065 * (row + 1)) * 14));
      f.lineTo(960, 270); f.fill();
    }
    for (let i = 0; i < 40; i++) px(f, r() * 960, 120 + r() * 80, 1, 1, "#7ff8e8aa");
  } else {
    f.fillStyle = P.far; f.fillRect(0, 200, 960, 70);
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(r() * 960), w = 10 + Math.floor(r() * 24), h = 40 + Math.floor(r() * 110);
      wrap((o) => {
        px(f, x + o, 205 - h, w, h, P.far);
        px(f, x + o - 2, 205 - h, w + 4, 4, P.farHi);
        if (r() < 0.5) { px(f, x + o + w * 0.3, 205 - h - 20, 5, 20, P.far); px(f, x + o + w * 0.3, 205 - h - 22, 5, 2, "#ff6a1a"); }
        for (let k = 0; k < 4; k++) if (r() < 0.4) px(f, x + o + 2 + r() * (w - 4), 210 - h + r() * h * 0.8, 2, 1, "#ff8a2a");
      });
    }
  }
  speckle(f, 960, 270, r, 900, "#ffffff08");
  // MID
  if (z === 0) {
    for (let i = 0; i < 6; i++) {
      const x = i * 160 + Math.floor(r() * 40), h = 90 + Math.floor(r() * 60);
      wrap((o) => {
        const X = x + o, top = 240 - h;
        px(m, X, top, 70, h + 40, P.mid);
        m.fillStyle = "#00000000";
        m.save(); m.globalCompositeOperation = "destination-out";
        m.beginPath(); m.ellipse(X + 35, top + 52, 20, 26, 0, 0, Math.PI * 2); m.fill(); m.fillRect(X + 15, top + 52, 40, h);
        m.beginPath(); for (let k = 0; k < 5; k++) m.rect(X + k * 14 + (k % 2) * 3, top - 2, 7, 6 + (k * 7) % 9); m.fill();
        m.restore();
        px(m, X, top, 2, h, P.midHi);
        for (let k = 0; k < 6; k++) px(m, X + 4 + (k % 3) * 22, top + 10 + Math.floor(k / 3) * 26, 4, 6, k % 2 ? "#ff9a3a" : "#1a1830");
        for (let yy = top + 8; yy < 240; yy += 8) px(m, X + 2, yy, 66, 1, "#00000030");
      });
    }
    for (let i = 0; i < 30; i++) px(m, r() * 960, 200 + r() * 40, 3 + r() * 6, 2 + r() * 3, P.midHi);
  } else if (z === 1) {
    for (let i = 0; i < 11; i++) {
      const x = Math.floor(r() * 960), w = 8 + Math.floor(r() * 10);
      wrap((o) => {
        const X = x + o;
        m.fillStyle = P.mid; m.beginPath(); m.moveTo(X - 8, 270); m.lineTo(X, 200);
        for (let y = 200; y > -10; y -= 20) m.lineTo(X + Math.sin(y * 0.05 + i) * 6, y);
        m.lineTo(X + w + Math.sin(i) * 6, -10);
        for (let y = -10; y < 200; y += 20) m.lineTo(X + w + Math.sin(y * 0.05 + i) * 6, y);
        m.lineTo(X + w + 10, 270); m.fill();
        px(m, X + 2, 0, 1, 230, P.midHi);
        for (let b = 0; b < 3; b++) {
          const by = 40 + b * 50 + r() * 20, dir = r() < 0.5 ? -1 : 1;
          m.strokeStyle = P.mid; m.lineWidth = 3; m.beginPath(); m.moveTo(X + w / 2, by);
          m.quadraticCurveTo(X + w / 2 + dir * 20, by - 14, X + w / 2 + dir * 40, by - 4); m.stroke();
          px(m, X + w / 2 + dir * 30, by - 6, 1, 18 + r() * 14, "#2a5a4a");
        }
        if (r() < 0.8) { px(m, X - 3, 232, 5, 3, "#5ff0e0"); px(m, X - 2, 235, 1, 4, "#a0e0d0"); }
      });
    }
  } else {
    for (let i = 0; i < 5; i++) {
      const cx = Math.floor(r() * 960), cy = 120 + Math.floor(r() * 60), rad = 22 + Math.floor(r() * 18);
      wrap((o) => {
        m.fillStyle = P.mid; m.beginPath();
        for (let a = 0; a < 24; a++) { const ang = (a / 24) * Math.PI * 2, rr = a % 2 ? rad : rad + 6; m.lineTo(cx + o + Math.cos(ang) * rr, cy + Math.sin(ang) * rr); }
        m.fill();
        m.fillStyle = P.midHi; m.beginPath(); m.arc(cx + o, cy, rad * 0.4, 0, Math.PI * 2); m.fill();
        px(m, cx + o - 2, cy - 2, 4, 4, "#ff6a1a");
      });
    }
    for (let i = 0; i < 4; i++) { const y = 90 + i * 40; px(m, 0, y, 960, 6, P.mid); px(m, 0, y, 960, 1, P.midHi); for (let x = 0; x < 960; x += 40) px(m, x, y + 2, 2, 2, "#8a7a70"); }
    for (let x = 0; x < 960; x += 64) { px(m, x, 60, 8, 210, P.mid); for (let y = 60; y < 270; y += 16) { m.strokeStyle = P.midHi; m.beginPath(); m.moveTo(x, y); m.lineTo(x + 8, y + 16); m.stroke(); } }
  }
  speckle(m, 960, 270, r, 1200, "#00000020");
  // NEAR foreground silhouettes (top hangings + bottom)
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(r() * 960);
    wrap((o) => {
      const X = x + o;
      if (z === 0) { for (let y = 0; y < 40 + r() * 40; y += 4) px(n, X + (y % 8 ? 0 : 1), y, 3, 3, P.near); }
      else if (z === 1) { n.fillStyle = P.near; n.beginPath(); n.moveTo(X - 30, 0); n.quadraticCurveTo(X, 40 + r() * 30, X + 40, 0); n.fill(); for (let k = 0; k < 5; k++) px(n, X - 20 + k * 12, 10, 1, 30 + r() * 30, P.near); }
      else { px(n, X, 0, 10, 22, P.near); px(n, X - 20, 18, 50, 6, P.near); for (let y = 24; y < 60; y += 5) px(n, X + 3, y, 3, 4, P.near); }
      n.fillStyle = P.near; n.beginPath(); n.moveTo(X - 40, 270);
      for (let k = 0; k <= 8; k++) n.lineTo(X - 40 + k * 10, 270 - (k % 2 ? 6 + r() * 14 : 2));
      n.lineTo(X + 40, 270); n.fill();
    });
  }
  // TILE
  const [tile, t] = mk(16, 16);
  px(t, 0, 0, 16, 16, P.ground);
  if (z === 0) { px(t, 0, 7, 16, 1, P.groundDark); px(t, 0, 15, 16, 1, P.groundDark); px(t, 5, 0, 1, 7, P.groundDark); px(t, 12, 8, 1, 7, P.groundDark); px(t, 0, 0, 16, 1, "#ffffff10"); }
  else if (z === 1) { for (let k = 0; k < 6; k++) px(t, r() * 14, r() * 14, 2 + r() * 2, 1 + r() * 2, P.groundDark); if (r() < 1) px(t, 3, 9, 6, 1, "#2a6a5a"); }
  else { px(t, 0, 0, 16, 1, "#ffffff14"); px(t, 15, 0, 1, 16, P.groundDark); px(t, 0, 15, 16, 1, P.groundDark); px(t, 2, 2, 1, 1, "#9a9090"); px(t, 13, 2, 1, 1, "#9a9090"); px(t, 2, 13, 1, 1, "#9a9090"); px(t, 13, 13, 1, 1, "#9a9090"); }
  speckle(t, 16, 16, r, 14, "#00000040");
  speckle(t, 16, 16, r, 6, "#ffffff14");
  return { far, mid, near, tile };
}

let glowCache: Map<string, HTMLCanvasElement> | null = null;
export function glow(color: string): HTMLCanvasElement {
  glowCache ??= new Map();
  const c = glowCache.get(color);
  if (c) return c;
  const [cv, g] = mk(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, color); gr.addColorStop(0.35, color + "88"); gr.addColorStop(1, color + "00");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  glowCache.set(color, cv);
  return cv;
}

/* ---------- CHARACTERS (origin: feet center, facing right) ---------- */
export interface PoseP { t: number; run: number; air: boolean; vy: number; attack: number; combo: number; shooting: boolean; hurt: boolean; dash: boolean }
export function drawRebel(g: G, p: PoseP) {
  const moving = p.run > 0.1;
  const ph = p.t * 14;
  const bob = moving && !p.air ? Math.abs(Math.sin(ph)) * 1.5 : Math.sin(p.t * 3) * 0.5;
  const la = p.air ? -2 : moving ? Math.sin(ph) * 3.5 : 0;
  const lb = p.air ? 2 : moving ? -Math.sin(ph) * 3.5 : 0;
  const steel = p.hurt ? "#ffffff" : "#4a5a80", dark = p.hurt ? "#ffd0d0" : "#2a3250", hi = "#8aa0cc";
  // scarf
  const wave = Math.sin(p.t * 10) * 1.5;
  px(g, -10 - (p.dash ? 6 : 0), -20 - bob + wave, 6 + (p.dash ? 6 : 0), 2, "#ff5a1a");
  px(g, -13 - (p.dash ? 8 : 0), -19 - bob - wave, 4, 2, "#ff8a2a");
  // back arm
  px(g, -6, -17 - bob, 3, 7, dark);
  // legs
  px(g, -4 + la, -9, 4, 8, dark); px(g, -4 + la, -2, 5, 2, "#15151f");
  px(g, 0 + lb, -9, 4, 8, steel); px(g, 0 + lb, -2, 5, 2, "#1a1a24"); px(g, 0 + lb, -7, 4, 1, hi);
  // torso
  px(g, -5, -19 - bob, 10, 11, steel); px(g, -5, -19 - bob, 10, 2, hi); px(g, 3, -17 - bob, 2, 8, dark);
  px(g, -5, -10 - bob, 10, 2, "#8a5a2a"); px(g, -1, -10 - bob, 2, 2, "#ffcc66");
  px(g, -2, -16 - bob, 3, 3, "#ff8a2a"); px(g, -1, -15 - bob, 1, 1, "#fff0a0");
  // pauldron
  px(g, -6, -20 - bob, 5, 4, hi); px(g, -6, -17 - bob, 5, 1, dark);
  // head
  px(g, -4, -26 - bob, 8, 7, steel); px(g, -4, -26 - bob, 8, 1, hi); px(g, -5, -24 - bob, 1, 4, dark);
  px(g, 1, -23 - bob, 4, 2, "#5ff6ff"); px(g, 4, -23 - bob, 1, 1, "#ffffff");
  px(g, -3, -28 - bob, 4, 2, "#ff6a1a"); px(g, -6, -27 - bob, 3, 1, "#ff9a3a");
  // front arm + weapon
  if (p.attack > 0) {
    const sw = p.combo === 2 ? -1 : 1;
    px(g, 2, -18 - bob, 6, 3, steel);
    px(g, 7, -20 - bob + sw * 2, 2, 5, "#2a2a30");
    g.fillStyle = "#cfefff"; g.fillRect(8, -21 - bob + sw * 2, 12, 2);
    g.fillStyle = "#ffffff"; g.fillRect(8, -21 - bob + sw * 2, 12, 1);
  } else {
    px(g, 1, -17 - bob, 7, 3, steel); px(g, 1, -17 - bob, 7, 1, hi);
    px(g, 6, -18 - bob, 9, 3, "#23262f"); px(g, 6, -18 - bob, 9, 1, "#4a4f5c"); px(g, 9, -16 - bob, 2, 3, "#23262f");
    px(g, 13, -18 - bob, 2, 1, p.shooting ? "#fff0a0" : "#5ff6ff");
  }
}
export function drawBeast(g: G, p: PoseP) {
  const moving = p.run > 0.1;
  const ph = p.t * 12;
  const bob = moving && !p.air ? Math.abs(Math.sin(ph)) * 2 : Math.sin(p.t * 4);
  const la = moving ? Math.sin(ph) * 4 : 0;
  const fur = p.hurt ? "#ffffff" : "#2a1818", fur2 = p.hurt ? "#ffe0e0" : "#4a2620";
  const fl = (k: number) => (Math.sin(p.t * 20 + k) > 0 ? "#ffcc33" : "#ff6a1a");
  // tail of fire
  for (let k = 0; k < 4; k++) px(g, -16 - k * 3, -20 - bob + Math.sin(p.t * 12 + k) * 2, 4, 3, k % 2 ? "#ff6a1a" : "#ffaa33");
  // legs
  px(g, -9 + la, -10, 6, 10, fur); px(g, -10 + la, -2, 7, 2, "#140c0c");
  px(g, 3 - la, -10, 6, 10, fur2); px(g, 3 - la, -2, 8, 2, "#140c0c"); px(g, 9 - la, -2, 2, 2, "#ffe0a0");
  // torso hunched
  px(g, -11, -24 - bob, 22, 15, fur); px(g, -11, -24 - bob, 22, 3, fur2);
  px(g, -4, -20 - bob, 10, 6, "#5a2a20"); px(g, -2, -18 - bob, 5, 2, "#ff8a2a");
  // mane flames
  for (let k = 0; k < 6; k++) px(g, -10 + k * 3, -30 - bob - (k % 2) * 3 + Math.sin(p.t * 16 + k) * 1.5, 3, 7, fl(k));
  // head
  px(g, 5, -29 - bob, 10, 9, fur); px(g, 13, -26 - bob, 6, 5, fur2);
  px(g, 6, -32 - bob, 3, 4, fur); px(g, 10, -32 - bob, 3, 3, fur2);
  px(g, 10, -27 - bob, 3, 2, "#5ff6ff"); px(g, 12, -27 - bob, 1, 1, "#ffffff");
  px(g, 14, -22 - bob, 5, 2, "#1a0808"); px(g, 15, -22 - bob, 1, 2, "#ffffff"); px(g, 17, -22 - bob, 1, 2, "#ffffff");
  // arm + claws
  const reach = p.attack > 0 ? 8 : 0;
  px(g, 6, -18 - bob, 7 + reach, 5, fur2);
  px(g, 12 + reach, -19 - bob, 2, 3, "#ffe0a0"); px(g, 14 + reach, -17 - bob, 2, 3, "#ffe0a0"); px(g, 12 + reach, -14 - bob, 2, 3, "#ffe0a0");
}
export function drawSoldier(g: G, t: number, moving: boolean, aim: boolean, flash: boolean, heavy: boolean) {
  const ph = t * 10, la = moving ? Math.sin(ph) * 3 : 0;
  const coat = flash ? "#ffffff" : heavy ? "#4a3a2a" : "#3a3a2c", coat2 = flash ? "#fff" : heavy ? "#6a5032" : "#55543c";
  px(g, -4 + la, -8, 3, 8, "#22201a"); px(g, 1 - la, -8, 3, 8, "#2a281e");
  px(g, -5, -18, 10, 11, coat); px(g, -5, -18, 10, 1, coat2); px(g, -6, -9, 12, 3, coat);
  px(g, -5, -13, 10, 1, "#7a4a22");
  px(g, -4, -24, 8, 6, "#2e2e2a"); px(g, -5, -25, 10, 2, heavy ? "#6a5032" : "#4a4a3a");
  px(g, 0, -22, 2, 2, aim ? "#ffffff" : "#ff3a2a"); px(g, 3, -22, 2, 2, aim ? "#ffffff" : "#ff3a2a");
  px(g, 1, -19, 3, 2, "#55554a");
  px(g, 1, -16, 6, 3, coat2); px(g, 5, -17, 10, 3, "#1a1a1e"); px(g, 5, -17, 10, 1, "#44444c");
  if (aim) px(g, 15, -17, 2, 2, "#ff3a2a");
}
export function drawHound(g: G, t: number, moving: boolean, crouch: boolean, flash: boolean, mech: boolean) {
  const ph = t * 14, la = moving ? Math.sin(ph) * 3 : 0;
  const body = flash ? "#fff" : mech ? "#4a4248" : "#1e3028", hi = flash ? "#fff" : mech ? "#7a7070" : "#2e5040";
  const cy = crouch ? 2 : 0;
  px(g, -10 + la, -6, 3, 6, body); px(g, -5 - la, -6, 3, 6, body); px(g, 4 + la, -6, 3, 6, body); px(g, 8 - la, -6, 3, 6, body);
  px(g, -12, -14 + cy, 22, 9, body); px(g, -12, -14 + cy, 22, 2, hi);
  for (let k = 0; k < 5; k++) px(g, -10 + k * 4, -17 + cy - (k % 2), 2, 3, mech ? "#ff6a1a" : "#3a6a5a");
  px(g, 8, -17 + cy, 9, 7, body); px(g, 15, -13 + cy, 4, 3, hi);
  px(g, 13, -15 + cy, 2, 2, crouch ? "#ffffff" : mech ? "#ff3a2a" : "#5ff6ff");
  px(g, 16, -11 + cy, 1, 2, "#e0e0d0"); px(g, 18, -11 + cy, 1, 2, "#e0e0d0");
  px(g, -15, -14 + cy + Math.sin(t * 10) * 2, 4, 2, body);
}
export function drawFlyer(g: G, t: number, kind: number, flash: boolean, tele: boolean) {
  if (kind === 0) { // gargoyle bat
    const w = Math.sin(t * 18) * 6;
    const c = flash ? "#fff" : "#3a2a4a";
    g.fillStyle = c; g.beginPath(); g.moveTo(0, -4); g.lineTo(-14, -6 - w); g.lineTo(-10, 0); g.lineTo(-4, 2); g.fill();
    g.beginPath(); g.moveTo(0, -4); g.lineTo(14, -6 - w); g.lineTo(10, 0); g.lineTo(4, 2); g.fill();
    px(g, -4, -8, 8, 9, flash ? "#fff" : "#4a3a5a"); px(g, -3, -10, 2, 2, c); px(g, 1, -10, 2, 2, c);
    px(g, -2, -5, 1, 1, tele ? "#fff" : "#ff9a3a"); px(g, 1, -5, 1, 1, tele ? "#fff" : "#ff9a3a");
  } else if (kind === 1) { // wisp
    for (let k = 0; k < 5; k++) px(g, -k * 3 - 3, -3 + Math.sin(t * 8 + k) * 2, 3 - k * 0.4, 3 - k * 0.4, k % 2 ? "#2aa0a0" : "#5ff0e0");
    px(g, -4, -7, 8, 8, flash ? "#fff" : "#9ffff0"); px(g, -3, -6, 6, 6, tele ? "#ffffff" : "#5ff0e0");
    px(g, -2, -4, 1, 2, "#03201c"); px(g, 1, -4, 1, 2, "#03201c");
  } else { // war drone
    const r = Math.sin(t * 40) > 0;
    px(g, -10, -12, 20, 1, r ? "#aaa" : "#555"); px(g, -1, -11, 2, 3, "#333");
    px(g, -7, -8, 14, 8, flash ? "#fff" : "#4a4248"); px(g, -7, -8, 14, 1, "#8a8080");
    px(g, -2, -5, 4, 3, tele ? "#ffffff" : "#ff3a2a"); px(g, -5, 0, 2, 3, "#2a2224"); px(g, 3, 0, 2, 3, "#2a2224");
  }
}
export function drawWarden(g: G, t: number, flash: boolean, pose: string, phase2: boolean) {
  const steel = flash ? "#ffffff" : "#4a4450", dark = flash ? "#ffe" : "#2a2630", hi = "#8a8090";
  const bob = Math.sin(t * 2) * 1.5;
  const armUp = pose === "slam" ? -18 : 0;
  // legs
  px(g, -24, -26, 14, 26, dark); px(g, 10, -26, 14, 26, dark); px(g, -26, -6, 18, 6, steel); px(g, 8, -6, 18, 6, steel);
  px(g, -20, -22, 6, 3, "#ff6a1a"); px(g, 14, -22, 6, 3, "#ff6a1a");
  // torso
  px(g, -30, -66 + bob, 60, 42, steel); px(g, -30, -66 + bob, 60, 3, hi);
  for (let y = -60; y < -26; y += 6) px(g, -30, y + bob, 60, 1, "#00000030");
  // furnace core
  const pulse = (Math.sin(t * (phase2 ? 10 : 5)) + 1) / 2;
  px(g, -12, -56 + bob, 24, 20, "#1a0a08");
  px(g, -10, -54 + bob, 20, 16, pulse > 0.5 ? "#ff8a1a" : "#ff5a10"); px(g, -6, -50 + bob, 12, 8, "#ffe080");
  for (let k = 0; k < 4; k++) px(g, -10 + k * 6, -54 + bob, 2, 16, "#3a1a10");
  // smokestacks
  px(g, -28, -82 + bob, 8, 18, dark); px(g, 20, -82 + bob, 8, 18, dark); px(g, -29, -84 + bob, 10, 3, hi); px(g, 19, -84 + bob, 10, 3, hi);
  // head
  px(g, -10, -78 + bob, 20, 14, steel); px(g, -10, -78 + bob, 20, 2, hi);
  px(g, -7, -72 + bob, 14, 3, "#0a0a10"); px(g, -6 + ((t * 20) % 12), -72 + bob, 3, 3, phase2 ? "#ff3a2a" : "#5ff6ff");
  // arms
  px(g, -44, -64 + bob + armUp, 14, 30, steel); px(g, 30, -64 + bob + armUp, 14, 30, steel);
  px(g, -44, -64 + bob + armUp, 14, 3, hi); px(g, 30, -64 + bob + armUp, 14, 3, hi);
  px(g, -46, -36 + bob + armUp, 18, 12, dark); px(g, 28, -36 + bob + armUp, 18, 12, dark);
  if (pose === "slam" || pose === "barrage") { px(g, -42, -32 + bob + armUp, 12, 4, "#ffaa33"); px(g, 32, -32 + bob + armUp, 12, 4, "#ffaa33"); }
  // cannon
  px(g, 30, -74 + bob, 22, 7, dark); px(g, 50, -75 + bob, 4, 9, steel);
  if (pose === "beam") px(g, 52, -73 + bob, 4, 5, "#5ff6ff");
}