---
product: WLD
productName: 微粒贷
platform: wechat
pageClass: wld-page
---

# WLD (微粒贷) Product Profile

Everything in this file is specific to 微粒贷. `SKILL.md` holds the method and points here for product facts. The frontmatter above is the machine-readable half of the profile — `server.cjs`, `qa-gate.mjs`, `npm run validate` and the site build read `platform` and `pageClass` from it.

Read this file at Step 3, before writing any screen HTML.

- **Product:** WLD (微粒贷 / Weilidai / WeBank Micro-Loan) — runs as a WeChat Mini Program
- **Page class:** `.wld-page` — every screen is wrapped in it
- **Token prefix:** `--wld-*` (this profile's own prefix; nothing shared depends on it)

---

## Screen templates

Production-accurate HTML in `profile/screens/`, exported from Figma. **This table is checked against disk by `npm run validate`** — if a template exists on disk, it is listed here.

| Screen name | File | Description |
|-------------|------|-------------|
| 个人中心 | `个人中心.html` | Home — new user (预估可借 + 借钱 circle button) |
| 个人中心-有借款 | `个人中心-有借款.html` | Home — active loan (总额度, loan details card) |
| 个人中心-双offer | `个人中心-双offer.html` | Home — dual offer cards (前30天0利息 vs 优惠年利率7.2%) |
| 个人中心-单offer | `个人中心-单offer.html` | Home — single offer badge (限1笔 前30天0利息) |
| 输入金额 | `输入金额.html` | Loan amount input (form + options + bottom CTA) |
| 提前还清 | `提前还清.html` | Early repayment (receipt list + checkboxes + action bar) |
| 本期应还 | `本期应还.html` | Current period due (amount summary + receipt list) |
| 收银台 | `收银台.html` | Cashier — repayment method (amount summary + bank card / transfer cards + centered CTA) |
| 借款详情 | `借款详情.html` | Loan details — principal & status header + installments list (no bottom bar) |
| 欢迎页 | `欢迎页.html` | Welcome / first-run landing — value prop + 3 feature icons + primary CTA (white bg) |
| 更换还款卡 | `更换还款卡.html` | Change repayment card — current card selected + alternatives + add new |
| 我的Tab | `我的Tab.html` | Account tab — avatar header, feature grid, welfare row (我的 active, `#F5F5F5` bg) |

**When the user names a screen in Chinese** (e.g. "优化个人中心样式"), read the matching file and use it as the base template.

## Which template to read

| Screen type | Read this file |
|-------------|---------------|
| Home / landing | `个人中心.html` (or the -有借款/-双offer/-单offer variant) |
| Amount input / form | `输入金额.html` |
| Repayment / receipt list | `提前还清.html` |
| Due amount / info | `本期应还.html` |
| Pay / repayment method / cashier | `收银台.html` |
| Loan detail / installment list | `借款详情.html` |
| Onboarding / welcome | `欢迎页.html` |
| Bank card management | `更换还款卡.html` |
| Account / profile (我的) tab | `我的Tab.html` |
| Any card/cell layout | Also read `profile/components.css` |

**Canonical reference:** where templates disagree (inline styles vs. classes), prefer the majority pattern. `个人中心.html` is the canonical home screen reference.

---

## Design language

**Trustworthy, Simple, Calm.** The interface should inspire financial confidence through restraint — never pressure, never overwhelm. Text is concise and factual; the tone is neutral and informative, not promotional. The brand speaks quietly but clearly.

**Visual tone:** clean, minimal, and warm. The design lives in a narrow palette — white surfaces, a light grey background, and a single gold accent reserved for primary actions. Text hierarchy is achieved through opacity (0.9 / 0.5 / 0.35), not competing colors. Light mode only.

**References:** WeChat native UI; Apple's iOS design language — whitespace, system fonts, information density balance.

**Anti-references:** flashy lending apps (red/orange urgency colors, countdown timers, gamified rewards, aggressive promo banners); traditional banking UIs (dense data tables, corporate gradients, stiff formal layouts); anything that creates artificial urgency or emotional pressure around borrowing.

### Principles

1. **One gold action per screen** — the gold accent is the single most powerful visual element. Reserve it for exactly one primary CTA per screen; all other actions use secondary or outline styles. The production dual-offer state is the explicit exception: its two mutually exclusive offer cards each keep their gold `借钱` action.
2. **Hierarchy through opacity, not color** — three opacity levels on black (0.9 / 0.5 / 0.35) create the reading order. Avoid colored text except links (`--wld-info-500`) and promotional highlights (`--wld-emphasis-500` / `--wld-promo-500`).
3. **Earn every pixel** — no decorative filler. Remove background patterns, "温馨提示" boilerplate, redundant icons, and anything that doesn't help the user decide or act. If text can be shorter, make it shorter (body text ≤15 characters where possible).
4. **WeChat-native context** — mockups keep the presentation-only preview chrome; users should never feel they've left WeChat.
5. **Calm information density** — enough whitespace to feel calm, enough information to feel confident: 20px card padding, 12px section gaps, 20px page margins. Never cram; never leave screens feeling empty.

### Typography

- Body: `var(--wld-font-family)`. Numbers: `var(--wld-font-number)` (WeChat Sans SS) — only for large currency amounts.
- Headlines 20–24px semibold; body 14–16px regular; 12px captions sparingly, for hints only. Hierarchy comes from opacity, not competing weights.
- **Large currency amounts:** 44px, **weight 500** (not semibold), `letter-spacing: -0.5px`, `line-height: 1.2`. The ¥ prefix may be smaller (20px, as in the dual-offer cards). The 预估可借 label above the amount is 14px semibold.

### Elevation

Minimal shadows: cards may use `var(--wld-shadow-card)`; avoid heavy drop shadows. Depth comes from border contrast and surface color variation.

### Component notes

The values live in `tokens.css` and the CSS lives in `components.css`; these are the behavioral rules the CSS alone does not say:

- **Quick amount chips** (输入金额): `border-radius: 4px`, padding 5px 10px, 14px text, `rgba(0,0,0,0.06)` background. They are NOT buttons — never make them pills.
- **Settings/options row** (输入金额 loan config): label (14px semibold, left) + value (14px regular, right-aligned) + chevron, inside a white 12px-radius card, 0.5px dividers indented 20px. A distinct pattern from Select/Cell.
- **Checkbox:** round or square (2px radius), 20px or 16px. Checked = gold background + black check mark SVG:
  `<svg viewBox="0 0 16 16" fill="none"><path d="M4 8.5l2.5 2.5L12 5" stroke="rgba(0,0,0,0.9)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
- **Radio:** round only. Checked = gold border + gold inner dot (10px) — NOT a gold-filled background.
- **Info icon:** 18×18 SVG circle (stroke `rgba(0,0,0,0.35)`, 1px) with a centered "i" (11px, semibold, same color). Never emoji or unicode.
- **Status icons:** 60×60 gold circles; icon tint is black (`rgba(0,0,0,0.9)`).
- **Buttons loading:** text becomes invisible and the spinner appears centered — never text + spinner together.

---

## Product laws

Non-negotiable. These win over anything a template appears to show.

- **Text on gold is never white.** Always `rgba(0,0,0,0.9)` (`--wld-text-on-theme`).
- **Buttons are always pill-shaped** (`border-radius: 999px`). Never squared.
- **Quick-amount chips are the exception:** `border-radius: 4px`, NOT `999px`.
- **Background depends on screen depth.** Home screens use `#FFFFFF` on `.wld-page` (and a white navbar). Inner/detail screens use the default `#F5F5F5`. Check the template you are copying.
- **No artificial urgency.** No `立即领取`, countdowns, `仅剩`, `秒杀`, or pressure language.
- **No thousands separators.** Production writes `¥60000`, never `¥60,000` — consistently on every screen.
- **Large currency amounts are `font-weight: 500`**, not semibold.
- **Never `font-family: sans-serif`.** Use `var(--wld-font-family)`.
- **Body text is never `#000`.** Use the opacity scale (`--wld-text-primary/-secondary/-tertiary`).
- **Dividers are 0.5px** (`--wld-divider`); no thick borders (2px+) on elements.
- **No emojis anywhere.** Use the profile's icon set or inline SVGs.
- **Home screens keep the tab bar** (借钱 / 我的).
- **Required rate, agreement, repayment and risk text stays** whenever the template has it.
- **One primary gold CTA per screen.** The production dual-offer state is the explicit exception described above.

### Canonical CTA forms

Each screen ships a CTA form that visual variants must not swap:

- `个人中心` — the 84px gold circle 借钱 button
- `个人中心-双offer` — two side-by-side offer cards, each with its own small gold 借钱 button
- `输入金额` — the full-width gold pill 下一步, in the template's own position
- `收银台`, `更换还款卡` — CTA centered directly below the content
- `提前还清` — the only screen using a fixed bottom action bar

When content ends high on the screen, the CTA sits right after it. A CTA pinned to the bottom behind an empty region is a defect.

### Preview chrome

Use the placeholder from the production template:

```html
<preview-chrome variant="home" title="微粒贷"></preview-chrome>
<preview-chrome variant="inner" title="提前还清借款"></preview-chrome>
```

Never hand-write status bar, navbar, capsule, or back-arrow markup. The server expands the placeholder. This chrome is presentation only — it is not WLD production code.

### Screen-specific styles

多个生产模板共用的样式放在 `components.css`；仅属于单个页面的样式保留在模板底部的 `<style>` 中（例如 `.wld-loan-amount`）。改造模板时必须同时保留其局部样式；同一方案页只保留一份局部 CSS，禁止为每个方案重复复制。

---

## Product rules and pitfalls

After reading the template, read `profile/PRODUCT.md` to find the screen's COMP_ID. If one exists, load matching entries from `profile/pm-memory-cache/product-patterns.yaml` and `profile/pm-memory-cache/common-pitfalls.yaml` per that file's filter rule, and inject them under its labelled headers before generating solutions.

Patterns describe state splits, hidden product variants, and default-selection rules the visual template alone does not capture (e.g. 首借/非首借 keyboard CTA differs; the 期数 sheet has two independent variants). Pitfalls are must-avoid constraints, not cleanup suggestions.

If a rule conflicts with the template, **the rule wins** — flag the conflict to the user. If no COMP_ID is mapped or the cache file is missing, skip silently.

**Do not edit `pm-memory-cache/` during normal use** — it is a bundled product knowledge snapshot.

---

## Passes

Run these in Steps 4 and 5, after the shared Simplify pass, before showing anything to the user.

| Pass | Doc | Notes |
|------|-----|-------|
| Fix Details | `profile/passes/fix-details.md` | Verifies loan arithmetic with `profile/tools/calc.mjs`. If a calculation needs missing loan parameters, leave the value unchanged and note the exact input needed. |

---

## Solution archetypes

The UX Strategy directions for this product's screens. `references/solution-archetypes.md` holds the method (UX vs Visual modes, caption format) and the visual archetypes; these are the product-specific ones it points here for.

### Loan amount / borrowing entry

- **Amount-first:** fastest path to entering amount and submitting
- **Repayment-confidence:** foregrounds monthly repayment, term, and repayment schedule before CTA
- **Offer-comparison:** helps compare term, rate, and discount tradeoffs
- **Guardrail-first:** makes eligibility, limits, disabled states, or risk explanations clear before action

### Home / personal center

- **Credit-first:** makes available credit the dominant object
- **Task-first:** makes the next likely action obvious based on user state
- **Repayment-aware:** balances borrowing entry with due amount and repayment status
- **Offer-aware:** lets promotion or preferential rate explain why the user should continue, without pressure

### Repayment / due amount

- **Receipt-first:** makes selected loans, totals, and due items easy to verify
- **Risk-reduction:** emphasizes what changes after repayment and whether any fee/risk remains
- **Batch-action:** optimizes selecting or clearing multiple loans quickly
- **Status-first:** prioritizes paid, overdue, processing, or failed repayment status

---

## Figma component library

When running the Push to Figma branch, prioritize these existing components before drawing primitives:

`Button 按钮`, `Actions 操作区`, `借钱按钮`, `Input 输入框`, `借款金额输入`, `借款选项`, `Keyboard 键盘`, `Cell 列表项`, `Receipt 借据`, `优惠券`, `Dialog 弹框`, `Drawer 抽屉`, `Header 标题`, `Tabs`, `Tab Bar - 首页 Tab`, `首页主内容`, `首页详情`, `利率条`.

Frames are 375 x 812. Preserve Chinese copy, amounts, rates and agreement text exactly.

---

## Quick reference

```
Theme: #FFD143 | Text: rgba(0,0,0,0.9)
Bg: #F5F5F5 (inner pages) | #FFFFFF (home screens)
Emphasis: #F7852C | Promo text: #EE8A27 | Info: #5C8EE6 | Danger: #FF5A4F
Font: var(--wld-font-family) | Numbers: var(--wld-font-number) 44px weight 500
Buttons: border-radius 999px | Preview chrome: <preview-chrome> expands to 88px WeChat navbar
Page: 375x812 | Cards: white, 12px radius
```

Values are restated here for convenience only — `profile/tokens.css` is the single source of truth.

**Production screens & terminology:** `profile/production-reference.md`
