import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const scratch = resolve("test/scratch");
await mkdir(scratch, { recursive: true });
const vite = process.env.SQUEEK_TOOLING_ROOT
  ? await import(
      pathToFileURL(
        resolve(process.env.SQUEEK_TOOLING_ROOT, "vite/dist/node/index.js"),
      ).href
    )
  : await import("vite");
await writeFile(
  resolve(scratch, "engine-entry.ts"),
  `export { Game, overlaps } from '../../src/game/engine';export { Persistence, playerLevel, COSMETICS } from '../../src/adapters/persistence';export { createLevel } from '../../src/game/levels';export { AudioEngine } from '../../src/game/audio';export { verifyDeployment } from '../../src/adapters/external';`,
);
await vite.build({
  configFile: false,
  logLevel: "error",
  build: {
    outDir: resolve(scratch, "engine-build"),
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: resolve(scratch, "engine-entry.ts"),
      formats: ["es"],
      fileName: () => "engine.mjs",
    },
  },
});
globalThis.window = new EventTarget();
globalThis.HTMLInputElement = class {};
globalThis.HTMLButtonElement = class {};
const db = new Map();
globalThis.localStorage = {
  getItem: (k) => db.get(k) ?? null,
  setItem: (k, v) => db.set(k, v),
  removeItem: (k) => db.delete(k),
};
const { Game, Persistence, createLevel, AudioEngine, playerLevel, COSMETICS } =
  await import(pathToFileURL(resolve(scratch, "engine-build/engine.mjs")).href);
const sounds = [];
const audio = {
  sfx: (s) => sounds.push(s),
  music() {},
  stop() {},
  destroy() {},
};
const make = () => {
  db.clear();
  const storage = new Persistence(),
    game = new Game(storage, audio);
  game.start();
  return game;
};
const results = [];
const check = (name, fn) => {
  try {
    const details = fn();
    results.push({ name, passed: true, ...(details && { details }) });
    console.log("PASS", name, details || "");
  } catch (e) {
    results.push({ name, passed: false, error: e.message });
    console.error("FAIL", name, e.message);
  }
};
const tick = (g, seconds = 1 / 120) => {
  for (let i = 0; i < Math.ceil(seconds * 120); i++) g.update(1 / 120);
};
const press = (g, a) => {
  g.input.pressed.add(a);
  g.input.held.add(a);
};
const release = (g, a) => g.input.held.delete(a);
check("Movement accelerates, stops, jumps, lands, attacks and dashes", () => {
  const g = make();
  tick(g, 0.2);
  const x = g.player.x;
  press(g, "right");
  tick(g, 0.35);
  assert(g.player.x > x + 50);
  assert(g.player.vx > 200);
  release(g, "right");
  tick(g, 0.2);
  assert.equal(g.player.vx, 0);
  const y = g.player.y;
  press(g, "jump");
  tick(g, 0.15);
  assert(g.player.y < y - 40);
  assert.equal(g.player.anim, "jump");
  release(g, "jump");
  tick(g, 0.8);
  assert(g.player.grounded);
  press(g, "attack");
  tick(g, 0.02);
  assert(g.player.attack > 0);
  release(g, "attack");
  press(g, "dash");
  tick(g, 0.02);
  assert(g.player.dash > 0);
  assert.equal(g.player.anim, "dodge");
  assert(g.player.dashCooldown > 0);
  g.destroy();
});
check("Coyote time and jump buffering forgive edge timing", () => {
  const g = make();
  tick(g, 0.2);
  g.player.coyote = 0.08;
  g.player.grounded = false;
  press(g, "jump");
  tick(g, 0.01);
  assert(g.player.vy < 0);
  release(g, "jump");
  tick(g, 0.9);
  g.player.y = 360;
  g.player.vy = 100;
  g.player.grounded = false;
  g.player.coyote = 0;
  press(g, "jump");
  tick(g, 0.15);
  assert(g.player.vy < 0);
  g.destroy();
});
check(
  "Damage protection, pause, checkpoints, retries and safe game-over",
  () => {
    const g = make();
    tick(g, 0.1);
    g.player.invuln = 0;
    g.damage(g.player.x + 10);
    const hp = g.player.hp;
    g.damage(g.player.x + 10);
    assert.equal(g.player.hp, hp);
    g.pause();
    const x = g.player.x,
      seconds = g.run.seconds;
    tick(g, 1);
    assert.equal(g.player.x, x);
    assert.equal(g.run.seconds, seconds);
    g.pause();
    g.checkpoint = 0;
    g.player.hp = 1;
    g.player.invuln = 0;
    g.damage(g.player.x);
    assert.equal(g.mode, "defeat");
    g.retry();
    assert.equal(g.player.hp, g.maxHp);
    assert.equal(g.player.x, g.level.checkpoints[0].x + 26);
    for (let i = 0; i < 3; i++) {
      g.player.hp = 1;
      g.player.invuln = 0;
      g.damage(g.player.x);
      if (g.run.lives > 0) g.retry();
    }
    tick(g, 1.1);
    assert.equal(g.mode, "gameover");
    g.retry();
    assert.equal(g.run.lives, 3);
    g.destroy();
  },
);
check(
  "Solid walls stop movement and one-way ledges catch a falling player",
  () => {
    const g = make();
    g.level.platforms = [
      { x: 0, y: 408, w: 500, h: 160 },
      { x: 190, y: 330, w: 36, h: 78 },
      { x: 280, y: 280, w: 110, h: 18 },
    ];
    g.level.enemies = [];
    g.level.items = [];
    g.level.hazards = [];
    press(g, "right");
    tick(g, 1);
    assert.equal(g.player.x, 162);
    release(g, "right");
    g.player.x = 300;
    g.player.y = 220;
    g.player.vy = 160;
    tick(g, 0.25);
    assert.equal(g.player.y, 246);
    assert(g.player.grounded);
    g.destroy();
  },
);
check(
  "Combat defeats a real enemy and each enemy telegraphs before attacking",
  () => {
    const g = make();
    tick(g, 0.1);
    const beetle = g.level.enemies[0];
    g.player.x = beetle.x - 50;
    g.player.invuln = 5;
    press(g, "attack");
    tick(g, 0.8);
    assert(beetle.dead);
    assert.equal(g.run.kills, 1);
    assert(g.storage.profile.achievements.includes("first-foe"));
    release(g, "attack");
    for (const kind of ["beetle", "moth", "sentry"]) {
      g.load(1);
      g.player.invuln = 10;
      const enemy = g.level.enemies.find((e) => e.kind === kind);
      g.level.enemies = [enemy];
      g.level.hazards = [];
      g.player.x = enemy.x - 100;
      g.player.y = 374;
      tick(g, 0.02);
      assert.equal(enemy.state, "tell", kind);
      assert.equal(g.projectiles.length, 0);
      tick(g, 0.3);
      assert.equal(enemy.state, "tell", kind);
      tick(g, 0.7);
      assert(
        kind === "sentry"
          ? g.projectiles.length > 0
          : ["charge", "rest"].includes(enemy.state),
        kind,
      );
    }
    g.destroy();
  },
);
check(
  "Spikes and timed steam hurt, dash protects, and lethal hazards cannot complete a level",
  () => {
    const g = make();
    g.level.enemies = [];
    g.level.items = [];
    g.player.x = 840;
    g.player.y = 374;
    g.player.invuln = 0;
    tick(g, 0.01);
    assert.equal(g.player.hp, 4);
    assert.equal(g.player.anim, "hurt");
    g.player.invuln = 0;
    g.player.dash = 0.1;
    const hp = g.player.hp;
    tick(g, 0.01);
    assert.equal(g.player.hp, hp);
    g.load(2);
    g.level.enemies = [];
    g.level.items = [];
    g.player.x = 650;
    g.player.y = 374;
    g.time = 0.5;
    tick(g, 0.02);
    assert.equal(g.player.hp, 5);
    g.time = 2.3;
    tick(g, 0.01);
    assert.equal(g.player.hp, 4);
    g.load(0);
    g.level.enemies = [];
    g.level.items = [];
    g.level.required = 0;
    g.player.x = 3055;
    g.player.y = 374;
    g.player.hp = 1;
    g.player.invuln = 0;
    g.level.hazards = [{ x: 3050, y: 394, w: 80, h: 14, kind: "spikes" }];
    g.level.checkpoints = [{ x: 3050, y: 408, reached: false }];
    tick(g, 0.01);
    assert.equal(g.mode, "defeat");
    assert.equal(g.checkpoint, -1);
    assert.equal(g.run.levels, 0);
    g.destroy();
  },
);
check(
  "Falling returns to the last flag, costs a heart, and keeps collected progress",
  () => {
    const g = make();
    g.checkpoint = 0;
    g.level.checkpoints[0].reached = true;
    g.player.y = 580;
    g.player.invuln = 0;
    const lives = g.run.lives;
    tick(g, 0.01);
    assert.equal(g.player.hp, 4);
    assert.equal(g.run.lives, lives);
    assert.equal(g.player.x, g.level.checkpoints[0].x + 30);
    assert(g.player.invuln > 1.9);
    g.destroy();
  },
);
check("Scoring persists and cannot be rewarded twice within a run", () => {
  const g = make();
  const p = g.storage.profile;
  g.storage.award(g.run, "test-award", 100, 50);
  g.storage.award(g.run, "test-award", 100, 50);
  assert.equal(p.points, 100);
  assert.equal(p.xp, 50);
  g.persist();
  const reloaded = new Persistence();
  assert.equal(reloaded.profile.points, 100);
  assert.equal(reloaded.profile.save.run.id, g.run.id);
  assert.equal(playerLevel(400), 3);
  assert(COSMETICS[0].unlocked(p));
  g.destroy();
});
check("Corrupt saves and unavailable storage degrade safely", () => {
  db.set("squeek-arena-v1", "{broken");
  const bad = new Persistence();
  assert.equal(bad.profile.points, 0);
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
  };
  const blocked = new Persistence();
  assert(blocked.unavailable);
  blocked.write();
  assert(blocked.unavailable);
  globalThis.localStorage = previous;
});
check("Audio failures are harmless", () => {
  const a = new AudioEngine(new Persistence().profile.settings);
  a.sfx("jump");
  a.sfx("boss");
  a.sfx("victory");
  a.destroy();
});
check(
  "Three distinct worlds contain designed content and a separate boss arena",
  () => {
    for (let i = 0; i < 3; i++) {
      const l = createLevel(i);
      assert(l.width >= 3000);
      assert(l.items.filter((s) => s.kind === "seed").length >= 30);
      assert(l.enemies.length >= 5);
      assert(l.platforms.length >= 10);
      assert(l.checkpoints.length >= 2);
      assert(l.hazards.length >= 3);
      assert.equal(l.items.filter((i) => i.kind === "relic").length, 1);
    }
    const b = createLevel(3);
    assert.equal(b.theme, "boss");
    assert(b.width > 1000);
    assert.equal(b.enemies.length, 0);
  },
);

// A deterministic player agent drives the exact same input and physics as the UI.
// It never changes position, health, inventory, damage or completion state.
function walkWorld(g, maxSeconds = 160) {
  let lastJump = -1,
    stuckTime = 0,
    lastX = g.player.x,
    maxX = 0,
    returns = 0;
  const trace = [];
  for (let frame = 0; frame < maxSeconds * 120; frame++) {
    if (g.mode === "transition")
      return {
        time: +g.run.seconds.toFixed(2),
        seeds: g.levelSeeds,
        kills: g.run.kills,
        deaths: g.run.deaths,
        maxX: Math.floor(maxX),
      };
    if (g.mode === "defeat" || g.mode === "gameover") {
      g.retry();
      returns++;
      if (returns > 12) break;
    }
    const p = g.player,
      l = g.level;
    g.input.held.add("right");
    g.input.held.add("attack");
    // Jump to optional ledges, over floor hazards and across gaps.
    const floor = l.platforms.find(
      (s) =>
        s.h > 30 &&
        p.x + p.w > s.x &&
        p.x < s.x + s.w &&
        Math.abs(p.y + p.h - s.y) < 5,
    );
    const standing = l.platforms.find(
      (s) =>
        p.x + p.w > s.x && p.x < s.x + s.w && Math.abs(p.y + p.h - s.y) < 5,
    );
    const ledge = l.platforms
      .filter(
        (s) =>
          s.h < 30 &&
          s.x > p.x + 40 &&
          s.x < p.x + 140 &&
          s.y < (standing?.y ?? 408) - 20 &&
          s.y >= (standing?.y ?? 408) - 110,
      )
      .sort((a, b) => a.x - b.x)[0];
    const edge = standing && standing.x + standing.w - (p.x + p.w) < 65;
    const hazard = l.hazards.some(
      (h) => h.x > p.x - 10 && h.x < p.x + 95 && h.y > p.y + p.h - 40,
    );
    const foe = l.enemies.some(
      (e) => !e.dead && e.kind !== "moth" && e.x > p.x + 10 && e.x < p.x + 75,
    );
    if (
      p.grounded &&
      (ledge || edge || hazard || foe || stuckTime > 0.3) &&
      frame - lastJump > 35
    ) {
      press(g, "jump");
      lastJump = frame;
      stuckTime = 0;
    }
    if (frame - lastJump > 65) release(g, "jump");
    // Dash only over wide open gaps, once already airborne.
    if (
      !p.grounded &&
      p.vy > -140 &&
      p.vy < 220 &&
      !l.platforms.some(
        (s) => s.h > 30 && p.x + 45 >= s.x && p.x + 45 < s.x + s.w,
      ) &&
      p.dashCooldown <= 0
    )
      press(g, "dash");
    if (Math.abs(p.x - lastX) < 0.05) stuckTime += 1 / 120;
    else stuckTime = 0;
    lastX = p.x;
    maxX = Math.max(maxX, p.x);
    if (frame % 120 === 0)
      trace.push({
        t: frame / 120,
        x: Math.round(p.x),
        y: Math.round(p.y),
        hp: p.hp,
        seeds: g.levelSeeds,
      });
    g.update(1 / 120);
  }
  throw Error(
    `Agent did not finish ${g.level.name}: ${JSON.stringify({ x: g.player.x, y: g.player.y, seeds: g.levelSeeds, returns, mode: g.mode, trace: trace.slice(-12) })}`,
  );
}
const adventure = make();
for (let level = 0; level < 3; level++)
  check(
    `World ${level + 1} is completable using movement, jump and combat inputs`,
    () => {
      if (level > 0) adventure.continueLevel();
      assert.equal(adventure.levelIndex, level);
      const details = walkWorld(adventure);
      assert.equal(adventure.mode, "transition");
      assert(adventure.levelSeeds >= adventure.level.required);
      assert(adventure.storage.profile.completed.includes(level));
      return details;
    },
  );
check("Saving at a completed world resumes in the next world", () => {
  if (adventure.mode !== "transition")
    throw Error("World traversal did not complete");
  adventure.persist();
  const s = new Persistence();
  assert.equal(s.profile.save.level, 3);
  assert.equal(s.profile.save.checkpoint, -1);
});
check(
  "Full adventure ends in boss victory, rewards and a real local score",
  () => {
    const g = adventure;
    g.continueLevel();
    assert.equal(g.levelIndex, 3);
    let exposed = 0,
      slam = 0,
      charge = 0,
      phaseTwo = false,
      loops = 0;
    const states = new Set();
    for (let i = 0; i < 240 * 120 && g.mode !== "victory"; i++) {
      if (g.mode === "defeat" || g.mode === "gameover") {
        g.retry();
        loops++;
        if (loops > 8) break;
      }
      const p = g.player,
        b = g.boss;
      states.add(b.state);
      if (b.state === "exposed") exposed++;
      if (b.state === "slam") slam++;
      if (b.state === "charge") charge++;
      if (b.phase === 2) phaseTwo = true;
      g.input.held.delete("left");
      g.input.held.delete("right");
      g.input.held.add("attack");
      const dx = b.x + b.w / 2 - (p.x + p.w / 2);
      if (b.state === "exposed") {
        if (Math.abs(dx) > 65 || p.facing !== (Math.sign(dx) || 1))
          g.input.held.add(dx > 0 ? "right" : "left");
      } else if (b.state === "tell-charge" || b.state === "charge") {
        if (Math.abs(dx) < 170 && p.grounded) press(g, "jump");
        else if (p.y < 350) release(g, "jump");
      } else if (b.state === "tell-slam" && b.timer < 0.35 && p.grounded) {
        press(g, "jump");
      } else if (p.grounded) release(g, "jump");
      const shock = g.projectiles.some(
        (s) => s.kind === "shock" && Math.abs(s.x - p.x) < 120,
      );
      if (shock && p.grounded) press(g, "jump");
      if (p.grounded && p.x < 325 && p.x > 140 && b.state === "exposed")
        press(g, "jump");
      g.update(1 / 120);
    }
    assert(
      exposed > 0 && slam > 0 && charge > 0 && phaseTwo,
      `states: ${[...states]}`,
    );
    assert.equal(
      g.mode,
      "victory",
      `boss hp ${g.boss.hp}, retries ${loops}, player x ${g.player.x}`,
    );
    assert.equal(g.storage.profile.victories, 1);
    assert(g.storage.profile.achievements.includes("heartseed"));
    assert(
      COSMETICS.find((s) => s.id === "champion").unlocked(g.storage.profile),
    );
    assert.equal(g.storage.profile.scores.length, 1);
    assert.equal(g.storage.profile.save, null);
    return {
      seconds: Math.round(g.run.seconds),
      retries: loops,
      states: [...states],
      score: g.run.score,
    };
  },
);
await writeFile(
  resolve(scratch, "earned-profile.json"),
  JSON.stringify(adventure.storage.profile, null, 2),
);
adventure.destroy();
await writeFile(
  resolve(scratch, "engine-results.json"),
  JSON.stringify(results, null, 2),
);
if (results.some((r) => !r.passed)) process.exitCode = 1;
