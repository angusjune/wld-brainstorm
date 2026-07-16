# WLD (微粒贷) Product Profile

Everything in this file is specific to 微粒贷. `SKILL.md` holds the method and points here for product facts.

Read this file at Step 3, before writing any screen HTML.

- **Product:** WLD (微粒贷 / Weilidai / WeBank Micro-Loan)
- **Platform:** `wechat` — runs as a WeChat Mini Program
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
- **Required rate, agreement, repayment and risk text stays** whenever the template has it.
- **One primary gold CTA per screen.**

### Canonical CTA forms

Each screen ships a CTA form that visual variants must not swap:

- `个人中心` — the 84px gold circle 借钱 button
- `输入金额` — the full-width gold pill 下一步, in the template's own position
- `收银台`, `更换还款卡` — CTA centered directly below the content
- `提前还清` — the only screen using a fixed bottom action bar

When content ends high on the screen, the CTA sits right after it. A CTA pinned to the bottom behind an empty region is a defect.

### Preview chrome

Use the placeholder from the production template:

```html
<wld-wechat-chrome variant="home" title="微粒贷"></wld-wechat-chrome>
<wld-wechat-chrome variant="inner" title="提前还清借款"></wld-wechat-chrome>
```

Never hand-write status bar, navbar, capsule, or back-arrow markup. The server expands the placeholder. This chrome is presentation only — it is not WLD production code.

### Screen-specific styles

Each template defines its own CSS classes in a `<style>` block at the bottom (`.wld-rate-bar`, `.wld-home-content`, `.wld-loan-amount`). These are **not** in `components.css`. When adapting a template, copy these local styles along with the HTML.

---

## Product rules and pitfalls

After reading the template, read `profile/product-memory.md` to find the screen's COMP_ID. If one exists, load matching entries from `profile/pm-memory-cache/product-patterns.yaml` and `profile/pm-memory-cache/common-pitfalls.yaml` per that file's filter rule, and inject them under its labelled headers before generating solutions.

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

Beyond the generic archetypes in `references/solution-archetypes.md`, these UX directions are specific to this product:

- **Loan amount / borrowing entry** — Amount-first, Repayment-confidence, Offer-comparison, Guardrail-first
- **Home / personal center** — Status-first, Card-continuation, Amount-focused
- **Repayment / due amount** — Task-verification, Flow-continuation, Light-prompt

Visual variants may use warmer secondary emphasis while staying inside the WLD palette, and may show an offer or discount — but without urgency language, countdowns, or pressure.

---

## Quick reference

```
Theme: #FFD143 | Text: rgba(0,0,0,0.9)
Bg: #F5F5F5 (inner pages) | #FFFFFF (home screens)
Emphasis: #F7852C | Promo text: #EE8A27 | Info: #5C8EE6 | Danger: #FF5A4F
Font: var(--wld-font-family) | Numbers: var(--wld-font-number) 44px weight 500
Buttons: border-radius 999px | Preview chrome: <wld-wechat-chrome> expands to 88px WeChat navbar
Page: 375x812 | Cards: white, 12px radius
```

Values are restated here for convenience only — `profile/tokens.css` is the single source of truth.

**Full design specs:** `profile/DESIGN.md`
**Production screens & terminology:** `profile/production-reference.md`
