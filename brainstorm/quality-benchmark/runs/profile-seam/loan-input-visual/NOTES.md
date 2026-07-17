# Benchmark run notes — loan-input-visual

Task: 输入金额页流程已定，出三个视觉方向，要求更高级、更平静。
Benchmark mode: no clarifying questions, no server, no browser verification. All Step 1
defaults chosen here; every other SKILL.md rule applied.

## Step 1 defaults (recorded in place of the interview)

- **Core user action:** 确认借款金额并点击「下一步」提交（流程已定，不改流程）。
- **Diversity mode:** Visual Exploration — 用户明确要视觉方向，流程固定。
- **Screens:** 仅 输入金额 一屏，默认已填入金额的状态（¥10000），无键盘、无浮层。
- **Source template:** `profile/screens/输入金额.html`（COMP_WLD_LOAN_AMOUNT）。
- **State assumptions:** 金额已填入 → 底部「下一步」为可用亮黄态（PIT-001：空状态才禁用）。
  静态稿不展示键盘，因此 首借/非首借 键盘 CTA 差异（PAT-WLD-001 / PIT-003）与期数浮层
  变体（PAT-WLD-002 / PIT-002）不在本次渲染范围内，不合并、不臆造。
- **期数:** 沿用模板的 24 个月（PAT-WLD-003 的默认选中规则作用于浮层，未渲染）。
- **Chosen direction for Step 5:** 方案 A「留白·聚焦」（Premium / spacious）——
  与「更高级、更平静」诉求最直接对应。
- **Non-goals:** 不改流程、不加新模块、不引入交互。

## Loaded product knowledge (COMP_WLD_LOAN_AMOUNT)

【Product rules — bundled memory】PAT-WLD-001、PAT-WLD-002、PAT-WLD-003（均 confidence: high）
【Pitfalls to avoid — bundled memory】PIT-001、PIT-002、PIT-003
（PIT-004 面向 req_doc 影响分析，与本屏设计无关。）

## Fix Details pass — corrections applied

模板缺少借款日期。按 pass 规则用 `profile/tools/calc.mjs` 对 2026-05-16 ~ 2026-07-17
日期带扫描（annualRate 0.108, principal 10000, term 24, coupon 前30天0利息）：

- 模板「还款计划 首次6月16日，应还 ¥683.00」在整个日期带内不可能
  （首期应还 ¥375.83 ~ ¥378.77）→ 属可证伪错误，已更正。
- 模板「省利息¥150.00」在整个日期带内不可能（¥89.89 ~ ¥90.00）→ 已更正为 ¥90.00。
- **假定借款日 = 2026-07-17（今天）**：首次还款 2026-08-16，首期应还 ¥375.83，
  省利息 ¥90.00。三个方案统一使用同一组数据。
- 年利率 (单利) 10.8% 与「前30天0利息」并存符合优惠券规则
  （INTEREST_REDUCTION 不改变利率口径）。

如需精确到真实放款日，请提供借款日期（YYYY-MM-DD），即可用 calc.mjs 重新核算
首次还款日与首期应还金额。

## Benchmark deviations applied

- Step 2（server）与所有浏览器截图验证跳过。
- 输出目录改为本目录（覆盖 screenDir）。
- Simplify Pass 与 profile 声明的 Fix Details pass 由本 agent 直接执行。
- 在 Step 5 完成所选方向第一屏（`loan-amount.html`）后停止，不进入反馈循环。
