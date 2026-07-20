# Benchmark run notes — home-repay-reminder

Task: 首页要能提醒用户最近7天内要还的钱，给我三个方案看看

## Step 1 defaults (benchmark mode — no clarifying questions asked)

| Question Step 1 would have asked | Default chosen | Rationale |
|---|---|---|
| Core user action | Notice money due within the next 7 days on the home screen, then tap through to repay (本期应还) | Direct reading of the request |
| User state | Existing borrower with one active loan (总额度 ¥60000, 已用 ¥5000, 预估可借 ¥55000) | Only users with an active loan have upcoming repayments; matches `个人中心-有借款.html` |
| How many screens | One screen (home), three solution variants | The request names only 首页 |
| Data shown | Due date, due amount, countdown, auto-repay note, available credit, early-payoff entry | Minimum needed for a 7-day reminder without breaking the home structure |
| Due data | 1 loan due 7月20日, ¥537.20, auto-repay; "today" = 2026-07-17, so 3天后 (within the 7-day window) | Amount carried verbatim from the production template |
| Diversity mode | Mixed (default): 方案 A + B are UX variants, 方案 C is a visual variant | User intent ("要能提醒…三个方案") does not name visual exploration |
| Chosen direction for Step 5 | 方案 A (还款卡片提醒) | Recommended default: closest to production patterns, lowest risk |

## Snapshot (per Step 1)

- Core user action: see 7-day due money at a glance on home; tap → 本期应还
- Screens/states: 个人中心 with active loan, repayment due in 3 days
- Data: ¥55000 可借 / ¥60000 总额度 / 7月20日应还 ¥537.20 / 提前还清 1笔
- Source templates: `profile/screens/个人中心-有借款.html` (base), `profile/screens/本期应还.html` (repayment terminology: 应还 / 自动还款)
- Product rules loaded: none — 个人中心-有借款.html is mapped to "(not yet in bundled KB)" in `profile/PRODUCT.md`, so no bundled product rules cover this screen; the design relies on the visual template alone (per the bridge's filter rule, nothing was invented to fill the gap)
- Non-goals: no change to the borrow flow, no new screens, no interactivity

## Benchmark deviations applied

- Step 2 (server start) skipped; no browser screenshot verification
- Output written to `quality-benchmark/runs/profile-seam/home-repay-reminder/` instead of screenDir
- Embedded Simplify Pass and the profile's Fix Details pass run by hand (see below)

## Deviation from template markup

- Tab-bar icon paths: production templates reference `/assets/icons/*.svg`, but the icons ship at `profile/icons/` (served as `/profile/icons/`); `assets/icons/` does not exist. Generated screens use `/profile/icons/tab-icon-home-filled.svg` and `/profile/icons/tab-icon-me.svg` so the preview resolves. Everything else is copied from the templates.

## Simplify Pass log

- 方案 B: removed the "X月X日应还" row from the bottom loan card because the top notice strip already carries date + amount — kept only the 提前还清借款 row (duplicate element merged).
- Kept everywhere: rate bar copy (required rate text), 借钱须知 + disclaimer footer, tab bar, one gold CTA (84px 借钱 circle), production terminology (应还 / 自动还款 / 提前还清借款 / 预估可借 / 总额度).
- No decorative elements introduced; countdown "3天后自动还款" retained as the functional 7-day-window signal.

## Fix Details pass log

- Rate copy: 10.8% 年利率(单利) → 1000 × 0.108 / 360 = ¥0.30/天 — matches "1千元用1天只需0.3元" (production copy, verbatim).
- Credit arithmetic: 60000 − 5000 = 55000 — 预估可借/总额度 intra-consistent.
- Date arithmetic: 2026-07-17 + 3天 = 7月20日 — inside the 7-day window. Consistent on every screen.
- ¥537.20 monthly due: **blocked — cannot verify with calc.mjs.** Verification needs the active loan's 放款日 (loanDate), 借款本金 (principal), 期数 (term) and 实际年利率; none were given. The value is carried verbatim and unchanged from the production template `个人中心-有借款.html` per the pass's missing-input rule.
- Inter-screen consistency: 7月20日 / ¥537.20 / 1笔 / ¥55000 / ¥60000 identical across all three solutions and `home.html`.

## QA gate result

- `node qa-gate.mjs solutions.html home.html` → 0 error(s), 0 warning(s) (final run; see summary)
