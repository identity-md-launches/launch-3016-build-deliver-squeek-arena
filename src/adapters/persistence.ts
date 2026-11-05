import type { Profile, Run, CheckpointSave, Settings } from "../game/types";
export const STORAGE_KEY = "squeek-arena-v1";
export const defaultSettings: Settings = {
  music: 0.4,
  sfx: 0.7,
  muted: false,
  reducedMotion:
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  assist: false,
  touch: false,
};
export const freshProfile = (): Profile => ({
  version: 1,
  name: "Burrow explorer",
  xp: 0,
  points: 0,
  seeds: 0,
  kills: 0,
  victories: 0,
  completed: [],
  achievements: [],
  cosmetic: "adventurer",
  scores: [],
  settings: { ...defaultSettings },
  save: null,
});
const int = (v: unknown, max = 1e9) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.max(0, Math.min(max, Math.floor(v)))
    : 0;
export const safeName = (name: string) =>
  name
    .replace(/[<>\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 24) || "Burrow explorer";
export class Persistence {
  profile: Profile = freshProfile();
  unavailable = false;
  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.version === 1) {
          this.profile = {
            ...freshProfile(),
            name: safeName(String(p.name || "")),
            xp: int(p.xp),
            points: int(p.points),
            seeds: int(p.seeds),
            kills: int(p.kills),
            victories: int(p.victories),
            completed: Array.isArray(p.completed)
              ? p.completed.filter(
                  (n: unknown) =>
                    Number.isInteger(n) && Number(n) >= 0 && Number(n) < 4,
                )
              : [],
            achievements: Array.isArray(p.achievements)
              ? p.achievements
                  .filter((s: unknown) => typeof s === "string")
                  .slice(0, 20)
              : [],
            cosmetic: ["adventurer", "moss", "starlight", "champion"].includes(
              p.cosmetic,
            )
              ? p.cosmetic
              : "adventurer",
            scores: Array.isArray(p.scores)
              ? p.scores
                  .filter(
                    (s: any) =>
                      typeof s.id === "string" &&
                      typeof s.name === "string" &&
                      Number.isFinite(s.score) &&
                      Number.isFinite(s.seconds) &&
                      typeof s.date === "string",
                  )
                  .slice(0, 20)
                  .map((s: any) => ({
                    ...s,
                    name: safeName(s.name),
                    score: int(s.score),
                    seconds: int(s.seconds),
                  }))
              : [],
            settings: {
              ...defaultSettings,
              ...Object.fromEntries(
                Object.entries(p.settings || {}).filter(([k, v]) =>
                  k === "music" || k === "sfx"
                    ? typeof v === "number" && v >= 0 && v <= 1
                    : typeof v === "boolean",
                ),
              ),
            },
            save: this.validSave(p.save) ? p.save : null,
          };
        }
      }
    } catch {
      this.unavailable = true;
    }
  }
  private validSave(s: any): s is CheckpointSave {
    return (
      !!s &&
      Number.isInteger(s.level) &&
      s.level >= 0 &&
      s.level <= 3 &&
      Number.isInteger(s.checkpoint) &&
      s.checkpoint >= -1 &&
      s.checkpoint < 4 &&
      Array.isArray(s.items) &&
      s.items.every((x: unknown) => typeof x === "string") &&
      Array.isArray(s.enemies) &&
      s.enemies.every(Number.isInteger) &&
      !!s.run &&
      typeof s.run.id === "string" &&
      Array.isArray(s.run.awarded) &&
      [
        "score",
        "seeds",
        "kills",
        "relics",
        "seconds",
        "deaths",
        "levels",
        "lives",
      ].every((k) => Number.isFinite(s.run[k]) && s.run[k] >= 0) &&
      s.run.lives <= 5
    );
  }
  write() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
      this.unavailable = false;
    } catch {
      this.unavailable = true;
    }
  }
  save(save: CheckpointSave | null) {
    this.profile.save = save;
    this.write();
  }
  award(run: Run, key: string, points: number, xp: number) {
    if (run.awarded.includes(key)) return;
    run.awarded.push(key);
    run.score += points;
    this.profile.points += points;
    this.profile.xp += xp;
  }
  achievement(id: string) {
    if (!this.profile.achievements.includes(id))
      this.profile.achievements.push(id);
  }
  record(run: Run, completed: boolean) {
    const existing = this.profile.scores.find((s) => s.id === run.id);
    if (completed && !existing?.completed) {
      this.profile.victories++;
      this.achievement("heartseed");
    }
    const entry = {
      id: run.id,
      name: this.profile.name,
      score: Math.floor(run.score),
      seconds: Math.floor(run.seconds),
      date: new Date().toISOString(),
      completed: completed || existing?.completed || false,
    };
    if (existing) Object.assign(existing, entry);
    else this.profile.scores.push(entry);
    this.profile.scores.sort(
      (a, b) => b.score - a.score || a.seconds - b.seconds,
    );
    this.profile.scores = this.profile.scores.slice(0, 20);
    this.write();
  }
  finish(run: Run, completed: boolean) {
    this.record(run, completed);
    this.profile.save = null;
    this.write();
  }
}
export const playerLevel = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1;
export const ACHIEVEMENTS = [
  {
    id: "first-seed",
    name: "Pocket treasure",
    detail: "Collect your first seed.",
  },
  {
    id: "first-foe",
    name: "Small but mighty",
    detail: "Defeat your first enemy.",
  },
  {
    id: "burrow",
    name: "Out of the burrow",
    detail: "Complete Burrow Entrance.",
  },
  { id: "cavern", name: "Crystal clear", detail: "Complete Crystal Caverns." },
  {
    id: "factory",
    name: "Clocking out",
    detail: "Complete Forgotten Factory.",
  },
  { id: "relic", name: "Curious paws", detail: "Find a hidden keepsake." },
  {
    id: "collector",
    name: "Full cheeks",
    detail: "Collect 50 seeds across adventures.",
  },
  { id: "heartseed", name: "Heart of a hero", detail: "Defeat the Iron Gnaw." },
];
export const COSMETICS = [
  {
    id: "adventurer",
    name: "Golden adventurer",
    requirement: "Always yours",
    unlocked: (_: Profile) => true,
  },
  {
    id: "moss",
    name: "Moss scarf",
    requirement: "Complete Burrow Entrance",
    unlocked: (p: Profile) => p.completed.includes(0),
  },
  {
    id: "starlight",
    name: "Crystal scarf",
    requirement: "Find a keepsake",
    unlocked: (p: Profile) => p.achievements.includes("relic"),
  },
  {
    id: "champion",
    name: "Champion crown",
    requirement: "Defeat the Iron Gnaw",
    unlocked: (p: Profile) => p.victories > 0,
  },
];
