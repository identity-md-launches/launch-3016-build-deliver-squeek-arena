import { resolve } from "node:path";
// A bounded contributor environment can keep installed tooling in its excluded test area.
// A normal npm install uses normal package resolution and needs no environment setting.
const tooling = process.env.SQUEEK_TOOLING_ROOT;
export default {
  base: "./",
  resolve: tooling
    ? {
        alias: [
          ...[
            "react-dom",
            "react",
            "wagmi",
            "viem",
            "@tanstack/react-query",
            "@coinbase/wallet-sdk",
          ].map((name) => ({
            find: name,
            replacement: resolve(tooling, name),
          })),
        ],
      }
    : {},
  build: { target: "es2022", sourcemap: false, chunkSizeWarningLimit: 650 },
};
