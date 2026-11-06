# Squeek Arena validation

Revision checked **2026-11-06** (Europe/Berlin). Scope: reproduce and repair the missing documentation finding `01684f65d8dbe95ac616962ed0a93177341e0072f9ddf990c5af73043ae4aa10`, preserve accepted gameplay and recheck the delivered export. This is the worker's measured report, not independent certification.

## Finding, repair and evidence

**High — missing delivery documentation.** `README.md:70`, `README.md:103` and `README.md:109` linked `artifacts/INTEGRATIONS.md`, `artifacts/VALIDATION.md` and `artifacts/ATTRIBUTION.md`. Before editing, the reviewer's Markdown-link extraction and filesystem-access logic reported all three missing while `DESIGN.md` passed. The complete revision suite also reproduced its documentation failure (`3 !== 0`); the Escape and boss-advice assertions passed. Its first wheel-browser attempt could not run before browser tooling was installed.

The repair adds the three actual documents, dated inspected official sources, the Genesis applicability assessment, exact missing daily-check-in dependencies, explicit integration trust boundaries, full font/design/dependency notices, retained test results and representative screenshots. README's validation paragraph is updated to describe this revision. No game, wallet, styling, build configuration or dependency implementation was changed. The accepted `dist/` export is retained byte for byte. [The response file](../.imd-responses.json) records the finding's disposition.

Final submission inspection found the packaging cause: Git's existing repository-local exclusions hide `artifacts/` and `.imd-responses.json`, even when those files exist. `git check-ignore -v` reproduced both exclusions. Narrow exceptions in the root `.gitignore` now keep only the required documentation, license and evidence file types visible, with an explicit **1536 KiB artifacts / 4 KiB response** path budget inside the existing 8 MiB total. No `.git/` file was modified. Dependency/cache/scratch exclusions remain in force. Git visibility, as well as filesystem existence, is checked before handoff.

## Build and interaction verification

The following checks were run against the existing source/export in this revision. Standard reproduction commands are shown; the bounded worker used the same locked tool versions in an excluded flat tooling directory because this task prohibits writing `node_modules/`.

| Check | Reproduction command | Actual outcome |
| --- | --- | --- |
| Production build | `npm run build` | Pass. Vite 8.3.6 production build completed. A verification build was written under excluded scratch, preserving the accepted `dist/`. |
| TypeScript | `npm run typecheck` | Pass. TypeScript 7.0.2, strict mode and `--noEmit`; scratch configuration maps the same packages/types in the flat layout. |
| Engine/gameplay | `npm test` | **16/16 passed.** Movement/jump/attack/dash, coyote/buffer, solid/one-way collision, damage protection, enemies/tells, spikes/steam/falls, checkpoints/retry/game-over, score idempotence, persistence failure, audio failure, three-world traversal and boss victory. |
| Production browser | `npm run test:browser` | **19/19 Chromium checks passed; one WebKit check unperformed.** Real static export served at `/preview/`, including UI, keyboard/touch input, wallet/error states, audio, persistence and offline degradation. |
| Full adventure, desktop | `npm run test:adventure` | **5/5 passed.** All worlds, completion UI, boss combat/defeat/victory, reward/profile/score persistence, game-over/retry/restart and confirmation flows. |
| Full adventure, mobile | `node scripts/adventure-check.mjs --mobile` | **5/5 passed**, same flows in a 390×844 touch context. |
| Official integrations | `npm run test:integration` | **7/7 passed.** Twenty-eight real public API captures; NFT ownership/metadata/pagination/selection, mismatch/stale/unavailable refusal, rate-limit recovery and wheel provenance/staleness. |
| Pinned design probe | `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | **16/16 passed** against retained `dist/`. The pinned probe is an assignment input; its results remain delivered after the input is removed. |

The finding-regression suite and final documentation-link check are recorded in [revision results](evidence/results/revision.json). The other retained results are [gameplay](evidence/results/gameplay.json), [browser](evidence/results/browser.json), [desktop adventure](evidence/results/adventure-desktop.json), [mobile adventure](evidence/results/adventure-mobile.json), [integrations](evidence/results/integrations.json) and [taste probe](evidence/results/taste.json). [Build/typecheck evidence](evidence/build-and-typecheck.json) records the actual invocation adaptations without depending on them at runtime.

Tooling details and initial attempts: packages were extracted into excluded scratch using the lockfile's exact URLs and verified integrity hashes; nothing was installed into `node_modules/`. A Node package-resolution hook and Vite resolution plugin provided the flat layout. Initial TypeScript resolution lacked nested wagmi type paths; adding those paths to the **scratch-only** check configuration resolved it without a source change. The successful build emitted dependency `use client`-directive warnings and a browser externalization warning for ox's optional `node:worker_threads` path; production browser checks had no script or missing-local-resource errors. An initial build into `dist/` was reverted to the accepted export before browser validation; subsequent verification output stayed in scratch.

The provided browser MCP launcher failed before navigation because its temporary socket path was too long. Chromium Headless Shell was then installed in excluded scratch and all successful browser checks/probe used Playwright 1.65.0 with that executable. No remote browser-tool rendering is claimed. WebKit was not installed in this revision environment; the suite explicitly skipped that additional check. The inherited README's older host-library diagnosis is not treated as a newly measured result.

## Observed browser flows

Production widths **320, 390, 744 and 1440px** had no horizontal page overflow, script exceptions or missing local resource responses. At **390×844**, Start adventure's top was 561px and the whole button was within the first viewport. Both local font faces reported loaded. The actual [390px menu](evidence/screenshots/menu-390.png) and [1440px menu](evidence/screenshots/menu-1440.png) screenshots were opened and visually inspected: the product, top navigation and main action are visible, with the original amber/charcoal/sage pixel-art treatment intact.

The browser suite starts without a wallet, sends keyboard movement/jump/attack/dash, pauses, changes audio/settings, returns modal focus, refreshes a save, edits the explorer name and uses local board filters. It checks multi-pointer touch input, a 320px Gentle-mode HUD, 844×390 mobile landscape, tab hiding, blocked storage, unavailable audio, no-provider/rejected/wrong-network wallet states, network switch/disconnect, mobile app links, unavailable check-in and offline external-data feedback. [Mobile play screenshot](evidence/screenshots/mobile-play.png).

Adventure checks build an excluded test export that exposes the real engine reference. They drive held/pressed input states through the actual physics and click normal completion/reward UI. The shipped export has no engine-reference test hook. Traversal is accelerated, and targeted setup is used for retry/game-over assertions. The desktop run reached boss HP 0, animated victory, a frozen final run clock, 2,980 earned points and persisted rewards; the mobile run reached victory with 3,020 points. These are test outcomes, not fabricated leaderboard entries bundled in the runtime. [Desktop victory screenshot](evidence/screenshots/victory-desktop.png), also opened and inspected.

Official API reads succeeded through `curl`. Browser success states used exactly captured real responses; deliberately modified copies tested mismatch, old snapshots, unavailable and rate-limit failures. Direct browser access to external services was unavailable during these checks. The isolated test provider cannot sign or send transactions. Neither captured data nor that provider is injected into the production export.

## Better Interface consolidated review

The pinned workflow, core principles of all six domains, and implementation-documentation method were read and applied to this bounded repair. Existing implemented tokens/components remain documented in [DESIGN.md](../DESIGN.md); no redesign was warranted by the reproduced finding.

| Domain | Coverage and evidence | Unperformed subchecks / limitations |
| --- | --- | --- |
| Accessibility — Checked | Source: native controls, labels, named dialogs, skip link and focus handling (`src/ui/Modal.tsx:31`, `src/styles.css:84`). Browser: keyboard focus, Escape/focus return, reduced motion and touch controls. Probe: all ten first-screen controls meet its 24px target/spacing rule. | No screen-reader session or full accessibility audit; five first-screen targets are below the preferred 44px size but meet the measured baseline/spacing test. Canvas combat has no screen-reader equivalent. |
| Layout — Checked | Source: breakpoint/safe-area structure in `src/styles.css`; browser: 320/390/744/1440, touch landscape and active-play scroll lock. Opened mobile/desktop screenshots; product/main action visible at 390. Probe: no overflow, text overlap, floating obstruction or clipped text. | Physical devices, browser-native 200% zoom, RTL mirror and pseudo-localization were not tested. The shipped interface is English-only. |
| Writing — Checked | Source/UI: verbs identify actions, controls include nearby directions, local leaderboard scope is explicit, unavailable check-in never promises a reward (`src/ui/Panels.tsx:434`), API failures describe recovery. Documentation now provides the evidence its README links promise. | The review is limited to implemented English copy. No translation review was performed. |
| Typography — Checked | Source: two local font faces and six semantic sizes (`src/styles.css:1`, `src/styles.css:30`); browser confirms both faces loaded. Probe reports two families and three weights. Opened screenshots confirm hierarchy and wrapping in inspected states. | No physical iOS input-zoom test or exhaustive maximum-length/localized-content review. |
| Colors — Checked | Source: existing role tokens (`src/styles.css:15`) retained. Probe: all measured solid-background DOM text meets 4.5:1, or 3:1 for large text. Text labels accompany semantic states. | **15 image/video/canvas/gradient-backed text boxes were not measured** by the probe. No claim of universal contrast compliance; canvas contrast and all focus-ring background pairs were not exhaustively measured. No light theme exists to test. |
| UI details — Checked | Existing dialogs, buttons, profile, board, settings and wallet/community failure states exercised. Source has named 120ms transitions/press feedback and reduced-motion handling. Probe finds no gradient text, border/shadow stacking, nested cards, `transition: all` or endless DOM animation. | No animation-panel review at 10% speed, physical app handoff or every possible wallet-provider variant. Gameplay animation is checked by engine/adventure behavior, not by the DOM motion probe. |

The one reproduced high-severity finding is the documentation omission at the README locations above. Its fix is the delivered documents and notices, not a visual/code change. The new browser/probe checks found no applicable first-screen or repeated visual failure requiring a source repair. Comfortable touch sizes and the unmeasured contrast regions remain explicit coverage limits rather than silently marked passes.

## Remaining boundaries

- No real wallet app/extension/passkey account was used; wallet confirmation and physical deeplink handoff remain unperformed.
- Daily check-in is unavailable because the official deployment/ABI, authoritative daily eligibility, confirmation policy and verifiable history are absent. No pending/confirmed transaction or streak is simulated. See [exact dependencies](INTEGRATIONS.md#daily-on-chain-check-in-unavailable).
- No hosted/shared score or profile backend was supplied. The local board is editable and does not claim server-validated scores or cross-device accounts.
- No human difficulty study, physical-device run, Safari/WebKit completion, screen-reader-equivalent gameplay or prolonged performance soak was performed. Automated traversal verifies completion, not human difficulty.
- Genesis registration, ownership proof, deployment, team approval and publication were not performed. The [integration record](INTEGRATIONS.md#genesis-applicable-requirements-and-optional-steps) identifies the conditional external steps.

**Complete for the stated documentation-revision scope.** The accepted playable implementation/export is preserved, with actual new checks and honest unavailable integrations. Final link, response-schema and submission-budget checks are included in the retained revision evidence.
