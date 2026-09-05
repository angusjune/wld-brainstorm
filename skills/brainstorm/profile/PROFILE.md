---
product: WLD
productName: 微粒贷
platform: wechat
pageClass: wld-page
tokenPrefix: wld
---

# WLD (微粒贷) Product Profile

Everything in this file is specific to 微粒贷. `SKILL.md` holds the method and points here for product facts. The frontmatter above is the machine-readable half of the profile — preview, workflow, QA, validation, and site tooling read `platform`, `pageClass` and `tokenPrefix` from it.

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
| 逾期 | `逾期.html` | Home — overdue state (red indicator + 征信 warning, 逾期金额, 部分/全部还款, 应还详情) |

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
| Any card/cell layout | Also read `profile/design-system/components.css` |

**Canonical reference:** where templates disagree (inline styles vs. classes), prefer the majority pattern. `个人中心.html` is the canonical home screen reference.

---

## Design language

**Trustworthy, Simple, Calm.** The interface should inspire financial confidence through restraint — never pressure, never overwhelm. Text is concise and factual; the tone is neutral and informative, not promotional. The brand speaks quietly but clearly.

**Visual tone:** clean, minimal, and warm. The design lives in a narrow palette — white surfaces, a light grey background, and a single gold accent reserved for primary actions. Text hierarchy is achieved through opacity (0.9 / 0.5 / 0.35), not competing colors. Light mode only.

**References:** WeChat native UI; Apple's iOS design language — whitespace, system fonts, information density balance.

**Anti-references:** flashy lending apps (red/orange urgency colors, countdown timers, gamified rewards, aggressive promo banners); traditional banking UIs (dense data tables, corporate gradients, stiff formal layouts); anything that creates artificial urgency or emotional pressure around borrowing.

### Principles

1. **Every screen should have an action** — the gold accent is the single most powerful visual element. Generally, reserve it for exactly one primary CTA per screen; all other actions use secondary or outline styles. But this rule can be broken if there's a strong reason.
2. **Hierarchy through opacity, not color** — three opacity levels on black (0.9 / 0.5 / 0.35) create the reading order. Avoid colored text except links (`--wld-info-500`) and promotional highlights (`--wld-emphasis-500` / `--wld-promo-500`).
3. **Earn every pixel** — no decorative filler. Remove background patterns, "温馨提示" boilerplate, redundant icons, and anything that doesn't help the user decide or act. If text can be shorter, make it shorter (body text ≤15 characters where possible).
4. **WeChat-native context** — mockups keep the presentation-only preview chrome; users should never feel they've left WeChat.
5. **Calm information density** — enough whitespace to feel calm, enough information to feel confident: 20px card padding, 12px section gaps, 20px page margins. Never cram; never leave screens feeling empty.

### Typography

- Body: `var(--wld-font-family)`. Numbers: `var(--wld-font-number)` (WeChat Sans SS) — only for large currency amounts.
- Headlines 20–24px semibold; body 14–16px regular; 12px captions sparingly, for hints only. Hierarchy comes from opacity, not competing weights.
- **Large currency amounts:** 44px, **weight 500** (not semibold), `letter-spacing: -0.5px`, `line-height: 1.2`. The ¥ prefix may be smaller (20px, as in the dual-offer cards). The 预估可借 label above the amount is 14px semibold. Write amounts without thousands separators (`¥60000`, never `¥60,000`).

### Elevation

Minimal shadows: cards may use `var(--wld-shadow-card)`; avoid heavy drop shadows. Depth comes from border contrast and surface color variation. Dividers are 0.5px (`--wld-divider`); avoid borders 2px or thicker.

### Component notes

The values live in `profile/design-system/tokens.css` and the CSS lives in `profile/design-system/components.css`; these are the behavioral rules the CSS alone does not say:

- **Quick amount chips** (输入金额): `border-radius: 4px`, padding 5px 10px, 14px text, `rgba(0,0,0,0.06)` background. They are NOT buttons — never make them pills.
- **Settings/options row** (输入金额 loan config): label (14px semibold, left) + value (14px regular, right-aligned) + chevron, inside a white 12px-radius card, 0.5px dividers indented 20px. A distinct pattern from Select/Cell.
- **Checkbox:** round or square (2px radius), 20px or 16px. Checked = gold background + black check mark SVG:
  `<svg viewBox="0 0 16 16" fill="none"><path d="M4 8.5l2.5 2.5L12 5" stroke="rgba(0,0,0,0.9)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
- **Radio:** round only. Checked = gold border + gold inner dot (10px) — NOT a gold-filled background.
- **Icons:** use the profile's icon set or inline SVG; never use emoji or Unicode symbols.
- **Info icon:** 18×18 SVG circle (stroke `rgba(0,0,0,0.35)`, 1px) with a centered "i" (11px, semibold, same color).
- **Status icons:** 60×60 gold circles; icon tint is black (`rgba(0,0,0,0.9)`).
- **Buttons loading:** text becomes invisible and the spinner appears centered — never text + spinner together.

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
<preview-chrome variant="home" title="微粒贷" nav-bg="var(--wld-bg)"></preview-chrome>  <!-- 逾期: navbar matches the grey page -->
```

Home screens keep the 借钱 / 我的 tab bar. The home offer states use `#FFFFFF` for `.wld-page` and the navbar; the overdue home state and every inner/detail screen use the default `#F5F5F5`. Check the template being copied for the exact combination.

Never hand-write status bar, navbar, capsule, or back-arrow markup. The server expands the placeholder. This chrome is presentation only — it is not WLD production code.

### Screen-specific styles

多个生产模板共用的样式放在 `profile/design-system/components.css`；仅属于单个页面的样式保留在模板底部的 `<style>` 中（例如 `.wld-loan-amount`）。改造模板时必须同时保留其局部样式；同一方案页只保留一份局部 CSS，禁止为每个方案重复复制。

Keep every rate, agreement, repayment, and risk disclosure required by the selected template's workflow contract.

---

## Passes

Run these in Step 4 during the finishing cycle, before showing anything to the user.

| Pass | Doc | Notes |
|------|-----|-------|
| Fix Details | `profile/quality/passes/fix-details.md` | Verifies loan arithmetic with `profile/quality/tools/calc.mjs`. If a calculation needs missing loan parameters, leave the value unchanged and note the exact input needed. |

---

## Branches

This profile declares no product branches. A profile that needs product-specific Step 5 paths may create workflow documents under `profile/branches/` and declare them in this optional table:

| Branch | Doc | Notes |
|--------|-----|-------|

The branch rows are offered in table order. Keep the table absent or empty when the product contributes no branches; Feedback remains available independently.

---

## Canonical terminology

Use these terms consistently in generated screens and captions. The production templates remain the source of truth for full copy and context.

| Chinese | English | Context |
|---------|---------|---------|
| 微粒贷 | Weilidai | App name (WeBank micro-loan) |
| 借钱 | Borrow | Main tab, circle CTA |
| 我的 | My Account | Second tab |
| 预估可借 | Estimated available | Label above amount on home |
| 总额度 | Total credit limit | Shown when partially used |
| 日利率 | Daily interest rate | Shown on active loan home |
| 年利率(单利) | Annual rate (simple) | Interest rate bar |
| 借款期数 | Loan term | In months |
| 还款计划 | Repayment plan | First payment date + amount |
| 收款账户 | Receiving account | Bank card selector |
| 借款用途 | Loan purpose | Dropdown selector |
| 提前还清 | Early repayment | Repay before due date |
| 本期应还 | Current period due | Amount due this period |
| 借据 | Receipt/IOU | Individual loan record |
| 下一步 | Next step | Continue button |
| 还款 | Repay | Repayment action |

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

Values are restated here for convenience only — `profile/design-system/tokens.css` is the single source of truth.
