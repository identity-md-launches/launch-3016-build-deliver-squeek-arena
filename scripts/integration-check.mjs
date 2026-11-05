import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  playwright,
  serve,
  chromiumOptions,
  injectWallet,
} from "./qa-utils.mjs";

// Public holder observed in the official API. Used only with the clearly named,
// test-only provider; this script has no signing or transaction implementation.
const holder = "0x9ca0a63dcea0592859bf78083c3a455fde747d31";
const api = "https://api.squeekchain.com";
const out = resolve("test/scratch/integration");
await mkdir(out, { recursive: true });
const fixtures = new Map(),
  results = [];
function capture(path) {
  if (fixtures.has(path)) return fixtures.get(path);
  const data = JSON.parse(
    execFileSync(
      "curl",
      ["--fail", "--silent", "--show-error", "--max-time", "25", api + path],
      { encoding: "utf8", timeout: 27000, maxBuffer: 4 * 1024 * 1024 },
    ),
  );
  fixtures.set(path, data);
  return data;
}
const check = async (name, fn) => {
  try {
    const detail = await fn();
    results.push({ name, passed: true, ...(detail && { detail }) });
    console.log("PASS", name);
  } catch (e) {
    results.push({ name, passed: false, error: e.message });
    console.error("FAIL", name, e.message);
  }
};
let browser, server;
try {
  await check(
    "Live official status, deployment, ownership and metadata reads",
    async () => {
      const status = capture("/v1/status"),
        economy = capture("/v1/economy/state");
      assert.equal(status.schemaVersion, 1);
      assert.equal(economy.status, "available");
      assert.equal(economy.chain.chainId, "11155111");
      const first = `/v1/accounts/${holder}?limit=12`,
        account = capture(first);
      assert.equal(account.status, "available");
      assert.equal(account.account, holder);
      assert.equal(account.tokens.length, 12);
      const pages = [account];
      if (account.nextCursor)
        pages.push(
          capture(`${first}&cursor=${encodeURIComponent(account.nextCursor)}`),
        );
      for (const page of pages)
        for (const token of page.tokens.filter((t) => t.custody === "wallet")) {
          const nft = capture(`/v1/squeeks/${token.tokenId}`);
          assert.equal(nft.tokenId, token.tokenId);
          assert.equal(nft.custody.owner.toLowerCase(), holder);
          assert.equal(nft.metadata.status, "available");
        }
      assert.equal(
        economy.deployment.components.collection.address.toLowerCase(),
        "0xc4c7982657f00509548f3a3a41db7fa439a6856b",
      );
      await writeFile(
        resolve(out, "capture.json"),
        JSON.stringify(
          {
            capturedAt: new Date().toISOString(),
            sources: [...fixtures.keys()].map((p) => api + p),
            chain: economy.chain,
            observedTokens: pages.flatMap((p) =>
              p.tokens.map((t) => t.tokenId),
            ),
          },
          null,
          2,
        ),
      );
      return {
        requests: fixtures.size,
        confirmedBlock: economy.chain.safeThroughBlock,
        firstToken: account.tokens[0].tokenId,
      };
    },
  );
  if (results.some((r) => !r.passed))
    throw Error(
      "Live fixture capture failed; browser integration checks were not run.",
    );
  const { chromium } = await playwright();
  server = await serve();
  browser = await chromium.launch(chromiumOptions());
  async function connected({ fault, rateLimit = false } = {}) {
    const p = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    p.setDefaultTimeout(10000);
    await injectWallet(p);
    let limited = rateLimit;
    await p.route(`${api}/**`, async (route) => {
      const url = new URL(route.request().url()),
        path = url.pathname + url.search;
      if (limited && url.pathname === "/v1/economy/state")
        return route.fulfill({
          status: 429,
          headers: {
            "retry-after": "2",
            "access-control-expose-headers": "Retry-After",
          },
          json: { error: "rate_limited" },
        });
      const fixture = fixtures.get(path);
      if (!fixture)
        return route.fulfill({
          status: 404,
          json: { error: "No captured official response for this test path" },
        });
      const data = structuredClone(fixture);
      if (fault) fault(data, url);
      await route.fulfill({ json: data });
    });
    await p.goto(server.url);
    await p.getByRole("button", { name: "Connect", exact: true }).click();
    await p
      .getByRole("button", { name: "QA browser wallet", exact: true })
      .click();
    await p.locator(".connect-button").filter({ hasText: /0x/i }).waitFor();
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Character", exact: true })
      .click();
    return {
      p,
      unlimit: () => {
        limited = false;
      },
    };
  }
  await check(
    "Captured real NFT ownership, metadata, pagination and portrait selection render",
    async () => {
      const { p } = await connected();
      await p.locator(".nft-option").first().waitFor();
      assert.equal(await p.locator(".nft-option").count(), 12);
      const first = fixtures.get(`/v1/accounts/${holder}?limit=12`).tokens[0]
        .tokenId;
      await p
        .locator(".nft-option")
        .filter({ hasText: `Squeek #${first}` })
        .click();
      await p.locator(".character-portrait > img").waitFor();
      assert.equal(
        await p.locator(".character-portrait > img").getAttribute("alt"),
        `Squeek #${first}`,
      );
      await p
        .getByRole("button", { name: "Read next page", exact: true })
        .click();
      await p.waitForFunction(
        () => document.querySelectorAll(".nft-option").length === 24,
      );
      await p.screenshot({
        path: resolve(out, "verified-nfts.png"),
        fullPage: true,
      });
      await p
        .getByRole("navigation")
        .getByRole("button", { name: "Play", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Start adventure", exact: true })
        .click();
      assert(await p.locator(".game-canvas").isVisible());
      assert.equal(
        await p.evaluate(() =>
          window.qaWallet.calls.some((m) =>
            /sign|sendTransaction|sendRaw/i.test(m),
          ),
        ),
        false,
      );
      await p.close();
    },
  );
  await check(
    "Deployment mismatch refuses NFT identity while preserving open gameplay",
    async () => {
      const { p } = await connected({
        fault: (d, u) => {
          if (u.pathname === "/v1/economy/state") d.chain.chainId = "1";
        },
      });
      await p.getByText(/official deployment does not match/).waitFor();
      assert.equal(await p.locator(".nft-option").count(), 0);
      await p
        .getByRole("navigation")
        .getByRole("button", { name: "Play", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Start adventure", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Pause adventure", exact: true })
        .waitFor();
      await p.close();
    },
  );
  await check(
    "Stale chain data is unavailable, rather than an empty NFT collection",
    async () => {
      const { p } = await connected({
        fault: (d, u) => {
          if (u.pathname === "/v1/economy/state")
            d.chain.safeBlockTimestamp = "2000-01-01T00:00:00.000Z";
        },
      });
      await p.getByText(/official chain snapshot is stale/).waitFor();
      assert.equal(await p.locator(".nft-option").count(), 0);
      await p.close();
    },
  );
  await check(
    "HTTP 200 unavailable ownership is surfaced as unknown",
    async () => {
      const { p } = await connected({
        fault: (d, u) => {
          if (u.pathname.startsWith("/v1/accounts/")) {
            d.status = "unavailable";
            d.reason = "indexer_unavailable";
          }
        },
      });
      await p
        .getByText(/Official data unavailable \(indexer_unavailable\)/)
        .waitFor();
      assert.equal(await p.locator(".nft-option").count(), 0);
      await p.close();
    },
  );
  await check(
    "NFT rate limiting disables retry, then recovers from real responses",
    async () => {
      const { p, unlimit } = await connected({ rateLimit: true });
      const retry = p.getByRole("button", { name: /Retry in \d+s/ });
      await retry.waitFor();
      assert(await retry.isDisabled());
      unlimit();
      await p
        .getByRole("button", { name: "Retry ownership read", exact: true })
        .click();
      await p.locator(".nft-option").first().waitFor();
      assert.equal(await p.locator(".nft-option").count(), 12);
      await p.close();
    },
  );
  await check(
    "Real wheel readings render with provenance and stale readings are labeled",
    async () => {
      const { p } = await connected({
        fault: (d, u) => {
          if (u.pathname === "/v1/status")
            d.measurement.receivedAt = "2000-01-01T00:00:00.000Z";
        },
      });
      await p
        .getByRole("navigation")
        .getByRole("button", { name: "Play", exact: true })
        .click();
      await p.getByText("Last known activity", { exact: true }).waitFor();
      assert(
        await p
          .getByRole("link", { name: "View official source", exact: true })
          .isVisible(),
      );
      assert((await p.locator(".wheel-reading").innerText()).includes("rpm"));
      await p.close();
    },
  );
} finally {
  await browser?.close();
  await server?.close();
  await writeFile(
    resolve(out, "results.json"),
    JSON.stringify(results, null, 2),
  );
}
if (results.some((r) => !r.passed)) process.exitCode = 1;
