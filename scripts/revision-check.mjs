import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { playwright, serve, chromiumOptions } from "./qa-utils.mjs";

// Regression checks for the four reported revision findings. Fixtures and the
// clock are test-only; production never receives a provider or invented data.
const out = resolve("test/scratch/revision");
await mkdir(out, { recursive: true });
const results = [];
const check = async (name, fn) => {
  try {
    const detail = await fn();
    results.push({ name, passed: true, ...(detail && { detail }) });
    console.log("PASS", name, detail || "");
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    console.error("FAIL", name, error.message);
  }
};
const vite = process.env.SQUEEK_TOOLING_ROOT
  ? await import(
      pathToFileURL(
        resolve(process.env.SQUEEK_TOOLING_ROOT, "vite/dist/node/index.js"),
      ).href
    )
  : await import("vite");
await writeFile(
  resolve(out, "entry.ts"),
  `export { Game } from '../../../src/game/engine'; export { Persistence } from '../../../src/adapters/persistence';`,
);
await vite.build({
  configFile: false,
  logLevel: "error",
  build: {
    outDir: resolve(out, "engine"),
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: resolve(out, "entry.ts"),
      formats: ["es"],
      fileName: () => "engine.mjs",
    },
  },
});
globalThis.window = new EventTarget();
for (const name of [
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "HTMLSelectElement",
  "HTMLButtonElement",
])
  globalThis[name] = class {};
const db = new Map();
globalThis.localStorage = {
  getItem: (key) => db.get(key) ?? null,
  setItem: (key, value) => db.set(key, value),
};
const { Game, Persistence } = await import(
  pathToFileURL(resolve(out, "engine/engine.mjs")).href
);
const make = () => {
  db.clear();
  const g = new Game(new Persistence(), {
    sfx() {},
    music() {},
    stop() {},
    destroy() {},
  });
  g.start();
  return g;
};
const tick = (g, count) => {
  for (let i = 0; i < count; i++) g.update(1 / 120);
};
const escape = (repeat = false, type = "keydown") => {
  const event = new Event(type, { cancelable: true });
  Object.defineProperties(event, {
    code: { value: "Escape" },
    repeat: { value: repeat },
  });
  window.dispatchEvent(event);
};

await check("Every README documentation link resolves", async () => {
  const source = await readFile("README.md", "utf8");
  const links = [...source.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/g)].map(
    (m) => m[1],
  );
  const missing = [];
  for (const path of links) {
    try {
      await access(resolve(path));
    } catch {
      missing.push(path);
    }
  }
  assert.equal(
    missing.length,
    0,
    `Missing documentation: ${missing.join(", ")}`,
  );
  return { checked: links };
});
await check(
  "Holding Escape leaves play paused until a second physical press",
  () => {
    const g = make();
    try {
      escape();
      assert.equal(g.mode, "paused");
      const seconds = g.run.seconds;
      for (let i = 0; i < 12; i++) {
        escape(true);
        tick(g, 6);
        assert.equal(g.mode, "paused");
      }
      assert.equal(g.run.seconds, seconds);
      escape(false, "keyup");
      escape();
      assert.equal(g.mode, "playing");
      escape(true);
      assert.equal(g.mode, "playing");
    } finally {
      g.destroy();
    }
  },
);
await check("Boss charge advice matches measured ground-jump clearance", () => {
  const g = make();
  try {
    g.load(3);
    tick(g, 30);
    assert(g.player.grounded);
    g.input.held.add("jump");
    g.input.pressed.add("jump");
    let minFeet = g.player.y + g.player.h;
    for (let i = 0; i < 100; i++) {
      tick(g, 1);
      minFeet = Math.min(minFeet, g.player.y + g.player.h);
    }
    assert(
      minFeet > g.boss.y,
      "A ground jump still overlaps the boss collider",
    );
    g.boss.state = "idle";
    g.boss.timer = 0;
    g.boss.cycle = 2;
    tick(g, 1);
    assert.equal(g.boss.state, "tell-charge");
    const detail = {
      minPlayerFeet: minFeet,
      bossTop: g.boss.y,
      advice: g.notice,
    };
    console.log("Boss measurement", JSON.stringify(detail));
    assert.equal(g.notice, "Charge incoming. Dash through!");
    g.boss.state = "idle";
    g.boss.timer = 0;
    g.boss.cycle = 0;
    tick(g, 1);
    assert.equal(g.notice, "Ground slam incoming. Get ready to jump!");
    return detail;
  } finally {
    g.destroy();
  }
});

let browser, server;
try {
  await check(
    "Wheel retry enables after its 10-second cooldown without another poll",
    async () => {
      const { chromium } = await playwright();
      server = await serve();
      browser = await chromium.launch(chromiumOptions());
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      page.setDefaultTimeout(8000);
      let requests = 0;
      await page.clock.install();
      await page.route("https://api.squeekchain.com/v1/status", (route) => {
        requests++;
        return route.fulfill({
          status: 429,
          headers: { "retry-after": "10" },
          json: { error: "rate_limited" },
        });
      });
      await page.goto(server.url);
      const retry = page.getByRole("button", {
        name: "Retry activity",
        exact: true,
      });
      await retry.waitFor();
      assert.equal(await retry.isDisabled(), true);
      await page.clock.fastForward(9000);
      assert.equal(await retry.isDisabled(), true);
      await page.clock.fastForward(2000);
      assert.equal(
        requests,
        1,
        "Cooldown expiry must not send an automatic read",
      );
      assert.equal(
        await retry.isEnabled(),
        true,
        "Retry must enable after 10 seconds without unrelated rerenders",
      );
      await retry.click();
      await page.waitForFunction(
        () => document.querySelector(".wheel-panel button")?.disabled === true,
      );
      assert.equal(requests, 2);
      await page.close();
      return { requests, elapsedMs: 11000 };
    },
  );
} finally {
  await browser?.close();
  await server?.close();
  await writeFile(
    resolve(out, "results.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
}
if (results.some((r) => !r.passed)) process.exitCode = 1;
