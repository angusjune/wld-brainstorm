# Benchmark run notes — merged-profile / home-repay-reminder

Task: 首页要能提醒用户最近7天内要还的钱，给我三个方案看看

## Step 1 defaults (benchmark mode — no clarifying questions asked)

| Question Step 1 would have asked | Default chosen | Rationale |
|---|---|---|
| Core user action | Notice money due within the next 7 days on the home screen, then tap through to repay (本期应还) | Direct reading of the request |
| User state | Existing borrower with one active loan (总额度 ¥60000, 预估可借 ¥55000, implied used ¥5000) | Only users with an active loan have upcoming repayments; matches `个人中心-有借款.html` |
| How many screens | One screen (首页/个人中心), three solution variants | The request names only 首页 |
| Data shown | Due date, due amount, proximity signal (3天后), auto-repay note, available credit, early-payoff entry | Minimum needed for a 7-day reminder without breaking the home structure |
| Due data | 1 loan due 7月20日, ¥537.20, auto-repay; "today" = 2026-07-17, so 3天后 (inside the 7-day window) | Amount carried verbatim from the production template `个人中心-有借款.html` |
| Diversity mode | Mixed (default): 方案 A + B are UX variants, 方案 C is the visual variant | "要能提醒…三个方案" states a UX goal; no visual-exploration wording |
| Chosen direction for Step 5 | 方案 A (还款卡片提醒) | Recommended default: minimal delta from the production loan card, lowest risk, calm per the design language; the due row is already visible on the first screen without scrolling |

## Snapshot (per Step 1)

- Core user action: see the 7-day due money at a glance on home; tap the due row → 本期应还
- Screens/states: 个人中心 with active loan, repayment due in 3 days
- Data: ¥55000 可借 / ¥60000 总额度 / 7月20日应还 ¥537.20 / 3天后自动还款 / 提前还清 1笔
- Source templates: `profile/screens/个人中心-有借款.html` (base), `profile/screens/本期应还.html` (repayment terminology: 应还 / 自动还款), `profile/screens/个人中心-单offer.html` (badge-slot precedent consulted for 方案 B's strip placement)
- Product rules loaded: none — the 个人中心 screens are mapped to "(not yet in bundled KB)" in `profile/PRODUCT.md`, so no bundled product rules cover this screen and the design relies on the visual template alone (per the bridge's filter rule, nothing was invented to fill the gap)
- Non-goals: no change to the borrow flow, no new screens beyond home, no interactivity

## Benchmark deviations applied

- Step 2 (server start) skipped; no browser screenshot verification
- Output written to `profile/quality-benchmark/runs/merged-profile/home-repay-reminder/` instead of screenDir
- Embedded Simplify Pass and the profile's Fix Details pass run by hand (logs below)
- Stopped after Step 5 first screen; feedback loop not entered

## The three solutions (Mixed mode)

- **方案 A — 还款卡片提醒 (UX):** the production loan card's due row ("7月20日应还 ¥537.20") gains a proximity sub-label "3天后自动还款". Minimal delta from production. Hypothesis: reminder belongs where repayment info already lives. Tradeoff: not the visual focus.
- **方案 B — 顶部提醒条 (UX):** a calm reminder strip (`--wld-theme-100` bg, card radius) directly under the required rate bar: "3天后应还 ¥537.20" + chevron. The loan card below keeps only the 提前还清借款 row. Hypothesis: due money is seen first. Tradeoff: a second message competes with the borrow task.
- **方案 C — 数据前置 (Visual, structure = A):** same rows as A; the due amount is promoted to 24px number font (`--wld-text-display`, weight 500) with date + auto-repay note demoted to a 12px caption line. CTA, chrome, tab bar, legal copy, and all data values unchanged from A.

## Simplify Pass log

- 方案 B: removed the due row from the bottom loan card — the top strip already carries countdown + amount (duplicate element merged); kept only 提前还清借款.
- 方案 B strip: dropped a "查看" action label (the chevron already signals tap-through) and dropped the explicit date on the strip — "3天后" is the 7-day-window signal; the exact date lives one tap deeper in 本期应还. (In A and C the date is kept because the production due row is date-first.)
- Kept everywhere: rate bar copy (required rate text, verbatim), 借钱须知 + 实际可借以当次借款审批为准 footer, tab bar (借钱 active / 我的 inactive), one gold CTA (84px 借钱 circle), production terminology (应还 / 自动还款 / 提前还清借款 / 预估可借 / 总额度).
- No decorative elements introduced; "3天后自动还款" retained as functional information (proximity + no manual action needed), styled calm (secondary text, no red, no urgency).

## Fix Details pass log

- Rate copy: verified with `node profile/tools/calc.mjs '{"annualRate":0.108,"principal":1000,"term":1,...}'` → 资金占用日利率 0.0003 = ¥0.30 per ¥1000 per day — matches "1千元用1天只需0.3元" (production copy, verbatim).
- Credit arithmetic: 预估可借 ¥55000 / 总额度 ¥60000 carried verbatim from the template; intra-consistent (55000 ≤ 60000, implied used ¥5000).
- Date arithmetic: 2026-07-17 + 3 days = 7月20日 — inside the 7-day window; "3天后" consistent with the date on every screen where both appear.
- ¥537.20 due amount: **blocked — cannot be exactly verified.** calc.mjs needs the active loan's 放款日 (loanDate), 借款本金 (principal), 期数 (term) and actual rate; none were given. Plausibility check: implied used credit ¥5000 at 10.8% over 10 terms gives 每期 ¥525.34 — ¥537.20 is in the plausible band. The value is carried verbatim and unchanged from the production template per the pass's missing-input rule.
- Inter-screen consistency: 7月20日 / ¥537.20 / 3天后 / 1笔 / ¥55000 / ¥60000 identical across all three variants in `solutions.html` and in `home.html`.
- No thousands separators; large amounts weight 500; number font only on currency values.

## QA gate result

- `node qa-gate.mjs solutions.html home.html` → **0 error(s), 0 warning(s) across 2 file(s)** (first and final run)
- Manual eyeball checks: preview chrome via `<preview-chrome variant="home" title="微粒贷">` placeholder only; no custom JS; one gold CTA per screen; white home background forced on `.wld-page`; all copy fits one line at 375px width.
