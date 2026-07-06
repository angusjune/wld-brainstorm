# Benchmark Run Notes — home-repay-reminder (template-index)

Task: 「首页要能提醒用户最近7天内要还的钱，给我三个方案看看」
Mode: headless benchmark — no clarifying questions, no server, no screenshots.

## Defaults chosen (in place of Step 1 clarifying questions)

1. **Core user action** — On opening the home, notice how much money is due within
   the next 7 days and reach the repayment flow in one tap.
2. **How many screens** — One screen: the home (个人中心). The reminder only exists
   in the active-loan state; solutions are three variants of that single screen.
3. **User state** — Active loan user (base template 个人中心-有借款.html): one loan,
   one repayment due inside the 7-day window. Users without an active loan see the
   unchanged home (out of scope for this run).
4. **Data shown** — Reused production template values for value consistency:
   due amount ¥537.20, 可借 ¥55000, 总额度 ¥60000, rate bar 年利率(单利) 10.8%.
   Due date set to 7月10日 (today is 2026-07-06, so 4 days away — inside the 7-day
   window); proximity copy 「4天后自动扣款」/「7月10日自动扣款」 is factual, not
   urgency language. Autopay behavior (自动扣款) taken from 本期应还.html
   (「优先从招商银行(5397)自动还款」), shortened for home; bank name omitted on home.
5. **Diversity mode** — UX Strategy (the PM is asking how the reminder should work,
   not for visual directions). Options differ by information hierarchy:
   - 方案 A 卡片内提醒 — minimal: due row in the existing loan card gains a
     proximity sub-line (4天后自动扣款).
   - 方案 B 顶部提醒条 — additive: reminder bar between rate bar and hero with a
     secondary 去还款 button; duplicate due row removed from the loan card.
   - 方案 C 还款优先 — hierarchy flip: 44px hero becomes the due amount with a gold
     还款 circle button; borrow entry demoted to a 可借额度 card row.
6. **Chosen direction (no user available)** — 方案 B, as the balanced default:
   reminder is immediately visible without demoting the borrow entry (方案 C's
   business risk) and is harder to miss than 方案 A.
7. **Kept vs. stripped (simplify boundaries)** — Rate bar, 借钱须知 link, and
   「实际可借以当次借款审批为准」 disclaimer kept in all options: interest-rate
   disclosure / compliance text that the base template carries (simplify skill
   boundary "legal/compliance text"; brainstorm QA gate "required financial/legal
   text remains if the template has it").

## Source production templates

- `plugins/wld-design/assets/screens/个人中心-有借款.html` — base for all three
  solutions and for home.html (structure, rate bar, hero, loan card, footer,
  tab bar, and all screen-local styles copied verbatim).
- `plugins/wld-design/assets/screens/本期应还.html` — reference for due-amount
  presentation (date + amount + autopay line) and the two-line row pattern
  (title + caption sub-line) used in 方案 A and the reminder bar.

## Product rules / pitfalls

`product-memory.md` maps 个人中心-有借款.html to no COMP_ID (「not yet in bundled product knowledge
KB」) → per the bridge filter rule, nothing to load; skipped silently.

## wld-design:simplify pass (applied manually, headless)

- Product Correctness Pass: skipped (no COMP_ID for home screens).
- 方案 B: removed the loan card's 「x月x日应还」 row — the reminder bar already
  carries date + amount (merge duplicates, one focal point).
- Copy kept ≤15 chars per line; no 温馨提示 boilerplate, no 请输入/请选择 prefixes,
  no urgency copy (立即/countdown), no emojis, no decorations, no custom JS.
- One gold CTA per phone: A/B = 借钱 circle (去还款 in B is secondary style
  #FFF9D9 / #DBAE31); C = 还款 circle only.

## Pre-user QA gate (manual, no browser)

- `<wld-wechat-chrome variant="home" title="微粒贷">` placeholder used; no
  hand-built chrome; mockup-chrome.css linked.
- Home background white (`var(--wld-surface)` on .wld-page, per template).
- Buttons pill/circle; text on gold is rgba(0,0,0,0.9) via tokens.
- Small amounts use var(--wld-font-number) at 14px; hero amounts 44px weight 500.
- Screenshot verification skipped (benchmark mode — no browser).

## Steps skipped (benchmark deviations)

- Step 1 questions (defaults above), Step 2 server start, all screenshot
  verification, Step 6 feedback loop. Stopped after Step 5 first screen.

## Files written

- `solutions.html` — 3-solution phone gallery (UX Strategy captions:
  Hypothesis + Tradeoff).
- `home.html` — 方案 B full home screen, single centered phone.
- `NOTES.md` — this file.
