# Benchmark run notes — loan-input-visual (guidance-pass)

Task: 「输入金额页流程已经定了，帮我出三个视觉方向，想要更高级、更平静的感觉」
Executed headless per benchmark mode: no clarifying questions, no server (Step 2 skipped), no browser screenshot verification.

## Step 1 defaults (in place of clarifying questions)

| Question the skill would ask | Default chosen | Why |
|---|---|---|
| Core user action | 在输入金额页确认借款金额并点击「下一步」 | Given directly by the request (输入金额页) |
| How many screens | One screen (输入金额), single state | Flow is fixed per PM; request is visual exploration only |
| Data to show | Exactly the production template's data: ¥10000, hint 输入合法金额, chips 借1万/借2万/借全部, promo 前30天0利息 + 省利息¥150.00, rows 借款期数 24个月 / 还款计划 首次6月16日应还¥683.00 / 收款账户 工商银行(2004) / 借款用途 个人日常消费 / 协议相关 年利率(单利)10.8%, CTA 下一步 + disclaimer 按日计息，次日起可提前还，免违约金 | Visual-mode invariant: all data values stay unchanged from the source template |
| User/state variant | 非首借 user, keyboard collapsed, amount filled (¥10000) → CTA enabled bright gold | Matches the shipped template state; consistent with PIT-001 (only the EMPTY state requires a disabled CTA) and PAT-WLD-003 (非首借 default = previous loan tenor, 24个月) |
| Diversity mode | Visual Exploration | 「流程已经定了」+「三个视觉方向」 matches the skill's Visual Exploration trigger exactly |
| Direction picked for Step 5 (no user available) | 方案 A · 静谧留白 (Premium / spacious) | Closest archetype to 「更高级、更平静」; recorded as a benchmark default, not a user choice |

## Step 1 snapshot

- Core user action: confirm loan amount, tap 下一步
- Screens/states: 1 screen — 输入金额, filled/keyboard-collapsed state
- Data: identical to production template (see table above)
- Source production template: `assets/screens/输入金额.html` (+ `DESIGN.md`, `components.css` for card/cell rules)
- Product rules loaded: yes (COMP_WLD_LOAN_AMOUNT — see below)
- Non-goals: no flow/state changes, no keyboard or 期数 sheet screens (those are separate states per PIT-002/PIT-003 and out of scope for a visual-direction comparison), no promotional escalation

## Product rules loaded (COMP_WLD_LOAN_AMOUNT via product-memory.md)

【Product rules — from bundled memory】
- PAT-WLD-001 (confidence: high): 输入金额页（COMP_WLD_LOAN_AMOUNT）存在首借/非首借两条独立路径，必须拆分为独立状态，不能合并。关键区别：· 首借用户：进入页面自动带入可借额度，键盘 CTA 为「确定」（仅收起键盘），用户需再次点击页面「下一步」才能提交 · 非首借用户：键盘 CTA 为「下一步」，点击直接触发提交，无需二次确认 · 首借用户：键盘激活时顶部显示利息气泡 · 非首借用户：无利息气泡
- PAT-WLD-002 (confidence: high): 借款期数浮层有两种变体，需建立独立状态：· 标准版（TENOR_STANDARD）：选项为 6/12/24 个月 · 含1期版（TENOR_WITH_1M）：选项为 1/6/12/24 个月 用户是否有1期选项由后台资格判断，前端无法提前知晓，因此两种浮层是独立状态，不能合并为一个状态用条件渲染来表达。
- PAT-WLD-003 (confidence: high): 借款期数默认选中规则（三条分支，需全部覆盖）：· 首借 + 有1期选项 → 默认选中1个月 · 首借 + 无1期选项 → 默认选中12个月 · 非首借 → 默认选中上一笔借款的期数 这三个分支在测试用例中必须独立覆盖。

【Pitfalls to avoid — from bundled memory】
- PIT-001 (stage: state_machine_confirm): 在未输入金额的空状态下，底部 CTA「下一步」按钮默认为禁用状态（浅黄色），不能假设为可点击，也不应将空状态连接到 SUBMITTING 状态。
  Detection: 观察 Figma 截图中按钮颜色：· 亮黄色 = 启用（enabled）· 浅黄色/灰黄色 = 禁用（disabled）空状态的正确处理：下一步按钮 disabled，不可触发提交流程。
  Correction: 空状态（EMPTY_HIGH / EMPTY_LOW）不应有指向 SUBMITTING 的 transition。只有已填入金额的状态（AUTOFILLED / EDITING）才能进入 SUBMITTING。
- PIT-002 (stage: state_machine_identification): 底部浮层（Sheet/Overlay）容易被漏识别为独立状态，只关注主页面截图而忽略浮层状态。
  Detection: 检查每一张 Figma 截图是否有底部弹出层（半透明遮罩 + 白色卡片）。如有，该浮层是独立状态，必须为其建立对应状态及 transitions（弹出/关闭）。
  Correction: 对每个浮层建立：· 至少一个浮层状态（如 TENOR_SHEET_STANDARD）· 弹出 transition（主页面 → 浮层状态）· 关闭 transition（浮层状态 → 主页面）· 如浮层有异步加载，还需建立 LOADING / LOADED / ERROR 三态
- PIT-003 (stage: state_machine_confirm): 首借和非首借的键盘 CTA 行为差异容易被忽略，误将两者合并为同一种「输入中」状态，或误认为 CTA 行为相同。
  Detection: 分析 Figma 截图时，仔细检查数字键盘右下角的按钮文案：· 「确定」= 首借路径，点击只收起键盘 · 「下一步」= 非首借路径，点击直接提交 两者必须是独立状态。
  Correction: 建立独立的 EDITING_FIRST 和 EDITING_RELOAN 两个状态，并在 rules 中记录各自的键盘 CTA 行为和提交流程差异。

PIT-004 was not loaded: its source is 模块05设计讨论, not COMP_WLD_LOAN_AMOUNT (fails the bridge filter rule).

How the rules were applied: screens show the filled state, so the CTA is enabled (PIT-001 only mandates disabled in the empty state); no sheets or keyboards are rendered, so no sheet/keyboard states were merged (PIT-002/PIT-003, PAT-WLD-001/002); 24个月 kept as the 非首借 previous-tenor default (PAT-WLD-003).

## The 3 visual directions (all adapted from 输入金额.html, Visual Exploration mode)

- 方案 A · 静谧留白 (Premium / spacious) — bigger whitespace around the amount, promo becomes a quiet no-card text line, option rows taller with a subtle card shadow (`--wld-shadow-card`).
- 方案 B · 归整同卡 (Calmer / native) — promo row merged as the first row of a single grouped card; labels drop to regular weight; values move to secondary grey (hierarchy through opacity).
- 方案 C · 暖调点染 (Softer / warmer) — quick-amount chips and promo row surfaces tinted `--wld-theme-100` (#FFF9D9); layout and data identical to the template.

Visual-mode invariants held in all three: CTA form/copy, WeChat chrome, all legal/rate/disclaimer text, and all data values are unchanged from the source template; each caption's "What changes" names exactly what varies.

## wld-design:simplify results (applied manually per benchmark mode)

Product Correctness Pass: no pitfall exhibited (see rule application above). Simplify Pass (5 questions + checklist) on both files:
- Nothing removed. All template elements are task-relevant production content: 省利息¥150.00 is unique data; 输入合法金额 is the production validation hint; 年利率(单利)10.8% and the 按日计息 disclaimer are required rate/legal text (simplify boundary); the bank icon is functional (account identification).
- Already-clean checks: no 温馨提示/请输入 boilerplate, one gold CTA per screen, no emojis, label+value rows already merged single-line, no background decoration (方案 A's card shadow is the DESIGN.md-sanctioned elevation, and A's promo de-carding is itself a simplification).

## Pre-user QA gate

`node plugins/wld-design/skills/brainstorm/qa-gate.mjs evals/ui-quality/runs/guidance-pass/loan-input-visual/` → 0 errors, 0 warnings across both files. Browser screenshot verification skipped (benchmark mode). Manual checks: inner-page `#F5F5F5` kept (no white forced on `.wld-page`), `<wld-wechat-chrome variant="inner">` used, no custom JS, no urgency copy, no thousands separators.

## Deviations / flags

1. **Skill-text vs template CTA conflict (flagged per skill rule):** SKILL.md Step 5 and `production-reference.md` describe the 输入金额 CTA as an 84px gold circle, but the production template `输入金额.html` ships a full-width gold pill (`wld-btn wld-btn-primary wld-btn-m`) in `.wld-loan-bottom`. Since templates in `assets/screens/` are the source of truth for look and the visual-mode invariant requires the CTA "unchanged from the source template", all screens keep the template's pill CTA. Raised here for the maintainers to reconcile.
2. **One token substitution vs template:** the template's bottom gradient starts at literal `rgba(245,245,245,0)` (off-palette literal, would warn in the QA gate); replaced with `var(--wld-transparent)` — visually identical fade into `var(--wld-bg)`.
3. Benchmark-mode skips: Step 2 (server), all screenshot verification, the user feedback loop (Step 6), and user direction choice (方案 A chosen by default as documented above).

## Files written

- `solutions.html` — 3-solution phone gallery (Step 4)
- `loan-input.html` — full screen for the chosen direction 方案 A (Step 5, first screen)
- `NOTES.md` — this file
