export const OFFICIAL_API = "https://api.squeekchain.com";
export const COLLECTION = "0xC4C7982657f00509548F3a3a41db7FA439a6856B";
export const CORE = "0xfd6c166d4b8e2962e65746a13e5a0797cd4de0c4";
export const SQK = "0xd78a3956cf63164d1fa1c622ad3c66623162fa1e";
export const EXPLORER = "https://eth-sepolia.blockscout.com";
export class ExternalError extends Error {
  constructor(
    message: string,
    public retryAfter = 0,
  ) {
    super(message);
  }
}
const decimal = (n: unknown): n is string =>
  typeof n === "string" && /^\d+$/.test(n);
const same = (a: unknown, b: string) =>
  typeof a === "string" && a.toLowerCase() === b.toLowerCase();
export async function getJson(
  path: string,
  signal?: AbortSignal,
): Promise<any> {
  const response = await fetch(`${OFFICIAL_API}${path}`, {
    headers: { accept: "application/json" },
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
      : AbortSignal.timeout(10000),
    credentials: "omit",
  });
  if (response.status === 429 || response.status === 503) {
    const seconds = Math.max(
      1,
      Math.min(300, Number(response.headers.get("retry-after")) || 10),
    );
    throw new ExternalError(
      `Squeekchain is busy. Try again in ${seconds} seconds.`,
      seconds,
    );
  }
  if (!response.ok)
    throw new ExternalError(
      `Squeekchain returned HTTP ${response.status}. Try again later.`,
    );
  const data = await response.json();
  if (!data || typeof data !== "object")
    throw new ExternalError(
      "The response could not be verified. Try again later.",
    );
  if (data.status === "unavailable")
    throw new ExternalError(
      `Official data unavailable (${String(data.reason || "unknown")}). Try again later.`,
    );
  return data;
}
export interface WheelStatus {
  observedAt: string;
  receivedAt: string;
  staleAfter: number;
  freshness: string;
  provenance: string;
  rpmMilli: number;
  distanceMm: number;
  coreStatus: string;
}
export async function readWheel(signal?: AbortSignal): Promise<WheelStatus> {
  const data = await getJson("/v1/status", signal),
    m = data.measurement;
  if (
    data.schemaVersion !== 1 ||
    !m ||
    !Number.isInteger(m.rpmMilli) ||
    m.rpmMilli < 0 ||
    !Number.isSafeInteger(m.distanceMm) ||
    m.distanceMm < 0 ||
    !Number.isFinite(Date.parse(m.observedAt)) ||
    !Number.isFinite(Date.parse(m.receivedAt)) ||
    typeof m.freshness !== "string" ||
    typeof m.provenance !== "string" ||
    typeof m.coreStatus !== "string" ||
    !Number.isFinite(m.staleAfterSeconds)
  )
    throw new ExternalError("No verifiable wheel measurement is available.");
  return {
    observedAt: m.observedAt,
    receivedAt: m.receivedAt,
    staleAfter: m.staleAfterSeconds,
    freshness: m.freshness,
    provenance: m.provenance,
    rpmMilli: m.rpmMilli,
    distanceMm: m.distanceMm,
    coreStatus: m.coreStatus,
  };
}
export function verifyDeployment(data: any) {
  const components = data?.deployment?.components;
  if (
    data.schemaVersion !== 3 ||
    data.status !== "available" ||
    data.chain?.chainId !== "11155111" ||
    data.deployment?.chainId !== "11155111" ||
    data.capabilities?.collection?.status !== "verified" ||
    data.capabilities?.core?.status !== "verified" ||
    data.capabilities?.token?.status !== "verified" ||
    !same(components?.collection?.address, COLLECTION) ||
    !same(components?.core?.address, CORE) ||
    !same(components?.token?.address, SQK) ||
    !decimal(data.chain.safeThroughBlock)
  )
    throw new ExternalError(
      "The official deployment does not match the supported Sepolia release. NFT identity is unavailable.",
    );
  const time = Date.parse(data.chain.safeBlockTimestamp);
  if (
    !Number.isFinite(time) ||
    Date.now() - time > 30 * 60 * 1000 ||
    time > Date.now() + 60000
  )
    throw new ExternalError(
      "The official chain snapshot is stale. NFT identity is temporarily unavailable.",
    );
}
export interface HeldNft {
  id: string;
  name: string;
  image: string | null;
  traits: { traitType: string; value: string }[];
  block: string;
  checkedAt: number;
}
function safeImage(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_000_000) return null;
  if (/^data:image\/(svg\+xml|png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(value))
    return value;
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      [
        "api.squeekchain.com",
        "media.squeekchain.com",
        "squeekchain.com",
      ].includes(u.hostname)
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export async function readHeldNfts(
  address: string,
  cursor: string | null = null,
  signal?: AbortSignal,
): Promise<{
  items: HeldNft[];
  cursor: string | null;
  block: string;
  heldOnPage: number;
}> {
  if (!/^0x[a-f\d]{40}$/i.test(address))
    throw new ExternalError("Connect a wallet to read its identity.");
  const economy = await getJson("/v1/economy/state", signal);
  verifyDeployment(economy);
  const query = new URLSearchParams({ limit: "12" });
  if (cursor) query.set("cursor", cursor);
  const page = await getJson(
    `/v1/accounts/${address.toLowerCase()}?${query}`,
    signal,
  );
  verifyDeployment(page);
  if (
    !same(page.account, address) ||
    !Array.isArray(page.tokens) ||
    !page.tokens.every(
      (t: any) =>
        decimal(t.tokenId) &&
        BigInt(t.tokenId) >= 1n &&
        BigInt(t.tokenId) <= 9999n &&
        ["wallet", "staking"].includes(t.custody),
    ) ||
    !(page.nextCursor === null || typeof page.nextCursor === "string")
  )
    throw new ExternalError("The ownership response could not be verified.");
  const held = page.tokens.filter((t: any) => t.custody === "wallet");
  const items: HeldNft[] = [];
  // Bound metadata traffic. Additional held portraits can be loaded explicitly.
  for (const token of held.slice(0, 12)) {
    const nft = await getJson(`/v1/squeeks/${token.tokenId}`, signal);
    verifyDeployment(nft);
    if (
      nft.tokenId !== token.tokenId ||
      !same(nft.custody?.owner, address) ||
      nft.custody?.burned ||
      nft.metadata?.status !== "available"
    )
      continue;
    items.push({
      id: nft.tokenId,
      name:
        typeof nft.metadata.name === "string"
          ? nft.metadata.name.slice(0, 100)
          : `Squeek #${nft.tokenId}`,
      image:
        safeImage(nft.metadata.cardImageUrl) ||
        safeImage(nft.metadata.imageDataUri),
      traits: Array.isArray(nft.metadata.attributes)
        ? nft.metadata.attributes
            .filter(
              (a: any) =>
                typeof a.traitType === "string" &&
                ["string", "number"].includes(typeof a.value),
            )
            .slice(0, 12)
            .map((a: any) => ({
              traitType: a.traitType,
              value: String(a.value),
            }))
        : [],
      block: nft.chain.safeThroughBlock,
      checkedAt: Date.now(),
    });
  }
  return {
    items,
    cursor: page.nextCursor,
    block: page.chain.safeThroughBlock,
    heldOnPage: held.length,
  };
}
// No check-in ABI, deployment or trusted reward records were published in the
// inspected official sources. No transaction or check-in reward is fabricated.
export const CHECK_IN = {
  status: "unavailable" as const,
  reason:
    "No official daily check-in contract or trusted check-in API is published.",
  missing:
    "An official Sepolia check-in deployment, ABI, per-wallet UTC-day eligibility method, confirmed receipt policy, and verifiable history.",
};
