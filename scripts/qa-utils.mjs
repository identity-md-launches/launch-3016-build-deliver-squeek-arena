import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";
export async function playwright() {
  return process.env.IMD_PLAYWRIGHT
    ? import(pathToFileURL(resolve(process.env.IMD_PLAYWRIGHT)).href)
    : import("playwright");
}
export const chromiumOptions = () => ({
  headless: true,
  ...(process.env.QA_CHROMIUM_PATH
    ? { executablePath: process.env.QA_CHROMIUM_PATH }
    : {}),
});
export async function serve(directory = "dist") {
  const root = resolve(directory),
    types = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".woff2": "font/woff2",
      ".json": "application/json",
    };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost"),
        part = decodeURIComponent(url.pathname.replace(/^\/preview\//, "")),
        file = resolve(root, part || "index.html");
      if (!file.startsWith(root + "/") && file !== root) throw Error();
      const info = await stat(file),
        path = info.isDirectory() ? resolve(file, "index.html") : file;
      res.setHeader(
        "Content-Type",
        types[extname(path)] || "application/octet-stream",
      );
      res.end(await readFile(path));
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}/preview/`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

// Test-only EIP-6963 provider. It cannot sign or send a transaction.
export async function injectWallet(
  page,
  { reject = false, chainId = "0xaa36a7" } = {},
) {
  await page.addInitScript(
    ({ reject, chainId }) => {
      const callbacks = new Map();
      window.qaWallet = { reject, chainId, calls: [], connected: false };
      const provider = {
        request: async ({ method, params }) => {
          window.qaWallet.calls.push(method);
          if (method === "eth_requestAccounts") {
            if (window.qaWallet.reject)
              throw Object.assign(new Error("User rejected request"), {
                code: 4001,
              });
            window.qaWallet.connected = true;
            return ["0x9ca0a63dcea0592859bf78083c3a455fde747d31"];
          }
          if (method === "eth_accounts")
            return window.qaWallet.connected
              ? ["0x9ca0a63dcea0592859bf78083c3a455fde747d31"]
              : [];
          if (method === "eth_chainId") return window.qaWallet.chainId;
          if (
            method === "wallet_requestPermissions" ||
            method === "wallet_getPermissions"
          )
            return [{ parentCapability: "eth_accounts" }];
          if (method === "wallet_switchEthereumChain") {
            window.qaWallet.chainId = params[0].chainId;
            for (const f of callbacks.get("chainChanged") || [])
              f(window.qaWallet.chainId);
            return null;
          }
          throw Object.assign(new Error("Unsupported test method " + method), {
            code: 4200,
          });
        },
        on: (name, fn) => {
          callbacks.set(name, [...(callbacks.get(name) || []), fn]);
        },
        removeListener: (name, fn) => {
          callbacks.set(
            name,
            (callbacks.get(name) || []).filter((f) => f !== fn),
          );
        },
      };
      window.ethereum = provider;
      const detail = {
        info: {
          uuid: "74bbfe70-14b7-4fbd-91f5-f1d4c1314018",
          name: "QA browser wallet",
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><rect width="28" height="28" fill="%23758961"/></svg>',
          rdns: "test.squeek.qa",
        },
        provider,
      };
      addEventListener("eip6963:requestProvider", () =>
        dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail })),
      );
      dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail }));
    },
    { reject, chainId },
  );
}
