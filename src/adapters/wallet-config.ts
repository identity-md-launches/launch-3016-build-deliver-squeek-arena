import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors/injected";
import { coinbaseWallet } from "wagmi/connectors/coinbaseWallet";
import { sepolia } from "viem/chains";
// Chain ID and explorer: official Squeekchain deployment record, inspected 2026-11-05.
// PublicNode's Sepolia endpoint was independently checked with eth_chainId = 11155111.
export const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
export const chain = {
  ...sepolia,
  rpcUrls: { default: { http: [SEPOLIA_RPC] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://eth-sepolia.blockscout.com" },
  },
};
export const walletConfig = createConfig({
  chains: [chain],
  multiInjectedProviderDiscovery: true,
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "Squeek Arena",
      appLogoUrl: new URL("assets/favicon.svg", document.baseURI).href,
      preference: { options: "all" },
    }),
  ],
  transports: {
    [chain.id]: http(SEPOLIA_RPC, { timeout: 10000, retryCount: 1 }),
  },
});
export const OPEN_IN = [
  {
    id: "metamask",
    name: "MetaMask",
    href: (url: string) =>
      `https://link.metamask.io/dapp/${url.replace(/^https?:\/\//, "")}`,
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    href: (url: string) =>
      `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`,
  },
  // Rabby Mobile's published universal-link handler: _cmd=open-dapp, dapp=<URL>.
  {
    id: "rabby",
    name: "Rabby",
    href: (url: string) =>
      `https://go.rabby.io/mobile/?_cmd=open-dapp&dapp=${encodeURIComponent(url)}`,
  },
  {
    id: "phantom",
    name: "Phantom",
    href: (url: string) =>
      `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(new URL(url).origin)}`,
  },
];
