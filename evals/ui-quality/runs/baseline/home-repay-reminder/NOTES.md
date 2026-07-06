# Benchmark Run Notes — home-repay-reminder

Task (from WLD PM): 「首页要能提醒用户最近7天内要还的钱，给我三个方案看看」
Skill followed: `plugins/wld-design/skills/brainstorm/SKILL.md` (headless benchmark mode).

## Defaults chosen (in place of Step 1 clarifying questions)

1. **Core user action** — Notice repayments due within the next 7 days directly on the home screen (个人中心) and jump to repay; borrowing remains the screen's primary action.
2. **How many screens** — One screen (home only). The PM said 「首页」; no repayment-flow screens were requested.
3. **User state** — 有借款 (active loan). A 7-day repayment reminder only exists for users with outstanding loans, so `个人中心-有借款.html` is the base, not the new-user home.
4. **Data shown (sample values)** — 预估可借 ¥55000 / 总额度 ¥60000 (verbatim from the production template). Two repayments inside the 7-day window: 7月6日 ¥537.20 (借款 ¥12000) and 7月9日 ¥463.80 (借款 ¥8000); 7-day total ¥1001.00 (total matches the 本期应还.html production figure). 提前还清借款 count = 2 笔 (two active loans).
5. **"最近7天" interpretation** — Rolling window from today (assumed 2026-07-03), i.e. due dates 7月3日–7月9日. Shown as explicit dates, never as countdowns (QA gate forbids countdown/urgency copy).
6. **Diversity mode** — UX Strategy (not Mixed). The PM is asking how the home should remind — a hierarchy/decision-model question — so all three options differ by information hierarchy, not surface styling. Archetypes used (from `references/solution-archetypes.md`, Home / Personal Center group): Repayment-aware (A), Task-first (B), Receipt-first brought to home (C).
7. **Chosen direction for Step 5 (no user available to pick)** — 方案 B 还款任务置顶 (task-first reminder card). Rationale: it most directly satisfies 「要能提醒」 — the reminder is noticeable and actionable — while the single gold 借钱 entry stays intact. Built as `home.html`.
8. **CTA weighting** — 去还款 uses the secondary button style (`wld-btn-secondary`, #FFF9D9/#DBAE31); the gold circle 借钱 stays the one primary gold CTA per screen.
9. **Reminder tone** — Neutral/informational per DESIGN.md anti-references: no red, no orange emphasis, no countdown, no pressure language. Dates and amounts only.

## Step 1 snapshot

- Core user action: see money due in next 7 days on home; optionally jump to repay.
- Screen/state: 个人中心, active-loan state, one screen; reminder as new module.
- Data per screen: 7-day due total, nearest due date, per-item date+amount (C only), available credit, early-payoff count.
- Source production templates: `个人中心-有借款.html` (base structure + local styles), `本期应还.html` (due summary + receipt-row pattern), `个人中心.html` (canonical home reference), `个人中心-单offer.html` (badge pattern reviewed but rejected — promotional styling is wrong for repayment info).
- Product rules loaded: none — all 个人中心 variants have no COMP_ID in `assets/product-memory.md` ("not yet in bundled KB"), so the pm-memory-cache load was skipped per the bridge filter rule.
- Non-goals: push notifications, repayment flow screens, overdue/failed states, dark mode.

## wld-design:simplify pass (applied manually per benchmark mode)

- Product Correctness Pass: skipped — no COMP_ID mapped for home screens.
- Kept (Boundaries: legal/financial text): rate bar 年利率 (单利) 10.8%…, 借钱须知 link, 实际可借以当次借款审批为准 disclaimer. The simplify skill's before/after example strips these, but its Boundaries section (interest-rate disclosure = never remove) and the brainstorm QA gate (required financial/legal text remains) override the example.
- Shortened: reminder label is 7日内应还 (5 chars) instead of 最近7天内需要还款的金额; date line is 最近还款日 7月6日; button is task-specific 去还款.
- Merged: label + amount inline on one row in the reminder card (7日内应还 ¥1001.00); per-item rows merge date + amount, loan principal demoted to 12px secondary.
- Removed/never added: no helper copy (e.g. 点击下方按钮), no 温馨提示 boilerplate, no info icons duplicating text, no decorations, no emojis.
- Focal point check: one gold CTA (借钱 circle) and one 44px number (预估可借) per screen; reminder amount capped at 20px (solutions B / home.html) or 14px rows (A, C).

## Pre-user QA gate (self-checked, no browser available)

- `<wld-wechat-chrome variant="home" title="微粒贷">` used; no hand-built chrome; `mockup-chrome.css` linked.
- One primary gold CTA per screen; 去还款 is secondary style.
- Home background white (`var(--wld-surface)` override on `.wld-page`), matching all 个人中心 templates.
- No urgency copy, no countdowns; required financial/legal text kept.
- No custom JavaScript; screens fully static; fonts via `var(--wld-font-family)` / `var(--wld-font-number)`; amounts weight 500; pill buttons only; quick-amount chips N/A.

## Benchmark-mode deviations (forced by headless run)

- Step 1 questions skipped — defaults above.
- Step 2 (server start) skipped; `/assets/` paths and `<wld-wechat-chrome>` expansion therefore only resolve when served by `server.cjs`.
- Screenshot verification (Step 4/5) skipped — no browser automation in this run.
- `wld-design:simplify` applied manually by reading its SKILL.md.
- Output written to `evals/ui-quality/runs/baseline/home-repay-reminder/` instead of a server-issued `screenDir`.
- Stopped after Step 5, first screen of chosen direction; no feedback loop (Step 6).

## Files written

- `solutions.html` — 3-option phone gallery (方案 A 温和提醒 / 方案 B 还款任务置顶 / 方案 C 到期明细).
- `home.html` — Step 5 build of 方案 B, single centered phone.
- `NOTES.md` — this file.
