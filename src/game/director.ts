/** Adaptive AI director: local heuristic logic (not an LLM). Tunes spawns & aggression to player performance. */
export function nextIntensity(cur: number, kills: number, dmgTaken: number, hpFrac: number): number {
  let d = kills * 0.05 - dmgTaken * 0.006;
  if (hpFrac > 0.75) d += 0.04;
  if (hpFrac < 0.35) d -= 0.1;
  return Math.min(1.6, Math.max(0.6, cur + d));
}
export class Director {
  intensity = 1;
  enabled = true;
  private kills = 0;
  private dmg = 0;
  private t = 0;
  lastChange = 0;
  onKill() { this.kills++; }
  onDamage(n: number) { this.dmg += n; }
  reset() { this.intensity = 1; this.kills = 0; this.dmg = 0; this.t = 0; }
  /** returns +1 / -1 when intensity crossed a notable threshold */
  update(dt: number, hpFrac: number): number {
    if (!this.enabled) { this.intensity = 1; return 0; }
    this.t += dt;
    if (this.t < 3) return 0;
    this.t = 0;
    const before = this.intensity;
    this.intensity = nextIntensity(this.intensity, this.kills, this.dmg, hpFrac);
    this.kills = 0; this.dmg = 0;
    if (before < 1.3 && this.intensity >= 1.3) return 1;
    if (before > 0.8 && this.intensity <= 0.8) return -1;
    return 0;
  }
  count(base: number) { return Math.max(1, Math.round(base * this.intensity)); }
  get aggression() { return this.intensity; }
}