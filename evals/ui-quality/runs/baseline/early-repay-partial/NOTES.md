# Benchmark Run Notes — early-repay-partial

Task: 提前还清页面想支持部分还款，用户可以只还一部分金额，先出三个方案
Mode: headless benchmark (no clarifying questions, no server, no screenshots, no feedback loop).

## Defaults chosen (in place of Step 1 clarifying questions)

1. **Core user action:** On the 提前还清 (early repayment) page, repay part of the outstanding amount instead of clearing selected loans in full.
2. **Screen count:** One screen (the partial-repayment entry screen). Confirm/result states out of scope for this run.
3. **Data shown (sample data, internally consistent):**
   - Loan 1: 借款 ¥5,000.00, borrowed 2025/03/12, 应还 ¥5,020.00
   - Loan 2: 借款 ¥3,000.00, borrowed 2025/05/02, 应还 ¥3,020.00
   - Total repayable: ¥8,040.00 (5,020.00 + 3,020.00)
   - Sample partial amount: ¥3,000.00 → oldest loan remainder 5,020.00 − 3,000.00 = ¥2,020.00; effect-card remainder 8,040.00 − 3,000.00 = ¥5,040.00
   - Interest-saved estimate (方案 C): ¥54.00 (≈ 10.8% simple annual on ¥3,000 over ~2 months)
   - Payment account: 招商银行 (5397) — same account terminology as 本期应还.html
4. **Diversity mode:** UX Strategy (new capability, product direction open — options differ by decision model, not surface styling).
5. **Chosen direction for Step 5 (no user available to pick):** 方案 A 金额优先 — fastest single-input path, most aligned with WLD calm/simple principles, and reuses the production 输入金额 amount-input pattern most directly.
6. **Allocation rule (方案 A):** partial amount is applied to the oldest loan first (优先还最早借款). Stated inline on the allocation card.
7. **State shown:** filled-amount state with enabled gold CTA. Per PIT-001 (adopted from COMP_WLD_LOAN_AMOUNT since the amount-input section is adapted from 输入金额.html), the empty state would show a disabled (浅黄) CTA and must not submit — noted in the frame subtitle, not built as a separate screen in this run.
8. **No bottom sheets** in any option, so PIT-002 (sheet = independent state) does not apply.
9. **CTA label:** 还款 (production terminology from 提前还清.html action bar); amount not repeated on the button because it is the screen's main number.

## Product rules loaded

`提前还清.html` has no COMP_ID in `assets/product-memory.md` (skip per bridge rule). Because the amount-input section is adapted from `输入金额.html` (COMP_WLD_LOAN_AMOUNT), the matching entries were loaded and applied where transferable:

【Product rules — from bundled memory】
- PAT-WLD-001 (confidence: high): 输入金额页（COMP_WLD_LOAN_AMOUNT）存在首借/非首借两条独立路径，必须拆分为独立状态，不能合并。关键区别：· 首借用户：进入页面自动带入可借额度，键盘 CTA 为「确定」（仅收起键盘），用户需再次点击页面「下一步」才能提交 · 非首借用户：键盘 CTA 为「下一步」，点击直接触发提交，无需二次确认 · 首借用户：键盘激活时顶部显示利息气泡 · 非首借用户：无利息气泡
  (Applied: not directly transferable — repayment page has no 首借 path; keyboard states not rendered since screens are static.)

【Pitfalls to avoid — from bundled memory】
- PIT-001 (stage: state_machine_confirm): 在未输入金额的空状态下，底部 CTA「下一步」按钮默认为禁用状态（浅黄色），不能假设为可点击，也不应将空状态连接到 SUBMITTING 状态。
  Detection: 观察 Figma 截图中按钮颜色：· 亮黄色 = 启用（enabled）· 浅黄色/灰黄色 = 禁用（disabled）空状态的正确处理：下一步按钮 disabled，不可触发提交流程。
  Correction: 空状态（EMPTY_HIGH / EMPTY_LOW）不应有指向 SUBMITTING 的 transition。只有已填入金额的状态（AUTOFILLED / EDITING）才能进入 SUBMITTING。
  (Applied: filled state shown with enabled CTA; empty-state-disabled rule recorded above.)
- PIT-002 (stage: state_machine_identification): 底部浮层（Sheet/Overlay）容易被漏识别为独立状态…
  (Applied: no sheets used, n/a.)
- PIT-003 (stage: state_machine_confirm): 首借和非首借的键盘 CTA 行为差异…
  (Applied: n/a for repayment; keyboard not rendered.)

## Templates read and used

- `提前还清.html` — base for 方案 B (receipt rows, checkboxes, action bar, 总计 + 还款 button) and repayment terminology throughout
- `输入金额.html` — amount input section (¥ + underline + hint + quick chips), options row (付款账户), bottom CTA area with disclaimer — 方案 A, 方案 C, and partial-repay.html
- `本期应还.html` — summary header (label + 44px amount + secondary line) for 方案 C; non-checkbox receipt-row layout adapted into 方案 A's allocation rows
- `DESIGN.md`, `tokens.css`, `components.css`, `phone-mockup.css`, `product-memory.md`, `pm-memory-cache/product-patterns.yaml`, `pm-memory-cache/common-pitfalls.yaml`, `references/solution-archetypes.md` — rules and shared classes

## wld-design:simplify pass (applied manually, headless)

- Removed: 温馨提示/boilerplate helper copy, promo banners, per-row info icons where the row carries no expandable breakdown (方案 A allocation, 方案 C effect card; kept on 方案 B rows because 应还 has an interest breakdown), "请输入" prefixes.
- Shortened: bottom disclaimer to 免违约金，利息计至今日 (keeps the fee/interest facts from 输入金额.html's 按日计息…免违约金 line); hint to 最多可还 ¥8,040.00.
- Merged: allocation card title + allocation rule into one line (还款分配 · 优先还最早借款); label+value single rows in the effect card.
- Focal point: exactly one 44px number and one gold CTA per phone (gold checkbox/radio checked states are selection states, not CTAs).

## Pre-user QA gate (self-checked, no browser available)

- `<wld-wechat-chrome variant="inner" title="提前还清借款">` on every phone; no hand-built chrome; mockup-chrome.css linked
- One primary gold CTA per screen; pill buttons; quick chips 4px radius (not pill); amounts weight 500
- Inner-page background left at default #F5F5F5; white cards 12px radius; 0.5px dividers
- No urgency copy, no emojis, no custom JS; screens static
- Skipped (headless): server start, browser screenshot verification. Note: `/assets/` paths and `<wld-wechat-chrome>` expansion require serving these files through `skills/brainstorm/server.cjs`.

## Files written

- `solutions.html` — 3-solution phone gallery (方案 A 金额优先 / 方案 B 按笔选择 / 方案 C 效果先行)
- `partial-repay.html` — Step 5 first screen of chosen direction (方案 A), filled state, single phone
- `NOTES.md` — this file
