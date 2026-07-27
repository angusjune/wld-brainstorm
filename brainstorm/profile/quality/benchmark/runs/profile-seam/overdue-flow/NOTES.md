# Benchmark run notes — overdue-flow

Task: 设计一个逾期还款的提醒和处理流程，大概两三个屏幕。
Benchmark mode: Step 1 questions skipped (defaults below), Step 2 server + all
browser screenshot verification skipped, shared and profile passes applied by hand.

## Step 1 defaults (recorded in place of clarifying questions)

- **Core user action:** 用户发现自己有一笔借款逾期，看清逾期金额与罚息，完成还款。
- **Screens (2–3):** ① 首页逾期提醒（个人中心-有借款 变体）→ ② 逾期详情/处理 → ③ 收银台还款。
- **Data shown:** 逾期天数、逾期应还总额（本期应还 + 罚息）、借据信息（借款金额/放款日/期数/到期日）、还款方式。
- **Diversity mode:** UX Strategy（新流程、方向未定）。三个方案按信息层级/路径分化：
  状态先行 (Status-first) / 最短路径 (Task-first) / 修复导向 (Risk-reduction)，
  取自 profile 的 Repayment / due amount 原型。
- **Source templates (no single template covers overdue — combined per SKILL Step 3):**
  `本期应还.html`（金额汇总 + 借据列表）、`收银台.html`（还款方式 + 居中 CTA）、
  `个人中心-有借款.html`（首页提醒入口）、`更换还款卡.html`（银行卡 chip 图案）、
  `借款详情.html`（状态点样式参照）。
- **Chosen direction (no user available):** 方案 A 状态先行 — 最符合品牌“Trustworthy,
  Simple, Calm”，同时覆盖“提醒”和“处理”两半任务。Step 5 构建其第 1 屏
  `home-overdue.html`（首页逾期提醒）。
- **Non-goals:** 不做催收/分期协商等深度流程；不加倒计时或施压文案（产品法禁止
  artificial urgency）；逾期状态下是否冻结“借钱”入口未获产品确认，首页保留模板
  原有的借钱按钮与预估可借（开放问题，留给用户决策）。

## Canonical loan data (Fix Details pass)

Computed with `node profile/quality/tools/calc.mjs '{"annualRate":0.144,"principal":6000,"term":12,"loanDate":"2025-12-10"}'`:

- 借款 ¥6000，2025/12/10 放款，12 期等额本息，年利率(单利) 14.4%（利率不在逾期屏展示）。
- 第 7 期到期日 2026/07/09，本期应还 ¥540.16（本金 ¥502.88 + 利息 ¥37.28）。
- 今日 2026/07/17 → 已逾期 8 天（口径：07/10 起为第 1 个逾期日，含今日共 8 天）。
- **罚息 ¥2.41 — 假设值，calc.mjs 不含罚息参数（blocked input）。**
  假设口径：逾期本金 × 日利率(0.04%) × 1.5 倍 × 8 天 = 502.88 × 0.0004 × 1.5 × 8 = 2.41。
  需要的确切输入：产品的罚息倍数与计息基数（本金 or 本息）。屏上文案只写
  “按合同约定逐日计收”，不展示未经确认的罚息利率口径。
- 逾期应还合计 = 540.16 + 2.41 = **¥542.57**（所有屏幕/方案间保持一致）。
- 首页 预估可借 ¥55000 / 总额度 ¥60000 沿用模板原值（预估值非算术推导，不做校验）。
- 还款卡统一为 工商银行 (1853)（取自 更换还款卡.html 当前卡），全流程一致。

## Product-knowledge injection (Step 3)

本期应还 / 收银台 / 个人中心-有借款 均未映射 COMP_ID（profile/knowledge/README.md 标注
“not yet in bundled KB”），**无捆绑产品规则覆盖这些屏幕，设计仅依据视觉模板**。
未凭空补造 patterns/pitfalls。

## Deviations / repairs noted

- 模板引用 `/assets/icons/*.svg`，但图标实际位于 `profile/design-system/icons/`（服务器挂载
  `/profile/` → profile 目录，`/assets/icons/` 会 404）。生成文件改用
  `/profile/design-system/icons/...` 路径。
- 收银台模板中“已选中”勾选框缺 `margin-left:auto`（模板内其他行均有），生成文件按
  多数模式右对齐。
- 收银台模板的 `.wld-cashier-row .wld-checkbox { border-color: rgba(0,0,0,0.25) }`
  为 off-token 值，未沿用（保留 components.css 默认 token 边框色）。
- 首页保留模板的利率条（产品法：模板已有的利率文案必须保留），逾期提醒条紧随其后，
  使用 `--wld-danger-100/700` token。

## Passes run

1. **Simplify Pass**（`SKILL.md`）— 合并罚息口径入摘要副行，
   去掉重复的“请尽快还款”正文、装饰性图标；保留法定/费率/风险文案与主 CTA。
2. **Fix Details**（profile/quality/passes/fix-details.md）— 全部金额经 calc.mjs 验证；
   罚息标记为 blocked-on-input 假设（见上）；跨屏一致性（¥542.57 / 8 天 /
   工商银行 (1853) / 1 笔）已核对。
3. **Pre-user QA gate** — `node qa-gate.mjs` 结果见最终报告。
