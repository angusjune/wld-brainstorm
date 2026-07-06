# Benchmark run notes — 逾期还款提醒与处理流程

Task: "设计一个逾期还款的提醒和处理流程，大概两三个屏幕" (headless benchmark, no clarifying questions asked).

## Step 1 defaults (in place of clarifying questions)

1. **Core user action:** 逾期用户在首页看到提醒，看懂逾期状态（金额/罚息/天数/信用影响），并完成逾期还款。
2. **How many screens:** B) 2-3 step flow — per the PM's "大概两三个屏幕". Chosen flow is 3 screens: 首页提醒 → 逾期还款详情 → 收银台。
3. **Data shown:** 逾期总额 ¥1043.50（2 笔借款各 ¥521.75）、罚息合计 ¥6.30（每笔 ¥3.15）、已逾期 3 天（6月30日到期，今天 2026-07-03）、信用影响提示、可借 ¥59000 / 总额度 ¥60000（60000 − 1000 在贷本金）。Amount format follows production templates (no thousands separator, e.g. ¥1043.50).
4. **Specific requirements:** none assumed. No countdowns, no pressure copy (QA gate bans artificial urgency); overdue uses the danger palette (`--wld-danger-*` from tokens.css) as a factual error state, kept restrained per DESIGN.md anti-references.
5. **Diversity mode:** UX Strategy — the request is a new flow ("设计一个…流程"), matching the "New flow, unclear product direction" row in the mode table. All 3 options differ by journey/decision model, not surface styling. Archetypes used (from `references/solution-archetypes.md`, Repayment/Due Amount group): Status-first, Batch-action, plus a reminder-shortcut variant of Task-first.
6. **Chosen direction (user pick simulated):** 方案 B 状态优先 — default because it best covers both halves of the ask (提醒 + 处理), explains penalty/credit consequences before payment (trust-first, matches WLD brand personality), and fits exactly 3 screens.
7. **Borrowing availability while overdue:** kept the standard 借钱 circle button and credit display (template structure preserved). Freezing credit during overdue is a plausible product rule but is NOT in the pm-memory cache, so it was not invented.

## Product rules / pitfalls (pm-memory)

Read `assets/product-memory.md`: none of the base screens (个人中心-有借款 / 本期应还 / 提前还清 / 收银台) has a COMP_ID mapped; all cache entries in `pm-memory-cache/*.yaml` are sourced to `COMP_WLD_LOAN_AMOUNT` only. Per the bridge filter rule → skipped silently. No product rules were injected.

## The 3 solutions (solutions.html)

- **方案 A 提醒直达** — home (base: `个人中心-有借款.html`) with an overdue reminder badge below the circle button (badge pattern adapted from `个人中心-单offer.html` promo badge, recolored to danger palette). Tap → straight to 收银台. 2 screens total.
- **方案 B 状态优先** — 逾期还款详情 screen (base: `本期应还.html` summary + receipt rows, bottom CTA pattern from `收银台.html`): 44px 逾期应还 amount, danger status line (逾期天数 + 罚息), consequence note, per-loan rows, one gold 还款 CTA. 3 screens total.
- **方案 C 分笔处理** — 逾期借据 multi-select screen (base: `提前还清.html` verbatim structure): checkboxes per receipt, 含罚息 sub-amount, 全选 + 总计 + gold 还款 action bar; supports partial repayment. Both rows default-checked (repay-all default). 3 screens total.

## Step 5 screen built (first screen of 方案 B)

`home-overdue.html` — base `个人中心-有借款.html`. Changes from template:

- Loan card row 1: `9月16日应还 ¥537.20` → `已逾期 3 天 ¥1043.50` in `--wld-danger-600` (semibold label); still a chevron row → leads to the 逾期还款详情 screen.
- Row 2: `提前还清借款 1 笔` → `2 笔` (consistent with the 2 overdue receipts).
- Amounts: 预估可借 ¥59000 / 总额度 ¥60000.
- Everything else (chrome placeholder, circle button, footer, tab bar, white home background) kept from template.

## Simplify pass record (wld-design:simplify applied manually per benchmark mode)

Product Correctness Pass: skipped (no COMP_ID, see above).

Applied to both files during authoring:

- **Removed:** rate-bar promo tail 「1千元用1天只需0.3元」 (kept 「年利率 (单利) 10.8%」 — required rate disclosure, per the skill's "keep the number, drop the explanation" rule); 单offer badge's decorative triangle pointer (pointed at the 借钱 button, wrong semantics for an overdue reminder); orange gradient on the badge tag (flat `--wld-danger-600` instead); the 本期应还 summary's bank-autopay line + info icon (replaced by the two overdue status lines, which are the point of this screen); 已抵扣 sub-amounts (not part of this scenario).
- **Shortened/merged:** overdue days + penalty merged into one line 「已逾期 3 天，含罚息 ¥6.30」; consequence note kept to one line 「还清后停止罚息，逾期记录影响信用」 (functional consequence info — kept per simplify boundaries, error-state/risk info is not decoration).
- **Kept (simplify boundaries / QA gate):** footer 「实际可借以当次借款审批为准」 disclaimer and 「借钱须知」 link (financial/legal text present in template); tab bar; back-capable chrome; one gold CTA per screen.

## Pre-user QA gate results

- `<wld-wechat-chrome>` placeholder used on every phone (home variant on home screens, inner variant with title 「逾期还款」 on detail screens); `mockup-chrome.css` linked. No hand-built chrome.
- One primary gold CTA per screen: A = 借钱 circle (badge is a status row, not a gold CTA); B = 还款 (M); C = 还款 (S); home-overdue = 借钱 circle.
- Home screens white background (inline `var(--wld-surface)` per template); inner screens default #F5F5F5.
- No artificial urgency copy, no countdowns, no emojis, no custom JS. All colors from tokens.css.

## Benchmark-mode deviations from SKILL.md

- Step 1 questions replaced by the defaults above.
- Step 2 (server start) skipped; files therefore contain unexpanded `<wld-wechat-chrome>` placeholders and `/assets/` paths, both resolved by `server.cjs` at serve time.
- Screenshot verification (Step 4/5) skipped — no browser in headless mode.
- Direction choice (end of Step 4) simulated: 方案 B.
- Stopped after Step 5 screen 1; no feedback loop.
