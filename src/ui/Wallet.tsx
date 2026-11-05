import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { OPEN_IN, chain } from "../adapters/wallet-config";
import {
  ExternalError,
  readHeldNfts,
  type HeldNft,
} from "../adapters/external";
import { Modal } from "./Modal";
import { Icon } from "./Icon";
const short = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;
const asset = (id: string) =>
  new URL(`assets/wallets/${id}.svg`, document.baseURI).href;
const marks: Record<string, string> = {
  metamask: asset("metamask"),
  rabby: asset("rabby"),
  phantom: asset("phantom"),
  coinbase: asset("coinbase"),
};
export function WalletControls({
  beforeOpen,
  onAddressChange,
}: {
  beforeOpen: () => void;
  onAddressChange: (address?: string) => void;
}) {
  const { address, isConnected, chainId } = useAccount(),
    { connect, connectors, isPending, error, variables, reset } = useConnect(),
    { disconnect } = useDisconnect(),
    {
      switchChain,
      isPending: switching,
      error: switchError,
    } = useSwitchChain();
  const [open, setOpen] = useState(false),
    [copied, setCopied] = useState(false);
  const mobile =
    matchMedia("(pointer: coarse)").matches &&
    !connectors.some((c) => c.type === "injected" && c.id !== "injected");
  useEffect(
    () => onAddressChange(chainId === chain.id ? address : undefined),
    [address, chainId, onAddressChange],
  );
  const named = connectors.some(
    (c) => c.type === "injected" && c.id !== "injected",
  );
  const listed = [
    ...connectors.filter((c) => c.type === "injected"),
    ...connectors.filter((c) => c.type !== "injected"),
  ].filter(
    (c) =>
      !(c.id === "injected" && named) && (!mobile || c.type !== "injected"),
  );
  const wrong = isConnected && chainId !== chain.id;
  const errorMessage = error
    ? /reject|denied|cancel/i.test(error.message)
      ? "Connection declined. You can retry or keep playing."
      : /not found|unavailable|provider/i.test(error.message)
        ? "No browser wallet is available. Install one or choose Coinbase Wallet."
        : "Wallet connection failed. Try again or keep playing."
    : null;
  return (
    <>
      <button
        className={`connect-button ${wrong ? "wrong-network" : ""}`}
        onClick={() => {
          beforeOpen();
          setOpen(true);
          reset();
        }}
      >
        <Icon name="wallet" size={17} />
        <span>
          {isConnected && address
            ? wrong
              ? "Wrong network"
              : short(address)
            : "Connect"}
        </span>
      </button>
      {open && (
        <Modal
          title={isConnected ? "Wallet identity" : "Connect a wallet"}
          onClose={() => setOpen(false)}
        >
          {isConnected && address ? (
            <>
              <p className="muted">
                Connected for identity. Gameplay needs no transactions.
              </p>
              <div className="wallet-address">
                <span>{address}</span>
                <button
                  className="text-button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(address);
                      setCopied(true);
                    } catch {
                      setCopied(false);
                    }
                  }}
                >
                  {copied ? "Copied" : "Copy address"}
                </button>
              </div>
              <p className={wrong ? "inline-error" : "inline-status"}>
                {wrong
                  ? `Connected to chain ${chainId}. NFT identity needs Sepolia (11155111).`
                  : "Sepolia · Chain 11155111"}
              </p>
              {wrong && (
                <button
                  className="primary full"
                  disabled={switching}
                  onClick={() => switchChain({ chainId: chain.id })}
                >
                  {switching ? "Waiting for wallet…" : "Switch to Sepolia"}
                </button>
              )}
              {switchError && (
                <p role="alert" className="inline-error">
                  Network switch declined or unavailable. Switch to Sepolia in
                  your wallet and retry.
                </p>
              )}
              <a
                className="row-link"
                href={`${chain.blockExplorers.default.url}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View address on Blockscout <Icon name="external" size={16} />
              </a>
              <button
                className="secondary full"
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
              >
                Disconnect wallet
              </button>
            </>
          ) : (
            <>
              <p className="muted">
                Optional identity and held NFT portraits. Your adventure is open
                to everyone.
              </p>
              <div className="wallet-rows">
                {mobile &&
                  OPEN_IN.map((w) => (
                    <a
                      className="wallet-row"
                      key={w.id}
                      href={w.href(location.href)}
                    >
                      <img src={marks[w.id]} width="28" height="28" alt="" />
                      <span>Open in {w.name}</span>
                      <Icon name="external" size={16} />
                    </a>
                  ))}
                {listed.map((c) => (
                  <button
                    className="wallet-row"
                    key={c.uid}
                    disabled={isPending}
                    onClick={() =>
                      connect(
                        { connector: c },
                        { onSuccess: () => setOpen(false) },
                      )
                    }
                  >
                    {c.icon ? (
                      <img src={c.icon} width="28" height="28" alt="" />
                    ) : c.type === "injected" ? (
                      <Icon name="wallet" size={28} />
                    ) : (
                      <img src={marks.coinbase} width="28" height="28" alt="" />
                    )}
                    <span>
                      {c.id === "injected"
                        ? "Browser wallet"
                        : c.id === "coinbaseWalletSDK" && mobile
                          ? "Coinbase Smart Wallet"
                          : c.name}
                      {isPending && variables?.connector === c
                        ? " · opening…"
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
              <p className="wallet-note">
                Approve the connection in your wallet. No signature, fee, or
                transaction is requested.
              </p>
              <p className="inline-error" role="status">
                {errorMessage}
              </p>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
export function NftIdentity({
  onSelect,
  selected,
}: {
  onSelect: (nft: HeldNft | null) => void;
  selected: HeldNft | null;
}) {
  const { address, chainId } = useAccount();
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [items, setItems] = useState<HeldNft[]>([]),
    [error, setError] = useState("");
  const [cursor, setCursor] = useState<string | null>(null),
    [page, setPage] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0),
    [heldOnPage, setHeldOnPage] = useState(0),
    [retrySeconds, setRetrySeconds] = useState(0);
  useEffect(() => {
    setItems([]);
    setPage(null);
    setCursor(null);
    setRetrySeconds(0);
  }, [address, chainId]);
  useEffect(() => {
    if (!address || chainId !== chain.id) {
      setState("idle");
      return;
    }
    const abort = new AbortController();
    setState("loading");
    setError("");
    readHeldNfts(address, page, abort.signal)
      .then((data) => {
        setItems((prev) =>
          page
            ? [
                ...prev.filter(
                  (n) => !data.items.some((next) => next.id === n.id),
                ),
                ...data.items,
              ]
            : data.items,
        );
        setCursor(data.cursor);
        setHeldOnPage(data.heldOnPage);
        setState("ready");
        if (selected && !data.items.some((n) => n.id === selected.id) && !page)
          onSelect(null);
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setState("error");
          setItems([]);
          setError(
            e.message || "Ownership could not be read. Try again later.",
          );
          setRetrySeconds(e instanceof ExternalError ? e.retryAfter : 0);
          onSelect(null);
        }
      });
    return () => abort.abort();
  }, [address, chainId, refresh, page]);
  useEffect(() => {
    if (retrySeconds <= 0) return;
    const timer = setTimeout(
      () => setRetrySeconds((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [retrySeconds]);
  const retry = () => {
    setPage(null);
    setRefresh((v) => v + 1);
  };
  return (
    <section className="nft-identity">
      <div className="section-heading">
        <h3>NFT portrait</h3>
        <span className="muted">Optional · Sepolia</span>
      </div>
      <p className="muted">
        A held Squeek can be your portrait. Your hamster keeps its full set of
        animations.
      </p>
      {!address ? (
        <p className="quiet-note">
          Connect from the top bar to read your held Squeeks.
        </p>
      ) : chainId !== chain.id ? (
        <p className="inline-error">
          Switch your wallet to Sepolia to read NFT ownership.
        </p>
      ) : (
        <>
          {state === "loading" && (
            <p role="status">Reading verified ownership and portraits…</p>
          )}
          {state === "error" && (
            <div className="empty-state">
              <p role="status">{error}</p>
              <button
                className="secondary"
                disabled={retrySeconds > 0}
                onClick={retry}
              >
                {retrySeconds > 0
                  ? `Retry in ${retrySeconds}s`
                  : "Retry ownership read"}
              </button>
            </div>
          )}
          {state === "ready" && items.length === 0 && (
            <p className="quiet-note">
              {heldOnPage
                ? "Held Squeeks were found, but their metadata or current ownership could not be verified. Try refreshing."
                : "No held Squeeks found on this page. The default hamster is ready for the whole adventure."}
            </p>
          )}
          {items.length > 0 && (
            <div className="nft-grid">
              {items.map((n) => (
                <button
                  key={n.id}
                  disabled={state !== "ready"}
                  className={`nft-option ${selected?.id === n.id ? "selected" : ""}`}
                  onClick={() => onSelect(n)}
                >
                  {n.image ? (
                    <img
                      src={n.image}
                      alt={n.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.hidden = true;
                      }}
                    />
                  ) : (
                    <Icon name="character" size={48} />
                  )}
                  <strong>{n.name}</strong>
                  <span>Use portrait {selected?.id === n.id ? "✓" : ""}</span>
                </button>
              ))}
            </div>
          )}
          {state === "ready" && (
            <div className="button-row">
              <button className="secondary" onClick={retry}>
                Refresh ownership
              </button>
              {cursor && (
                <button className="secondary" onClick={() => setPage(cursor)}>
                  Read next page
                </button>
              )}
            </div>
          )}
          {items.length > 0 && (
            <p className="caption">
              12 tokens per page. Held portraits use ownership from the official
              API at a confirmed block. Selected portraits expire after two
              minutes.
            </p>
          )}
        </>
      )}
      {selected && (
        <button className="text-button" onClick={() => onSelect(null)}>
          Use default portrait
        </button>
      )}
    </section>
  );
}
