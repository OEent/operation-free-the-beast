export type Difficulty = "easy" | "normal" | "hard";
export interface Settings {
  difficulty: Difficulty;
  smartAI: boolean;
  adaptive: boolean;
  announcer: boolean;
  sfx: boolean;
  music: boolean;
  shake: boolean;
  chroma: boolean;
  scanlines: boolean;
}
export const DEFAULT_SETTINGS: Settings = {
  difficulty: "normal",
  smartAI: true,
  adaptive: true,
  announcer: true,
  sfx: true,
  music: true,
  shake: true,
  chroma: true,
  scanlines: true,
};
export const DIFFS: Record<Difficulty, { enemyHp: number; enemyDmg: number; lives: number; score: number }> = {
  easy: { enemyHp: 0.75, enemyDmg: 0.6, lives: 5, score: 0.8 },
  normal: { enemyHp: 1, enemyDmg: 1, lives: 3, score: 1 },
  hard: { enemyHp: 1.35, enemyDmg: 1.4, lives: 2, score: 1.5 },
};
export interface HiScore { score: number; difficulty: Difficulty; won: boolean; date: string }
const SK = "ironfang:settings";
const HK = "ironfang:hiscores";
function ls(): Storage | null {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
}
export function loadSettings(): Settings {
  try { const raw = ls()?.getItem(SK); if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }; } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}
export function saveSettings(s: Settings) { ls()?.setItem(SK, JSON.stringify(s)); }
export function loadHiscores(): HiScore[] {
  try { const raw = ls()?.getItem(HK); if (raw) return JSON.parse(raw) as HiScore[]; } catch { /* ignore */ }
  return [];
}
export function insertHiscore(list: HiScore[], e: HiScore): HiScore[] {
  return [...list, e].sort((a, b) => b.score - a.score).slice(0, 5);
}
export function saveHiscore(e: HiScore): HiScore[] {
  const l = insertHiscore(loadHiscores(), e);
  ls()?.setItem(HK, JSON.stringify(l));
  return l;
}
export function topScore(): number { return loadHiscores()[0]?.score ?? 0; }