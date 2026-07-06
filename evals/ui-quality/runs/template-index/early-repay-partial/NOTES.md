# Benchmark Run Notes — early-repay-partial

Task: 「提前还清页面想支持部分还款，用户可以只还一部分金额，先出三个方案」
Mode: headless benchmark — no clarifying questions, no server, no browser verification.

## Step 1 defaults (in place of clarifying questions)

1. **Core user action:** 在提前还清页对未结清借款只偿还一部分金额（部分提前还款）。
2. **Screen count:** Single screen redesign of the 提前还清 page (option A in the skill's question 2). The partial flow would later add a confirm/cashier step, but the brief scopes to this page.
3. **Data shown:** Reused the production template's loan data verbatim so screens stay traceable:
   - 借款 ¥500 · 2020/05/21 · 明日起可还 (disabled)
   - 借款 ¥500.00 · 2020/05/20 · 应还 ¥500.50
   - 借款 ¥500.00 · 2020/05/01 · 应还 ¥504.00
   - Max repayable now = 500.50 + 504.00 = **¥1004.50** (no thousands separator, matching production 本期应还 style)
   - Example partial amount entered: **¥800** → allocation oldest-first: 2020/05/01 loan repaid in full (¥504.00, 还清), 2020/05/20 loan partial ¥296.00, 剩余应还 ¥204.50. CTA total 还款 ¥800.00. (方案 A uses a per-loan edit example: 本次还 ¥300.00 on the ¥504.00 loan → 剩余应还 ¥204.00.)
4. **Specific requirements:** None given; assumed 免违约金 policy text from the 输入金额 template disclaimer ("次日起可提前还，免违约金") carries over, shortened to 「提前还款免违约金」.
5. **Diversity mode:** UX Strategy (new capability, unclear product direction — "先出三个方案" on how partial repayment should work). All three options differ by journey/decision model, not surface styling.
6. **Page title:** Renamed preview chrome title from 提前还清借款 → **提前还款**, since the page no longer implies paying off in full. Flagged as a default, PM may keep the old title.
7. **Dropped from template:** the 已抵扣 ¥50 discount line on the checked row (not needed to demonstrate partial repayment; keeps allocation math verifiable).
8. **Allocation rule (invented default, needs PM confirmation):** partial amounts are allocated to loans oldest-first (「优先还清较早的借款」 note on screen). This is a product decision, not in any spec cache.
9. **Chosen direction for Step 5 (no user available):** **方案 B 金额优先** — it most directly answers 「用户可以只还一部分金额」 and reuses the production 输入金额 amount-entry pattern (strongest template traceability). Screen state shown: amount entered (per PIT-001 analog, an empty-amount state would need a disabled 浅黄 CTA — noted, not built since only one state was in scope).

## Product-knowledge pass

- `product-memory.md` bridge: `提前还清.html` has **no COMP_ID** (`not yet in bundled KB`) → per filter rule, pm-memory injection skipped (nothing to load).
- Advisory only (from COMP_WLD_LOAN_AMOUNT, since 方案 B/C adapt its amount-input block): PIT-001 (empty state ⇒ disabled CTA), PIT-002 (any bottom sheet = separate screen). Neither is violated by the built states.

## Templates read and used

| Output | Based on (assets/screens/) |
|---|---|
| solutions.html 方案 A | `提前还清.html` (rows, checkboxes, action bar — near-verbatim) |
| solutions.html 方案 B | `输入金额.html` (amount input, pills, bottom CTA) + `提前还清.html` (receipt card/rows) |
| solutions.html 方案 C | `提前还清.html` (card idiom) + `输入金额.html` (amount block) + components.css radio |
| partial-repay.html | `输入金额.html` + `提前还清.html` (same as 方案 B) |

Also read: `DESIGN.md`, `components.css`, `tokens.css`, `phone-mockup.css`, `product-memory.md`, `pm-memory-cache/*.yaml`, `references/solution-archetypes.md`, `production-reference.md`, `simplify/SKILL.md`.

## Simplify pass (wld-design:simplify applied manually)

- Product Correctness Pass: skipped (no COMP_ID for this screen).
- Kept: disabled-loan row + info icons in 方案 A (template parity, explains 明日起可还), allocation-rule note (user must understand where the money goes), 免违约金 disclaimer (policy/legal-adjacent).
- Merged: repay total into the CTA label (还款 ¥800.00) in 方案 B/C instead of a separate total row; 本次还 amount + 修改 link on one line in 方案 A.
- Removed relative to sources: 已抵扣 line, loan-options rows (期数/账户/用途/协议 irrelevant to repayment), promotion row, "请输入"-style prefixes. No 温馨提示 boilerplate, no urgency copy, no emojis, no JS.

## QA gate (benchmark stand-in for screenshot verification)

`node plugins/wld-design/skills/brainstorm/qa-gate.mjs <run dir>` → **0 errors**, 2 warnings (one per file: `rgba(245,245,245,0)` gradient stop — copied verbatim from production `输入金额.html` `.wld-loan-bottom`; kept for template parity).

## Files written

- `solutions.html` — Step 4, 3-solution phone gallery (UX Strategy mode)
- `partial-repay.html` — Step 5, screen 1 of 方案 B (single phone)
- `NOTES.md` — this file
