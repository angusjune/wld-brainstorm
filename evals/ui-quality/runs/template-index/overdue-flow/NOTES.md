# Benchmark run notes — 逾期还款提醒与处理流程 (template-index)

Task: "设计一个逾期还款的提醒和处理流程，大概两三个屏幕" — headless benchmark run, no clarifying questions asked. Run date: 2026-07-06.

## Step 1 defaults (in place of clarifying questions)

1. **Core user action:** 逾期用户在首页看到提醒，看懂逾期状态（金额 / 罚息 / 逾期天数 / 信用影响），并完成逾期还款。
2. **How many screens:** B) 2-3 step flow, per the PM's 「大概两三个屏幕」. Chosen direction is a 3-screen flow: 首页逾期提醒 → 逾期还款详情 → 收银台.
3. **Data shown:** 逾期总额 ¥1033.13 across 2 installment loans — 借款 ¥6000 (2026/01/30) 本期逾期应还 ¥619.24 含罚息 ¥2.50; 借款 ¥4000 (2026/03/30) 本期逾期应还 ¥413.05 → ¥413.89 含罚息 ¥1.67. 罚息合计 ¥4.17 (per-loan installments ¥616.74 / ¥412.22 + 6 days penalty at ~1.5x the 0.045% daily rate; ¥616.74 reuses an installment figure from 借款详情.html). 已逾期 6 天: due 2026/06/30, today 2026/07/06. 预估可借 ¥52000 / 总额度 ¥60000 (¥8000 principal outstanding). Amount format follows production templates: ¥ prefix, no thousands separator.
4. **Specific requirements:** none assumed. Overdue state uses the danger palette from tokens.css (`--wld-danger-100/600/700`) as a factual error state — no countdowns, no urgency copy, per DESIGN.md anti-references and the QA gate.
5. **Diversity mode:** UX Strategy — the request is a new flow (「设计一个…流程」), matching the "New flow, unclear product direction" row of the mode table. All 3 options differ by journey / decision model, not surface styling. Archetypes (from `references/solution-archetypes.md`, Repayment/Due Amount group): Task-first reminder shortcut (A), Status-first (B), Batch-action (C).
6. **Chosen direction (user pick simulated):** 方案 B 状态优先 — it covers both halves of the ask (提醒 + 处理), explains penalty and credit consequences before payment (matches the trustworthy/calm brand personality), and lands exactly on 3 screens.
7. **Borrowing availability while overdue:** the standard 借钱 circle button and credit display are kept (template structure preserved). Freezing credit during overdue is a plausible product rule but is NOT in the pm-memory cache, so it was not invented.

## Product rules / pitfalls (pm-memory bridge)

Read `assets/product-memory.md`: none of the base screens (个人中心-有借款 / 本期应还 / 提前还清 / 收银台 / 借款详情) has a COMP_ID mapped — only 输入金额.html → COMP_WLD_LOAN_AMOUNT, which is not used here. Per the bridge filter rule → skipped silently; no product rules injected.

## Template traceability

| Output | Based on (assets/screens/) |
|---|---|
| solutions.html 方案 A (home reminder) | `个人中心-有借款.html` (page structure, local styles) + `个人中心-单offer.html` (promo badge pattern → overdue badge) |
| solutions.html 方案 B (逾期还款 detail) | `本期应还.html` (summary + receipt rows) + `收银台.html` (centered bottom CTA pattern) |
| solutions.html 方案 C (multi-select) | `提前还清.html` (checkbox receipt list + action bar, structure verbatim) |
| home-overdue.html | `个人中心-有借款.html` (copied verbatim, then adapted) |

Also read for reference: `借款详情.html` (installment amounts, status treatment), `DESIGN.md`, `components.css`, `tokens.css`, `phone-mockup.css`, `production-reference.md`, `references/solution-archetypes.md`. Local `<style>` blocks were copied from each template and scoped (`.sol-a/.sol-b/.sol-c`) in solutions.html because 本期应还 and 提前还清 define conflicting `.wld-repay-*` classes.

## The 3 solutions (solutions.html)

- **方案 A 提醒直达** — home with an overdue badge below the 借钱 circle (单offer badge recolored to danger palette, pointer triangle removed); badge taps straight to 收银台. 2 screens. Tradeoff: no consequence explanation or per-loan detail.
- **方案 B 状态优先** — dedicated 逾期还款 detail: danger 「已逾期 6 天」 label, 44px total, 「含罚息 ¥4.17，还清后停止计收」 + 「逾期记录影响个人信用」 notes, per-loan receipt rows, one gold 还款 CTA. 3 screens. Tradeoff: one extra step before payment.
- **方案 C 分笔处理** — 逾期借款 multi-select (提前还清 structure): both receipts default-checked, 含罚息 sub-amounts, 全选 + 总计 + gold 还款 action bar; supports partial repayment. 3 screens. Tradeoff: users may underpay and remain overdue.

## Step 5 screen built (first screen of 方案 B)

`home-overdue.html` — base `个人中心-有借款.html`. Changes from template:

- Loan card row 1: `9月16日应还 ¥537.20` → `已逾期 6 天 ¥1033.13` in `--wld-danger-600` (semibold label; value tinted); chevron row → leads to the 逾期还款详情 screen.
- Row 2: `提前还清借款 1 笔` → `2 笔` (consistent with 2 loans in the flow).
- Amounts: 预估可借 ¥52000 / 总额度 ¥60000.
- Rate bar shortened (see simplify record). Everything else — chrome placeholder, circle button, footer, tab bar, white home background, local styles — kept from the template.

Note on danger color: `--wld-text-error` resolves to danger-500 (#FF5A4F); `--wld-danger-600` was used for the 14px text rows instead for legibility on white/`--wld-section`, staying inside the tokens.css danger scale.

## Simplify pass record (wld-design:simplify applied manually per benchmark mode)

Product Correctness Pass: skipped — no COMP_ID mapped (see above).

- **Removed:** rate-bar promo tail 「1千元用1天只需0.3元」 (kept 「年利率 (单利) 10.8%」 — the required rate number, per the "keep the number, drop the explanation" rule); 单offer badge's decorative triangle pointer (it would point at the 借钱 button — wrong semantics for an overdue notice) and its orange gradient tag (flat `--wld-danger-600` instead); the 本期应还 summary's bank-autopay line + info icon (replaced by the penalty/credit lines, which are this screen's point); 已抵扣 sub-amounts (not part of this scenario — the slot shows 含罚息 instead).
- **Shortened/merged:** penalty facts merged into one line 「含罚息 ¥4.17，还清后停止计收」; credit consequence kept to one line 「逾期记录影响个人信用」 (error-state / risk info is functional, not decoration — kept per simplify boundaries). No 请尽快 / pressure phrasing.
- **Kept (simplify boundaries / QA gate):** footer 「借钱须知」 link + 「实际可借以当次借款审批为准」 disclaimer (financial/legal text present in the template); tab bar and back-capable chrome (navigation); one gold CTA per screen; info icons on 方案 C rows (template pattern carrying the penalty breakdown affordance).

## Pre-user QA gate results

- `<wld-wechat-chrome>` placeholder on every phone (home variant on home screens; inner variant titled 「逾期还款」 on detail screens); `mockup-chrome.css` linked; no hand-built chrome.
- One primary gold CTA per screen: A = 借钱 circle (overdue badge is a status element, not a gold CTA); B = 还款 (M, centered bottom); C = 还款 (S, action bar); home-overdue = 借钱 circle.
- Home screens white background (inline `var(--wld-surface)` per template); inner screens default `#F5F5F5`.
- No artificial urgency copy, no countdowns, no emojis, no custom JS; all colors from tokens.css.
- `node plugins/wld-design/skills/brainstorm/qa-gate.mjs` on the output dir: **0 errors, 0 warnings across 2 files.**

## Benchmark-mode deviations from SKILL.md

- Step 1 questions replaced by the defaults above.
- Step 2 (server start) skipped; files contain unexpanded `<wld-wechat-chrome>` placeholders and `/assets/` paths — both resolved by `server.cjs` at serve time.
- Browser screenshot verification (Steps 4/5) skipped — headless run.
- Direction choice at the end of Step 4 simulated: 方案 B.
- Stopped after Step 5 screen 1; no feedback loop.
