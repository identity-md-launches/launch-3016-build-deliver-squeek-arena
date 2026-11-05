# Squeek Arena

An original, complete hamster action-adventure for Squeekchain’s Sepolia test environment. Start without a wallet, explore three worlds, recover the heartseed from the Iron Gnaw, and keep your earned progress on this browser.

The ready-to-serve website is in **`dist/`**. Source, original procedural art/audio, local fonts, configuration, lockfile, and executable checks are included. No server, private credentials, paid service, or contract deployment is required.

## Install, run, and rebuild

Use Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. For the production export:

```sh
npm run typecheck
npm run build
npm run preview
```

Serve `dist/` through any static HTTP host. Vite uses `base: './'`; assets work under a gateway subpath. Navigation stays on one page and needs no server rewrites. Opening `index.html` directly through `file://` is not supported by JavaScript module loading. Publishing, registration, and deployment were not performed.

## Controls

| Action | Keyboard | Phone or tablet |
| --- | --- | --- |
| Move | A / D or left / right arrows | Hold Left / Right |
| Jump | Space / W / up arrow; hold for height | Hold Jump for height |
| Attack | J / X; hold to keep swinging | Attack |
| Dash / dodge | K / Shift / Z | Dash |
| Pause | Escape or top-right pause button | Pause button |

Touch supports multiple fingers at once. Active mobile play stays within the viewport without page scrolling. Controls clear on blur; changing tabs or hiding the browser pauses the adventure. Settings include Gentle adventure (eight hearts and longer damage protection), reduced motion, persistent audio volumes/mute, and optional touch controls on desktop.

## The adventure

- **Burrow Entrance:** woodland paths, optional ledges, beetles, introductory moths, gaps and spikes. Learn movement, variable jumps, combat and collecting; find eight seeds to open the hollow tree.
- **Crystal Caverns:** layered crystal ledges, wider gaps, diving moths, charging beetles and projectile sentries. Find ten seeds and cross the crystal bridge.
- **Forgotten Factory:** conveyors, timed steam vents, enemy combinations and the most demanding platform route. Find twelve seeds to reach the engine room.
- **The Iron Gnaw:** a separate arena with an armored boss, readable slam/charge tells, shockwaves, an exposed core, a second phase, and a defeat sequence leading to the victory summary.

Each world has surplus seeds, healing items, multiple healing checkpoints, and one optional keepsake. Jumping on enemies and twig attacks both work. Acceleration, jump buffering, coyote time, damage reactions, invulnerability frames and dash protection make the controls forgiving. Nine hamster animation states communicate idle, running, jumping, falling, attacking, dodging, hurt, defeat and victory.

XP, Arena Points, eight achievements and four cosmetics are earned through play. **Arena Points have no monetary value. They are not tokens and cannot be purchased, transferred, sold or withdrawn.** The game has no payment, betting, staking, mint, marketplace or token reward flow.

## Saves and scores

The versioned `squeek-arena-v1` local-storage record contains settings, explorer name, progression, earned cosmetics, the last checkpoint and up to twenty actual finished/defeated run records. Autosave runs every five seconds during play and at checkpoints, pauses and transitions. Refresh resumes at a checkpoint, retaining collected items and defeated enemies; a completed world resumes in the next world. Retry restores hearts; exhausting lives still offers a forgiving checkpoint retry.

The leaderboard shows rank, explorer identity, score, time and outcome. It has loading, empty, populated, filtering and storage-error states. It is prominently labeled **“Local leaderboard · This browser only.”** Local data is editable and unverified. There is no shared score/profile endpoint to abuse-protect, and no fabricated players or network rankings. A future shared board requires an authenticated backend that verifies replay inputs and computes scores itself.

Blocked or full storage keeps the current session playable and reports that persistence is unavailable. Clearing browser site data removes local progress. There is no cross-device account sync or service worker; an already loaded game continues offline, while a fresh offline visit depends on the browser’s normal cache.

## Connections actually implemented

| Integration | Implemented behavior | Availability / boundary |
| --- | --- | --- |
| Browser wallets | EIP-6963 discovery, injected fallback, address/network, disconnect, explicit network switch, rejected/pending/error states | Optional identity only; no signing or transactions |
| Mobile wallets | Open the current page in MetaMask, Coinbase Wallet, Rabby or Phantom; Coinbase Smart Wallet via the official SDK | Requires the corresponding external wallet/app or passkey service; no relay/project ID |
| Squeek NFT identity | Official economy/deployment verification, held-token pagination, ownership and metadata reads, selected NFT portrait | Sepolia only; original animated game hamster always remains |
| Real hamster activity | Official wheel reading with provenance, observation time, freshness, rate-limit and outage states | Optional desktop community display; never controls game physics or rewards |
| Daily on-chain check-in | Visible, explained **Unavailable** state | No official daily check-in deployment/ABI or trusted eligibility/history API was found; no signing action, reward, streak or transaction is simulated |
| Leaderboard | Real local run history | No hosted backend was supplied; browser-only fallback |

NFT reads verify chain ID, the collection/Core/SQK deployment addresses, verified capabilities, a confirmed block and snapshot freshness. Each page reads twelve tokens and their held metadata; next-page reads are explicit. Unavailable or mismatched data is an error, not zero ownership. NFT images are restricted to supported image data URIs and official HTTPS hosts. Selection clears on wallet/network change or after two minutes. Ownership is an official API snapshot, not a continuously refreshed proof.

The network is **Sepolia, chain 11155111**, as published by Squeekchain. The RPC is PublicNode’s verified Sepolia endpoint, and address links use the officially published Blockscout explorer. Exact endpoints, addresses, dated sources, Genesis requirements and the missing check-in dependencies are in [artifacts/INTEGRATIONS.md](artifacts/INTEGRATIONS.md). Ordinary gameplay never invokes a wallet transaction.

## Project structure

```text
src/game/       fixed-step engine, designed levels, input, rendering, pixel art, audio
src/adapters/   local persistence, official API reads, wallet configuration
src/ui/         profile, leaderboard, settings, dialogs, wallet/NFT and wheel panels
src/App.tsx     top navigation, game HUD, progression and game-state screens
public/assets/ local fonts, original favicon/share image, wallet identification marks
scripts/        gameplay, production-browser, full-adventure and integration checks
dist/           complete production static export
artifacts/      source/integration notes, validation evidence and license notices
```

Physics advances at a fixed 120 Hz, independently of render cadence. Canvas backing resolution is bounded, scenery is deterministic, offscreen actors are culled during drawing, and the audio engine synthesizes the original music/SFX locally. External adapters have bounded requests and failure states; no external data is needed for the adventure.

## Checks and results

```sh
npm test
npx playwright install chromium
npm run test:browser
npm run test:adventure
node scripts/adventure-check.mjs --mobile
npm run test:integration
npm run test:revision
```

Run `npm test` before the browser suite: it creates an actually earned victory profile used to check populated UI. Integration checks additionally require `curl` and access to the official public API. They capture real public responses for a public holder, then test the browser against those exact responses and deliberate error conditions. No sample NFTs or players are bundled into the runtime.

The full-adventure browser check builds an excluded test export with an engine-reference hook, drives normal input states through the real physics, and clicks actual transition/reward UI. The shipped export has no test hook. Tests write only under excluded `test/scratch/`; the application build never depends on that directory.

Revision validation on 2026-11-06 (Europe/Berlin): production build and TypeScript check passed; **16 gameplay checks, 19 production-browser checks, ten adventure-flow browser checks across desktop and mobile, seven integration checks and four finding-regression checks passed**. The pinned design probe passed **16/16**. Production layout was checked at 320, 390, 744 and 1440 pixels, plus mobile landscape. All four review findings were reproduced before targeted repairs. See [artifacts/VALIDATION.md](artifacts/VALIDATION.md) for commands, retained evidence, repairs and coverage limits.

WebKit could not launch because the host lacks its system libraries. Physical wallet apps, Coinbase passkeys and wallet-confirmed transactions were not exercised. Public API reads succeeded through `curl`; direct external requests from this machine’s browser were unavailable, so browser success states used the captured real responses. Automated fast traversal establishes completion, but is not human difficulty testing. Canvas gameplay is visual and has no screen-reader equivalent. These limits are recorded explicitly rather than represented as successful checks.

## Design and attribution

[DESIGN.md](DESIGN.md) records the final tokens, typography, components and responsive behavior. Art, characters, scenery, game icons, animation and synthesized music/SFX were created for this project. Local DM Sans and Pixelify Sans retain their OFL notices. Wallet marks identify the real providers; they are not game art. Design guidance and other attribution are preserved in [artifacts/ATTRIBUTION.md](artifacts/ATTRIBUTION.md).
