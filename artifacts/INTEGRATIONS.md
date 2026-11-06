# Squeek Arena integration record

Inspected **2026-11-06** (Europe/Berlin; evidence timestamps use UTC). This describes the delivered implementation, not an application for Genesis approval. The adventure works without any external service or wallet. No contract was deployed, no Genesis project was registered or submitted, and no transaction was signed or sent for this project.

## Official sources inspected

All sources below were fetched on 2026-11-06. [The retained source record](evidence/official-sources.json) includes response hashes and selected observed fields. These are dated observations; they are not a promise of continued service availability.

| Official source | What was inspected |
| --- | --- |
| [Genesis Code lane](https://squeekchain.com/genesis/code) | Build categories, excluded projects, FAQ, ownership proof and submission process. The HTML is an application shell; its referenced Code page and build-guide modules were also inspected. |
| [Developers](https://docs.squeekchain.com/developers/) | Published contracts, ABI links, deployment record and integration invariants; the page explicitly describes ABI-based integration and says there is no SDK. |
| [Sepolia deployment record](https://docs.squeekchain.com/assets/deployments/sepolia.json) | Sepolia chain ID, release, addresses, expected implementation identities, ABI locations and explorer. |
| [Quickstart](https://docs.squeekchain.com/developers/quickstart/) | Chain verification, confirmed-block reads and deployment/binding checks for direct contract readers. |
| [Public API reference](https://docs.squeekchain.com/developers/api/) | Public read-only endpoints, response schemas, confirmed snapshots, freshness, pagination, rate limits and unavailable states. |
| [NFT reference](https://docs.squeekchain.com/developers/nft/) and [ownership](https://docs.squeekchain.com/squeeks/ownership/) | ERC-721 identity, metadata and the distinction between wallet ownership and staking custody. |
| [Rounds and blocks](https://docs.squeekchain.com/system/rounds-and-blocks/) | Physical wheel work, settled rounds and Squeek blocks; these are distinct from Ethereum blocks and game scores. |
| [Build with AI](https://docs.squeekchain.com/developers/build-with-ai/) | Published ABI/schema resources and the boundary between display data and owner-signed actions. The guidance is reference material, not code executed by this game. |
| [PublicNode Sepolia](https://ethereum-sepolia.publicnode.com/) | Provider page publishes `https://ethereum-sepolia-rpc.publicnode.com`, the public RPC configured in the client. A read-only Sepolia `eth_chainId` verification returned `0xaa36a7` (11155111). |
| [Live status](https://api.squeekchain.com/v1/status) and [economy state](https://api.squeekchain.com/v1/economy/state) | Real responses, deployment capabilities and measurement provenance. See the observations below. |

The inspected official developer pages link deployment records, response schemas and ABI files. They did not identify a canonical application repository or require a particular frontend framework. Source revision hashes in the deployment record are not guessed repository URLs. No unofficial SDK or guessed endpoint is used.

## Genesis: applicable requirements and optional steps

The following separates requirements of the published Code-lane process from examples of possible projects. This is an assessment of the inspected material; acceptance remains Squeekchain's decision.

| Published criterion or process | Mandatory or optional here | Delivered behavior / remaining dependency |
| --- | --- | --- |
| A finished, useful project that uses Squeekchain; automatic check followed by team review | Applicable product criterion for a future Code-lane submission | Three designed worlds and a boss are playable end to end. Optional identity reads real Squeek ownership/metadata, and the community panel reads real wheel activity. This is a game with independent gameplay, not a thin API display. |
| Excluded categories include bare landing pages, read-only dashboards, thin wrappers, lightly changed templates and copies | Applicable product criterion | Original engine, characters, scenery, animations and audio are in `src/game/`; the primary action starts a complete adventure. No claim of approval is made. |
| Examples involving races, bets, token finance, staking, holder-only games or trading | Optional ideas, not a requirement to implement every category | No payment, bet, token economy, purchase, staking or holder gate is included. Where examples conflict with this assignment's rules, the assignment's no-payment/no-bet/no-token rules prevail. |
| Submit through a Genesis profile and prove project ownership | Required only to register/list a project; outside this static build | Not performed. The requester would need their authenticated Genesis profile and actual project attribution. There is no registration button pretending this has happened. |
| IMD submission: the wallet paying for the first project job must be verified on that Genesis profile | Conditional requirement of the IMD submission route | The requester/IMD controls the canonical job record and payer attribution. This build neither collects payment nor invents a job ID or payer wallet. Submission also asks for an integration explanation and cover image. |
| Direct submission: owned domain, public GitHub repository, integration description, cover, and issued DNS/page/README verification values | Conditional requirement of the direct route | The requester must supply the live owned domain/repository and obtain the exact challenge from Genesis. Shared-host domains are excluded by the inspected form. No DNS record, meta tag or README ownership line is fabricated. |
| Verified direct-site records are rechecked daily; team approval precedes board listing | Conditional ongoing requirement after direct submission | Hosting, DNS control, continued verification and approval have not been performed by this worker. Static delivery in `dist/` does not establish any of these. |
| Swarm Review, build badges and placement on the board | Optional subsequent recognition | The inspected FAQ describes Swarm Review as opening soon. None is claimed as earned or completed. |
| Install an agent skill, use a particular SDK, deploy a game contract or charge an entry fee | No such universal requirement found in the inspected sources | No runtime SDK is published by the developer overview. The supplied docs/ABIs were inspected directly. No deployment or fee is needed for this game's read-only integrations. |

## Network and deployed identities

The official deployment record reports network `sepolia`, chain **11155111**, release **`core-sepolia-20261103`**, revision **7**, and explorer **`https://eth-sepolia.blockscout.com`**. There is no separately guessed “Squeekchain testnet” chain configuration. Wallet transport is the PublicNode Sepolia endpoint listed above.

| Identity | Address | Use in this build |
| --- | --- | --- |
| SqueekNFT | `0xC4C7982657f00509548F3a3a41db7FA439a6856B` | Verify the API deployment and read wallet-held NFT portraits. |
| SqueekCore | `0xfd6c166d4b8e2962e65746a13e5a0797cd4de0c4` | Verify the API's supported deployment; no game transaction. |
| SQK / SqueekToken | `0xd78a3956cf63164d1fa1c622ad3c66623162fa1e` | Verify the deployment identity only. No balances, transfers, rewards or token economy are implemented. |

Addresses in the official deployment record and the economy response matched the constants in `src/adapters/external.ts`. The captured economy snapshot was available at safe block **12072908**, timestamp **2026-11-06T00:05:12.000Z**, with collection, Core and token capabilities marked verified. The integration suite later captured a newer safe block, **12072922**. These block numbers are evidence of inspected responses, not hardcoded runtime state.

The frontend checks API schema/status, both chain IDs, all three addresses, verified collection/Core/token capabilities, a decimal safe block, and a safe-block timestamp no more than 30 minutes old or one minute in the future. This is an official API snapshot trust model. The frontend does **not** independently reproduce all code-hash, proxy-slot, binding and supply checks in the direct-contract Quickstart. It never uses API data to authorize a transaction. Any future write integration must perform the relevant contract verification and simulation first.

## Integrations actually connected

### Wallet identity

`src/adapters/wallet-config.ts` and `src/ui/Wallet.tsx` implement EIP-6963 discovery through wagmi, injected fallback and the official Coinbase Wallet SDK. The one top-bar Connect control opens the provider list. On phones without an extension, it offers MetaMask, Coinbase Wallet, Rabby and Phantom app-browser links plus Coinbase Smart Wallet. No WalletConnect relay or project ID is required.

The interface shows address/network, disconnect, rejected/unavailable connection feedback and an explicit switch to Sepolia. Wrong-network identity is withheld. Changing wallet/network clears the selected portrait. No seed phrase, private key, gameplay signature or transaction is requested. Browser tests use a clearly named test-only provider that cannot sign/send; real extension/app/passkey confirmation was not exercised.

Mobile-link references: [MetaMask deeplinks](https://docs.metamask.io/metamask-connect/evm/guides/metamask-exclusive/use-deeplinks), [Coinbase deep links](https://docs.cdp.coinbase.com/wallet-sdk/docs/deep-link), and [Phantom browse](https://docs.phantom.com/phantom-deeplinks/other-methods/browse) are the provider references retained in the pinned connector material. Rabby's `go.rabby.io/mobile/?_cmd=open-dapp&dapp=…` handler is the source-derived form supplied by that reference. These app links are implemented; physical app handoff remains untested.

### NFT portrait

Only these public GET paths are used for identity:

1. `/v1/economy/state` verifies the supported deployment.
2. `/v1/accounts/{connectedAddress}?limit=12[&cursor=…]` reads actual ownership pages.
3. `/v1/squeeks/{tokenId}` checks each wallet-held token's owner, burned state, metadata and confirmed deployment snapshot.

Only wallet-held custody is selectable; staking custody is not presented as wallet-held. Tokens must have IDs 1–9999. Up to twelve metadata reads follow a page, and further pages require an explicit action. Portraits allow supported base64 image data URIs or HTTPS on `api.squeekchain.com`, `media.squeekchain.com` or `squeekchain.com`. Metadata is displayed as data, not injected as executable HTML. Unsupported/broken images retain the text identity. Portrait selection expires after two minutes; the original animated hamster always remains the in-game character.

Timeout, HTTP failure, stale snapshot, deployment mismatch, unavailable data and rate limiting are distinct from empty ownership. Requests time out after ten seconds, abort when the view changes, and bound `Retry-After` cooldowns. No sample NFT identities are shipped. The integration test fetched real responses for a publicly observed holder and checked pagination/selection against those captured responses; it did not control that holder's wallet.

### Hamster activity and in-game events

`src/ui/Wheel.tsx` reads `/v1/status` on entry and at a one-minute interval while the page is visible. It displays real RPM, device state, hardware/other provenance, observation time and freshness; stale data is labeled “Last known activity.” It uses `receivedAt` and the response's freshness window, not generated random values. Errors show a retry action with cooldown. The official source is linked beside the reading.

The inspected status snapshot had schema 1, hardware provenance, `IDLE` state, 0 milli-RPM and a 120-second freshness window. These were real observed values, not a default or future prediction. The API also documents settlements, measurement statistics and `/v1/events`; these are not consumed or represented as integrated challenges. No wheel distance, round, streak or reward is invented. The optional keepsake challenge is explicitly labeled **In-game challenge** and uses local game state only. External outages never affect physics, level completion or rewards.

## Daily on-chain check-in: unavailable

The inspected deployment record, contract list, developer/API references and Code-lane material did not publish a daily player check-in contract or trusted check-in endpoint. Mining's `checkpoint()` is issuance/staking infrastructure, **not** a daily game check-in. Measurement days are likewise not wallet eligibility records.

`CHECK_IN` in `src/adapters/external.ts` and the About/Connections dialog in `src/ui/Panels.tsx` therefore show a labeled unavailable state. Connecting does not check in. There is no signing action, fee charge, made-up hash, pending/confirmed success, reward or streak. A transaction cannot be tested before an official integration exists.

The exact dependencies for enabling this are:

| Missing dependency | What the official integration owner must supply |
| --- | --- |
| Authoritative deployment or trusted service | Official Sepolia address/release and ABI with the callable check-in method and success event, or a documented trusted API capable of verifying the wallet's actual on-chain check-in. A random existing contract address is insufficient. |
| Daily eligibility and duplicate protection | An on-chain wallet/day guard or trusted backend uniqueness record, the read method/endpoint, the exact calendar/time-zone boundary and eligibility rules. The current notes anticipate UTC days; the integration must explicitly confirm its day definition. Local storage cannot establish authoritative uniqueness. |
| Receipt verification | Expected contract, method/event, success criteria, required confirmations, receipt/reorg handling and a reliable way to recover an uncertain transaction before retrying. Wallet approval alone is not success. |
| Verifiable history | Confirmed per-wallet day records, history queries/pagination and transaction hashes. A streak must be derived from these records rather than a local counter or wheel-activity streak. |
| Internal reward policy | Defined nonmonetary Arena Point/XP amounts and idempotent crediting keyed to the verified wallet/day/event. A shared reward system additionally needs a trusted verifier and abuse protection; none was supplied for this static game. |

When those dependencies are available, a future implementation must explain the action and estimated network fee before an explicit user action opens the wallet; handle pending, rejected, failed and confirmed states; award once only after verified confirmation; and link the real hash to the deployment's verified explorer. No contract deployment is authorized by this task.

## Local progression and leaderboard

`src/adapters/persistence.ts` stores actual local run results, XP, Arena Points, cosmetics, settings and checkpoint state. Points are internal game data with no monetary value and no purchase, transfer, sale or withdrawal path. They are not SQK.

There is no supplied shared leaderboard, authentication service, score-validation API or hosted profile backend. The board is labeled **Local leaderboard · This browser only**, ranks the browser's own real runs and supports loading, empty, populated, filtered and storage-failure states. It is editable local data, not an anti-cheat or global ranking. A shared board would require owner-provided hosting, wallet/account authentication, server-computed scores from validated replay inputs, replay protection, rate limits and bounded/validated inputs. No fake players or client-trusted shared endpoint is included.

See [validation](VALIDATION.md) for actual checks and limits, and [attribution](ATTRIBUTION.md) for asset and dependency notices.
