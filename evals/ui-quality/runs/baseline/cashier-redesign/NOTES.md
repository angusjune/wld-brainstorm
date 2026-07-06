# Benchmark run notes — 收银台 redesign (baseline)

Task: 重新设计收银台页面，突出还款金额，让银行卡还款和转账还款两种方式更容易理解和切换

Benchmark mode: no clarifying questions asked, no server started, no browser
screenshot verification. All Step 1 answers below are defaults chosen by the
agent and would normally be confirmed with the PM.

## Step 1 defaults (in place of clarifying questions)

1. **Core user action:** Confirm the repayment amount and complete repayment
   via one of two methods (bank card debit or transfer to a dedicated
   repayment account).
2. **Screen count:** A) One screen (the cashier itself). Method-switched and
   sheet states would be separate static screens per skill rules; only the
   first screen of the chosen direction was built (benchmark stop point).
3. **Data shown:** Due date label 9月16日应还 + amount ¥1001.00 (taken from
   the 本期应还 production template); bank card 工商银行 储蓄卡 (2004) (taken
   from 输入金额's 收款账户 row, because a logo asset exists for ICBC —
   本期应还's 招商银行 (5397) has no bundled logo); transfer method described
   as 转入专属还款账户，自动还款.
4. **Specific requirements:** None beyond the brief; no interactivity
   (screens are static per skill rules).

## Other defaults and decisions

- **Diversity mode:** UX Strategy — the brief is a decision-model problem
  (how two payment methods are understood and switched), not a visual
  restyle. All 3 options differ by decision model, not surface styling.
- **Chosen direction (in place of user pick):** 方案 A 并列直选 — it answers
  both goals directly (44px amount hero; both methods always visible with
  one-tap radio switching) and uses the canonical WLD select/cell pattern,
  which components.css documents as intended "for bank selection, payment
  methods".
- **Nav title:** 还款 (inner chrome variant), consistent with production
  terminology (还款 = repay action).
- **Selection control:** WLD radio component (gold border + gold dot) in the
  right slot of each method row — chosen over the select-cell checkmark
  because the radio is fully specified in components.css and better signals
  that the other method is switchable.
- **CTA:** single gold pill 确认还款 in `.wld-bottom-bar`; amount not
  repeated in the button (already the 44px hero — simplify Q5 duplication).
- **Icons:** bundled `/assets/icons/logo-icbc.svg` (bank card row) and
  `/assets/icons/logo-webank.svg` (transfer row).
- **bundled product rules:** skipped — product-memory.md maps no COMP_ID to
  any repayment/cashier screen (caches only cover COMP_WLD_LOAN_AMOUNT), so
  per the bridge filter rule there is nothing to load.
- **wld-design:simplify** applied manually to both files (benchmark mode):
  dropped a "选择还款方式" section label in 方案 C (self-evident from radio
  cards), kept method descs (they carry the "更容易理解" info), no
  boilerplate/urgency copy, one gold CTA and one 44px number per screen.
- **Skipped steps:** Step 2 (server), all screenshot verification, and the
  Step 6 feedback loop (stop after first screen of chosen direction).

## Template traceability

| Output piece | Source production template |
|---|---|
| Amount hero (label + 44px amount) | `assets/screens/本期应还.html` (`.wld-repay-summary`) |
| 方案 A / cashier.html method card | `assets/screens/提前还清.html` (`.wld-repay-card`, section title, divider, action-bar button pattern) + `components.css` select/cell + radio |
| 方案 B options card | `assets/screens/输入金额.html` (`.wld-loan-options` rows, incl. bank-icon value pattern and bottom CTA pattern) |
| 方案 C compare cards | `assets/screens/个人中心-双offer.html` (side-by-side offer cards, 16px radius + inset hairline shadow) |

## Files written

- `solutions.html` — 3-solution phone gallery (Step 4)
- `cashier.html` — 方案 A first screen, bank card selected (Step 5)
- `NOTES.md` — this file
