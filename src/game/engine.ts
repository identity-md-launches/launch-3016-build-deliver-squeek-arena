import { createLevel } from "./levels";
import { Input } from "./input";
import { AudioEngine } from "./audio";
import { Persistence } from "../adapters/persistence";
import type {
  Boss,
  Enemy,
  GameSnapshot,
  Level,
  Mode,
  Particle,
  Player,
  Projectile,
  Rect,
  Run,
} from "./types";

export const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const approach = (v: number, to: number, step: number) =>
  v < to ? Math.min(to, v + step) : Math.max(to, v - step);
const newPlayer = (x = 95, y = 370, hp = 5): Player => ({
  x,
  y,
  w: 28,
  h: 34,
  vx: 0,
  vy: 0,
  facing: 1,
  grounded: false,
  coyote: 0,
  jumpBuffer: 0,
  hp,
  invuln: 0,
  attack: 0,
  attackCooldown: 0,
  dash: 0,
  dashCooldown: 0,
  hurt: 0,
  anim: "idle",
  attackId: 0,
});
const newRun = (): Run => ({
  id: crypto.randomUUID(),
  score: 0,
  seeds: 0,
  kills: 0,
  relics: 0,
  seconds: 0,
  deaths: 0,
  levels: 0,
  lives: 3,
  awarded: [],
});

export class Game {
  mode: Mode = "menu";
  levelIndex = 0;
  level: Level = createLevel(0);
  player: Player = newPlayer();
  run: Run = newRun();
  boss: Boss | null = null;
  particles: Particle[] = [];
  projectiles: Projectile[] = [];
  checkpoint = -1;
  camera = 0;
  time = 0;
  viewWidth = 960;
  notice = "";
  noticeTimer = 0;
  shake = 0;
  exitHint = 0;
  private nextEmit = 0;
  private nextSave = 0;
  private stepTimer = 0;
  private deathTimer = 0;
  readonly input: Input;
  onChange: (s: GameSnapshot) => void = () => {};
  constructor(
    public storage: Persistence,
    public audio: AudioEngine,
  ) {
    this.input = new Input(
      () => this.mode === "playing" || this.mode === "paused",
      () => this.pause(),
    );
  }
  get maxHp() {
    return this.storage.profile.settings.assist ? 8 : 5;
  }
  get levelSeeds() {
    return this.level.items.filter((i) => i.kind === "seed" && i.taken).length;
  }
  get snapshot(): GameSnapshot {
    return {
      mode: this.mode,
      level: this.levelIndex,
      name: this.level.name,
      hp: this.player.hp,
      lives: this.run.lives,
      score: Math.floor(this.run.score),
      seeds: this.run.seeds,
      levelSeeds: this.levelSeeds,
      totalSeeds: this.level.required,
      kills: this.run.kills,
      relics: this.run.relics,
      seconds: Math.floor(this.run.seconds),
      objective: this.level.objective,
      progress: clamp(this.player.x / (this.level.width - 150), 0, 1),
      checkpoint: this.checkpoint,
      bossHp: this.boss?.hp ?? 0,
      bossMax: this.boss?.maxHp ?? 18,
      bossState: this.boss?.state ?? "",
      notice: this.notice,
      dashReady: this.player.dashCooldown <= 0,
    };
  }
  emit() {
    this.onChange(this.snapshot);
  }
  start(resume = false) {
    this.run = newRun();
    this.levelIndex = 0;
    this.checkpoint = -1;
    const save = resume ? this.storage.profile.save : null;
    if (save) {
      this.levelIndex = save.level;
      this.checkpoint = save.checkpoint;
      this.run = structuredClone(save.run);
      if (this.run.lives === 0) this.run.lives = 3;
    }
    this.load(this.levelIndex);
    if (save) {
      this.level.items.forEach((i) => (i.taken = save.items.includes(i.id)));
      this.level.enemies.forEach((e) => (e.dead = save.enemies.includes(e.id)));
      this.level.checkpoints.forEach(
        (c, i) => (c.reached = i <= this.checkpoint),
      );
      this.spawn();
    }
    this.mode = "playing";
    this.input.clear();
    this.audio.music(this.levelIndex, true);
    this.say(
      this.levelIndex === 0
        ? "The heartseed is missing. Follow the trail."
        : "Adventure resumed at your checkpoint.",
      4,
    );
    this.persist();
    this.emit();
  }
  load(index: number) {
    this.levelIndex = index;
    this.level = createLevel(index);
    this.player = newPlayer(95, 370, this.maxHp);
    this.particles = [];
    this.projectiles = [];
    this.camera = 0;
    this.boss =
      index === 3
        ? {
            x: 880,
            y: 304,
            w: 100,
            h: 104,
            hp: 18,
            maxHp: 18,
            state: "intro",
            timer: 2,
            phase: 1,
            cycle: 0,
            direction: -1,
            hit: 0,
            lastAttack: -1,
          }
        : null;
    this.time = 0;
  }
  spawn() {
    const cp = this.level.checkpoints[this.checkpoint];
    this.player = newPlayer(
      cp ? cp.x + 26 : 95,
      cp ? cp.y - 34 : 370,
      this.maxHp,
    );
    this.player.invuln = 2;
    this.camera = clamp(
      this.player.x - this.viewWidth * 0.32,
      0,
      Math.max(0, this.level.width - this.viewWidth),
    );
    this.projectiles = [];
    if (this.boss) {
      this.boss = {
        x: 880,
        y: 304,
        w: 100,
        h: 104,
        hp: 18,
        maxHp: 18,
        state: "intro",
        timer: 1.5,
        phase: 1,
        cycle: 0,
        direction: -1,
        hit: 0,
        lastAttack: -1,
      };
    }
  }
  pause() {
    if (this.mode === "playing") {
      this.mode = "paused";
      this.audio.stop();
      this.input.clear();
      this.persist();
    } else if (this.mode === "paused") {
      this.mode = "playing";
      this.audio.music(this.levelIndex, true);
      this.input.clear();
    }
    this.emit();
  }
  toMenu() {
    if (
      ["playing", "paused", "defeat", "gameover", "transition"].includes(
        this.mode,
      )
    )
      this.persist();
    this.mode = "menu";
    this.input.clear();
    this.audio.stop();
    this.emit();
  }
  retry() {
    if (this.run.lives <= 0) this.run.lives = 3;
    this.spawn();
    this.mode = "playing";
    this.deathTimer = 0;
    this.audio.music(this.levelIndex, true);
    this.input.clear();
    this.say("Fresh hearts. You have this.", 2);
    this.persist();
    this.emit();
  }
  restartLevel() {
    const savedItems = this.level.items.filter((i) => i.taken).map((i) => i.id),
      savedEnemies = this.level.enemies.filter((e) => e.dead).map((e) => e.id);
    this.load(this.levelIndex);
    this.checkpoint = -1;
    this.level.items.forEach((i) => (i.taken = savedItems.includes(i.id)));
    this.level.enemies.forEach((e) => (e.dead = savedEnemies.includes(e.id)));
    this.mode = "playing";
    this.input.clear();
    this.audio.music(this.levelIndex, true);
    this.persist();
    this.emit();
  }
  continueLevel() {
    if (this.mode !== "transition") return;
    this.checkpoint = -1;
    this.load(this.levelIndex + 1);
    this.mode = "playing";
    this.input.clear();
    this.audio.music(this.levelIndex, true);
    this.say(
      this.levelIndex === 3
        ? "Iron Gnaw: jump the waves, then strike the open core."
        : this.level.subtitle,
      4,
    );
    this.persist();
    this.emit();
  }
  persist() {
    if (this.mode === "victory" || this.mode === "menu") return;
    const next = this.mode === "transition";
    this.storage.save({
      level: next ? this.levelIndex + 1 : this.levelIndex,
      checkpoint: next ? -1 : this.checkpoint,
      items: next
        ? []
        : this.level.items.filter((i) => i.taken).map((i) => i.id),
      enemies: next
        ? []
        : this.level.enemies.filter((e) => e.dead).map((e) => e.id),
      run: structuredClone(this.run),
    });
  }
  say(message: string, seconds = 2.5) {
    this.notice = message;
    this.noticeTimer = seconds;
  }
  burst(x: number, y: number, color: string, n = 12) {
    for (let i = 0; i < n; i++) {
      const angle = i * 2.399963 + this.time;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * (30 + (i % 5) * 15),
        vy: Math.sin(angle) * (30 + (i % 4) * 20) - 40,
        life: 0.45 + (i % 4) * 0.1,
        max: 0.8,
        color,
        size: i % 3 === 0 ? 4 : 2,
      });
    }
  }
  damage(fromX: number, fall = false) {
    const p = this.player;
    if (
      this.mode !== "playing" ||
      (p.invuln > 0 && !fall) ||
      (p.dash > 0 && !fall)
    )
      return;
    p.hp--;
    p.hurt = 0.35;
    p.invuln = this.storage.profile.settings.assist ? 2 : 1.35;
    p.vx = (p.x < fromX ? -1 : 1) * 240;
    p.vy = -245;
    this.shake = 0.2;
    this.audio.sfx("hit");
    this.burst(p.x + p.w / 2, p.y + 15, "#edbd8e", 14);
    if (p.hp <= 0) {
      this.run.deaths++;
      this.run.lives--;
      this.mode = "defeat";
      p.anim = "defeat";
      this.deathTimer = 1;
      this.audio.stop();
      this.audio.sfx("defeat");
      this.input.clear();
      this.persist();
      this.emit();
    } else if (fall) {
      const cp = this.level.checkpoints[this.checkpoint];
      p.x = cp ? cp.x + 30 : 95;
      p.y = cp ? cp.y - p.h : 370;
      p.vx = 0;
      p.vy = 0;
      p.invuln = 2;
      this.say("A soft landing at the last checkpoint.");
    }
  }
  private collect() {
    for (const item of this.level.items) {
      if (item.taken || !overlaps(this.player, item)) continue;
      item.taken = true;
      const p = this.storage.profile;
      if (item.kind === "heart") {
        this.player.hp = Math.min(this.maxHp, this.player.hp + 2);
        this.audio.sfx("pickup");
        this.burst(item.x, item.y, "#e9ad99", 8);
      } else if (item.kind === "relic") {
        this.run.relics++;
        this.storage.award(this.run, `relic:${item.id}`, 150, 100);
        this.storage.achievement("relic");
        this.audio.sfx("relic");
        this.say("Keepsake found. Crystal scarf unlocked.");
        this.burst(item.x, item.y, "#c4bcdd", 20);
      } else {
        this.run.seeds++;
        p.seeds++;
        this.storage.award(this.run, `seed:${item.id}`, 10, 6);
        this.storage.achievement("first-seed");
        if (p.seeds >= 50) this.storage.achievement("collector");
        this.audio.sfx("pickup");
        this.burst(item.x + 8, item.y + 8, "#edc679", 6);
      }
    }
  }
  private hitEnemy(e: Enemy, damage = 1) {
    if (e.dead) return;
    e.hp -= damage;
    e.hit = 0.2;
    e.x += this.player.facing * 10;
    this.audio.sfx("enemy");
    this.burst(e.x + e.w / 2, e.y + 12, "#d8c897", 8);
    if (e.hp <= 0) {
      e.dead = true;
      this.run.kills++;
      this.storage.profile.kills++;
      this.storage.award(this.run, `foe:${this.levelIndex}:${e.id}`, 50, 30);
      this.storage.achievement("first-foe");
      this.burst(e.x + 15, e.y + 15, "#aeae81", 15);
    }
  }
  private enemyStep(e: Enemy, dt: number) {
    if (e.dead) return;
    e.time += dt;
    e.hit = Math.max(0, e.hit - dt);
    e.timer -= dt;
    const p = this.player,
      dx = p.x - e.x,
      near = Math.abs(dx) < 430;
    if (e.kind === "beetle") {
      if (e.state === "patrol") {
        e.x += e.vx * dt;
        if (e.x < e.home - e.range || e.x > e.home + e.range) e.vx *= -1;
        if (near && Math.abs(dx) < 165 && Math.abs(p.y - e.y) < 65) {
          e.state = "tell";
          e.timer = 0.65;
          e.vx = Math.sign(dx || 1) * 220;
        }
      } else if (e.state === "tell" && e.timer <= 0) {
        e.state = "charge";
        e.timer = 0.45;
      } else if (e.state === "charge") {
        e.x += e.vx * dt;
        e.x = clamp(e.x, e.home - e.range - 30, e.home + e.range + 30);
        if (e.timer <= 0) {
          e.state = "rest";
          e.timer = 0.9;
        }
      } else if (e.state === "rest" && e.timer <= 0) {
        e.state = "patrol";
        e.vx = Math.sign(e.home - e.x || 1) * 38;
      }
    } else if (e.kind === "moth") {
      if (e.state === "patrol") {
        e.x = e.home + Math.sin(e.time * 0.85) * e.range;
        e.y = 245 + Math.sin(e.time * 2) * 26;
        if (near && Math.abs(dx) < 200) {
          e.state = "tell";
          e.timer = 0.8;
          e.vx = dx / 0.65;
          e.vy = (p.y - e.y) / 0.65;
        }
      } else if (e.state === "tell" && e.timer <= 0) {
        e.state = "charge";
        e.timer = 0.65;
      } else if (e.state === "charge") {
        e.x += clamp(e.vx, -280, 280) * dt;
        e.y += clamp(e.vy, -220, 220) * dt;
        if (e.timer <= 0) {
          e.state = "rest";
          e.timer = 1.4;
        }
      } else if (e.state === "rest") {
        e.y = approach(e.y, 245, 80 * dt);
        if (e.timer <= 0) {
          e.state = "patrol";
          e.home = e.x;
        }
      }
    } else {
      if (e.state === "patrol" && near) {
        e.state = "tell";
        e.timer = 0.9;
      } else if (e.state === "tell" && e.timer <= 0) {
        e.state = "rest";
        e.timer = 1.9;
        this.projectiles.push({
          x: e.x + e.w / 2,
          y: e.y + 8,
          w: 12,
          h: 12,
          vx: Math.sign(dx || 1) * 180,
          vy: 0,
          life: 3,
          kind: "spore",
        });
      } else if (e.state === "rest" && e.timer <= 0) e.state = "patrol";
    }
    const attackBox = {
      x: p.facing === 1 ? p.x + p.w - 8 : p.x - 65,
      y: p.y - 12,
      w: 73,
      h: p.h + 26,
    };
    if (p.attack > 0 && e.lastAttack !== p.attackId && overlaps(attackBox, e)) {
      e.lastAttack = p.attackId;
      this.hitEnemy(e);
    }
    if (overlaps(p, e) && e.hit <= 0) {
      if (p.vy > 80 && p.y + p.h < e.y + 20) {
        this.hitEnemy(e, 2);
        p.vy = -360;
        this.audio.sfx("jump");
      } else this.damage(e.x + e.w / 2);
    }
  }
  private bossStep(dt: number) {
    const b = this.boss;
    if (!b) return;
    b.timer -= dt;
    b.hit = Math.max(0, b.hit - dt);
    if (b.state === "defeated") {
      if (b.timer <= 0) {
        this.mode = "victory";
        this.player.anim = "victory";
        this.storage.award(this.run, "boss", 1000, 500);
        this.storage.finish(this.run, true);
        this.audio.stop();
        this.audio.sfx("victory");
        this.emit();
      } else if (Math.floor(b.timer * 12) !== Math.floor((b.timer + dt) * 12))
        this.burst(
          b.x + ((b.timer * 79) % 100),
          b.y + ((b.timer * 43) % 80),
          "#e6ba70",
          6,
        );
      return;
    }
    if (b.hp <= b.maxHp / 2) b.phase = 2;
    if (b.state === "intro" && b.timer <= 0) {
      b.state = "idle";
      b.timer = 1;
      this.say("Wait for the core to open. Jump the shockwaves.", 4);
    }
    if (b.state === "idle" && b.timer <= 0) {
      b.cycle++;
      b.direction = this.player.x < b.x ? -1 : 1;
      b.state = b.cycle % 3 === 0 ? "tell-charge" : "tell-slam";
      b.timer = b.phase === 2 ? 0.9 : 1.15;
      this.say(
        b.state === "tell-charge"
          ? "Charge incoming. Jump or dash through!"
          : "Ground slam incoming. Get ready to jump!",
        1.3,
      );
      this.audio.sfx("boss");
    } else if (b.state === "tell-slam" && b.timer <= 0) {
      b.state = "slam";
      b.timer = 0.25;
      this.shake = 0.35;
      this.audio.sfx("boss");
      for (const d of [-1, 1])
        this.projectiles.push({
          x: b.x + b.w / 2,
          y: 386,
          w: 30,
          h: 22,
          vx: d * (b.phase === 2 ? 310 : 240),
          vy: 0,
          life: 5,
          kind: "shock",
        });
      if (b.phase === 2) {
        for (const x of [240, 490, 740, 990])
          this.projectiles.push({
            x,
            y: 70,
            w: 18,
            h: 22,
            vx: 0,
            vy: 110,
            life: 3,
            kind: "debris",
          });
      }
      this.burst(b.x + 50, 405, "#c4a47d", 24);
    } else if (b.state === "slam" && b.timer <= 0) {
      b.state = "exposed";
      b.timer = b.phase === 2 ? 2.2 : 2.8;
      this.say("Core open. Get close and attack!", 2);
    } else if (b.state === "tell-charge" && b.timer <= 0) {
      b.state = "charge";
      b.timer = 1.3;
    } else if (b.state === "charge") {
      b.x += b.direction * (b.phase === 2 ? 440 : 340) * dt;
      if (b.x < 80 || b.x > 1080 || b.timer <= 0) {
        b.x = clamp(b.x, 80, 1080);
        b.state = "exposed";
        b.timer = 3;
        this.shake = 0.2;
        this.say("The core is open. Strike now!", 2);
      }
    } else if (b.state === "exposed" && b.timer <= 0) {
      b.state = "idle";
      b.timer = 0.8;
    }
    if (
      overlaps(this.player, b) &&
      b.state !== "intro" &&
      b.state !== "exposed"
    )
      this.damage(b.x + 50);
    const p = this.player,
      box = {
        x: p.facing === 1 ? p.x + p.w - 8 : p.x - 65,
        y: p.y - 12,
        w: 73,
        h: p.h + 26,
      };
    if (
      b.state === "exposed" &&
      p.attack > 0 &&
      b.lastAttack !== p.attackId &&
      overlaps(box, b)
    ) {
      b.lastAttack = p.attackId;
      b.hp--;
      b.hit = 0.2;
      this.audio.sfx("enemy");
      this.burst(b.x + 50, b.y + 50, "#efc66f", 12);
      if (b.hp <= 0) {
        b.state = "defeated";
        b.timer = 2.5;
        this.projectiles = [];
        p.invuln = 5;
        this.say("The heartseed is safe.", 4);
        this.storage.profile.completed = [
          ...new Set([...this.storage.profile.completed, 3]),
        ];
      }
    }
  }
  update(dt: number) {
    if (
      this.mode === "paused" ||
      this.mode === "transition" ||
      this.mode === "gameover" ||
      this.mode === "victory" ||
      (this.mode === "menu" && this.storage.profile.settings.reducedMotion)
    )
      return;
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.noticeTimer -= dt;
    if (this.noticeTimer <= 0) this.notice = "";
    for (const f of this.particles) {
      f.life -= dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 180 * dt;
    }
    this.particles = this.particles.filter((f) => f.life > 0);
    if (this.mode === "defeat") {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0 && this.run.lives <= 0) {
        this.mode = "gameover";
        this.storage.record(this.run, false);
        this.persist();
        this.emit();
      }
      return;
    }
    if (this.mode !== "playing") return;
    this.run.seconds += dt;
    const p = this.player,
      inp = this.input;
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurt = Math.max(0, p.hurt - dt);
    p.attack = Math.max(0, p.attack - dt);
    p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.dash = Math.max(0, p.dash - dt);
    p.coyote = p.grounded ? 0.12 : Math.max(0, p.coyote - dt);
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    if (inp.consume("jump")) p.jumpBuffer = 0.15;
    const direction =
      (inp.held.has("right") ? 1 : 0) - (inp.held.has("left") ? 1 : 0);
    if (p.hurt <= 0 && p.dash <= 0) {
      p.vx = approach(
        p.vx,
        direction * (this.storage.profile.settings.assist ? 225 : 235),
        (direction ? 1600 : 2100) * dt,
      );
      if (direction) p.facing = direction;
    }
    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = -555;
      p.grounded = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
      this.audio.sfx("jump");
      this.burst(p.x + 14, p.y + p.h, "#a5a785", 7);
    }
    if (
      (inp.consume("attack") || inp.held.has("attack")) &&
      p.attackCooldown <= 0 &&
      p.dash <= 0 &&
      p.hurt <= 0
    ) {
      p.attack = 0.2;
      p.attackCooldown = 0.32;
      p.attackId++;
      this.audio.sfx("attack");
    }
    if (inp.consume("dash") && p.dashCooldown <= 0 && p.hurt <= 0) {
      p.dash = 0.19;
      p.dashCooldown = 0.85;
      p.vx = p.facing * 620;
      p.vy = 0;
      this.audio.sfx("dash");
      this.burst(p.x + 14, p.y + 20, "#aaa98a", 8);
    }
    if (p.dash <= 0)
      p.vy = Math.min(
        780,
        p.vy + (p.vy < 0 && !inp.held.has("jump") ? 2400 : 1500) * dt,
      );
    const oldY = p.y;
    p.x += p.vx * dt;
    p.x = clamp(p.x, 0, this.level.width - p.w);
    for (const wall of this.level.platforms) {
      if (wall.h > 30 && overlaps(p, wall)) {
        if (p.vx > 0) p.x = wall.x - p.w;
        else if (p.vx < 0) p.x = wall.x + wall.w;
        p.vx = 0;
      }
    }
    p.y += p.vy * dt;
    const wasGrounded = p.grounded;
    p.grounded = false;
    for (const platform of this.level.platforms) {
      if (
        p.x + p.w > platform.x &&
        p.x < platform.x + platform.w &&
        p.vy >= 0 &&
        oldY + p.h <= platform.y + 2 &&
        p.y + p.h >= platform.y
      ) {
        p.y = platform.y - p.h;
        p.vy = 0;
        p.grounded = true;
        if (platform.conveyor) p.x += platform.conveyor * dt;
      }
    }
    if (p.grounded && !wasGrounded) this.audio.sfx("land");
    if (p.grounded && Math.abs(p.vx) > 50) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.17;
        this.audio.sfx("step");
        if (!this.storage.profile.settings.reducedMotion)
          this.burst(p.x + 14, 406, "#92937b", 2);
      }
    }
    if (p.y > 565) this.damage(p.x, true);
    if (this.mode !== "playing") {
      p.anim = "defeat";
      return;
    }
    p.anim =
      p.hurt > 0
        ? "hurt"
        : p.dash > 0
          ? "dodge"
          : p.attack > 0
            ? "attack"
            : !p.grounded
              ? p.vy < 0
                ? "jump"
                : "fall"
              : Math.abs(p.vx) > 25
                ? "run"
                : "idle";
    this.collect();
    for (const enemy of this.level.enemies) this.enemyStep(enemy, dt);
    if (this.mode !== "playing") {
      p.anim = "defeat";
      return;
    }
    for (const h of this.level.hazards) {
      const active =
        h.kind === "spikes" || (this.time + (h.phase || 0)) % 3.8 > 2.1;
      if (
        active &&
        overlaps(p, h.kind === "steam" ? { ...h, y: h.y - 56, h: h.h + 56 } : h)
      )
        this.damage(h.x + h.w / 2);
    }
    if (this.mode !== "playing") {
      p.anim = "defeat";
      return;
    }
    for (let i = 0; i < this.level.checkpoints.length; i++) {
      const cp = this.level.checkpoints[i];
      if (!cp.reached && p.x > cp.x) {
        cp.reached = true;
        this.checkpoint = i;
        p.hp = this.maxHp;
        this.audio.sfx("checkpoint");
        this.burst(cp.x, 370, "#ecc67d", 20);
        this.say("Checkpoint saved. Hearts restored.", 3);
        this.persist();
      }
    }
    for (const shot of this.projectiles) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      if (shot.kind === "debris") shot.vy += 320 * dt;
      shot.life -= dt;
      if (overlaps(p, shot)) {
        this.damage(shot.x);
        if (p.dash <= 0) shot.life = 0;
      }
    }
    if (this.mode !== "playing") {
      p.anim = "defeat";
      return;
    }
    this.projectiles = this.projectiles.filter(
      (s) =>
        s.life > 0 && s.y < 470 && s.x > -100 && s.x < this.level.width + 100,
    );
    this.bossStep(dt);
    if (this.levelIndex < 3 && overlaps(p, this.level.exit)) {
      if (this.levelSeeds >= this.level.required) {
        this.mode = "transition";
        this.run.levels++;
        this.run.lives = Math.min(5, this.run.lives + 1);
        this.storage.award(
          this.run,
          `level:${this.levelIndex}`,
          300 + this.levelIndex * 100,
          150 + this.levelIndex * 50,
        );
        this.storage.profile.completed = [
          ...new Set([...this.storage.profile.completed, this.levelIndex]),
        ];
        this.storage.achievement(
          ["burrow", "cavern", "factory"][this.levelIndex],
        );
        this.audio.stop();
        this.audio.sfx("checkpoint");
        this.persist();
        this.input.clear();
        this.emit();
      } else if (this.exitHint <= 0) {
        this.say(
          `Find ${this.level.required - this.levelSeeds} more seeds to open the passage.`,
          3,
        );
        this.exitHint = 3;
      }
    }
    this.exitHint -= dt;
    const desired = clamp(
      p.x - this.viewWidth * 0.34,
      0,
      Math.max(0, this.level.width - this.viewWidth),
    );
    this.camera = approach(
      this.camera,
      desired,
      Math.max(240, Math.abs(desired - this.camera) * 6) * dt,
    );
    this.nextEmit -= dt;
    if (this.nextEmit <= 0) {
      this.nextEmit = 0.1;
      this.emit();
    }
    this.nextSave -= dt;
    if (this.nextSave <= 0) {
      this.nextSave = 5;
      this.persist();
    }
    inp.end();
  }
  destroy() {
    this.input.destroy();
    this.audio.destroy();
  }
}
