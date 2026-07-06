# Benchmark run notes — 收银台 redesign (template-index)

Task: 重新设计收银台页面，突出还款金额，让银行卡还款和转账还款两种方式更容易理解和切换

Benchmark mode: no clarifying questions asked, no server started, no browser
screenshot verification. All Step 1 answers below are defaults chosen by the
agent and would normally be confirmed with the PM.

## Step 1 defaults (in place of clarifying questions)

1. **Core user action:** Confirm the repayment amount and choose a repayment
   method (银行卡还款 or 转账还款), then continue with 下一步.
2. **Screen count:** A) One screen (the cashier itself). The transfer-selected
   state would be a separate static screen in the feedback loop; only the
   first screen of the chosen direction was built (benchmark stop point).
3. **Data shown:** 还款金额 ¥10006.00, bank card 工商银行 (2004), transfer
   sub-copy 还款不限额，实时到账 — all taken verbatim from the production
   收银台.html template (the Step 3 table maps "Pay / repayment method /
   cashier" directly to it).
4. **Specific requirements:** None beyond the brief; screens are static per
   skill rules (no JS, no interactivity).

## Other defaults and decisions

- **Diversity mode:** Mixed (default) — the brief contains both a UX goal
  (两种方式更容易理解和切换) and a visual-emphasis goal (突出还款金额), so
  intent is not purely one mode. Two UX-meaningful variants + one
  visual-treatment variant, labelled in the captions.
- **Chosen direction (in place of user pick):** 方案 A 并列单选 — it answers
  both goals most directly: the 44px amount sits alone at the top with more
  breathing room, and both methods are peer rows in a single card where a
  one-tap radio switches between them.
- **Nav title:** inner chrome variant with empty title, exactly as the
  production 收银台.html template (`<wld-wechat-chrome variant="inner"
  title="">`).
- **Selection control (方案 A / cashier.html):** WLD radio (components.css,
  gold border + gold dot) instead of the production checkbox — single-choice
  semantics signal that picking one method deselects the other, which serves
  the "容易切换" goal. 方案 C keeps the production gold checkboxes since it is
  the structure-preserving visual variant.
- **CTA:** 方案 A / C keep the production centered gold 下一步
  (`.wld-cashier-bottom`); 方案 B uses a full-width 还款 (production
  terminology, 提前还清 action-bar verb) because in a confirm-first model the
  button is the repayment action itself. One gold CTA per screen everywhere.
- **Icons:** bundled `/assets/icons/logo-icbc.svg` in the 更换还款卡 logo-chip
  style (32px circle) replaces the production inline generic ICBC SVG;
  transfer keeps the production light-yellow arrows icon, resized 28→32px so
  the two method rows align.
- **bundled product rules:** skipped silently — product-memory.md maps no
  COMP_ID to 收银台 (caches only cover COMP_WLD_LOAN_AMOUNT), so per the
  bridge filter rule there is nothing to load.
- **wld-design:simplify** applied manually (benchmark mode), per
  skills/simplify/SKILL.md:
  - Product correctness pass: skipped (no COMP_ID, see above).
  - Q5 merge: dropped the production card caption 银行卡还款 in 方案 A/C —
    the method name moved into the row label with the concrete card
    (工商银行 (2004)) as the sub-line, so caption + row became one row.
  - Q2 copy: kept 还款不限额，实时到账 (unique info the user needs to
    understand 转账还款); no 温馨提示/urgency/helper boilerplate anywhere;
    CTA labels are task verbs (下一步 / 还款).
  - Q3 focus: one gold CTA and one 44px amount per screen; 其他银行卡 kept as
    a quiet secondary row (functional navigation, not decoration).
  - In 方案 B, 还款方式 and 还款卡 remain two rows (not merged) — they are
    independently tappable settings, matching the 输入金额 options pattern.
- **Skipped steps (benchmark deviations):** Step 2 (server), all Playwright
  screenshot verification, and the Step 6 feedback loop (stopped after the
  first screen of the chosen direction).

## Template traceability

| Output piece | Source production template |
|---|---|
| Amount summary (label + 44px amount, centered) | `assets/screens/收银台.html` (`.wld-cashier-summary`, padding increased) |
| Method card, rows, divider, transfer icon, centered 下一步 | `assets/screens/收银台.html` (`.wld-cashier-card`, `.wld-cashier-row`, `.wld-cashier-bottom`, 其他银行卡 row) |
| 方案 C white amount band | `assets/screens/本期应还.html` (`.wld-repay-summary` white full-bleed treatment) |
| Bank logo chip | `assets/screens/更换还款卡.html` (`.wld-card-bank` + `/assets/icons/logo-icbc.svg`) |
| 方案 B settings rows + full-width bottom CTA | `assets/screens/输入金额.html` (`.wld-loan-options` rows, `.wld-loan-bottom` without disclaimer) |
| Radio / checkbox controls | `assets/components.css` (`.wld-radio`, `.wld-checkbox`) |

## Files written

- `solutions.html` — 3-solution phone gallery (Step 4, Mixed mode)
- `cashier.html` — 方案 A first screen, bank card selected (Step 5)
- `NOTES.md` — this file
