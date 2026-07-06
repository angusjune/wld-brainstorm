# Benchmark Run Notes — home-repay-reminder (guidance-pass)

Task: 「首页要能提醒用户最近7天内要还的钱，给我三个方案看看」
Executed headless per benchmark rules: no clarifying questions, no server, no
screenshot verification. All Step 1 defaults recorded below.

## Defaults chosen (in place of Step 1 clarifying questions)

1. **Core user action** — On the home page (个人中心), a user with an active
   loan sees how much is due within the next 7 days and can tap through to
   repay. Borrowing (借钱) stays the home's primary action; the reminder never
   becomes the gold CTA.
2. **How many screens** — One screen (the home page). The user's request names
   首页 only, so no new flow screens.
3. **User state shown** — Active loan (the only state where money can be due):
   available ¥55000 of 总额度 ¥60000, exactly one installment due within the
   window. No overdue state, no multi-installment aggregation.
4. **Data story (kept consistent across all options)** — Due amount ¥537.20,
   due date 9月16日, which is 3 days away (implied "today" = 9月13日, inside
   the 7-day window). Auto-repay card 招商银行(5397) (from 本期应还.html).
   提前还清借款 1 笔. Rate bar, footer link, and disclaimer exactly as the
   source template.
5. **Diversity mode** — Mixed (skill default; the request names a capability
   but no visual-exploration intent): 方案 A + B are UX variants (information
   hierarchy differs), 方案 C is the visual variant (labelled as such).
6. **Chosen direction for Step 5** (no user available to pick) — **方案 B
   还款优先**: it most directly satisfies "首页要能提醒" — the reminder is
   surfaced above the borrow area and is legible without scrolling or
   scanning, while 借钱 remains the only gold CTA. Built as `home.html`.
7. **Benchmark stop point** — Stopped after Step 5 first screen; no feedback
   loop, no additional screens, no `-v2` iterations.

## The 3 solutions (solutions.html)

- **方案 A: 卡内提醒 (UX)** — The existing loan-card due row gains a
  proximity marker (「3天后」, 12px, `--wld-emphasis-500`). Zero layout
  change. Hypothesis: enhance the existing due entry in place. Tradeoff:
  quietest reminder, easy to miss.
- **方案 B: 还款优先 (UX)** — A due banner (「7天内应还 ¥537.20」+
  「9月16日 招商银行(5397) 自动还款」+ secondary 去还款 XS button) sits
  directly under the rate bar, before the borrow area. The loan card drops its
  due row (no duplication) and keeps only 提前还清借款. Hypothesis: money due
  this week should be seen before borrowing. Tradeoff: borrow area loses some
  dominance.
- **方案 C: 数据前置 (visual variant of A)** — Same structure as A; the due
  row becomes a two-line data block (meta line 「9月16日应还 · 3天后」+ 20px
  number-font amount). Invariants kept: gold circle CTA, chrome, tab bar, rate
  bar, footer, all data values.

## Templates used (traceability)

- `个人中心-有借款.html` — base for all three options and `home.html`
  (markup + template-local styles copied verbatim, then adapted).
- `本期应还.html` — source for the auto-repay bank line wording
  (「招商银行(5397) 自动还款」) and the date+amount summary pattern echoed in
  方案 C's data block.
- `个人中心.html` — read as the canonical home reference (per skill).
- `个人中心-单offer.html` — read for its promo-badge pattern; deliberately NOT
  reused (its inline gradient/off-token colors are promotional, wrong tone for
  a repayment reminder).

## Product rules / pitfalls

- `product-memory.md` maps no COMP_ID for any 个人中心 variant → pm-memory
  injection and simplify's Product Correctness Pass skipped silently, per the
  bridge file and both SKILL.md files.

## wld-design:simplify pass (applied manually per benchmark rules)

Applied to `solutions.html` and `home.html`; decisions:

- **Kept (boundaries: legal/compliance)** — rate bar 「年利率 (单利) 10.8%…」,
  footer 「借钱须知」+「实际可借以当次借款审批为准」: interest-rate disclosure
  and approval disclaimer present in the source template.
- **Merged** — banner title merges label + amount (「7天内应还 ¥537.20」);
  方案 A/C merge date + proximity into one line instead of a separate tag row.
- **Removed (by design, nothing left to strip)** — no boilerplate (温馨提示 /
  请输入 / 点击下方按钮), no decorations, no urgency copy, no emojis, no
  duplicate due info in 方案 B (due row removed from loan card when the banner
  exists).
- **Kept after Q1 deliberation** — bank line 「9月16日 招商银行(5397)
  自动还款」in 方案 B: tells the user when and how the deduction happens
  (functional reassurance, production wording from 本期应还.html), slightly
  over the ≤15-char guideline but information-bearing.
- **One focal point** — exactly one gold CTA per screen (借钱 circle);
  去还款 uses `wld-btn-secondary` XS.

## Pre-user QA gate

- Mechanical checks: `node plugins/wld-design/skills/brainstorm/qa-gate.mjs`
  on both files → **0 errors, 0 warnings**.
- Manual checklist: `<wld-wechat-chrome variant="home">` used (no hand-built
  chrome), all 4 stylesheets linked, home screens forced white via
  `var(--wld-surface)`, no custom JS, amounts written without thousands
  separators (¥55000 / ¥60000 / ¥537.20), 44px amount at weight 500.
- Screenshot verification: **skipped** (benchmark headless mode).

## Files written

- `solutions.html` — 3-option phone gallery (Step 4)
- `home.html` — chosen direction 方案 B, single-slide gallery (Step 5)
- `NOTES.md` — this file
