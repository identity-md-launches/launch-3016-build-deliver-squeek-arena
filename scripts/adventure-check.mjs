import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { playwright, serve, chromiumOptions } from "./qa-utils.mjs";
const mobile = process.argv.includes("--mobile");
const out = resolve(
  mobile ? "test/scratch/adventure-mobile" : "test/scratch/adventure",
);
await mkdir(out, { recursive: true });
const vite = process.env.SQUEEK_TOOLING_ROOT
  ? await import(
      pathToFileURL(
        resolve(process.env.SQUEEK_TOOLING_ROOT, "vite/dist/node/index.js"),
      ).href
    )
  : await import("vite");
// A test-only build exposes the actual engine reference on emit. The shipped
// production source/export have no test hook. Rendering, UI and physics are unchanged.
await vite.build({
  configFile: resolve("vite.config.mjs"),
  configLoader: "runner",
  logLevel: "error",
  plugins: [
    {
      name: "qa-engine-reference",
      enforce: "pre",
      transform(source, id) {
        if (id.endsWith("/src/game/engine.ts"))
          return source.replace(
            "emit() {",
            "emit() {\n(window as any).__arena = this;",
          );
      },
    },
  ],
  build: { outDir: resolve(out, "export"), emptyOutDir: true },
});
const source = await readFile("scripts/validate.mjs", "utf8");
const walk = source.slice(
  source.indexOf("function walkWorld("),
  source.indexOf("const adventure = make();"),
);
assert(walk.includes("function walkWorld"));
const { chromium } = await playwright(),
  server = await serve(resolve(out, "export")),
  browser = await chromium.launch(chromiumOptions()),
  results = [];
try {
  const page = await browser.newPage({
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1000 },
    ...(mobile ? { hasTouch: true, isMobile: true } : {}),
  });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(server.url);
  await page
    .getByRole("button", { name: "Start adventure", exact: true })
    .click();
  await page.waitForFunction(() => window.__arena?.mode === "playing");
  for (let i = 0; i < 3; i++) {
    await page
      .locator(".in-game-location strong")
      .filter({
        hasText: ["Burrow Entrance", "Crystal Caverns", "Forgotten Factory"][i],
      })
      .waitFor();
    await page.screenshot({
      path: resolve(out, `world-${i + 1}.png`),
      fullPage: true,
    });
    const detail = await page.evaluate(
      `(()=>{const press=(g,a)=>{g.input.pressed.add(a);g.input.held.add(a);};const release=(g,a)=>g.input.held.delete(a);${walk};return walkWorld(window.__arena);})()`,
    );
    await page.getByText(`World ${i + 1} complete`, { exact: true }).waitFor();
    results.push({
      name: `World ${i + 1}: normal-input traversal and completion UI`,
      passed: true,
      detail,
    });
    await page
      .getByRole("button", {
        name: i === 2 ? "Face the Iron Gnaw" : "Continue adventure",
        exact: true,
      })
      .click();
  }
  await page
    .getByRole("progressbar", { name: "Iron Gnaw health", exact: true })
    .waitFor();
  async function driveBoss(stopAtExposure = false) {
    return page.evaluate(
      ({ stopAtExposure }) => {
        const g = window.__arena,
          press = (a) => {
            g.input.pressed.add(a);
            g.input.held.add(a);
          };
        let retries = 0;
        for (let i = 0; i < 240 * 120 && g.mode !== "victory"; i++) {
          if (g.mode === "defeat" || g.mode === "gameover") {
            g.retry();
            if (++retries > 8) break;
          }
          const p = g.player,
            b = g.boss;
          if (stopAtExposure && b.state === "exposed") {
            g.emit();
            return { mode: g.mode, bossHp: b.hp };
          }
          g.input.held.delete("left");
          g.input.held.delete("right");
          g.input.held.add("attack");
          const dx = b.x + b.w / 2 - (p.x + p.w / 2);
          if (b.state === "exposed") {
            if (Math.abs(dx) > 65 || p.facing !== (Math.sign(dx) || 1))
              g.input.held.add(dx > 0 ? "right" : "left");
          } else if (b.state === "tell-charge" || b.state === "charge") {
            if (Math.abs(dx) < 170 && p.grounded) press("jump");
            else if (p.y < 350) g.input.held.delete("jump");
          } else if (b.state === "tell-slam" && b.timer < 0.35 && p.grounded)
            press("jump");
          else if (p.grounded) g.input.held.delete("jump");
          if (
            g.projectiles.some(
              (s) => s.kind === "shock" && Math.abs(s.x - p.x) < 120,
            ) &&
            p.grounded
          )
            press("jump");
          if (p.grounded && p.x < 325 && p.x > 140 && b.state === "exposed")
            press("jump");
          g.update(1 / 120);
        }
        g.emit();
        return { mode: g.mode, bossHp: g.boss.hp, retries, score: g.run.score };
      },
      { stopAtExposure },
    );
  }
  await driveBoss(true);
  await page.getByText("Core open", { exact: true }).waitFor();
  await page.screenshot({
    path: resolve(out, "boss-core.png"),
    fullPage: true,
  });
  const victory = await driveBoss();
  assert.equal(victory.mode, "victory");
  assert.equal(victory.bossHp, 0);
  await page.getByText("A very small legend.", { exact: true }).waitFor();
  const beforeCelebration = await page
    .locator(".victory-overlay .pixel-art")
    .screenshot();
  const frozenSeconds = await page.evaluate(() => window.__arena.run.seconds);
  await page.waitForTimeout(200);
  const afterCelebration = await page
    .locator(".victory-overlay .pixel-art")
    .screenshot();
  assert(
    !beforeCelebration.equals(afterCelebration),
    "Victory portrait must animate",
  );
  assert.equal(
    await page.evaluate(() => window.__arena.run.seconds),
    frozenSeconds,
  );
  victory.celebrationAnimated = true;
  victory.runClockFrozen = true;
  await page.screenshot({
    path: resolve(out, "victory-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: resolve(out, "victory-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page
    .getByRole("button", { name: "See your rewards", exact: true })
    .click();
  await page.getByRole("heading", { name: "Character", exact: true }).waitFor();
  assert(
    await page
      .locator(".cosmetic")
      .filter({ hasText: "Champion crown" })
      .isEnabled(),
  );
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Leaderboard", exact: true })
    .click();
  await page.locator("tbody tr").waitFor();
  assert((await page.locator("tbody").innerText()).includes("Victory"));
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Character", exact: true })
    .click();
  assert(
    await page
      .locator(".cosmetic")
      .filter({ hasText: "Champion crown" })
      .isEnabled(),
  );
  results.push({
    name: "Boss combat → defeat sequence → victory → rewards → real local score → refresh",
    passed: true,
    detail: victory,
  });
  // Targeted UI fixture after the genuine completed run: exercise the terminal
  // failure/retry controls without changing the earned victory above.
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Play", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start adventure", exact: true })
    .click();
  await page.evaluate(() => {
    const g = window.__arena;
    g.run.lives = 1;
    g.player.hp = 1;
    g.player.invuln = 0;
    g.damage(g.player.x + 1);
  });
  await page.getByText("Down, but never out.", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Retry checkpoint", exact: true })
    .click();
  assert(
    await page.evaluate(
      () =>
        window.__arena.mode === "playing" &&
        window.__arena.run.lives === 3 &&
        window.__arena.player.hp === window.__arena.maxHp,
    ),
  );
  await page
    .getByRole("button", { name: "Pause adventure", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restart level", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pause adventure", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save and return to menu", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start a new adventure", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Keep current adventure", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continue adventure", exact: true })
    .waitFor();
  const previousId = await page.evaluate(() => window.__arena.run.id);
  await page
    .getByRole("button", { name: "Start a new adventure", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start new adventure", exact: true })
    .click();
  assert.notEqual(await page.evaluate(() => window.__arena.run.id), previousId);
  results.push({
    name: "Game-over retry, restart and new-adventure cancel/confirm buttons",
    passed: true,
  });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
  await server.close();
  await writeFile(
    resolve(out, "results.json"),
    JSON.stringify(results, null, 2),
  );
}
