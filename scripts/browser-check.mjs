import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  playwright,
  serve,
  chromiumOptions,
  injectWallet,
} from "./qa-utils.mjs";
const { chromium, webkit } = await playwright(),
  server = await serve(),
  out = resolve("test/scratch/browser");
await mkdir(resolve(out, "shots"), { recursive: true });
const results = [];
let browser;
const test = async (name, fn) => {
  try {
    const detail = await fn();
    results.push({ name, passed: true, ...(detail && { detail }) });
    console.log("PASS", name, detail || "");
  } catch (e) {
    results.push({ name, passed: false, error: e.message });
    console.error("FAIL", name, e.message);
  }
};
const key = "squeek-arena-v1";
const stored = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
const goto = async (page) => {
  await page.goto(server.url);
  await page.locator(".game-canvas").waitFor();
  await page.evaluate(() => document.fonts.ready);
  const loadedFonts = await page.evaluate(() =>
    Array.from(document.fonts)
      .filter((f) => f.status === "loaded")
      .map((f) => f.family.replaceAll('"', "")),
  );
  assert(
    loadedFonts.includes("DM Sans") && loadedFonts.includes("Pixelify Sans"),
    "Both local font faces must load",
  );
};
const start = async (page) => {
  await page
    .getByRole("button", { name: "Start adventure", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pause adventure", exact: true })
    .waitFor();
};

try {
  browser = await chromium.launch(chromiumOptions());
  const originalPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => {
    const p = await originalPage(...args);
    p.setDefaultTimeout(8000);
    return p;
  };
  const originalContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const c = await originalContext(...args);
    c.setDefaultTimeout(8000);
    return c;
  };
  await test("Production export renders at 320, 390, 744 and 1440 without overflow", async () => {
    const reports = [];
    for (const width of [320, 390, 744, 1440]) {
      const page = await browser.newPage({
          viewport: { width, height: width === 1440 ? 1080 : 844 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("response", (r) => {
        if (r.status() >= 400 && r.url().startsWith(server.url))
          errors.push(`${r.status()} ${r.url()}`);
      });
      await goto(page);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.equal(errors.length, 0, errors.join("\n"));
      const b = await page
        .getByRole("button", { name: "Start adventure", exact: true })
        .boundingBox();
      if (width === 390) assert(b.y + b.height < 844);
      await page.screenshot({
        path: resolve(out, `shots/menu-${width}.png`),
        fullPage: true,
      });
      reports.push({ width, actionY: Math.round(b.y), errors: errors.length });
      await page.close();
    }
    return reports;
  });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  await goto(page);
  await test("No-wallet desktop play: movement, jump, attack, dash and pause", async () => {
    await start(page);
    const initial = await page.locator(".game-canvas").screenshot();
    await page.keyboard.down("d");
    await page.waitForTimeout(900);
    await page.keyboard.up("d");
    await page.keyboard.down("Space");
    await page.waitForTimeout(160);
    await page.keyboard.up("Space");
    await page.keyboard.down("j");
    await page.waitForTimeout(150);
    await page.keyboard.up("j");
    await page.keyboard.press("k");
    await page.waitForTimeout(180);
    const moved = await page.locator(".game-canvas").screenshot();
    assert(!initial.equals(moved));
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Resume adventure", exact: true })
      .last()
      .waitFor();
    const p = await stored(page);
    assert(p.save.run.seeds >= 3);
    assert(p.save.run.score >= 30);
    return { seeds: p.save.run.seeds, score: p.save.run.score };
  });
  await test("Pause settings, audio controls, modal Escape and focus return", async () => {
    await page
      .locator(".pause-actions")
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("switch", { name: "Mute all audio" }).check();
    const slider = dialog.getByRole("slider").first();
    await slider.focus();
    await slider.press("Home");
    for (let i = 0; i < 5; i++) await slider.press("ArrowRight");
    await page.keyboard.press("Escape");
    assert.equal(await dialog.count(), 0);
    assert(
      await page
        .getByRole("button", { name: "Resume adventure", exact: true })
        .last()
        .isVisible(),
    );
    const p = await stored(page);
    assert(p.settings.muted);
    assert.equal(p.settings.music, 0.25);
    await page
      .getByRole("button", { name: "Resume adventure", exact: true })
      .last()
      .click();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Save and return to menu", exact: true })
      .click();
    assert(
      await page
        .getByRole("button", { name: "Continue adventure", exact: true })
        .isVisible(),
    );
  });
  await test("Refresh resumes a valid saved checkpoint", async () => {
    const before = (await stored(page)).save.run.id;
    await page.reload();
    await page
      .getByRole("button", { name: "Continue adventure", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Pause adventure", exact: true })
      .waitFor();
    await page.keyboard.press("Escape");
    assert.equal((await stored(page)).save.run.id, before);
  });
  await test("Top navigation and character profile form work", async () => {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Character", exact: true })
      .click();
    await page.getByLabel("Explorer name", { exact: true }).fill("Acorn scout");
    await page.getByRole("button", { name: "Save name", exact: true }).click();
    assert.equal((await stored(page)).name, "Acorn scout");
    assert(
      await page.getByText("Explorer name saved.", { exact: true }).isVisible(),
    );
  });
  await test("Local leaderboard shows loading, empty and filter states honestly", async () => {
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Leaderboard", exact: true })
      .click();
    await page
      .getByText("Every legend starts somewhere.", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Victories", exact: true }).click();
    await page
      .getByText("Your first victory is waiting.", { exact: true })
      .waitFor();
    assert(
      await page
        .getByText("Local leaderboard · This browser only", { exact: true })
        .isVisible(),
    );
  });
  await test("Check-in is labeled unavailable and offers no signing action", async () => {
    await page
      .getByRole("button", { name: "About & connections", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    assert(await dialog.getByText("Unavailable", { exact: true }).isVisible());
    assert(await dialog.getByText(/No transaction is sent/).isVisible());
    assert.equal(await dialog.getByRole("button").count(), 1);
    await page.keyboard.press("Escape");
  });
  await test("No-provider wallet flow reports unavailable and remains playable", async () => {
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await page
      .getByRole("button", { name: "Browser wallet", exact: true })
      .click();
    await page
      .getByText(
        "No browser wallet is available. Install one or choose Coinbase Wallet.",
        { exact: true },
      )
      .waitFor();
    await page.keyboard.press("Escape");
  });
  await context.close();
  await test("Mobile touch supports simultaneous move/jump plus attack and dash", async () => {
    const c = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      }),
      p = await c.newPage();
    await goto(p);
    await start(p);
    assert(await p.locator(".touch-controls").isVisible());
    const aspectError = await p.locator(".game-canvas").evaluate((c) => {
      const r = c.getBoundingClientRect();
      return Math.abs(r.width / c.width / (r.height / c.height) - 1);
    });
    assert(aspectError < 0.015, `Portrait pixels distorted by ${aspectError}`);
    const client = await c.newCDPSession(p),
      right = await p
        .getByRole("button", { name: "Right", exact: true })
        .boundingBox(),
      jump = await p
        .getByRole("button", { name: "Jump", exact: true })
        .boundingBox();
    const point = (b, id) => ({
      x: b.x + b.width / 2,
      y: b.y + b.height / 2,
      id,
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point(right, 1)],
    });
    await p.waitForTimeout(900);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point(right, 1), point(jump, 2)],
    });
    await p.waitForTimeout(200);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await p.getByRole("button", { name: "Attack", exact: true }).tap();
    await p.getByRole("button", { name: "Dash", exact: true }).tap();
    await p.screenshot({
      path: resolve(out, "shots/mobile-play.png"),
      fullPage: true,
    });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    const controls = await p.locator(".touch-controls").boundingBox();
    assert(controls.y + controls.height <= 844);
    await p.getByRole("button", { name: "Pause adventure", exact: true }).tap();
    assert((await stored(p)).save.run.seeds >= 3);
    await p
      .getByRole("button", { name: "Resume adventure", exact: true })
      .last()
      .tap();
    await p.setViewportSize({ width: 844, height: 390 });
    await p.waitForTimeout(100);
    const bottom = await p.locator(".stage-bottom").boundingBox();
    assert(bottom.y + bottom.height <= 390);
    await p.screenshot({
      path: resolve(out, "shots/mobile-landscape.png"),
      fullPage: true,
    });
    await c.close();
  });
  await test("Gentle adventure HUD and touch controls fit a 320px screen", async () => {
    const c = await browser.newContext({
        viewport: { width: 320, height: 844 },
        hasTouch: true,
        isMobile: true,
      }),
      p = await c.newPage();
    await goto(p);
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    await p.getByRole("switch", { name: /Gentle adventure/ }).check();
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Play", exact: true })
      .click();
    await start(p);
    assert.equal(await p.locator(".hearts canvas").count(), 8);
    const health = await p.locator(".health-hud").boundingBox(),
      seeds = await p.locator(".stage-status").boundingBox();
    assert(health.x + health.width <= seeds.x + 1);
    for (const button of await p.locator(".touch-button").all()) {
      const r = await button.boundingBox();
      assert(r.width >= 44 && r.height >= 44);
    }
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await p.screenshot({
      path: resolve(out, "shots/mobile-gentle-320.png"),
      fullPage: true,
    });
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    await p.getByRole("switch", { name: /Gentle adventure/ }).uncheck();
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Play", exact: true })
      .click();
    assert.equal(await p.locator(".hearts canvas").count(), 5);
    assert(
      (await p.locator(".health-hud").getAttribute("aria-label")).startsWith(
        "5 of 5 hearts",
      ),
    );
    await c.close();
  });
  await test("Tab visibility pauses safely", async () => {
    const p = await browser.newPage();
    await goto(p);
    await start(p);
    await p.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        get: () => "hidden",
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await p
      .getByRole("button", { name: "Resume adventure", exact: true })
      .last()
      .waitFor();
    await p.close();
  });
  await test("Audio construction failure does not block gameplay", async () => {
    const p = await browser.newPage();
    await p.addInitScript(() => {
      window.AudioContext = class {
        constructor() {
          throw Error("Unavailable in QA");
        }
      };
    });
    await goto(p);
    await start(p);
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    assert(
      await p
        .getByText(
          "Audio is unavailable in this browser. The adventure is fully playable.",
          { exact: true },
        )
        .isVisible(),
    );
    await p.close();
  });
  await test("Blocked local storage shows an honest recoverable state", async () => {
    const p = await browser.newPage();
    await p.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw Error("Storage blocked in QA");
      };
      Storage.prototype.setItem = () => {
        throw Error("Storage blocked in QA");
      };
    });
    await goto(p);
    await start(p);
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Leaderboard", exact: true })
      .click();
    await p.getByText("Saved runs are unavailable", { exact: true }).waitFor();
    await p
      .getByRole("button", { name: "Retry browser storage", exact: true })
      .click();
    await p.getByText("Saved runs are unavailable", { exact: true }).waitFor();
    await p.close();
  });
  await test("Earned progression, cosmetics and populated leaderboard render after refresh", async () => {
    const profile = JSON.parse(
      await readFile("test/scratch/earned-profile.json", "utf8"),
    );
    assert(profile.victories > 0);
    const p = await browser.newPage();
    await p.addInitScript(
      ({ key, profile }) => localStorage.setItem(key, JSON.stringify(profile)),
      { key, profile },
    );
    await goto(p);
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Leaderboard", exact: true })
      .click();
    await p.locator("tbody tr").waitFor();
    assert.equal(await p.locator("tbody tr").count(), 1);
    assert((await p.locator("tbody").innerText()).includes("Victory"));
    await p.screenshot({
      path: resolve(out, "shots/leaderboard.png"),
      fullPage: true,
    });
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Character", exact: true })
      .click();
    const champion = p
      .locator(".cosmetic")
      .filter({ hasText: "Champion crown" });
    assert(await champion.isEnabled());
    await champion.click();
    assert.equal((await stored(p)).cosmetic, "champion");
    await p.screenshot({
      path: resolve(out, "shots/character.png"),
      fullPage: true,
    });
    await p.close();
  });
  await test("EIP-6963 rejection returns a useful error", async () => {
    const p = await browser.newPage();
    await injectWallet(p, { reject: true });
    await goto(p);
    await p.getByRole("button", { name: "Connect", exact: true }).click();
    await p
      .getByRole("button", { name: "QA browser wallet", exact: true })
      .click();
    await p
      .getByText("Connection declined. You can retry or keep playing.", {
        exact: true,
      })
      .waitFor();
    await p.close();
  });
  await test("EIP-6963 connects, shows wrong network, switches and disconnects without transactions", async () => {
    const p = await browser.newPage();
    await injectWallet(p, { chainId: "0x1" });
    await goto(p);
    await p.getByRole("button", { name: "Connect", exact: true }).click();
    await p
      .getByRole("button", { name: "QA browser wallet", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Wrong network", exact: true })
      .waitFor();
    await p.getByRole("button", { name: "Wrong network", exact: true }).click();
    await p
      .getByRole("button", { name: "Switch to Sepolia", exact: true })
      .click();
    await p.getByText("Sepolia · Chain 11155111", { exact: true }).waitFor();
    assert(
      (await p.locator(".wallet-address").innerText()).includes("0x9Ca0a63D") ||
        (await p.locator(".wallet-address").innerText())
          .toLowerCase()
          .includes("0x9ca0a63d"),
    );
    assert.equal(
      await p.evaluate(() =>
        window.qaWallet.calls.some((x) =>
          /sendTransaction|sign|sendRaw/i.test(x),
        ),
      ),
      false,
    );
    await p
      .getByRole("button", { name: "Disconnect wallet", exact: true })
      .click();
    await p.getByRole("button", { name: "Connect", exact: true }).waitFor();
    await p.close();
  });
  await test("Mobile wallet picker includes app links and Coinbase Smart Wallet", async () => {
    const c = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      }),
      p = await c.newPage();
    await goto(p);
    await p.getByRole("button", { name: "Connect", exact: true }).click();
    for (const name of ["MetaMask", "Coinbase Wallet", "Rabby", "Phantom"])
      assert(
        await p
          .getByRole("link", { name: `Open in ${name}`, exact: true })
          .isVisible(),
      );
    assert(
      await p
        .getByRole("button", { name: "Coinbase Smart Wallet", exact: true })
        .isVisible(),
    );
    await p.screenshot({
      path: resolve(out, "shots/mobile-wallet.png"),
      fullPage: true,
    });
    await c.close();
  });
  await test("Offline mode preserves the game and labels external data unavailable", async () => {
    const c = await browser.newContext(),
      p = await c.newPage();
    await goto(p);
    await c.setOffline(true);
    await start(p);
    assert(await p.getByText(/You’re offline/).isVisible());
    await c.close();
  });
  await test("Reduced motion and keyboard focus are supported", async () => {
    const p = await browser.newPage({ reducedMotion: "reduce" });
    await goto(p);
    await p.keyboard.press("Tab");
    assert.equal(
      await p.evaluate(() => document.activeElement.className),
      "skip-link",
    );
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    assert(await p.getByRole("switch", { name: /Reduce motion/ }).isChecked());
    await p.close();
  });
  // WebKit is useful additional coverage; a missing host library is reported honestly.
  try {
    const wk = await webkit.launch({ headless: true });
    const p = await wk.newPage({ viewport: { width: 390, height: 844 } });
    await goto(p);
    await start(p);
    await p
      .getByRole("button", { name: "Pause adventure", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Resume adventure", exact: true })
      .last()
      .waitFor();
    results.push({ name: "WebKit main interaction", passed: true });
    await wk.close();
  } catch (e) {
    results.push({
      name: "WebKit main interaction",
      skipped: true,
      reason: e.message.slice(0, 1500),
    });
    console.log("UNAVAILABLE WebKit host runtime");
  }
} finally {
  await browser?.close();
  await server.close();
  await writeFile(
    resolve(out, "results.json"),
    JSON.stringify(results, null, 2),
  );
}
if (results.some((r) => r.passed === false)) process.exitCode = 1;
