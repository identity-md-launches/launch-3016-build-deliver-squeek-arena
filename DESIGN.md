# Squeek Arena design system

## Overview

Squeek Arena is a playable indie adventure for desktop and touch screens. The game occupies the main surface immediately; the first action is Start adventure. Quiet charcoal/sage framing supports warm, outlined pixel art. The amber accent marks the primary action, active navigation and earned state. The top navigation remains the primary route between Play, Character, Leaderboard and Settings.

The desktop Play view pairs a large game stage with a narrow, optional profile/community column. On phones the game and its controls take priority. This composition belongs to Play; profile and settings use ordinary readable panels. Implementation lives in `src/styles.css`, `src/App.tsx` and `src/ui/`.

## Colors

Canonical tokens are CSS custom properties in `src/styles.css`.

| Token | Value | Job |
| --- | --- | --- |
| `--bg` | `#191d1b` | Page background |
| `--surface` | `#222823` | Main stage/panel surface |
| `--surface-raised` | `#2a322a` | Raised/hover surface |
| `--field` | `#171c18` | Text inputs/address field |
| `--line` | `#3b453b` | Quiet separators and outlines |
| `--text` | `#eee9da` | Primary text and focus outline |
| `--muted` | `#a7afa1` | Supporting text |
| `--dim` | `#838e7f` | Low-emphasis decorative details |
| `--accent` | `#e8ba72` | Primary button, selected route, important progress |
| `--accent-hover` | `#f4ce8d` | Primary hover |
| `--ink` | `#282a20` | Text on the primary button |
| `--error` | `#e7ac97` | Rejected/unavailable action feedback |
| `--sage` | `#a3b791` | Quiet game/status support |

World palettes are local to `src/game/art.ts` and `renderer.ts`: forest greens and warm earth; slate/lavender crystal; desaturated industrial green/metal. These are scenery palettes, not additional action accents. The UI uses text alongside semantic colors and icons. The design probe measured solid-background DOM text against its 4.5:1 / 3:1 thresholds; canvas/image-backed text was not measured. See validation for the exact coverage limit.

## Typography

- **DM Sans** (`public/assets/dm-sans.woff2`, fallback `sans-serif`) handles controls, body copy, data and supporting text. The local variable font is declared for weights 100–1000; the interface requests 400, 500 and 700.
- **Pixelify Sans** (`public/assets/pixelify-sans.woff2`, fallback `sans-serif`) handles the game title, page-intro line, state headings and diegetic tutorial signs. Its declared weight range is 400–700.
- Six CSS sizes: `--small: 14px`, `--body: 16px`, `--sub: 20px`, `--heading: 28px`, `--display: 40px`, `--title: 64px`. Mobile state headings use 28px. The game title stays 64px and deliberately breaks between Squeek and Arena.
- Body line height is 1.5; supporting story/help text uses 1.6–1.7; headings use 1.2, state titles 1.05, and the title 0.91. Title tracking is `-0.035em`; ordinary content uses natural tracking and sentence case.
- Scores and table cells use tabular numerals. Headings balance wrapping; paragraphs use pretty wrapping. Help/state copy is bounded in characters rather than stretched across the stage.

Font files are bundled locally, and the browser suite waits for `document.fonts.ready` and verifies both font faces report `loaded`. The title treatment does not introduce gradient text or glow effects.

## Layout

`main-content` is centered with a 1536px maximum width and 40px desktop side padding. Header height is 88px. Desktop `play-layout` uses a flexible game column and 264px sidebar with a 32px gap. Related controls use 4/6/8/10/12px gaps; component padding commonly uses 12/16/20/24px; section separation uses 24/28/32px. These are implemented values, not a separate invented spacing-token scale.

The stage scene uses a 1.93 aspect ratio with a 422px minimum desktop height. The canvas renders a 480-unit vertical world with a bounded 260–1800-unit width. CSS scales the bitmap with pixelated rendering; the physics coordinate system remains stable when resizing.

Implemented breakpoints:

| Condition | Behavior |
| --- | --- |
| At least 1500px | More scene height/title breathing room |
| At most 1190px | 24px page padding, 235px sidebar, tighter navigation |
| At most 980px | One game column; supporting panels become a two-column group |
| At most 700px | Two-row top header, text-only nav, 16px page padding, supporting sidebar hidden, compact HUD and two-column cosmetics/NFTs |
| At most 360px | 10px page padding, tighter touch/navigation spacing, single-column profile overview |
| Coarse pointer | Touch controls visible; utility targets enlarged |
| Coarse pointer, landscape, height at most 550px | Compact single-row header; controls overlay the lower game edges; stage fits viewport |
| Reduced-motion preference | CSS transitions/press scaling disabled; game setting defaults to reduced motion |
| Forced colors | System-colored control outlines and visible progress boundaries |

Active portrait mobile play hides the intro/footer/route, locks page scroll, and sizes the stage using `100dvh`, reserving room for the HUD, touch controls, objective strip and bottom safe area. Pause/results restore the normal page arrangement. Data tables have a contained horizontal scroll region; the page itself does not overflow. Native dialogs scroll within the viewport.

Observed widths are 320, 390, 744 and 1440px; landscape touch was checked at 844×390. Physical notches, foldables and browser chrome behavior on actual phones remain unverified.

## Elevation & Depth

The interface is mostly flat: tonal surfaces, 1px borders and separators, with no decorative card shadows or glows. Native dialogs use a dark backdrop and the browser top layer. Victory and defeat portraits animate unless reduced motion is enabled. Celebration uses presentation time while the completed run clock stays frozen. Game pause/transition/results use an opaque darkened overlay above the canvas; the underlying location/HUD remain contextual. Parallax layers, outlines and small highlights create depth inside the game art. The title-screen illustration has a dark readability mask; text itself is solid colored.

## Shapes

The main radius token is `--radius: 8px`. Buttons, cosmetics, NFT cards and segmented controls commonly use 6px; dialogs use 10px; the mobile wallet sheet uses 12px upper corners. Small field/details use 4–5px. Pixel-art characters and world objects retain stepped edges and consistent dark outlines. Status dots are small circles, while progress tracks are simple horizontal bars.

## Components

| Component/pattern | Source | Behavior |
| --- | --- | --- |
| Top navigation | `src/App.tsx`, `.top-nav` | Four real buttons, selected underline and `aria-current`; changing route pauses play |
| Primary / secondary / text / icon buttons | `src/styles.css` | Amber primary, outlined supporting action, quiet text, named icon utilities; hover/pressed/disabled/focus states |
| Game HUD/state screens | `src/App.tsx` | Hearts/lives/seeds/score/objective, boss health, pause, defeat/retry, transitions and victory summary |
| Touch buttons | `src/App.tsx`, `game/input.ts` | Pointer capture, cancellation handling, simultaneous direction/action input; generally 48×58px, larger jump, compact-width exceptions |
| `Modal` | `src/ui/Modal.tsx` | Native dialog, named heading, focus containment, Escape/backdrop close and opener focus return |
| `SettingsPanel` | `src/ui/Panels.tsx` | Labeled native ranges and switches; values save immediately; explicit audio-failure message |
| `CharacterPanel` / `ProfileMini` | `src/ui/Panels.tsx` | Name form, XP progress, achievements, earned/locked/equipped cosmetics and optional portrait |
| `LeaderboardPanel` | `src/ui/Panels.tsx` | Labeled local scope, filter group, loading/empty/error/table states and retry |
| `WalletControls` / `NftIdentity` | `src/ui/Wallet.tsx` | Provider discovery, mobile app links, network/error/pending states; paginated verified identity reads with cooldown |
| `Wheel` | `src/ui/Wheel.tsx` | Real measurement, provenance/time/freshness, loading/error/retry; optional community context |
| `HamsterPortrait`, `PixelItem`, `RegionArt`, `Icon` | `src/ui/` | Locally drawn canvas art and custom SVG paths; decorative icons hidden from assistive technology |

Focus uses a 2px primary-text outline with 4px offset. The skip link appears on keyboard focus. Native labels, table headers and progress semantics carry ordinary UI meaning. The visual canvas game itself is not a screen-reader accessible game.

## Do’s and Don’ts

Start an added page inside the existing top navigation and `panel-page` pattern. Use the six existing type tokens, quiet dividers and one clear primary action. Use `Modal` for interrupting tasks and inline status text for recoverable failures. Keep wallet and live-data reads optional.

Preserve pixel outlines, original character proportions and world palettes when adding art. Use amber to guide an action or earned state; avoid decorating every surface with it. Do not introduce all-cap labels, tracked eyebrow text, emoji game assets, gradient lettering, glow effects or fabricated online activity. Keep directions beside the relevant controls.

This document describes the final implementation. Six-domain review coverage and actual findings/fixes are in `artifacts/VALIDATION.md`. Guidance attribution and licenses are in `artifacts/ATTRIBUTION.md`.
