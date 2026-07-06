# Run Notes — early-repay-partial (guidance-pass)

Task: "提前还清页面想支持部分还款，用户可以只还一部分金额，先出三个方案"
Benchmark mode: headless — no clarifying questions, no server, no browser verification.

## Defaults chosen (in place of Step 1 questions)

1. **Core user action:** On the 提前还清 page, repay part of the outstanding
   repayable loans early (enter/choose a partial amount instead of the full total).
   Taken directly from the PM prompt.
2. **Number of screens:** One screen (the 提前还清 page with partial-repayment
   support). solutions.html shows three one-screen directions; the chosen
   direction is built as one full screen.
3. **Data shown:** Reused the production 提前还清.html dataset — repayable loans
   借款 ¥500.00 (2020/05/20, 应还¥500.50) and 借款 ¥500.00 (2020/05/01, 应还¥504.00),
   plus one not-yet-repayable loan (2020/05/21, 明日起可还). Max repayable
   = ¥1004.50. Example partial entry = ¥600.00 → oldest loan (05/01) cleared
   ¥504.00, second loan (05/20) partially repaid ¥96.00, leaving 剩余应还 ¥404.50.
4. **Diversity mode:** UX Strategy (new capability, unclear product direction,
   "先出三个方案") — all three options differ by decision model, not styling.
5. **Simulated user pick (Step 4→5):** 方案 A 金额优先 (Amount-first) — chosen as
   default because it is the shortest path and reuses the production amount-input
   pattern (输入金额) with the least new UI.
6. **Screen title:** kept production terminology 提前还清借款 (inner chrome).
7. **Allocation rule (方案 A/C):** partial amount is applied to the oldest
   repayable loan first ("优先还较早借款"). Assumed default; needs PM confirmation.
8. **方案 C interest-saved figure:** 预计省利息 ¥5.67 assumed as
   600 × 0.045%/day × ~21 remaining days — illustrative only, not verified
   against calc.mjs (fix-details was not part of this run).
9. **方案 B partial value:** ¥300.00 on the checked 05/01 loan, 部分还款 radio
   selected; action-bar 总计 matches (¥300.00).

## Product rules loaded

- `product-memory.md` bridge: 提前还清.html has **no COMP_ID** → per the filter
  rule, nothing to load; skipped silently.
- Because the amount-entry section is adapted from 输入金额.html
  (COMP_WLD_LOAN_AMOUNT), PIT-001 was applied conservatively: the screens show a
  **filled** amount state (¥600.00) with an enabled CTA; an empty-amount state
  would need a disabled (浅黄色) CTA. PAT-WLD-001/002/003 and PIT-002/PIT-003
  concern borrow-flow keyboard CTA and tenor sheets — not applicable to this
  static repayment screen (no keyboard, no sheet shown).

## Simplify pass (wld-design:simplify applied manually)

- Product Correctness Pass: skipped (no COMP_ID for 提前还清).
- Merged section title + allocation-rule note into one head row
  (还款分配 · 优先还较早借款).
- Dropped per-row info icons on 方案 A/C allocation rows (values 还¥X / 结清 /
  剩余应还¥X are self-explaining); kept them in 方案 B where rows show 应还
  breakdowns, matching production.
- Dropped 已抵扣¥50 sub-line in allocation rows (not needed for the partial
  decision; the 应还 figure already includes it).
- One 44px hero number and one gold CTA per screen; no footer disclaimers,
  no boilerplate, no urgency copy, no emojis, no custom JS.

## Verification

- Browser screenshot verification: skipped (headless benchmark mode).
- `node plugins/wld-design/skills/brainstorm/qa-gate.mjs <run dir>`:
  0 errors, 0 warnings across both files.

## Source templates

| Output | Based on |
|---|---|
| solutions.html 方案 A + partial-repay.html | 提前还清.html (receipt card, action bar, disabled row) + 输入金额.html (amount entry, quick chips) |
| solutions.html 方案 B | 提前还清.html (checkbox receipt list, action bar) + DESIGN.md radio spec |
| solutions.html 方案 C | 本期应还.html (hero summary) + 输入金额.html (chips, row card patterns) + 提前还清.html terminology |

## Files written

- solutions.html
- partial-repay.html
- NOTES.md
