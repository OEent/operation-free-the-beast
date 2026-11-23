import { Sound, type Sfx } from "./audio";
import { Input } from "./input";
import { Director } from "./director";
import { ZONES, makeLayers, mk, px, rng, glow, drawRebel, drawBeast, drawSoldier, drawHound, drawFlyer, drawWarden, type Layers, type G } from "./art";
import { DIFFS, saveHiscore, topScore, type Settings } from "./storage";

export const W = 480, H = 270;
const GRAV = 980;
export const ARENA_START = 8560, ARENA_END = 9200;
const ZONE_X = [0, 3000, 6000];
const CHECKPOINTS = [40, 3000, 6000, 8400];
export type GameState = "title" | "playing" | "paused" | "gameover" | "victory";

interface Box { x: number; y: number; w: number; h: number }
interface Body extends Box { vx: number; vy: number; onGround: boolean }
interface Solid extends Box { oneWay: boolean; zone: number }
interface Crate extends Box { hp: number; alive: boolean }
type BKind = "bullet" | "ember" | "fire" | "wave" | "shell" | "orb" | "ebullet";
interface Bullet { x: number; y: number; vx: number; vy: number; r: number; dmg: number; owner: "p" | "e"; life: number; kind: BKind; hits?: Set<object>; target?: Enemy | null; homing?: number }
interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; s: number; grav: number; glow?: boolean }
interface Pickup { x: number; y: number; vy: number; kind: "hp" | "ammo" | "energy" | "gem"; t: number; alive: boolean }
type EType = "soldier" | "hound" | "flyer";
interface Enemy extends Body { type: EType; variant: number; hp: number; maxHp: number; face: number; state: string; st: number; cool: number; flash: number; alive: boolean; t: number; homeX: number; baseY: number; contact: number; score: number }
interface Light { x: number; y: number; r: number; c: string; a: number }
interface FText { x: number; y: number; s: string; t: number; c: string }
interface Spawn { x: number; type: EType; n: number; variant: number; done: boolean }

export interface EngineOpts { standalone?: boolean; settings: Settings; onState?: (s: GameState) => void; onExit?: () => void }

export class Engine {
  canvas: HTMLCanvasElement; ctx: G; buf: HTMLCanvasElement; g: G; fx: HTMLCanvasElement; fxg: G; tmp: HTMLCanvasElement; tg: G;
  input = new Input(); sound = new Sound(); director = new Director();
  settings: Settings; opts: EngineOpts;
  state: GameState = "title";
  layers: Layers[] = [];
  raf = 0; last = 0; acc = 0; time = 0;
  // world
  solids: Solid[] = []; crates: Crate[] = []; enemies: Enemy[] = []; bullets: Bullet[] = []; parts: Part[] = []; pickups: Pickup[] = [];
  spawns: Spawn[] = []; decor: { x: number; y: number; k: number }[] = []; signs: { x: number; y: number; s: string }[] = [];
  lights: Light[] = []; texts: FText[] = []; warn: { x: number; t: number }[] = [];
  camX = 0; camY = 0; shake = 0; chroma = 0; hitStop = 0; timeScale = 1; flashT = 0;
  // player
  p = this.freshPlayer();
  score = 0; combo = 0; comboT = 0; best = 0; lives = 3; cpIndex = 0; zone = 0; zoneBanner = 0; ambientT = 0;
  boss: (Body & { hp: number; maxHp: number; state: string; st: number; t: number; flash: number; phase2: boolean; next: number; beamY: number; face: number; alive: boolean; dyingT: number }) | null = null;
  bossLocked = false; endT = 0; ann: { s: string; t: number }[] = []; annCool: Record<string, number> = {}; firstKill = false;
  stats = { kills: 0, time: 0 };
  // All weapons are available from the start; performance unlocks their upgrades.
  weaponIndex = 0;
  weaponLevel = 1;
  get weaponName() { return ["RIFLE", "STORM SMG", "SHOTGUN", "RAILGUN", "INFERNO", "ROCKET"][this.weaponIndex] ?? "RIFLE"; }


  constructor(canvas: HTMLCanvasElement, opts: EngineOpts) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d")!; this.opts = opts; this.settings = opts.settings;
    [this.buf, this.g] = mk(W, H); [this.fx, this.fxg] = mk(W, H); [this.tmp, this.tg] = mk(W, H);
    for (let z = 0; z < 3; z++) this.layers.push(makeLayers(z));
    this.applySettings(opts.settings);
    this.buildLevel();
    this.best = topScore();
  }
  freshPlayer() {
    return { x: 40, y: 180, w: 12, h: 24, vx: 0, vy: 0, onGround: false, face: 1, hp: 100, energy: 0, ammo: 40, beast: false, t: 0, attackT: 0, combo: 0, comboWin: 0, shootCool: 0,
      dashT: 0, dashCool: 0, inv: 0, hurtT: 0, coyote: 0, jumpBuf: 0, specialCool: 0, deadT: 0, transT: 0, safeX: 40, safeY: 180, hitSet: new Set<object>(), shootFlash: 0 };
  }
  applySettings(s: Settings) {
    this.settings = s; this.director.enabled = s.adaptive; this.sound.setSfx(s.sfx); this.sound.setMusic(s.music);
  }
  start() {
    this.input.attach();
    window.addEventListener("resize", this.resize);
    window.addEventListener("pointerdown", this.unlock);
    window.addEventListener("keydown", this.unlock);
    this.resize();
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      let dt = (now - this.last) / 1000; this.last = now;
      if (dt > 0.25) dt = 0.25;
      this.acc += dt;
      const step = 1 / 60;
      let n = 0;
      while (this.acc >= step && n < 5) { this.input.poll(); this.update(step); this.input.endStep(); this.acc -= step; n++; }
      if (n === 5) this.acc = 0;
      this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }
  destroy() {
    cancelAnimationFrame(this.raf); this.input.detach(); this.sound.destroy();
    window.removeEventListener("resize", this.resize); window.removeEventListener("pointerdown", this.unlock); window.removeEventListener("keydown", this.unlock);
  }
  unlock = () => { this.sound.init(); };
  resize = () => {
    const parent = this.canvas.parentElement; if (!parent) return;
    const r = parent.getBoundingClientRect();
    const scale = Math.max(0.25, Math.min(r.width / W, r.height / H));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.style.width = `${Math.floor(W * scale)}px`; this.canvas.style.height = `${Math.floor(H * scale)}px`;
    this.canvas.width = Math.floor(W * scale * dpr); this.canvas.height = Math.floor(H * scale * dpr);
    this.ctx.imageSmoothingEnabled = false;
  };
  setState(s: GameState) { this.state = s; this.opts.onState?.(s); }
  sfx(n: Sfx) { this.sound.play(n); }

  // IRONFANG_FREE_BEAST_V1: automatic lock-on aiming with gentle homing.
  findTarget(x: number, y: number, face: number): Enemy | null {
    let chosen: Enemy | null = null, score = Infinity;
    for (const e of this.enemies) {
      if (!e.alive || e.hp <= 0) continue;
      const dx = e.x + e.w / 2 - x, dy = e.y + e.h / 2 - y;
      const dist = Math.hypot(dx, dy);
      if (dist > 265 || dist < 1 || (dx * face < 0 && dist > 55)) continue;
      const n = dist + Math.abs(dy) * .12 + (dx * face < 0 ? 65 : 0) - (e.type === "flyer" ? 12 : 0);
      if (n < score) { score = n; chosen = e; }
    }
    return chosen;
  }
  aimedVelocity(x: number, y: number, face: number, speed: number) {
    const target = this.findTarget(x, y, face);
    if (!target) return { vx: face * speed, vy: 0, target: null as Enemy | null };
    const dx = target.x + target.w / 2 - x, dy = target.y + target.h / 2 - y;
    const len = Math.max(1, Math.hypot(dx, dy));
    return { vx: dx / len * speed, vy: dy / len * speed, target };
  }
  /* ---------------- LEVEL ---------------- */
  zoneAt(x: number) { return x >= ZONE_X[2]! ? 2 : x >= ZONE_X[1]! ? 1 : 0; }
  buildLevel() {
    const r = rng(1337);
    this.solids = []; this.crates = []; this.spawns = []; this.decor = []; this.signs = [];
    let x = -60;
    const nearCp = (a: number, b: number) => CHECKPOINTS.some((c) => c > a - 80 && c < b + 80);
    while (x < ARENA_START - 40) {
      const w = Math.floor(r() * 240 + 200);
      const gy = x < 1500 ? 226 + Math.floor(r() * 2) * 8 : [214, 226, 238][Math.floor(r() * 3)]!;
      const z = this.zoneAt(x + w / 2);
      const segW = Math.min(w, ARENA_START - x);
      this.solids.push({ x, y: gy, w: segW, h: 300, oneWay: false, zone: z });
      if (segW > 240 && r() < 0.85) {
        const pw = 56 + Math.floor(r() * 50), pxx = x + 60 + Math.floor(r() * (segW - pw - 80));
        this.solids.push({ x: pxx, y: gy - 50, w: pw, h: 8, oneWay: true, zone: z });
        if (r() < 0.5) this.solids.push({ x: pxx + pw + 20, y: gy - 92, w: 48, h: 8, oneWay: true, zone: z });
        if (r() < 0.6) this.pickupSpawn(pxx + pw / 2, gy - 70, r() < 0.5 ? "gem" : "ammo");
      }
      const nc = r() < 0.7 ? 1 + Math.floor(r() * 3) : 0;
      const cx = x + 40 + Math.floor(r() * Math.max(10, segW - 120));
      for (let k = 0; k < nc; k++) this.crates.push({ x: cx + (k % 2) * 16, y: gy - 16 - (k === 2 ? 16 : 0), w: 16, h: 16, hp: 2, alive: true });
      for (let dx = 30; dx < segW - 20; dx += 90 + Math.floor(r() * 80)) this.decor.push({ x: x + dx, y: gy, k: z });
      x += segW;
      if (x > 1500 && x < ARENA_START - 100 && !nearCp(x, x + 60)) x += 34 + Math.floor(r() * 22);
    }
    // arena floor + walls
    this.solids.push({ x: ARENA_START - 40, y: 230, w: ARENA_END - ARENA_START + 80, h: 300, oneWay: false, zone: 2 });
    this.solids.push({ x: ARENA_START + 120, y: 182, w: 60, h: 8, oneWay: true, zone: 2 });
    this.solids.push({ x: ARENA_END - 180, y: 182, w: 60, h: 8, oneWay: true, zone: 2 });
    this.solids.push({ x: ARENA_END, y: -300, w: 40, h: 900, oneWay: false, zone: 2 });
    this.solids.push({ x: -100, y: -300, w: 40, h: 900, oneWay: false, zone: 0 });
    // spawns
    for (let sx = 560; sx < ARENA_START - 200; sx += 300 + Math.floor(r() * 140)) {
      const z = this.zoneAt(sx), q = r();
      let type: EType, variant = z;
      if (z === 0) type = q < 0.6 ? "soldier" : "flyer";
      else if (z === 1) type = q < 0.55 ? "hound" : q < 0.85 ? "flyer" : "soldier";
      else type = q < 0.45 ? "soldier" : q < 0.75 ? "flyer" : "hound";
      if (type === "soldier") variant = z === 2 ? 1 : 0;
      this.spawns.push({ x: sx, type, n: 1 + Math.floor(r() * 2) + (sx > 4000 ? 1 : 0), variant, done: false });
    }
    this.signs.push({ x: 90, y: 0, s: "A/D MOVE  SPACE JUMP" }, { x: 330, y: 0, s: "J MELEE x3 COMBO" }, { x: 620, y: 0, s: "K SHOOT  SHIFT DASH" },
      { x: 940, y: 0, s: "L SPECIAL (COSTS ENERGY)" }, { x: 1260, y: 0, s: "50% ENERGY: E = BEAST FORM" }, { x: 1560, y: 0, s: "BREAK CRATES FOR LOOT" });
    for (const s of this.signs) s.y = (this.groundY(s.x) ?? 226);
  }
  pickupSpawn(x: number, y: number, kind: Pickup["kind"]) { this.pickups.push({ x, y, vy: -120, kind, t: 0, alive: true }); }
  groundY(x: number): number | null {
    let best: number | null = null;
    for (const s of this.solids) if (!s.oneWay && s.h > 100 && x >= s.x && x <= s.x + s.w && s.y > -100) if (best === null || s.y < best) best = s.y;
    return best;
  }
  newGame() {
    this.buildLevel();
    this.enemies = []; this.bullets = []; this.parts = []; this.pickups = []; this.texts = []; this.warn = []; this.ann = [];
    for (const s of this.signs) s.y = this.groundY(s.x) ?? 226;
    this.p = this.freshPlayer(); this.score = 0; this.combo = 0; this.cpIndex = 0; this.boss = null; this.bossLocked = false; this.endT = 0;
    this.lives = DIFFS[this.settings.difficulty].lives; this.director.reset(); this.timeScale = 1; this.zone = 0; this.zoneBanner = 3; this.firstKill = false;
    this.stats = { kills: 0, time: 0 }; this.best = topScore();
    this.camX = 0; this.sound.mode = "level";
    this.setState("playing");
    this.say("Rise, rebel. The Citadel burns — carve a path!", "start", 0);
  }

  /* ---------------- ANNOUNCER ---------------- */
  say(s: string, key: string, cool = 8) {
    if (!this.settings.announcer) return;
    const c = this.annCool[key] ?? -99;
    if (this.time - c < cool) return;
    this.annCool[key] = this.time;
    this.ann.push({ s, t: 0 });
    if (this.ann.length > 2) this.ann.shift();
  }

  /* ---------------- PHYSICS ---------------- */
  colliders(): Box[] {
    const a = this.camX - 300, b = this.camX + W + 300;
    const out: (Solid | Crate)[] = [];
    for (const s of this.solids) if (s.x + s.w > a && s.x < b) out.push(s);
    for (const c of this.crates) if (c.alive && c.x > a && c.x < b) out.push(c);
    return out;
  }
  move(b: Body, dt: number, cols: Box[], stepUp = true): boolean {
    let wall = false;
    const wasGround = b.onGround;
    b.x += b.vx * dt;
    for (const s of cols) {
      if ((s as Solid).oneWay) continue;
      if (b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y) {
        if (stepUp && wasGround && s.y >= b.y + b.h - 13 && s.y < b.y + b.h) { b.y = s.y - b.h; continue; }
        if (b.vx > 0) b.x = s.x - b.w; else if (b.vx < 0) b.x = s.x + s.w;
        wall = true;
      }
    }
    const prevBottom = b.y + b.h;
    b.y += b.vy * dt; b.onGround = false;
    for (const s of cols) {
      if (!(b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y)) continue;
      if ((s as Solid).oneWay) { if (b.vy >= 0 && prevBottom <= s.y + 2) { b.y = s.y - b.h; b.vy = 0; b.onGround = true; } continue; }
      if (b.vy > 0) { b.y = s.y - b.h; b.vy = 0; b.onGround = true; } else if (b.vy < 0) { b.y = s.y + s.h; b.vy = 0; }
    }
    return wall;
  }
  hit(a: Box, b: Box) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  /* ---------------- FX ---------------- */
  burst(x: number, y: number, n: number, c: string, sp = 120, grav = 300, s = 2, glowy = false) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = Math.random() * sp; this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, life: 0.3 + Math.random() * 0.5, max: 0.8, c, s, grav, glow: glowy }); }
  }
  explode(x: number, y: number, size = 1) {
    this.burst(x, y, 18 * size, "#ffcc44", 160 * size, 100, 3, true); this.burst(x, y, 14 * size, "#ff5a1a", 120 * size, 50, 3, true); this.burst(x, y, 10 * size, "#3a3038", 60 * size, -30, 5);
    this.lights.push({ x, y, r: 70 * size, c: "#ff8a2a", a: 1 }); this.addShake(4 * size); this.sfx("explode");
  }
  addShake(n: number) { if (this.settings.shake) this.shake = Math.min(12, this.shake + n); }
  ftext(x: number, y: number, s: string, c = "#ffe080") { this.texts.push({ x, y, s, t: 0, c }); }

  /* ---------------- UPDATE ---------------- */
  update(dt: number) {
    this.time += dt;
    const I = this.input;
    if (this.state === "title") {
      this.camX = (this.camX + dt * 40) % (ARENA_START - W); this.updateParts(dt);
      if (this.opts.standalone && (I.pressed("start") || I.pressed("jump"))) { this.sound.init(); this.newGame(); }
      return;
    }
    if (this.state === "paused") {
      if (I.pressed("pause") || I.pressed("start")) { this.setState("playing"); this.sfx("select"); }
      else if (I.pressed("restart")) this.newGame();
      else if (I.pressed("menu")) this.toMenu();
      return;
    }
    if (this.state === "gameover" || this.state === "victory") {
      this.endT += dt; this.updateParts(dt);
      if (this.endT > 1 && (I.pressed("start") || I.pressed("restart") || I.pressed("jump"))) this.newGame();
      else if (this.endT > 1 && I.pressed("menu")) this.toMenu();
      return;
    }
    if (I.pressed("pause") || I.pressed("menu")) { this.setState("paused"); this.sfx("select"); return; }
    if (I.pressed("restart")) { this.newGame(); return; }
    if (this.hitStop > 0) { this.hitStop -= dt; return; }
    dt *= this.timeScale;
    this.stats.time += dt;
    this.shake *= 0.86; this.chroma *= 0.9; this.flashT = Math.max(0, this.flashT - dt);
    for (const a of this.ann) a.t += dt;
    this.ann = this.ann.filter((a) => a.t < 4.5);
    const swing = this.director.update(dt, this.p.hp / 100);
    if (swing > 0) this.say("Adaptive AI: the horde grows bolder. More foes incoming!", "dirup", 20);
    if (swing < 0) this.say("Adaptive AI: easing the pressure. Regroup, rebel.", "dirdn", 20);
    const cols = this.colliders();
    this.updatePlayer(dt, cols);
    this.updateEnemies(dt, cols);
    this.updateBoss(dt);
    this.updateBullets(dt, cols);
    this.updatePickups(dt, cols);
    this.updateParts(dt);
    this.updateWorld(dt);
    // camera
    const p = this.p;
    let tx = p.x + p.w / 2 - W * 0.4 + p.face * 24;
    let minX = 0, maxX = ARENA_END - W;
    if (this.bossLocked) minX = ARENA_START - 20;
    tx = Math.max(minX, Math.min(maxX, tx));
    this.camX += (tx - this.camX) * Math.min(1, dt * 6);
    const ty = Math.min(0, p.y - 110) * 0.5;
    this.camY += (ty - this.camY) * Math.min(1, dt * 4);
  }
  toMenu() { this.sound.mode = "title"; this.setState("title"); this.opts.onExit?.(); }

  updatePlayer(dt: number, cols: Box[]) {
    const p = this.p, I = this.input;
    if (I.pressed("nextWeapon") && !p.beast) {
      this.weaponIndex = (this.weaponIndex + 1) % 6;
      p.shootCool = 0; this.sfx("select");
      this.ftext(p.x, p.y - 18, this.weaponName, "#ffe39a");
    }
    // Earn permanent weapon upgrades every 20 kills this run.
    const earnedLevel = Math.min(3, 1 + Math.floor(this.stats.kills / 20));
    if (earnedLevel > this.weaponLevel) {
      this.weaponLevel = earnedLevel;
      this.say("ARSENAL UPGRADED! Weapons now hit harder.", "upgrade" + earnedLevel, 0);
      this.burst(p.x + p.w / 2, p.y + p.h / 2, 24, "#5ff6ff", 100, -30, 2, true);
    }
    p.t += dt; p.shootFlash -= dt;
    if (p.deadT > 0) {
      p.deadT -= dt;
      if (p.deadT <= 0) {
        if (this.lives <= 0) { this.finish(false); return; }
        const cx = CHECKPOINTS[this.cpIndex] ?? 40;
        const e = p.energy, a = p.ammo;
        this.p = this.freshPlayer(); this.p.x = cx + 10; this.p.y = (this.groundY(cx + 16) ?? 200) - 40; this.p.energy = Math.floor(e / 2); this.p.ammo = Math.max(30, a); this.p.inv = 2;
        this.bullets = this.bullets.filter((b) => b.owner === "p");
        this.say("Back from the ashes. Again!", "respawn", 0);
      }
      return;
    }
    p.inv -= dt; p.hurtT -= dt; p.attackT -= dt; p.comboWin -= dt; p.shootCool -= dt; p.dashCool -= dt; p.specialCool -= dt; p.transT -= dt;
    const left = I.down("left"), right = I.down("right");
    const spd = p.beast ? 150 : 128;
    if (p.dashT > 0) {
      p.dashT -= dt; p.vx = p.face * 330; p.vy = 0;
      if (Math.random() < 0.8) this.parts.push({ x: p.x + p.w / 2, y: p.y + p.h / 2 + (Math.random() - 0.5) * p.h, vx: -p.face * 30, vy: 0, life: 0.25, max: 0.25, c: p.beast ? "#ff6a1a" : "#5ff6ff", s: 3, grav: 0, glow: true });
    } else {
      const dir = (right ? 1 : 0) - (left ? 1 : 0);
      if (dir && p.hurtT <= 0) p.face = dir;
      let target = dir * spd;
      if (p.attackT > 0 && p.onGround) target *= 0.35;
      const acc = p.onGround ? 1600 : 1000;
      if (p.hurtT <= 0) p.vx += Math.max(-acc * dt, Math.min(acc * dt, target - p.vx));
      p.vy = Math.min(560, p.vy + GRAV * dt * (p.vy < 0 && !(I.down("jump") || I.down("up")) ? 2.2 : 1));
    }
    p.coyote = p.onGround ? 0.1 : p.coyote - dt;
    p.jumpBuf = I.pressed("jump") || I.pressed("up") ? 0.12 : p.jumpBuf - dt;
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = p.beast ? -350 : -335; p.jumpBuf = 0; p.coyote = 0; this.sfx("jump"); this.burst(p.x + p.w / 2, p.y + p.h, 5, "#8a8aa0", 40, 0, 2);
    }
    if (I.pressed("dash") && p.dashCool <= 0) { p.dashT = 0.16; p.dashCool = 0.55; p.inv = Math.max(p.inv, 0.2); this.sfx("dash"); }
    // melee
    if (I.pressed("melee") && p.attackT <= 0.05) {
      p.combo = p.comboWin > 0 ? (p.combo % 3) + 1 : 1;
      p.attackT = p.beast ? 0.26 : 0.22; p.comboWin = 0.5; p.hitSet = new Set(); this.sfx("slash");
      if (p.combo === 3) p.vx += p.face * 120;
    }
    if (p.attackT > 0.08) {
      const big = p.combo === 3;
      const hw = p.beast ? 36 : big ? 32 : 26, hh = p.beast ? 30 : 22;
      const hb: Box = { x: p.face > 0 ? p.x + p.w - 4 : p.x - hw + 4, y: p.y + p.h - hh - 2, w: hw, h: hh };
      const dmg = (p.beast ? 3 : 1) * (big ? 2 : 1);
      for (const e of this.enemies) if (e.alive && !p.hitSet.has(e) && this.hit(hb, e)) { p.hitSet.add(e); this.hurtEnemy(e, dmg, p.face, true); }
      const bs = this.boss;
      if (bs && bs.alive && bs.state !== "intro" && !p.hitSet.has(bs) && this.hit(hb, bs)) { p.hitSet.add(bs); this.hurtBoss(dmg * 1.2); }
      for (const c of this.crates) if (c.alive && !p.hitSet.has(c) && this.hit(hb, c)) { p.hitSet.add(c); this.hurtCrate(c, 2); }
      for (const b of this.bullets) if (b.owner === "e" && b.kind !== "wave" && b.kind !== "shell" && this.hit(hb, { x: b.x - 3, y: b.y - 3, w: 6, h: 6 })) {
        b.owner = "p"; b.vx = p.face * 320; b.vy = 0; b.dmg = 2; this.burst(b.x, b.y, 6, "#ffffff", 80, 0, 1, true); this.ftext(b.x, b.y - 6, "PARRY!", "#5ff6ff");
      }
    }
    // shoot
    if (I.down("shoot") && p.shootCool <= 0) {
      const mx = p.face > 0 ? p.x + p.w + 6 : p.x - 6, my = p.y + (p.beast ? 8 : 8);
      if (p.beast) {
        p.shootCool = 0.22;
        const aim = this.aimedVelocity(mx, my, p.face, 340);
        this.bullets.push({ x: mx, y: my, vx: aim.vx, vy: aim.vy, target: aim.target, homing: 8, r: 8, dmg: 7, owner: "p", life: 1.1, kind: "fire" });
        this.burst(mx, my, 8, "#ff8a2a", 130, 0, 3, true); this.sfx("ember");
      } else if (p.ammo > 0) {
        const weapon = this.weaponIndex, level = this.weaponLevel;
        const rates = [0.16, 0.07, 0.55, 0.8, 0.06, 0.65];
        const costs = [1, 1, 3, 4, 1, 5];
        const speeds = [420, 460, 370, 850, 250, 280];
        const damages = [2, 1.2, 2.3, 9, 0.8, 8];
        const count = weapon === 2 ? 5 + level * 2 : 1;
        const cost = Math.min(p.ammo, costs[weapon] ?? 1);
        p.shootCool = (rates[weapon] ?? 0.16) * (1 - (level - 1) * 0.09);
        p.ammo -= cost; p.shootFlash = 0.08;
        for (let k = 0; k < count; k++) {
          const aim = this.aimedVelocity(mx, my, p.face, speeds[weapon] ?? 420);
          const spread = weapon === 2 ? (k - (count - 1) / 2) * 0.10 : weapon === 1 ? (Math.random() - 0.5) * 0.06 : weapon === 4 ? (Math.random() - 0.5) * 0.17 : 0;
          const cs = Math.cos(spread), sn = Math.sin(spread);
          const vx = aim.vx * cs - aim.vy * sn, vy = aim.vx * sn + aim.vy * cs;
          const kind: BKind = weapon === 4 ? "fire" : weapon === 5 ? "ember" : weapon === 3 ? "bullet" : "bullet";
          const piercing = weapon === 3 ? new Set<object>() : undefined;
          this.bullets.push({ x: mx, y: my, vx, vy, target: weapon === 2 ? null : aim.target, homing: weapon === 5 ? 11 : weapon === 3 ? 0 : 6,
            r: weapon === 5 ? 6 : weapon === 4 ? 5 : weapon === 3 ? 3 : 2.5, dmg: (damages[weapon] ?? 2) * (1 + (level - 1) * .4),
            owner: "p", life: weapon === 4 ? 0.24 : weapon === 3 ? 0.8 : 1.05, kind, ...(piercing ? { hits: piercing } : {}) });
        }
        if (weapon === 5) this.addShake(3);
        this.lights.push({ x: mx, y: my, r: weapon === 5 ? 75 : 40, c: weapon === 4 || weapon === 5 ? "#ff6a1a" : "#ffcc66", a: 1 }); this.sfx(weapon === 4 || weapon === 5 ? "ember" : "shoot");
        this.parts.push({ x: p.x + p.w / 2, y: my, vx: -p.face * 40, vy: -80, life: 0.5, max: 0.5, c: "#e0b040", s: 1, grav: 600 });
      } else if (I.pressed("shoot")) { this.sfx("click"); this.ftext(p.x, p.y - 8, "NO AMMO", "#ff5a5a"); this.say("Out of rounds! Melee, or smash crates for ammo.", "noammo", 15); }
    }
    // special
    if (I.pressed("special") && p.specialCool <= 0) {
      if (p.beast && p.energy >= 20) {
        p.energy -= 20; p.specialCool = 0.6;
        const gy = p.y + p.h;
        for (const d of [-1, 1]) this.bullets.push({ x: p.x + p.w / 2, y: gy - 8, vx: d * 300, vy: 0, r: 12, dmg: 8, owner: "p", life: 1.15, kind: "wave", hits: new Set() });
        for (const e of this.enemies) if (e.alive && Math.abs(e.x - p.x) < 110 && Math.abs(e.y - p.y) < 75) this.hurtEnemy(e, 8, Math.sign(e.x - p.x) || 1, false);
        this.addShake(9); this.hitStop = 0.08; this.chroma = 1; this.flashT = 0.12; this.sfx("shock"); this.burst(p.x + p.w / 2, gy, 30, "#ff8a2a", 200, 200, 3, true);
      } else if (!p.beast && p.energy >= 30) {
        p.energy -= 30; p.specialCool = 0.5;
        for (let k = -2; k <= 2; k++) this.bullets.push({ x: p.x + p.w / 2 + p.face * 8, y: p.y + 8, vx: p.face * 280 * Math.cos(k * 0.18), vy: 280 * Math.sin(k * 0.18), r: 4, dmg: 3, owner: "p", life: 0.7, kind: "ember" });
        this.lights.push({ x: p.x + p.face * 14, y: p.y + 8, r: 70, c: "#ff8a2a", a: 1 }); this.addShake(3); this.sfx("ember");
      } else if (p.energy < 20) { this.sfx("click"); }
    }
    // transform
    if (I.pressed("transform")) {
      if (!p.beast && p.energy >= 50) {
        p.beast = true; p.transT = 0.6; p.inv = 0.8; const bottom = p.y + p.h; p.w = 32; p.h = 43; p.y = bottom - p.h; p.x -= 10; p.hp = Math.min(100, p.hp + 20);
        this.addShake(8); this.chroma = 1.2; this.flashT = 0.2; this.hitStop = 0.12; this.sfx("transform"); this.sfx("roar");
        this.burst(p.x + p.w / 2, p.y + p.h / 2, 50, "#ff6a1a", 220, -60, 3, true);
        this.say("BEASTFIRE UNLEASHED! Claws (J), fireballs (K), shockwave (L)!", "beast", 6);
      } else if (p.beast) this.revert();
      else { this.sfx("click"); this.ftext(p.x - 10, p.y - 8, "NEED 50% ENERGY", "#5ff6ff"); }
    }
    if (p.beast) { p.energy -= 1.8 * dt; if (Math.random() < 0.5) this.parts.push({ x: p.x + Math.random() * p.w, y: p.y + Math.random() * 8, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 40, life: 0.5, max: 0.5, c: Math.random() < 0.5 ? "#ff6a1a" : "#ffcc33", s: 2, grav: -40, glow: true }); if (p.energy <= 0) { p.energy = 0; this.revert(); } }
    p.energy = Math.min(100, p.energy);
    const landing = !p.onGround;
    this.move(p, dt, cols);
    if (landing && p.onGround && p.vy === 0) this.burst(p.x + p.w / 2, p.y + p.h, 3, "#6a6a80", 30, 0, 1);
    if (p.onGround && p.dashT <= 0) {
      const gy = this.groundY(p.x + p.w / 2);
      if (gy !== null && Math.abs(gy - (p.y + p.h)) < 2) { p.safeX = p.x; p.safeY = p.y; }
    }
    if (this.bossLocked && p.x < ARENA_START - 20) { p.x = ARENA_START - 20; p.vx = 0; }
    if (p.y > H + 60) {
      p.x = p.safeX - p.face * 10; p.y = p.safeY - 10; p.vx = 0; p.vy = 0; p.inv = 0;
      this.damagePlayer(20, p.x, true); this.say("Mind the abyss!", "pit", 12);
    }
    if (p.hp > 0 && p.hp < 30) this.say("Health critical! Find a red heart or fall back.", "lowhp", 20);
    if (!p.beast && p.energy >= 50) this.say("Energy charged — press E to become the fire-wolf!", "eready", 25);
  }
  revert() {
    const p = this.p; if (!p.beast) return;
    p.beast = false; const bottom = p.y + p.h; p.w = 12; p.h = 24; p.y = bottom - p.h; p.x += 4; this.sfx("revert"); this.burst(p.x + 6, p.y + 12, 20, "#5ff6ff", 100, 0, 2, true);
  }
  damagePlayer(dmg: number, srcX: number, force = false) {
    const p = this.p;
    if (p.deadT > 0 || this.state !== "playing") return;
    if (!force && (p.inv > 0 || p.dashT > 0 || p.transT > 0)) return;
    dmg *= DIFFS[this.settings.difficulty].enemyDmg * (p.beast ? 0.5 : 1);
    p.hp -= dmg; p.inv = 1; p.hurtT = 0.22; this.director.onDamage(dmg);
    const d = p.x + p.w / 2 < srcX ? -1 : 1; p.vx = d * 170; p.vy = -170;
    this.addShake(5); this.chroma = 0.8; this.hitStop = 0.06; this.sfx("hurt"); this.burst(p.x + p.w / 2, p.y + p.h / 2, 10, "#ff3a3a", 120, 300, 2);
    this.combo = 0;
    if (p.hp <= 0) {
      p.hp = 0; this.lives--; p.deadT = 1.8; p.beast = false; p.w = 12; p.h = 24;
      this.explode(p.x + 6, p.y + 12, 1.3); this.timeScale = 1;
      this.say(this.lives > 0 ? "You fell! Returning to the last banner..." : "The rebellion falters...", "die", 0);
    }
  }
  addCombo(pts: number) {
    this.combo++; this.comboT = 2.5;
    const mult = Math.min(4, 1 + Math.floor(this.combo / 5) * 0.5);
    this.score += Math.round(pts * mult * DIFFS[this.settings.difficulty].score);
    if (this.combo === 10) this.say("10-hit combo! Score multiplier rising!", "c10", 10);
    if (this.combo === 25) this.say("UNSTOPPABLE! 25 hits!", "c25", 10);
  }
  hurtEnemy(e: Enemy, dmg: number, dir: number, melee: boolean) {
    e.hp -= dmg; e.flash = 0.1; e.vx = dir * (melee ? 140 : 60); if (e.type !== "flyer") e.vy = Math.min(e.vy, -80);
    this.p.energy = Math.min(100, this.p.energy + (melee ? 5 : 2.5));
    this.burst(e.x + e.w / 2, e.y + e.h / 2, 6, melee ? "#ffffff" : "#ffcc66", 100, 200, 1, true);
    if (melee) { this.hitStop = 0.05; this.addShake(2); }
    this.sfx("hit"); this.addCombo(10);
    this.ftext(e.x + e.w / 2, e.y - 4, `${Math.round(dmg)}`, melee ? "#ffffff" : "#ffcc66");
    if (e.hp <= 0) {
      e.alive = false; this.stats.kills++; this.director.onKill(); this.addCombo(e.score); this.p.energy = Math.min(100, this.p.energy + 8);
      this.explode(e.x + e.w / 2, e.y + e.h / 2, e.type === "hound" ? 0.9 : 0.7); this.sfx("kill");
      const mercy = this.director.intensity < 0.85 ? 0.25 : 0;
      if (Math.random() < 0.3 + mercy) { const q = Math.random(); this.pickupSpawn(e.x + e.w / 2, e.y, q < 0.3 + mercy ? "hp" : q < 0.6 ? "ammo" : q < 0.8 ? "energy" : "gem"); }
      if (!this.firstKill) { this.firstKill = true; this.say("First blood! Hits charge your ENERGY meter.", "fk", 0); }
    }
  }
  hurtCrate(c: Crate, dmg: number) {
    c.hp -= dmg; this.sfx("crate"); this.burst(c.x + 8, c.y + 8, 6, "#8a5a2a", 80, 300, 2);
    if (c.hp <= 0) {
      c.alive = false; this.score += 50; this.burst(c.x + 8, c.y + 8, 16, "#b07a3a", 150, 400, 2); this.addShake(2);
      const q = Math.random(); this.pickupSpawn(c.x + 8, c.y, q < 0.3 ? "hp" : q < 0.65 ? "ammo" : q < 0.85 ? "energy" : "gem");
    }
  }
  spawnEnemy(type: EType, x: number, variant: number) {
    const dh = DIFFS[this.settings.difficulty].enemyHp;
    const gy = this.groundY(x) ?? 226;
    const base = { vx: 0, vy: 0, onGround: false, face: -1, state: "idle", st: 0, cool: 1 + Math.random(), flash: 0, alive: true, t: Math.random() * 10, homeX: x, variant };
    if (type === "soldier") { const hp = Math.round((variant ? 5 : 3) * dh); this.enemies.push({ ...base, type, x, y: gy - 24, w: 12, h: 24, hp, maxHp: hp, baseY: gy, contact: 10, score: variant ? 150 : 100 }); }
    else if (type === "hound") { const hp = Math.round(4 * dh); this.enemies.push({ ...base, type, x, y: gy - 16, w: 22, h: 16, hp, maxHp: hp, baseY: gy, contact: 14, score: 140 }); }
    else { const hp = Math.round(2 * dh); const y = gy - 80 - Math.random() * 40; this.enemies.push({ ...base, type, x, y, w: 14, h: 12, hp, maxHp: hp, baseY: y, contact: 10, score: 120, variant: Math.min(2, variant) }); }
  }
  updateEnemies(dt: number, cols: Box[]) {
    const p = this.p, smart = this.settings.smartAI, ag = this.director.aggression;
    for (const s of this.spawns) if (!s.done && p.x > s.x - 230) {
      s.done = true; const n = this.director.count(s.n);
      for (let i = 0; i < n; i++) { let x = s.x + i * 30; if (this.groundY(x) === null) x += 50; this.spawnEnemy(s.type, x, s.variant); }
    }
    this.ambientT += dt;
    const alive = this.enemies.filter((e) => e.alive).length;
    if (this.director.enabled && this.director.intensity > 1.15 && alive < 2 && this.ambientT > 7 && !this.bossLocked) { this.ambientT = 0; this.spawnEnemy("flyer", this.camX + W + 20, this.zone); }
    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.x < this.camX - 300 || e.x > this.camX + W + 300) continue;
      e.t += dt; e.flash -= dt; e.st -= dt; e.cool -= dt * ag;
      const ex = e.x + e.w / 2, dx = pcx - ex, dy = pcy - (e.y + e.h / 2), adx = Math.abs(dx);
      const sees = adx < 250 && Math.abs(dy) < 120 && p.deadT <= 0;
      if (e.type === "soldier") {
        let want = 0;
        if (e.state === "aim") {
          e.vx *= 0.8;
          if (e.st <= 0) {
            const sp = 190 + ag * 30;
            const vy = smart ? Math.max(-80, Math.min(80, (dy / Math.max(40, adx)) * sp)) : 0;
            this.bullets.push({ x: ex + e.face * 10, y: e.y + 8, vx: e.face * sp, vy, r: 2, dmg: e.variant ? 12 : 9, owner: "e", life: 2, kind: "ebullet" });
            this.lights.push({ x: ex + e.face * 12, y: e.y + 8, r: 30, c: "#ff5a3a", a: 1 }); this.sfx("shoot");
            e.state = "idle"; e.cool = (e.variant ? 1.3 : 1.8) + Math.random() * 0.6;
            if (e.variant && Math.random() < 0.5) e.cool = 0.25;
          }
        } else if (sees) {
          e.face = Math.sign(dx) || 1;
          if (smart) { if (adx < 80) want = -e.face; else if (adx > 170) want = e.face; else want = Math.sin(e.t * 1.3) > 0.6 ? e.face : 0; }
          else if (adx > 110) want = e.face;
          if (e.cool <= 0) { e.state = "aim"; e.st = 0.38 / Math.sqrt(ag); }
          if (smart && e.onGround) for (const b of this.bullets) if (b.owner === "p" && Math.abs(b.x - ex) < 50 && Math.sign(b.vx) === -Math.sign(b.x - ex) && Math.random() < 0.04) { e.vy = -260; break; }
        } else { want = Math.sin(e.t * 0.7) > 0 ? 1 : -1; if (Math.abs(e.x - e.homeX) > 50) want = Math.sign(e.homeX - e.x); e.face = want || e.face; }
        if (want && e.onGround) { const fy = this.groundY(ex + want * 12); if (fy === null || Math.abs(fy - (e.y + e.h)) > 14) want = 0; }
        e.vx += (want * 55 * (smart ? 1.2 : 1) - e.vx) * Math.min(1, dt * 6);
      } else if (e.type === "hound") {
        if (e.state === "crouch") { e.vx *= 0.8; if (e.st <= 0) { e.state = "leap"; const lead = smart ? p.vx * 0.35 : 0; e.vx = Math.max(-280, Math.min(280, (dx + lead) * 2.2)); e.vy = -250; this.sfx("roar"); } }
        else if (e.state === "leap") { if (e.onGround && e.vy >= 0) { e.state = smart ? "retreat" : "idle"; e.st = 0.6; e.cool = 1.4; } }
        else if (e.state === "retreat") { e.vx = -e.face * 90; if (e.st <= 0) e.state = "idle"; }
        else if (sees) {
          e.face = Math.sign(dx) || 1;
          const sp = (smart ? 135 : 110) * Math.sqrt(ag);
          e.vx += (e.face * sp - e.vx) * Math.min(1, dt * 4);
          if (adx < 100 && e.onGround && e.cool <= 0) { e.state = "crouch"; e.st = 0.42; e.vx = 0; }
        } else { e.vx = Math.sin(e.t * 0.8) * 40; e.face = Math.sign(e.vx) || 1; }
        if (e.state !== "leap" && e.onGround) { const fy = this.groundY(ex + e.face * 14); if (fy === null || Math.abs(fy - (e.y + e.h)) > 14) e.vx = 0; }
      } else {
        // flyer
        if (e.state === "tele") { e.vx *= 0.9; e.vy *= 0.9; if (e.st <= 0) { e.state = "dive"; e.st = 0.7; const d = Math.hypot(dx, dy) || 1; e.vx = (dx / d) * 210; e.vy = (dy / d) * 210; } }
        else if (e.state === "dive") { if (e.st <= 0) { e.state = "idle"; e.cool = 1.6; } }
        else {
          const ox = smart ? -Math.sign(p.vx || p.face) * 70 : 0;
          const tx = pcx + ox + Math.sin(e.t * 1.5) * 50, ty = p.y - 60 + Math.sin(e.t * 2.3) * 14;
          if (sees || this.bossLocked) { e.vx += ((tx - ex) * 1.6 - e.vx) * dt * 2; e.vy += ((ty - e.y) * 1.6 - e.vy) * dt * 2; e.face = Math.sign(dx) || 1; }
          else { e.vx = Math.sin(e.t) * 30; e.vy = Math.cos(e.t * 1.7) * 20; }
          if (sees && e.cool <= 0) {
            if (e.variant === 2) { this.bullets.push({ x: ex, y: e.y + e.h, vx: dx * 0.6, vy: 120, r: 3, dmg: 10, owner: "e", life: 2, kind: "orb" }); e.cool = 1.6; this.sfx("ember"); }
            else { e.state = "tele"; e.st = 0.45; }
          }
        }
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (this.hit(p, e) && p.deadT <= 0) this.damagePlayer(e.contact, ex);
        continue;
      }
      e.vy = Math.min(560, e.vy + GRAV * dt);
      this.move(e, dt, cols);
      if (e.y > H + 80) e.alive = false;
      if (this.hit(p, e) && p.deadT <= 0) this.damagePlayer(e.state === "leap" ? e.contact * 1.4 : e.contact, ex);
    }
    this.enemies = this.enemies.filter((e) => e.alive);
  }
  hurtBoss(dmg: number) {
    const b = this.boss; if (!b || !b.alive || b.state === "dying") return;
    b.hp -= dmg; b.flash = 0.08; this.p.energy = Math.min(100, this.p.energy + 1.5); this.addCombo(15); this.sfx("hit");
    this.burst(b.x + b.w / 2 + (Math.random() - 0.5) * 30, b.y + 30, 5, "#ffcc66", 120, 200, 2, true);
    if (!b.phase2 && b.hp < b.maxHp / 2) { b.phase2 = true; this.say("The Warden's furnace overheats — PHASE TWO!", "bp2", 0); this.addShake(10); this.sfx("roar"); this.flashT = 0.2; }
    if (b.hp <= 0) {
      b.hp = 0; b.state = "dying"; b.dyingT = 3.4; this.timeScale = 0.4; this.say("THE IRON WARDEN FALLS!", "bdie", 0);
      this.bullets = this.bullets.filter((x) => x.owner === "p"); this.enemies.forEach((e) => (e.alive = false));
    }
  }
  updateBoss(dt: number) {
    const p = this.p;
    if (!this.boss && p.x > ARENA_START + 80) {
      const hp = Math.round(140 * DIFFS[this.settings.difficulty].enemyHp);
      this.boss = { x: ARENA_START + 420, y: -120, w: 60, h: 80, vx: 0, vy: 0, onGround: false, hp, maxHp: hp, state: "intro", st: 2.6, t: 0, flash: 0, phase2: false, next: 0, beamY: 0, face: -1, alive: true, dyingT: 0 };
      this.bossLocked = true; this.sound.mode = "boss"; this.sfx("roar"); this.say("WARNING: The IRON WARDEN awakens! Watch for red warnings!", "bin", 0);
    }
    const b = this.boss; if (!b || !b.alive) return;
    const floor = 230;
    b.t += dt; b.st -= dt; b.flash -= dt;
    const bcx = b.x + b.w / 2, pcx = p.x + p.w / 2, sp = b.phase2 ? 1.35 : 1;
    b.face = pcx < bcx ? -1 : 1;
    if (b.state === "intro") {
      b.y = Math.min(floor - b.h, b.y + 220 * dt);
      if (b.y >= floor - b.h && b.vy === 0) { b.vy = 1; this.addShake(12); this.explode(bcx, floor, 1.5); this.chroma = 1; }
      if (b.st <= 0) { b.state = "idle"; b.st = 1; }
      return;
    }
    if (b.state === "dying") {
      b.dyingT -= dt / Math.max(0.4, this.timeScale);
      if (Math.random() < 0.25) this.explode(b.x + Math.random() * b.w, b.y + Math.random() * b.h, 0.8 + Math.random());
      if (b.dyingT < 2) this.timeScale = 1;
      if (b.dyingT <= 0) { b.alive = false; this.explode(bcx, b.y + 40, 3); this.flashT = 0.5; this.finish(true); }
      return;
    }
    if (b.state === "idle") {
      const target = pcx + (pcx < ARENA_START + 320 ? 140 : -140);
      b.x += Math.max(-50, Math.min(50, target - bcx)) * dt * sp;
      b.x = Math.max(ARENA_START + 10, Math.min(ARENA_END - b.w - 10, b.x));
      if (b.st <= 0) {
        const opts = b.phase2 ? ["barrage", "slam", "beam", "summon", "slam", "beam"] : ["barrage", "slam", "beam"];
        b.state = opts[b.next % opts.length]!; b.next++;
        if (b.state === "barrage") { b.st = 1.0 / sp; this.warn = []; const n = b.phase2 ? 7 : 5; for (let i = 0; i < n; i++) this.warn.push({ x: pcx + (i - (n - 1) / 2) * 44 + (Math.random() - 0.5) * 12, t: 0 }); this.sfx("warn"); }
        else if (b.state === "slam") { b.st = 0.75 / sp; this.sfx("warn"); }
        else if (b.state === "beam") { b.st = 1.0 / sp; b.beamY = Math.random() < 0.5 ? floor - 8 : floor - 36; this.sfx("warn"); this.say(b.beamY > floor - 20 ? "Low beam — JUMP!" : "High beam — stay grounded!", "beamtip", 14); }
        else { b.st = 0.6; }
      }
    } else if (b.state === "barrage") {
      if (b.st <= 0) { for (const w of this.warn) this.bullets.push({ x: w.x, y: -20 - Math.random() * 30, vx: 0, vy: 300, r: 5, dmg: 16, owner: "e", life: 3, kind: "shell" }); this.warn = []; b.state = "idle"; b.st = 1.4 / sp; this.sfx("explode"); }
    } else if (b.state === "slam") {
      if (b.st <= 0) {
        for (const d of [-1, 1]) this.bullets.push({ x: bcx + d * 30, y: floor - 7, vx: d * 210 * sp, vy: 0, r: 7, dmg: 18, owner: "e", life: 3, kind: "wave" });
        this.addShake(10); this.explode(bcx, floor, 1); this.sfx("shock");
        if (b.phase2 && b.next % 2 === 0) { b.state = "slam"; b.st = 0.5; b.next++; } else { b.state = "idle"; b.st = 1.3 / sp; }
      }
    } else if (b.state === "beam") {
      if (b.st <= 0 && b.st > -0.7) {
        if (b.st + dt > 0) this.sfx("beam");
        const band: Box = { x: b.face > 0 ? bcx : ARENA_START - 40, y: b.beamY - 4, w: b.face > 0 ? 900 : bcx - ARENA_START + 40, h: 8 };
        if (this.hit(p, band)) this.damagePlayer(20, bcx);
        this.lights.push({ x: bcx + b.face * 60, y: b.beamY, r: 90, c: "#5ff6ff", a: 0.8 }); this.addShake(1);
      } else if (b.st <= -0.7) { b.state = "idle"; b.st = 1.2 / sp; }
    } else if (b.state === "summon") {
      if (b.st <= 0) { this.spawnEnemy("flyer", ARENA_START + 60, 2); this.spawnEnemy("flyer", ARENA_END - 60, 2); b.state = "idle"; b.st = 1.2; this.say("Drones deployed!", "drones", 10); }
    }
    if (this.hit(p, b)) this.damagePlayer(20, bcx);
    for (const w of this.warn) w.t += dt;
  }
  updateBullets(dt: number, cols: Box[]) {
    const p = this.p;
    for (const b of this.bullets) {
      if (b.owner === "p" && b.homing && b.target?.alive) {
        const target = b.target;
        const dx = target.x + target.w / 2 - b.x, dy = target.y + target.h / 2 - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          const speed = Math.max(50, Math.hypot(b.vx, b.vy)), blend = Math.min(1, dt * b.homing);
          b.vx = b.vx * (1 - blend) + dx / dist * speed * blend;
          b.vy = b.vy * (1 - blend) + dy / dist * speed * blend;
        }
      }
      b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.kind === "orb") b.vy += 200 * dt;
      if (b.kind === "fire" || b.kind === "ember") { if (Math.random() < 0.7) this.parts.push({ x: b.x, y: b.y, vx: 0, vy: -20, life: 0.25, max: 0.25, c: "#ff8a2a", s: 2, grav: -50, glow: true }); }
      this.lights.push({ x: b.x, y: b.y, r: b.kind === "bullet" ? 14 : b.kind === "wave" ? 40 : 22, c: b.owner === "p" ? (b.kind === "bullet" ? "#ffcc66" : "#ff8a2a") : b.kind === "orb" ? "#ff3a2a" : "#ff6a3a", a: 0.6 });
      const bb: Box = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
      if (b.kind === "wave") {
        const gy = this.groundY(b.x);
        if (gy === null || gy < b.y) { b.life = 0; continue; }
        if (Math.random() < 0.8) this.parts.push({ x: b.x, y: b.y + 4, vx: (Math.random() - 0.5) * 40, vy: -100 - Math.random() * 80, life: 0.4, max: 0.4, c: b.owner === "p" ? "#ff8a2a" : "#ffcc44", s: 3, grav: 300, glow: true });
      } else if (b.kind === "shell") {
        const gy = this.groundY(b.x) ?? 230;
        if (b.y >= gy) { b.life = 0; this.explode(b.x, gy - 4, 0.8); if (Math.abs(p.x + p.w / 2 - b.x) < 22 && Math.abs(p.y + p.h - gy) < 30) this.damagePlayer(b.dmg, b.x); continue; }
      } else {
        for (const s of cols) if (!(s as Solid).oneWay && this.hit(bb, s)) {
          const c = s as Crate; if (b.owner === "p" && "hp" in c) this.hurtCrate(c, b.dmg);
          b.life = 0; this.burst(b.x, b.y, 4, "#ffcc66", 60, 200, 1); break;
        }
      }
      if (b.life <= 0) continue;
      if (b.owner === "p") {
        for (const e of this.enemies) if (e.alive && this.hit(bb, e) && !b.hits?.has(e)) {
          this.hurtEnemy(e, b.dmg, Math.sign(b.vx) || 1, false);
          if (b.hits) b.hits.add(e); else { b.life = 0; break; }
        }
        const bs = this.boss;
        if (b.life > 0 && bs && bs.alive && bs.state !== "intro" && this.hit(bb, bs) && !b.hits?.has(bs)) { this.hurtBoss(b.dmg); if (b.hits) b.hits.add(bs); else b.life = 0; }
      } else if (this.hit(bb, p)) {
        this.damagePlayer(b.dmg, b.x - b.vx); if (b.kind !== "wave") b.life = 0;
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0 && b.x > this.camX - 200 && b.x < this.camX + W + 200);
  }
  updatePickups(dt: number, cols: Box[]) {
    const p = this.p;
    for (const k of this.pickups) {
      if (!k.alive) continue;
      k.t += dt;
      const body: Body = { x: k.x - 5, y: k.y - 5, w: 10, h: 10, vx: 0, vy: k.vy, onGround: false };
      const d = Math.hypot(p.x + p.w / 2 - k.x, p.y + p.h / 2 - k.y);
      if (d < 40 && p.deadT <= 0) { k.x += (p.x + p.w / 2 - k.x) * dt * 8; k.y += (p.y + p.h / 2 - k.y) * dt * 8; }
      else { body.vy = Math.min(300, k.vy + GRAV * dt); this.move(body, dt, cols, false); k.x = body.x + 5; k.y = body.y + 5; k.vy = body.vy; }
      if (d < 12 && p.deadT <= 0) {
        k.alive = false; this.sfx("pickup");
        const map = { hp: ["+25 HP", "#ff5a6a"], ammo: ["+20 AMMO", "#ffcc66"], energy: ["+25 ENERGY", "#5ff6ff"], gem: ["+250", "#ffe080"] } as const;
        if (k.kind === "hp") p.hp = Math.min(100, p.hp + 25); else if (k.kind === "ammo") p.ammo = Math.min(99, p.ammo + 20); else if (k.kind === "energy") p.energy = Math.min(100, p.energy + 25); else this.score += 250;
        this.ftext(k.x, k.y - 8, map[k.kind][0], map[k.kind][1]); this.burst(k.x, k.y, 8, map[k.kind][1], 60, 0, 1, true);
      }
    }
    this.pickups = this.pickups.filter((k) => k.alive);
  }
  updateParts(dt: number) {
    for (const q of this.parts) { q.life -= dt; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.98; }
    this.parts = this.parts.filter((q) => q.life > 0);
    if (this.parts.length > 900) this.parts.splice(0, this.parts.length - 900);
    for (const t of this.texts) { t.t += dt; t.y -= 20 * dt; }
    this.texts = this.texts.filter((t) => t.t < 0.9);
  }
  updateWorld(dt: number) {
    const p = this.p;
    this.comboT -= dt; if (this.comboT <= 0) this.combo = 0;
    const z = this.zoneAt(p.x);
    if (z !== this.zone) { this.zone = z; this.zoneBanner = 3.5; this.say(z === 1 ? "The Cursed Wood: hounds hunt in packs. Watch the leaps!" : "The War-Machine Fortress! Snipers and drones ahead.", "z" + z, 0); }
    this.zoneBanner -= dt;
    for (let i = this.cpIndex + 1; i < CHECKPOINTS.length; i++) {
      if (p.x > CHECKPOINTS[i]!) { this.cpIndex = i; this.sfx("checkpoint"); p.hp = Math.min(100, p.hp + 20); this.ftext(p.x, p.y - 12, "CHECKPOINT", "#5ff6ff"); this.say("Checkpoint banner raised. Health restored a little.", "cp" + i, 0); this.burst(CHECKPOINTS[i]!, (this.groundY(CHECKPOINTS[i]!) ?? 226) - 30, 30, "#5ff6ff", 120, 100, 2, true); }
    }
  }
  finish(won: boolean) {
    if (this.state !== "playing") return;
    if (won) this.score += this.lives * 1000 + Math.round(this.p.hp) * 10;
    this.endT = 0; this.sound.mode = "title"; this.sfx(won ? "win" : "lose");
    saveHiscore({ score: this.score, difficulty: this.settings.difficulty, won, date: new Date().toISOString().slice(0, 10) });
    this.best = topScore();
    this.setState(won ? "victory" : "gameover");
  }

  /* ---------------- RENDER ---------------- */
  render() {
    const g = this.g;
    this.lightsFrame = this.lights; this.lights = [];
    const sx = this.shake > 0.3 ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake > 0.3 ? (Math.random() - 0.5) * this.shake : 0;
    const cx = Math.round(this.camX + sx), cy = Math.round(this.camY + sy);
    // zone blend
    const mid = this.camX + W / 2;
    const zA = this.zoneAt(mid); let zB = zA, blend = 0;
    for (const zx of [ZONE_X[1]!, ZONE_X[2]!]) { const d = mid - zx; if (Math.abs(d) < 240) { blend = (d + 240) / 480; zB = this.zoneAt(zx); } }
    const zPrev = blend > 0 ? zB - 1 : zA;
    this.drawBackdrop(g, blend > 0 ? zPrev : zA, cx, cy, 1);
    if (blend > 0) this.drawBackdrop(g, zB, cx, cy, blend);
    g.save(); g.translate(-cx, -cy);
    this.drawWorld(g);
    g.restore();
    // night tint + lights
    g.save(); g.globalCompositeOperation = "multiply"; g.fillStyle = ZONES[zA]!.tint; g.fillRect(0, 0, W, H); g.restore();
    g.save(); g.globalCompositeOperation = "lighter";
    for (const l of this.lightsFrame) { g.globalAlpha = Math.min(1, l.a) * 0.55; const s = l.r * 2; g.drawImage(glow(l.c), l.x - cx - l.r, l.y - cy - l.r, s, s); }
    g.restore(); g.globalAlpha = 1;
    // foreground parallax
    const nl = this.layers[zA]!.near; const nx = -((cx * 1.25) % 960);
    g.globalAlpha = 0.9; g.drawImage(nl, nx, 0); g.drawImage(nl, nx + 960, 0); g.globalAlpha = 1;
    // vignette
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85); vg.addColorStop(0, "#00000000"); vg.addColorStop(1, "#000000aa");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    if (this.flashT > 0) { g.fillStyle = `rgba(255,240,220,${Math.min(0.6, this.flashT * 3)})`; g.fillRect(0, 0, W, H); }
    if (this.state !== "title") this.drawHUD(g);
    else if (this.opts.standalone) this.drawTitle(g);
    this.drawOverlay(g);
    this.present();
  }
  lightsFrame: Light[] = [];
  drawBackdrop(g: G, z: number, cx: number, cy: number, alpha: number) {
    const P = ZONES[z]!, L = this.layers[z]!;
    g.globalAlpha = alpha;
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, P.skyTop); sky.addColorStop(0.6, P.skyMid); sky.addColorStop(1, P.skyBot);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // celestial
    if (z === 0) { g.drawImage(glow("#9ad8ff"), 330, 10, 90, 90); px(g, 362, 40, 26, 26, "#d8eeff"); px(g, 366, 44, 6, 5, "#b0c8e0"); px(g, 376, 54, 5, 4, "#b0c8e0"); }
    if (z === 2) g.drawImage(glow("#ff5a1a"), 120, 120, 260, 200);
    if (z === 1) g.drawImage(glow("#5ff0e0"), 200, 60, 120, 120);
    const r = (this.time * 0.2) | 0;
    for (let i = 0; i < 40; i++) { const x = (i * 97 + 13) % W, y = (i * 53) % 120; if ((i + r) % 7) px(g, x, y, 1, 1, i % 3 ? "#ffffff60" : "#9ff0ff90"); }
    const off = (k: number) => -((cx * k) % 960);
    const fy = -cy * 0.1, my = -cy * 0.3;
    g.drawImage(L.far, off(0.15), fy); g.drawImage(L.far, off(0.15) + 960, fy);
    // fog band
    const fog = g.createLinearGradient(0, 150, 0, 270); fog.addColorStop(0, P.skyBot + "00"); fog.addColorStop(1, P.skyBot + "aa");
    g.fillStyle = fog; g.fillRect(0, 150, W, 120);
    g.drawImage(L.mid, off(0.4), my + 10); g.drawImage(L.mid, off(0.4) + 960, my + 10);
    // embers / spores ambient
    for (let i = 0; i < 26; i++) {
      const t = this.time * (0.3 + (i % 5) * 0.1) + i * 13.7;
      const x = ((i * 71 - cx * 0.6 + Math.sin(t) * 20) % W + W) % W, y = ((H - (t * 30) % (H + 20)) + H) % H;
      px(g, x, y, 1, 1, z === 1 ? "#7ff8e8" : "#ffaa44");
    }
    g.globalAlpha = 1;
  }
  drawWorld(g: G) {
    const a = this.camX - 40, b = this.camX + W + 40, t = this.time;
    // solids
    for (const s of this.solids) {
      if (s.x + s.w < a || s.x > b) continue;
      const P = ZONES[s.zone]!;
      if (s.oneWay) {
        px(g, s.x, s.y, s.w, 6, P.groundDark); px(g, s.x, s.y, s.w, 2, P.groundTop); px(g, s.x, s.y, s.w, 1, P.groundTopHi);
        for (let x = s.x + 4; x < s.x + s.w - 2; x += 12) px(g, x, s.y + 6, 2, 4 + ((x * 7) % 5), P.groundDark);
        continue;
      }
      g.save(); g.fillStyle = g.createPattern(this.layers[s.zone]!.tile, "repeat")!; g.fillRect(s.x, s.y, s.w, Math.min(s.h, 300)); g.restore();
      px(g, s.x, s.y, s.w, 4, P.groundTop); px(g, s.x, s.y, s.w, 1, P.groundTopHi); px(g, s.x, s.y + 4, s.w, 2, "#00000050");
      px(g, s.x, s.y, 2, 300, "#00000040"); px(g, s.x + s.w - 2, s.y, 2, 300, "#00000060");
      if (s.zone === 1) for (let x = s.x + 3; x < s.x + s.w; x += 7) px(g, x, s.y - 2 - ((x * 13) % 3), 1, 2 + ((x * 13) % 3), "#4a8a4a");
      if (s.zone === 2) for (let x = s.x; x < s.x + s.w - 8; x += 16) px(g, x, s.y + 1, 8, 2, (x / 16) % 2 ? "#e0a020" : "#1a1a1a");
    }
    // decor + lights
    for (const d of this.decor) {
      if (d.x < a || d.x > b) continue;
      if (d.k === 0) { px(g, d.x - 1, d.y - 20, 3, 20, "#2a2a3a"); const f = Math.sin(t * 15 + d.x) > 0; px(g, d.x - 2, d.y - 25, 5, 5, f ? "#ffcc44" : "#ff6a1a"); px(g, d.x - 1, d.y - 28, 3, 3, "#ff9a3a"); this.lights.push({ x: d.x, y: d.y - 24, r: 46 + Math.sin(t * 13 + d.x) * 4, c: "#ff8a2a", a: 0.9 }); }
      else if (d.k === 1) { px(g, d.x, d.y - 6, 2, 6, "#a0d0c0"); px(g, d.x - 3, d.y - 9, 8, 3, "#5ff0e0"); px(g, d.x + 6, d.y - 4, 1, 4, "#a0d0c0"); px(g, d.x + 4, d.y - 6, 5, 2, "#3ab0a0"); this.lights.push({ x: d.x + 2, y: d.y - 8, r: 30 + Math.sin(t * 2 + d.x) * 5, c: "#5ff0e0", a: 0.8 }); }
      else { px(g, d.x - 3, d.y - 14, 6, 14, "#3a3434"); px(g, d.x - 4, d.y - 16, 8, 2, "#6a6060"); const on = Math.sin(t * 4 + d.x) > 0; px(g, d.x - 2, d.y - 20, 4, 4, on ? "#ff3a1a" : "#5a1a10"); if (on) this.lights.push({ x: d.x, y: d.y - 18, r: 36, c: "#ff3a1a", a: 0.9 }); }
    }
    // checkpoints
    CHECKPOINTS.forEach((cxp, i) => {
      if (i === 0 || cxp < a || cxp > b) return;
      const gy = this.groundY(cxp) ?? 226, on = this.cpIndex >= i;
      px(g, cxp, gy - 44, 2, 44, "#8a8090"); px(g, cxp - 1, gy - 46, 4, 3, "#ffcc66");
      const wv = Math.sin(t * 5) * 2;
      g.fillStyle = on ? "#ff6a1a" : "#3a3a50"; g.beginPath(); g.moveTo(cxp + 2, gy - 44); g.lineTo(cxp + 20, gy - 40 + wv); g.lineTo(cxp + 14, gy - 34); g.lineTo(cxp + 20, gy - 28 + wv); g.lineTo(cxp + 2, gy - 30); g.fill();
      px(g, cxp + 7, gy - 39, 4, 4, on ? "#fff0a0" : "#6a6a80");
      if (on) this.lights.push({ x: cxp + 10, y: gy - 36, r: 50, c: "#ff8a2a", a: 0.8 });
    });
    // signs
    g.font = "6px 'Press Start 2P', monospace"; g.textAlign = "center";
    for (const s of this.signs) {
      if (s.x < a - 80 || s.x > b + 80) continue;
      const wdt = s.s.length * 6 + 10;
      px(g, s.x - 1, s.y - 30, 2, 30, "#3a3440");
      px(g, s.x - wdt / 2, s.y - 46, wdt, 16, "#1a1626"); px(g, s.x - wdt / 2, s.y - 46, wdt, 1, "#5ff6ff"); px(g, s.x - wdt / 2, s.y - 31, wdt, 1, "#2a6a7a");
      g.fillStyle = "#bff8ff"; g.fillText(s.s, s.x, s.y - 35);
      this.lights.push({ x: s.x, y: s.y - 38, r: 40, c: "#5ff6ff", a: 0.4 });
    }
    // crates
    for (const c of this.crates) {
      if (!c.alive || c.x < a || c.x > b) continue;
      px(g, c.x, c.y, 16, 16, "#6a4220"); px(g, c.x + 1, c.y + 1, 14, 14, c.hp < 2 ? "#7a5228" : "#8a5a2a");
      px(g, c.x, c.y, 16, 2, "#a8743a"); px(g, c.x, c.y + 7, 16, 2, "#5a3a1a"); px(g, c.x + 7, c.y, 2, 16, "#5a3a1a");
      px(g, c.x + 1, c.y + 1, 1, 1, "#c0c0c0"); px(g, c.x + 14, c.y + 1, 1, 1, "#c0c0c0"); px(g, c.x + 1, c.y + 14, 1, 1, "#c0c0c0"); px(g, c.x + 14, c.y + 14, 1, 1, "#c0c0c0");
      if (c.hp < 2) px(g, c.x + 3, c.y + 4, 5, 1, "#2a1a0a");
    }
    // boss warnings
    for (const w of this.warn) { const on = Math.floor(w.t * 12) % 2 === 0; g.globalAlpha = 0.35; px(g, w.x - 6, 0, 12, 230, on ? "#ff2a2a" : "#ff8a2a"); g.globalAlpha = 1; px(g, w.x - 8, 226, 16, 3, "#ff3a2a"); }
    const bs = this.boss;
    if (bs && bs.alive && bs.state === "beam") {
      const bcx = bs.x + bs.w / 2, x0 = bs.face > 0 ? bcx : ARENA_START - 40, x1 = bs.face > 0 ? ARENA_END + 40 : bcx;
      if (bs.st > 0) { if (Math.floor(bs.st * 14) % 2) px(g, x0, bs.beamY - 1, x1 - x0, 2, "#5ff6ff"); }
      else { px(g, x0, bs.beamY - 5, x1 - x0, 10, "#5ff6ff"); px(g, x0, bs.beamY - 2, x1 - x0, 4, "#ffffff"); }
    }
    // pickups
    for (const k of this.pickups) {
      const y = k.y + Math.sin(k.t * 5) * 1.5;
      if (k.kind === "hp") { px(g, k.x - 4, y - 3, 3, 3, "#ff3a4a"); px(g, k.x + 1, y - 3, 3, 3, "#ff3a4a"); px(g, k.x - 4, y - 1, 8, 2, "#ff3a4a"); px(g, k.x - 3, y + 1, 6, 1, "#ff3a4a"); px(g, k.x - 1, y + 2, 2, 1, "#ff3a4a"); px(g, k.x - 3, y - 2, 1, 1, "#ffc0c0"); }
      else if (k.kind === "ammo") { px(g, k.x - 5, y - 3, 10, 7, "#4a5a3a"); px(g, k.x - 5, y - 3, 10, 1, "#8a9a6a"); px(g, k.x - 3, y - 6, 2, 4, "#e0b040"); px(g, k.x + 1, y - 6, 2, 4, "#e0b040"); }
      else if (k.kind === "energy") { px(g, k.x - 2, y - 5, 4, 10, "#5ff6ff"); px(g, k.x - 4, y - 2, 8, 4, "#5ff6ff"); px(g, k.x - 1, y - 3, 2, 6, "#ffffff"); }
      else { g.fillStyle = "#ffcc33"; g.beginPath(); g.moveTo(k.x, y - 5); g.lineTo(k.x + 4, y); g.lineTo(k.x, y + 5); g.lineTo(k.x - 4, y); g.fill(); px(g, k.x - 1, y - 2, 1, 2, "#ffffff"); }
      this.lights.push({ x: k.x, y, r: 18, c: k.kind === "hp" ? "#ff3a4a" : k.kind === "energy" ? "#5ff6ff" : "#ffcc33", a: 0.7 });
    }
    // enemies
    for (const e of this.enemies) {
      if (e.x < a || e.x > b) continue;
      g.save(); g.translate(Math.round(e.x + e.w / 2), Math.round(e.y + e.h)); if (e.face < 0) g.scale(-1, 1);
      const fl = e.flash > 0;
      if (e.type === "soldier") drawSoldier(g, e.t, Math.abs(e.vx) > 8, e.state === "aim", fl, e.variant === 1);
      else if (e.type === "hound") drawHound(g, e.t, Math.abs(e.vx) > 8, e.state === "crouch", fl, this.zoneAt(e.x) === 2);
      else { g.translate(0, -e.h / 2); drawFlyer(g, e.t, e.variant, fl, e.state === "tele"); }
      g.restore();
      if (e.state === "aim" || e.state === "crouch" || e.state === "tele") this.lights.push({ x: e.x + e.w / 2, y: e.y + 6, r: 20, c: "#ff3a2a", a: 1 });
      if (e.hp < e.maxHp) { px(g, e.x, e.y - 5, e.w, 2, "#2a0a0a"); px(g, e.x, e.y - 5, (e.w * e.hp) / e.maxHp, 2, "#ff4a3a"); }
      if (e.type === "flyer" && e.variant === 1) this.lights.push({ x: e.x + 7, y: e.y + 6, r: 30, c: "#5ff0e0", a: 0.8 });
    }
    // boss
    if (bs && bs.alive) {
      g.save(); g.translate(Math.round(bs.x + bs.w / 2), Math.round(bs.y + bs.h)); if (bs.face < 0) g.scale(-1, 1);
      const pose = bs.state === "slam" || bs.state === "barrage" || bs.state === "beam" ? bs.state : "idle";
      drawWarden(g, bs.t, bs.flash > 0, pose, bs.phase2); g.restore();
      this.lights.push({ x: bs.x + bs.w / 2, y: bs.y + 34, r: bs.phase2 ? 90 : 70, c: "#ff6a1a", a: 1 });
      if (Math.random() < 0.3) for (const sx2 of [-24, 24]) this.parts.push({ x: bs.x + bs.w / 2 + sx2 * bs.face, y: bs.y - 2, vx: (Math.random() - 0.5) * 10, vy: -30, life: 1.2, max: 1.2, c: "#4a4048", s: 4, grav: -10 });
    }
    // player
    const p = this.p;
    if (p.deadT <= 0 && (p.inv <= 0 || Math.floor(this.time * 20) % 2 === 0 || p.transT > 0)) {
      g.save(); g.translate(Math.round(p.x + p.w / 2), Math.round(p.y + p.h)); if (p.face < 0) g.scale(-1, 1);
      const pose = { t: p.t, run: Math.abs(p.vx) / 100, air: !p.onGround, vy: p.vy, attack: p.attackT, combo: p.combo, shooting: p.shootFlash > 0, hurt: p.hurtT > 0, dash: p.dashT > 0 };
      if (p.beast) { g.save(); g.scale(1.75, 1.75); drawBeast(g, pose); g.restore(); } else drawRebel(g, pose);
      // slash arc
      if (p.attackT > 0.06) {
        const k = 1 - p.attackT / 0.22, rad = p.beast ? 39 : p.combo === 3 ? 24 : 20;
        g.strokeStyle = p.beast ? "#ffaa33" : "#bff8ff"; g.lineWidth = p.combo === 3 ? 3 : 2; g.globalAlpha = 0.9;
        const a0 = p.combo === 2 ? 1.2 - k * 2.4 : -1.2 + k * 2.4;
        g.beginPath(); g.arc(4, -p.h * 0.55, rad, a0 - 0.9, a0 + 0.3); g.stroke(); g.globalAlpha = 1;
      }
      if (p.shootFlash > 0 && !p.beast) { px(g, 15, -19, 5, 4, "#fff0a0"); px(g, 19, -18, 3, 2, "#ffcc44"); }
      g.restore();
      this.lights.push({ x: p.x + p.w / 2, y: p.y + 10, r: p.beast ? 60 : 34, c: p.beast ? "#ff6a1a" : "#5ff6ff", a: p.beast ? 0.9 : 0.45 });
    }
    // bullets
    for (const bl of this.bullets) {
      if (bl.kind === "bullet") { px(g, bl.x - 4, bl.y - 1, 8, 2, "#ffcc66"); px(g, bl.x, bl.y - 1, 3, 2, "#ffffff"); }
      else if (bl.kind === "ebullet") { px(g, bl.x - 3, bl.y - 1.5, 6, 3, "#ff5a3a"); px(g, bl.x - 1, bl.y - 1, 2, 2, "#ffd0a0"); }
      else if (bl.kind === "orb") { px(g, bl.x - 3, bl.y - 3, 6, 6, "#ff3a2a"); px(g, bl.x - 1, bl.y - 1, 2, 2, "#ffffff"); }
      else if (bl.kind === "shell") { px(g, bl.x - 3, bl.y - 8, 6, 10, "#3a3434"); px(g, bl.x - 2, bl.y + 2, 4, 3, "#ff8a1a"); }
      else if (bl.kind === "wave") { const c = bl.owner === "p" ? "#ff8a2a" : "#ffcc44"; px(g, bl.x - 6, bl.y - 8, 12, 16, c + "aa"); px(g, bl.x - 3, bl.y - 12, 6, 20, "#fff0c0"); }
      else { const r2 = bl.r + Math.sin(this.time * 30) ; px(g, bl.x - r2, bl.y - r2, r2 * 2, r2 * 2, "#ff6a1a"); px(g, bl.x - r2 / 2, bl.y - r2 / 2, r2, r2, "#ffe080"); }
    }
    // particles
    for (const q of this.parts) {
      g.globalAlpha = Math.max(0, Math.min(1, q.life / q.max * 1.5));
      px(g, q.x, q.y, q.s, q.s, q.c);
      if (q.glow && Math.random() < 0.15) this.lights.push({ x: q.x, y: q.y, r: 10, c: q.c, a: 0.5 });
    }
    g.globalAlpha = 1;
    g.font = "6px 'Press Start 2P', monospace"; g.textAlign = "center";
    for (const tx of this.texts) { g.globalAlpha = 1 - tx.t / 0.9; g.fillStyle = "#000"; g.fillText(tx.s, tx.x + 1, tx.y + 1); g.fillStyle = tx.c; g.fillText(tx.s, tx.x, tx.y); }
    g.globalAlpha = 1;
  }
  text(g: G, s: string, x: number, y: number, c: string, size = 8, align: CanvasTextAlign = "left") {
    g.font = `${size}px 'Press Start 2P', monospace`; g.textAlign = align; g.textBaseline = "top";
    g.fillStyle = "#05030a"; g.fillText(s, x + 1, y + 1); g.fillStyle = c; g.fillText(s, x, y);
  }
  bar(g: G, x: number, y: number, w: number, h: number, f: number, c1: string, c2: string) {
    px(g, x - 1, y - 1, w + 2, h + 2, "#05030a"); px(g, x, y, w, h, "#221a2a");
    const fw = Math.max(0, Math.min(1, f)) * w; px(g, x, y, fw, h, c1); px(g, x, y, fw, 1, c2);
    for (let i = x + 8; i < x + w; i += 8) px(g, i, y, 1, h, "#05030a60");
  }
  drawHUD(g: G) {
    const p = this.p;
    // panel
    px(g, 4, 4, 150, 34, "#05030ab0"); px(g, 4, 4, 150, 1, "#ff8a2a"); px(g, 4, 37, 150, 1, "#2a2a40");
    // portrait
    px(g, 8, 8, 24, 26, "#141020"); g.save(); g.translate(20, p.beast ? 44 : 41); p.beast ? drawBeast(g, { t: p.t, run: 0, air: false, vy: 0, attack: 0, combo: 0, shooting: false, hurt: false, dash: false }) : drawRebel(g, { t: p.t, run: 0, air: false, vy: 0, attack: 0, combo: 0, shooting: false, hurt: false, dash: false }); g.restore();
    px(g, 8, 8, 24, 26, "#00000000");
    this.text(g, "HP", 36, 8, "#ff8a8a", 6); this.bar(g, 50, 8, 98, 6, p.hp / 100, p.hp < 30 ? "#ff2a2a" : "#ff4a5a", "#ffb0b0");
    const ready = p.energy >= 50;
    this.text(g, "EN", 36, 18, "#9ff8ff", 6); this.bar(g, 50, 18, 98, 5, p.energy / 100, ready && Math.floor(this.time * 4) % 2 ? "#ffffff" : "#3ae0f0", "#c0ffff");
    px(g, 99, 17, 1, 7, "#ffcc66");
    this.text(g, p.beast ? "BEAST" : `${this.weaponName} ${p.ammo} LV${this.weaponLevel}`, 36, 28, p.beast ? "#ffaa33" : "#ffcc66", 5);
    for (let i = 0; i < this.lives; i++) { px(g, 110 + i * 8, 28, 5, 5, "#ff6a1a"); px(g, 111 + i * 8, 29, 3, 3, "#ffcc66"); }
    if (ready && !p.beast) this.text(g, "E:BEAST!", 156, 18, Math.floor(this.time * 4) % 2 ? "#5ff6ff" : "#ffffff", 6);
    // score
    this.text(g, `SCORE ${String(this.score).padStart(7, "0")}`, W - 6, 6, "#ffe080", 8, "right");
    this.text(g, `HI ${String(Math.max(this.best, this.score)).padStart(7, "0")}`, W - 6, 17, "#a090c0", 6, "right");
    if (this.combo > 1) { const m = Math.min(4, 1 + Math.floor(this.combo / 5) * 0.5); this.text(g, `${this.combo} HITS x${m}`, W - 6, 27, "#ff8a2a", 6, "right"); }
    // progress
    const bx = 170, bw = 140, f = Math.min(1, p.x / (ARENA_START + 100));
    px(g, bx - 1, 5, bw + 2, 6, "#05030a");
    [["#6a6aa0", 0, 3000], ["#2a9a8a", 3000, 6000], ["#c05a2a", 6000, ARENA_START + 100]].forEach(([c, s0, s1]) => px(g, bx + (bw * (s0 as number)) / (ARENA_START + 100), 6, (bw * ((s1 as number) - (s0 as number))) / (ARENA_START + 100) - 1, 4, c as string));
    px(g, bx + f * bw - 1, 3, 3, 10, "#ffffff"); px(g, bx + bw + 3, 4, 6, 6, "#ff3a2a"); px(g, bx + bw + 4, 6, 1, 1, "#000"); px(g, bx + bw + 7, 6, 1, 1, "#000");
    this.text(g, ZONES[this.zone]!.name, bx + bw / 2, 14, "#c0b8e0", 6, "center");
    // AI labels
    const tags: string[] = [];
    if (this.settings.adaptive) tags.push(`ADAPTIVE AI x${this.director.intensity.toFixed(2)}`);
    if (this.settings.smartAI) tags.push("SMART FOES");
    this.text(g, tags.join("  "), 6, H - 10, "#6a7aa0", 5);
    // boss bar
    const b = this.boss;
    if (b && b.alive) {
      px(g, 90, H - 28, 300, 18, "#05030ac0");
      this.text(g, "IRON WARDEN", 240, H - 26, b.phase2 ? "#ff5a3a" : "#ffcc66", 6, "center");
      this.bar(g, 96, H - 17, 288, 4, b.hp / b.maxHp, b.phase2 ? "#ff3a1a" : "#ff8a2a", "#ffe0a0");
    }
    // zone banner
    if (this.zoneBanner > 0) {
      const a = Math.min(1, this.zoneBanner, 3.5 - this.zoneBanner + 0.01) ;
      g.globalAlpha = Math.max(0, Math.min(1, a * 2));
      px(g, 0, 92, W, 40, "#05030ab0"); px(g, 0, 92, W, 1, "#ff8a2a"); px(g, 0, 131, W, 1, "#ff8a2a");
      this.text(g, `ZONE ${this.zone + 1}`, W / 2, 98, "#ff8a2a", 8, "center");
      this.text(g, ZONES[this.zone]!.name, W / 2, 112, "#ffffff", 12, "center");
      g.globalAlpha = 1;
    }
    if (b && b.state === "intro") {
      g.globalAlpha = Math.min(1, b.st); px(g, 0, 100, W, 50, "#3a0505c0");
      this.text(g, "!! WARNING !!", W / 2, 106, Math.floor(this.time * 6) % 2 ? "#ff3a2a" : "#ffffff", 10, "center");
      this.text(g, "THE IRON WARDEN", W / 2, 124, "#ffcc66", 12, "center"); g.globalAlpha = 1;
    }
    // announcer
    const an = this.ann[this.ann.length - 1];
    if (an) {
      const chars = Math.min(an.s.length, Math.floor(an.t * 50));
      const a = Math.min(1, (4.5 - an.t) * 2);
      g.globalAlpha = a;
      const y = this.boss && this.boss.alive ? H - 58 : H - 38;
      px(g, 60, y, 360, 22, "#05030ad0"); px(g, 60, y, 2, 22, "#ff8a2a"); px(g, 64, y + 4, 14, 14, "#2a1a30"); px(g, 68, y + 8, 6, 2, "#5ff6ff"); px(g, 67, y + 12, 8, 3, "#ff6a1a");
      this.text(g, an.s.slice(0, chars), 84, y + 8, "#f0e8ff", 6);
      g.globalAlpha = 1;
    }
  }
  drawTitle(g: G) {
    px(g, 0, 0, W, H, "#05030a80");
    this.text(g, "IRONFANG", W / 2, 70, "#ff8a2a", 28, "center");
    this.text(g, "BEASTFIRE", W / 2, 106, "#5ff6ff", 16, "center");
    if (Math.floor(this.time * 2) % 2) this.text(g, "PRESS ENTER TO PLAY", W / 2, 160, "#ffffff", 8, "center");
    this.text(g, "WASD/ARROWS MOVE  SPACE JUMP  J MELEE  K SHOOT", W / 2, 200, "#c0b8e0", 6, "center");
    this.text(g, "Q SWAP GUN  L SPECIAL  SHIFT DASH  E BEAST  P PAUSE", W / 2, 212, "#c0b8e0", 6, "center");
    this.text(g, `HI SCORE ${topScore()}`, W / 2, 236, "#ffe080", 6, "center");
  }
  drawOverlay(g: G) {
    if (this.state === "paused") {
      px(g, 0, 0, W, H, "#05030ab0");
      this.text(g, "PAUSED", W / 2, 90, "#ff8a2a", 16, "center");
      this.text(g, "P / ENTER  RESUME", W / 2, 130, "#ffffff", 8, "center");
      this.text(g, "R  RESTART      ESC  MAIN MENU", W / 2, 146, "#c0b8e0", 6, "center");
    } else if (this.state === "gameover" || this.state === "victory") {
      const win = this.state === "victory";
      px(g, 0, 0, W, H, win ? "#1a0a00c0" : "#100005d0");
      this.text(g, win ? "VICTORY" : "GAME OVER", W / 2, 70, win ? "#ffcc44" : "#ff3a3a", 22, "center");
      this.text(g, win ? "The Iron Warden lies in ruin. The rebellion lives!" : "The citadel claims another rebel...", W / 2, 104, "#f0e8ff", 6, "center");
      this.text(g, `SCORE ${this.score}`, W / 2, 126, "#ffe080", 10, "center");
      this.text(g, `KILLS ${this.stats.kills}   TIME ${Math.floor(this.stats.time / 60)}:${String(Math.floor(this.stats.time % 60)).padStart(2, "0")}   ${this.settings.difficulty.toUpperCase()}`, W / 2, 144, "#c0b8e0", 6, "center");
      if (this.score >= this.best && this.score > 0) this.text(g, "NEW HIGH SCORE!", W / 2, 158, Math.floor(this.time * 4) % 2 ? "#5ff6ff" : "#ffffff", 8, "center");
      if (this.endT > 1) this.text(g, "ENTER / R  RETRY     ESC  MENU", W / 2, 190, "#ffffff", 7, "center");
    }
  }
  present() {
    const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    ctx.imageSmoothingEnabled = false;
    let src: HTMLCanvasElement = this.buf;
    if (this.settings.chroma && this.chroma > 0.08) {
      const k = Math.max(1, Math.round(this.chroma * 2));
      const fg = this.fxg, tg = this.tg;
      fg.globalCompositeOperation = "source-over"; fg.fillStyle = "#000"; fg.fillRect(0, 0, W, H);
      for (const [col, off] of [["#ff0000", -k], ["#00ffff", k]] as const) {
        tg.globalCompositeOperation = "source-over"; tg.clearRect(0, 0, W, H); tg.drawImage(this.buf, 0, 0);
        tg.globalCompositeOperation = "multiply"; tg.fillStyle = col; tg.fillRect(0, 0, W, H);
        tg.globalCompositeOperation = "destination-in"; tg.drawImage(this.buf, 0, 0);
        fg.globalCompositeOperation = "lighter"; fg.drawImage(this.tmp, off, 0);
      }
      fg.globalCompositeOperation = "source-over";
      src = this.fx;
    }
    ctx.drawImage(src, 0, 0, cw, ch);
    if (this.settings.scanlines) {
      const step = Math.max(2, Math.round(ch / H));
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      for (let y = 0; y < ch; y += step * 2) ctx.fillRect(0, y, cw, step);
    }
  }
}