# Squeek Arena attribution and notices

Recorded 2026-11-06. These notices accompany the source and static export; each included work retains its own license.

## Project-created work

The game engine, hamster, enemies, Iron Gnaw boss, scenery, pixel-animation routines, UI icons, favicon and share image were created for Squeek Arena. Sources are in `src/game/`, `src/ui/Icon.tsx`, `src/ui/PixelArt.tsx` and `scripts/generate-art.mjs`. Music and effects are synthesized locally by `src/game/audio.ts`; no stock audio recording or copied game character is bundled. The NFT portrait integration reads the connected holder's actual identity; Squeek artwork remains the work of its respective rights holders and is not redistributed as invented game assets.

## Bundled fonts

| Asset | Attribution | License included |
| --- | --- | --- |
| `public/assets/dm-sans.woff2` and the matching `dist/` asset | Copyright 2014 The DM Sans Project Authors ([DM Fonts](https://github.com/googlefonts/dm-fonts)) | SIL Open Font License 1.1: [DMSans-OFL.txt](licenses/DMSans-OFL.txt) |
| `public/assets/pixelify-sans.woff2` and the matching `dist/` asset | Copyright 2021 The Pixelify Sans Project Authors ([Pixelify Sans](https://github.com/eifetx/Pixelify-Sans)) | SIL Open Font License 1.1: [PixelifySans-OFL.txt](licenses/PixelifySans-OFL.txt) |

Full copyright and license notices were obtained from the Google Fonts distribution on 2026-11-06: [DM Sans OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt) and [Pixelify Sans OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/pixelifysans/OFL.txt). Fonts are bundled locally and do not require Google Fonts at runtime. Their reserved-name and redistribution terms remain in the full notices.

## Wallet identification marks

The MetaMask, Coinbase Wallet, Rabby and Phantom SVGs under `public/assets/wallets/` and `dist/assets/wallets/` identify real wallet providers. They were supplied through the pinned wallet-connectors reference, which identifies the RainbowKit mark sources. [RainbowKit's MIT notice](licenses/RainbowKit-MIT.txt), Copyright (c) 2024 Rainbow, is retained in full, sourced from the [RainbowKit repository license](https://github.com/rainbow-me/rainbowkit/blob/main/LICENSE) on 2026-11-06. Provider names and marks remain their owners' trademarks; their use here does not imply endorsement. Provider-discovered icons are supplied at runtime by the wallet, not fabricated by the application.

## Design and documentation guidance

The six-domain design review uses Jakub Krehel's **Better Interface**, MIT, pinned at commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`: [upstream source](https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface). Copyright (c) 2026 Jakub Krehel.

The implementation-documentation method is adapted from Paul Bakaus's **Impeccable**, Apache-2.0, pinned at commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`: [document reference](https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md). Copyright 2025 Paul Bakaus. The supplied adaptation changes the method for assignment-scoped work, consolidated reporting and implementation evidence; this revision applies it to the existing design and does not relicense either upstream work.

Both full licenses and the supplied copyright notices are retained in [DESIGN-GUIDANCE.txt](licenses/DESIGN-GUIDANCE.txt). The upstream source identities above remain pinned even after the task's input files are removed. [DESIGN.md](../DESIGN.md) describes the implemented system, and [VALIDATION.md](VALIDATION.md) records actual six-domain coverage and limitations.

## Software dependencies

The authoritative versions and integrity hashes are in `package-lock.json`. [dependency-inventory.json](licenses/dependency-inventory.json) lists all 33 installed production package/version entries and their notice locations; [DEPENDENCIES.txt](licenses/DEPENDENCIES.txt) preserves their full distributed license/notice texts, including Coinbase's included EIP-712 utility notice. This inventory covers production packages whether or not tree-shaking retained every module.

The main runtime works are React/React DOM (Meta, MIT), wagmi and its connectors/core (MIT), viem and ox (MIT), TanStack Query (MIT), and Coinbase Wallet SDK (Apache-2.0). Their supporting dependencies retain their own notices in the same file. Build/test tools such as Vite, TypeScript and Playwright are development dependencies, installed from the lockfile when rebuilding; their package distributions carry their licenses. No package archive, browser binary, npm registry mirror or installed dependency directory is part of the delivered project.

Squeekchain source/API provenance and the distinction between available read integrations and unavailable check-in/hosted services are recorded in [INTEGRATIONS.md](INTEGRATIONS.md). This attribution is not a claim of Genesis registration, approval or affiliation.
