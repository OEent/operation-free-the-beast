export type Sfx = "shoot" | "slash" | "hit" | "kill" | "explode" | "jump" | "dash" | "pickup" | "transform" | "revert" | "shock" | "hurt" | "warn" | "crate" | "checkpoint" | "click" | "ember" | "beam" | "roar" | "win" | "lose" | "select";
export class Sound {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxG!: GainNode;
  private musG!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private timer: number | null = null;
  private nextT = 0;
  private step = 0;
  mode: "title" | "level" | "boss" | "none" = "title";
  sfxOn = true;
  musicOn = true;
  init() {
    if (this.ctx) { if (this.ctx.state === "suspended") void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const c = new AC();
    this.ctx = c;
    this.master = c.createGain(); this.master.gain.value = 0.55; this.master.connect(c.destination);
    this.sfxG = c.createGain(); this.sfxG.gain.value = this.sfxOn ? 0.8 : 0; this.sfxG.connect(this.master);
    this.musG = c.createGain(); this.musG.gain.value = this.musicOn ? 0.32 : 0; this.musG.connect(this.master);
    const len = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.nextT = c.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }
  destroy() { if (this.timer) clearInterval(this.timer); void this.ctx?.close(); this.ctx = null; }
  setSfx(on: boolean) { this.sfxOn = on; if (this.ctx) this.sfxG.gain.value = on ? 0.8 : 0; }
  setMusic(on: boolean) { this.musicOn = on; if (this.ctx) this.musG.gain.value = on ? 0.32 : 0; }
  private tone(f: number, dur: number, type: OscillatorType, vol: number, slide?: number, delay = 0, dest?: AudioNode) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest ?? this.sfxG); o.start(t); o.stop(t + dur + 0.02);
  }
  private noise(dur: number, vol: number, freq: number, type: BiquadFilterType = "lowpass", slide?: number, delay = 0, dest?: AudioNode) {
    const c = this.ctx; if (!c || !this.noiseBuf) return;
    const t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(dest ?? this.sfxG); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  play(n: Sfx) {
    if (!this.ctx || !this.sfxOn) return;
    switch (n) {
      case "shoot": this.tone(880, 0.07, "square", 0.12, 220); this.noise(0.06, 0.25, 3000, "highpass"); break;
      case "ember": this.tone(500, 0.2, "sawtooth", 0.15, 120); this.noise(0.2, 0.3, 1500, "bandpass"); break;
      case "slash": this.noise(0.12, 0.35, 5000, "bandpass", 800); this.tone(300, 0.08, "triangle", 0.1, 120); break;
      case "hit": this.tone(160, 0.1, "square", 0.2, 60); this.noise(0.08, 0.3, 2000); break;
      case "kill": this.tone(400, 0.25, "sawtooth", 0.15, 60); this.noise(0.25, 0.35, 1200, "lowpass", 200); break;
      case "explode": this.noise(0.6, 0.7, 900, "lowpass", 80); this.tone(90, 0.5, "sine", 0.5, 30); break;
      case "jump": this.tone(220, 0.12, "square", 0.08, 520); break;
      case "dash": this.noise(0.15, 0.25, 600, "bandpass", 3000); break;
      case "pickup": [660, 880, 1320].forEach((f, i) => this.tone(f, 0.08, "square", 0.08, undefined, i * 0.05)); break;
      case "transform": this.tone(60, 0.9, "sawtooth", 0.3, 220); this.noise(0.9, 0.4, 300, "lowpass", 3000); this.tone(110, 0.6, "square", 0.12, 40, 0.3); break;
      case "revert": this.tone(300, 0.4, "triangle", 0.15, 90); break;
      case "shock": this.noise(0.7, 0.7, 2000, "lowpass", 60); this.tone(70, 0.6, "sine", 0.6, 25); break;
      case "hurt": this.tone(200, 0.2, "sawtooth", 0.2, 70); this.noise(0.1, 0.3, 800); break;
      case "warn": this.tone(990, 0.12, "square", 0.1); this.tone(990, 0.12, "square", 0.1, undefined, 0.18); break;
      case "crate": this.noise(0.2, 0.4, 700, "bandpass", 200); this.tone(140, 0.1, "triangle", 0.2, 70); break;
      case "checkpoint": [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, "triangle", 0.12, undefined, i * 0.08)); break;
      case "click": this.tone(1200, 0.03, "square", 0.05); break;
      case "beam": this.tone(140, 0.7, "sawtooth", 0.2, 600); this.noise(0.7, 0.2, 4000, "highpass"); break;
      case "roar": this.tone(80, 1.2, "sawtooth", 0.35, 40); this.noise(1.2, 0.4, 500, "lowpass", 150); break;
      case "win": [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.4, "square", 0.1, undefined, i * 0.14)); break;
      case "lose": [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.4, "triangle", 0.15, undefined, i * 0.22)); break;
      case "select": this.tone(660, 0.06, "square", 0.08, 990); break;
    }
  }
  /** Original procedural soundtrack: D-minor dieselpunk march. */
  private schedule() {
    const c = this.ctx; if (!c) return;
    if (this.mode === "none") { this.nextT = c.currentTime + 0.05; return; }
    const bpm = this.mode === "boss" ? 156 : this.mode === "title" ? 96 : 132;
    const six = 60 / bpm / 4;
    while (this.nextT < c.currentTime + 0.12) {
      this.playStep(this.step, this.nextT - c.currentTime);
      this.nextT += six; this.step++;
    }
  }
  private playStep(step: number, delay: number) {
    const s = step % 16, bar = Math.floor(step / 16) % 4;
    const prog = this.mode === "boss" ? [0, 1, -2, -1] : [0, -4, -2, -5];
    const root = 73.42 * Math.pow(2, (prog[bar] ?? 0) / 12);
    const d = Math.max(0, delay), m = this.musG;
    const bassSteps = this.mode === "title" ? [0, 8] : [0, 3, 6, 8, 10, 12, 14];
    if (bassSteps.includes(s)) this.tone(s % 6 === 0 ? root : root * 2, 0.18, "sawtooth", 0.18, undefined, d, m);
    const chord = [0, 3, 7, 12, 15, 12, 7, 3];
    if (s % 2 === 1 || this.mode === "boss") {
      const n = chord[(step >> (this.mode === "boss" ? 0 : 1)) % chord.length] ?? 0;
      this.tone(root * 4 * Math.pow(2, n / 12), 0.12, "square", this.mode === "title" ? 0.035 : 0.045, undefined, d, m);
    }
    if (this.mode === "title") { if (s === 0) this.tone(root * 2, 1.6, "triangle", 0.08, undefined, d, m); return; }
    if (s % 4 === 0) this.tone(130, 0.14, "sine", 0.5, 40, d, m);
    if (s % 8 === 4) this.noise(0.12, 0.3, 1800, "bandpass", undefined, d, m);
    if (s % 2 === 0) this.noise(0.03, 0.08, 8000, "highpass", undefined, d, m);
  }
}