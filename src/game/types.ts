export type Mode =
  | "menu"
  | "playing"
  | "paused"
  | "defeat"
  | "gameover"
  | "transition"
  | "victory";
export type Action = "left" | "right" | "jump" | "attack" | "dash";
export type Animation =
  | "idle"
  | "run"
  | "jump"
  | "fall"
  | "attack"
  | "dodge"
  | "hurt"
  | "defeat"
  | "victory";
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Player extends Rect {
  vx: number;
  vy: number;
  facing: number;
  grounded: boolean;
  coyote: number;
  jumpBuffer: number;
  hp: number;
  invuln: number;
  attack: number;
  attackCooldown: number;
  dash: number;
  dashCooldown: number;
  hurt: number;
  anim: Animation;
  attackId: number;
}
export type EnemyKind = "beetle" | "moth" | "sentry";
export interface Enemy extends Rect {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  home: number;
  range: number;
  vx: number;
  vy: number;
  time: number;
  state: "patrol" | "tell" | "charge" | "rest";
  timer: number;
  hit: number;
  lastAttack: number;
  dead: boolean;
}
export interface Collectible extends Rect {
  id: string;
  kind: "seed" | "heart" | "relic";
  taken: boolean;
}
export interface Hazard extends Rect {
  kind: "spikes" | "steam";
  phase?: number;
}
export interface Platform extends Rect {
  conveyor?: number;
}
export interface Checkpoint {
  x: number;
  y: number;
  reached: boolean;
}
export interface Sign extends Rect {
  text: string;
}
export interface Level {
  name: string;
  subtitle: string;
  objective: string;
  width: number;
  theme: "forest" | "crystal" | "factory" | "boss";
  platforms: Platform[];
  hazards: Hazard[];
  enemies: Enemy[];
  items: Collectible[];
  checkpoints: Checkpoint[];
  signs: Sign[];
  exit: Rect;
  required: number;
}
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}
export interface Projectile extends Rect {
  vx: number;
  vy: number;
  life: number;
  kind: "spore" | "shock" | "debris";
}
export interface Boss extends Rect {
  hp: number;
  maxHp: number;
  state:
    | "intro"
    | "idle"
    | "tell-slam"
    | "slam"
    | "tell-charge"
    | "charge"
    | "exposed"
    | "defeated";
  timer: number;
  phase: number;
  cycle: number;
  direction: number;
  hit: number;
  lastAttack: number;
}
export interface Run {
  id: string;
  score: number;
  seeds: number;
  kills: number;
  relics: number;
  seconds: number;
  deaths: number;
  levels: number;
  lives: number;
  awarded: string[];
}
export interface CheckpointSave {
  level: number;
  checkpoint: number;
  items: string[];
  enemies: number[];
  run: Run;
}
export interface GameSnapshot {
  mode: Mode;
  level: number;
  name: string;
  hp: number;
  lives: number;
  score: number;
  seeds: number;
  levelSeeds: number;
  totalSeeds: number;
  kills: number;
  relics: number;
  seconds: number;
  objective: string;
  progress: number;
  checkpoint: number;
  bossHp: number;
  bossMax: number;
  bossState: string;
  notice: string;
  dashReady: boolean;
}
export interface Settings {
  music: number;
  sfx: number;
  muted: boolean;
  reducedMotion: boolean;
  assist: boolean;
  touch: boolean;
}
export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  seconds: number;
  date: string;
  completed: boolean;
}
export interface Profile {
  version: 1;
  name: string;
  xp: number;
  points: number;
  seeds: number;
  kills: number;
  victories: number;
  completed: number[];
  achievements: string[];
  cosmetic: string;
  scores: ScoreEntry[];
  settings: Settings;
  save: CheckpointSave | null;
}
