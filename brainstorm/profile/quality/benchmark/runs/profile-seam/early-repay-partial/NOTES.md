# Benchmark run notes — 提前还清 · 部分还款

Task: 提前还清页面想支持部分还款，用户可以只还一部分金额，先出三个方案。
Benchmark mode: Step 1 interview skipped — every default is recorded here. Step 2 (server) and
browser screenshot verification skipped per benchmark instructions.

## Step 1 defaults (would have been clarifying questions)

1. **Core user action** — A) 在提前还清页完成一次“只还一部分金额”的还款（默认）。
2. **Screens** — A) 单屏（默认）：solutions.html 三方案 + 所选方向的第一屏。
3. **Diversity mode** — UX Strategy（新能力、产品方向未定，符合“New flow / how should this work”）。
   三个方案按决策模型区分，不是表面换肤。
4. **Data shown** — 借据列表（借款本金、放款日、剩余应还）、部分还款金额、总计、还款后影响。
5. **Loan dataset (assumed)** — 年利率(单利) 10.8%（取自生产模板 输入金额.html），等额本息 12 期：
   - 借据1：借款 ¥2000，放款日 2026/04/22 → 提前还清应还 ¥1693.75，省利息 ¥73.13（calc.mjs 验证）
   - 借据2：借款 ¥6000，放款日 2026/05/10 → 提前还清应还 ¥5054.04（calc.mjs 验证）
   - 借据3：借款 ¥3000，放款日 2026/07/17（今日借出，明日起可还，不可选）
   - 全部还清合计 ¥6747.79；还款日按今日 2026-07-17。
6. **Partial-repay product params (assumed)** — 最低部分还款 ¥100.00；方案 A/C 的自动分配规则为
   “优先冲抵较早借据”；部分还款先抵当日利息再冲本金（故 剩余应还 = 原应还 − 本次还款额）。
7. **Chosen direction for Step 5 (no user available)** — 方案 B 按借据调整（Receipt-first）。
   理由：与生产 提前还清.html 的勾选借据交互模型最一致、模板可追溯性最强，
   且保留该屏的 canonical CTA（卡片底部操作栏 全选/总计/还款）。
8. **Nav titles** — 方案 B 沿用生产标题「提前还清借款」；方案 A/C 因入口变为金额输入，
   预览导航题为「提前还款」（presentation-only chrome）。

## Product knowledge

- `提前还清.html` 在 profile/knowledge/README.md 中映射为 “not yet in bundled KB” —— 无 bundled
  product rules 覆盖此屏，设计仅依赖视觉模板与 PROFILE.md 产品法则（按 bridge 文件要求一行说明）。

## Source templates

- 提前还清.html（基底：借据列表、勾选、卡底操作栏、屏内局部样式）
- 输入金额.html（金额输入区、快捷金额 chips、免违约金 disclaimer 文案）
- 本期应还.html / 收银台.html（金额摘要与“内容后居中 CTA”形态参考）

## Passes run

- **Simplify Pass**（`SKILL.md`）：可编辑借据行以「改金额」链接替代 info 图标（避免右侧
  双图标堆叠）；disclaimer 精简为「按日计息，免违约金」（“次日起可提前还”与本屏无关）；
  分配卡不加多余说明文案，仅保留一行分配规则副标题；保留全部必需的还款/风险文案与禁用态解释。
- **Fix Details Pass**（profile/quality/passes/fix-details.md）：全部金额经 `profile/quality/tools/calc.mjs` 验证：
  - 1693.75 + 5054.04 = 6747.79（可还上限，方案 A/C hint 与 C 剩余待还基数）
  - 方案 A：输入 3000 = 还清 1693.75 + 部分还 1306.25；借据2 剩余应还 5054.04 − 1306.25 = 3747.79
  - 方案 B：总计 1693.75 + 3000.00 = 4693.75；借据2 剩余应还 5054.04 − 3000 = 2054.04
  - 方案 C：剩余待还 6747.79 − 3000 = 3747.79；省利息 ¥73.13 仅标注给已还清的借据（部分冲抵的
    未来省息 calc.mjs 无法验证，故不展示 —— 需要“部分提前还款重算”能力才能给出该数值）
  - 无千分位、¥ 两位小数用于计算值、本金整数、不显示利率（生产提前还清模板亦不显示）。

## Deviations / blocked values

- 借据2 部分还款后的“省利息”未展示：calc.mjs 仅支持整笔提前还清（earlyRepaymentDate），
  缺少部分还款重算输入，按 pass 规则留空并在此记录。
- 浏览器截图验证跳过（benchmark 指令）。
