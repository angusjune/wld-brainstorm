# WLD (微粒贷) Design System

## Overview

### Brand Personality

**Trustworthy, Simple, Calm.** The interface should inspire financial confidence through restraint — never pressure, never overwhelm. Text is concise and factual. Tone is neutral and informative, not promotional. The brand speaks quietly but clearly.

### Aesthetic Direction

**Visual Tone:** Clean, minimal, and warm. The design lives in a narrow palette — white surfaces, light grey backgrounds (#F5F5F5), and a single gold accent (#FFD143) reserved for primary actions. Text hierarchy is achieved through opacity (0.9 / 0.5 / 0.35) rather than competing colors. Currency amounts use WeChat Sans SS at 44px to feel prominent but not aggressive.

**References:** WeChat native UI, Apple's iOS design language — particularly the use of whitespace, system fonts, and information density balance.

**Anti-references:**
- Flashy Chinese lending apps with red/orange urgency colors, countdown timers, gamified reward elements, and aggressive promotional banners
- Traditional banking UIs with dense data tables, corporate gradients, and stiff formal layouts
- Any design that creates artificial urgency or emotional pressure around borrowing

**Theme:** Light mode only. No dark mode support needed.

### Design Principles

1. **One gold action per screen** — The gold accent (#FFD143) is the single most powerful visual element. Reserve it for exactly one primary CTA per screen. All other actions use secondary or outline styles. Buttons are always pill-shaped (border-radius: 999px).

2. **Hierarchy through opacity, not color** — Text uses three opacity levels on black: primary (0.9), secondary (0.5), tertiary (0.35). This creates clear reading order without introducing color noise. Avoid colored text except for links (blue #5C8EE6) and promotional highlights (orange #F7852C).

3. **Earn every pixel** — No decorative filler. Remove background patterns, "温馨提示" boilerplate, redundant icons, and any element that doesn't help the user make a decision or complete a task. If text can be shorter, make it shorter (body text ≤15 characters where possible).

4. **WeChat-native context** — HTML mockups include presentation-only WeChat chrome: 88px navbar (44px status bar + 44px title bar), capsule button, and back chevron. Use the shared mockup chrome instead of treating it as a WLD product component. Users should never feel they've left WeChat.

5. **Calm information density** — Enough whitespace to feel calm, enough information to feel confident. Cards have generous padding (20px), sections have 12px gaps, and the page breathes with 20px horizontal margins. Never cram; never leave screens feeling empty.

## Colors

- **Primary** (#FFD143): Gold accent for the single primary CTA per screen
- **Background** (#F5F5F5): Page background for inner/detail screens
- **Home Background** (#FFFFFF): Page background for home screens (all 个人中心 variants)
- **Surface** (#FFFFFF): Cards, bottom bars, modals
- **Text Primary** (rgba(0,0,0,0.9)): Headings, labels, button text on gold
- **Text Secondary** (rgba(0,0,0,0.5)): Descriptions, supporting copy
- **Text Tertiary** (rgba(0,0,0,0.35)): Hints, disabled text, timestamps
- **Emphasis** (#F7852C): Promotional highlights, orange accents
- **Promo Text** (#EE8A27): Promotional savings text, offer headers (slightly darker than emphasis). Used in "省利息" and "新用户优惠" text
- **Info/Link** (#5C8EE6): Inline links, info states
- **Error** (#FF5A4F): Validation errors, destructive actions
- **Success** (#98E059): Completion states, positive indicators

## Typography

- **Body Font**: Use `var(--wld-font-family)` — resolves to `-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", "Noto Sans CJK SC", sans-serif`. Do not write `font-family: sans-serif`.
- **Number Font**: Use `var(--wld-font-number)` (WeChat Sans SS) — only for large currency amounts

Headlines use 20-24px, semi-bold weight. Body text uses 14-16px, regular weight.
Captions use 12px sparingly for hints.
Hierarchy is achieved through opacity (0.9 / 0.5 / 0.35), not competing font weights.

### Currency Amount Display

Large currency amounts: `font-family: var(--wld-font-number)`, 44px, **weight 500** (NOT 600/semibold), `letter-spacing: -0.5px`, `line-height: 1.2`. The yen sign prefix may be smaller (20px) as in the dual-offer cards. The "预估可借" label above the amount is 14px semibold.

## Elevation
This design uses minimal shadows. Cards may use a subtle `0 1px 4px rgba(0,0,0,0.06)` shadow for elevation. Avoid heavy drop shadows. Depth is primarily conveyed through border contrast and surface color variation.

## Components

### Button

**Always pill-shaped:** `border-radius: 999px`

| Type | Background | Text | Border |
|------|-----------|------|--------|
| Primary | `#FFD143` | `rgba(0,0,0,0.9)` | — |
| Secondary | `#FFF9D9` | `#DBAE31` | — |
| Outline | transparent | `#DBAE31` | 1px `#DBAE31` |
| Circle | `#FFD143` | `rgba(0,0,0,0.9)` | — |

| Size | Height | Min Width | Padding | Font |
|------|--------|-----------|---------|------|
| XL | 60px | 120px | 0 35px | 20px |
| L | 54px | 120px | 0 35px | 18px |
| M | 48px | 120px | 0 35px | 16px |
| S | 40px | 80px | 0 20px | 16px |
| XS | 32px | — | 0 12px | 14px |

Circle: 84x84px. Disabled: primary → 55% opacity gold, others → `#F2F2F2`. Loading: text hidden, spinner centered.

### Other Components

- **Select/Cell:** 375px wide, 30px left pad, 60px min-height. 40px round icon, 16px label, 12px desc. Checkmark (single) or checkbox (multi) on right.

- **Settings/Options Row** (used in 输入金额 for loan config): Label (14px semibold, left) + Value (14px regular, right-aligned) + chevron arrow. Inside a white card with 12px radius. Dividers: 0.5px, indented 20px from left. This is a distinct pattern from Select/Cell.

- **Quick Amount Chips** (used in 输入金额): Background `rgba(0,0,0,0.06)`, `border-radius: 4px`, padding 5px 10px, 14px text. These are NOT buttons -- they use rectangular shape, not pill (999px). Do not confuse with pill buttons.

- **Checkbox:** Round or square (2px radius). 20px or 16px. Checked = gold background + black check mark SVG:
`<svg viewBox="0 0 16 16" fill="none"><path d="M4 8.5l2.5 2.5L12 5" stroke="rgba(0,0,0,0.9)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`

- **Radio:** Round only. 20px or 16px. Checked = gold border + gold inner dot (10px). NOT gold filled background.

- **Info Icon:** 18x18 SVG circle (stroke `rgba(0,0,0,0.35)`, 1px) with centered "i" text (11px, semibold, same color). Do not use emoji or unicode.

- **Status Icons:** 60x60px gold circles. Success check, Exclamation !, Clock, Shield, Face, Video, Info i, Location. Icon tint is black (`rgba(0,0,0,0.9)`).

## Do's and Don'ts

- **ALWAYS:** Shared WeChat mockup chrome in HTML previews · Pill buttons (999px) · `rgba(0,0,0,0.9)` on gold · 0.5px dividers · `#F5F5F5` inner page bg / `#FFFFFF` home page bg · `var(--wld-font-family)` · 375px base · primary CTA in fixed bottom bar · Tab bar on home screens (借钱/我的)
- **NEVER:** White text on gold · square buttons · text + spinner visible · `#000` for body text · caption for important text · off-palette colors · generic/custom navbar (always use the shared mockup chrome in HTML previews)
- Don't use thick borders (>= 2px) on elements
- **Text on gold backgrounds is always dark** (`rgba(0,0,0,0.9)`) — never white
- Don't use emojis any where
