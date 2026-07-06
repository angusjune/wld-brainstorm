# Benchmark run notes — 收银台 redesign (guidance-pass)

Task: 重新设计收银台页面，突出还款金额，让银行卡还款和转账还款两种方式更容易理解和切换

Benchmark mode: no clarifying questions asked, no server started, no browser
screenshot verification. All Step 1 answers below are defaults chosen by the
agent and would normally be confirmed with the PM.

## Step 1 defaults (in place of clarifying questions)

1. **Core user action:** Confirm the repayment amount, pick one of the two
   repayment methods (银行卡还款 / 转账还款), and continue via 下一步 —
   exactly the production 收银台 flow, redesigned per the brief.
2. **Screen count:** A) One screen (the cashier itself). Method-switched
   states would be separate static screens per skill rules; only the first
   screen of the chosen direction was built (benchmark stop point:
   solutions.html + one full screen).
3. **Data shown:** Taken verbatim from the 收银台.html production template —
   还款金额 ¥10006.00, bank card 工商银行 (2004) with the template's inline
   ICBC icon, 其他银行卡 entry, and 转账还款 with its production sub-copy
   还款不限额，实时到账. No values invented or reformatted (no thousands
   separators).
4. **Specific requirements:** None beyond the brief; screens are static per
   skill rules (no JS).

## Other defaults and decisions

- **Source templates:** `收银台.html` (primary base — exact Step 3 table
  match for "Pay / repayment method / cashier"); `本期应还.html` (white
  full-bleed amount-summary treatment reused to 突出还款金额);
  `更换还款卡.html` (read for the card-row/selected-state pattern and the
  centered-CTA convention). `components.css`, `tokens.css` and `DESIGN.md`
  read for card/checkbox/button rules.
- **Diversity mode:** Mixed (default — the brief has both a hierarchy goal,
  突出还款金额, and a decision-model goal, 更容易理解和切换). 方案 A and
  方案 B are UX variants (different method-selection models); 方案 C is the
  visual variant (production structure, amount treatment only).
- **Chosen direction (in place of user pick):** 方案 A 对等方式卡 — two peer
  method cards with card-level selection answer both goals most directly:
  the white 44px amount hero dominates, both methods are always visible and
  self-describing, and switching is one tap on the other card.
- **Nav title:** empty (`variant="inner" title=""`), copied from the
  production 收银台 template ("back, no title").
- **Selection control:** round `.wld-checkbox` with gold checked state —
  the control the production 收银台 template itself uses (kept over the
  DESIGN.md radio to stay traceable to the base template). In 方案 A/B the
  checkbox is right-aligned (`margin-left: auto`), matching the template's
  own 转账还款 row and 更换还款卡's right-side checkmark; 方案 C keeps the
  template's bank-row placement verbatim.
- **CTA:** single centered gold `wld-btn-m` 下一步 (production label),
  placed in flow directly below the content per SKILL.md Step 5 ("收银台
  … center the CTA directly below the content; a CTA pinned to the screen
  bottom behind an empty region is a defect"). This deviates from the
  template's absolute-bottom `.wld-cashier-bottom` because the skill rule
  explicitly names 收银台 and the rule wins; applied to all three options.
- **方案 A merge (simplify Q5):** the template's separate 其他银行卡 row is
  merged into a chevron on the current-card row (工商银行 (2004) ›) — the
  same changeable-value affordance as 输入金额's 收款账户 row. 方案 B keeps
  其他银行卡 as its own row (its single-list model needs it).
- **bundled product rules:** skipped — `product-memory.md` maps no COMP_ID
  to 收银台 (only COMP_WLD_LOAN_AMOUNT is mapped), so per the bridge filter
  rule there is nothing to load; a grep of both cache files found no
  cashier/repayment-tagged entries.
- **wld-design:simplify** applied manually to both files (benchmark mode):
  no invented explainer line added under 银行卡还款 (the visible card row
  already explains it — simplify Q2); transfer sub-copy kept verbatim (it
  carries the 更容易理解 contrast: 还款不限额，实时到账); one gold CTA per
  screen; no decorations, boilerplate, emoji, or urgency copy.
- **Screenshot verification:** skipped (headless). Substitute: ran the
  deterministic brainstorm QA gate
  (`plugins/wld-design/skills/brainstorm/qa-gate.mjs`) on both files.

## Files

- `NOTES.md` — this file
- `solutions.html` — Step 4, 3-option gallery (Mixed mode)
- `cashier.html` — Step 5, first screen of chosen direction 方案 A
