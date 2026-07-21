# Benchmark run notes — 提前还清 · 部分还款 (merged-profile)

Task: 提前还清页面想支持部分还款，用户可以只还一部分金额，先出三个方案。
Benchmark mode: Step 1 interview skipped — every default recorded here. Step 2 (server) and all
browser screenshot verification skipped per benchmark instructions.

## Step 1 defaults (would have been clarifying questions)

1. **Core user action** — A) 在提前还清页完成一次「只还一部分金额」的还款（默认）。
2. **Screens** — A) 单屏（默认）：solutions.html 三方案 + 所选方向的第一屏（benchmark 在 Step 5
   第一屏后停止）。
3. **Diversity mode** — UX Strategy：新能力、产品方向未定（"想支持…先出三个方案" 属 "how should
   this work"）。三方案按用户旅程/决策模型区分，不做表面换肤。
4. **Data shown** — 借据列表（借款本金、放款日、应还/剩余应还）、本次还款金额、总计、还款后变化。
5. **Loan dataset (assumed)** — 年利率(单利) 10.8%（取自生产模板 输入金额.html 协议相关行），
   等额本息 12 期，还款日为今日 2026-07-17：
   - 借据1：借款 ¥2000，放款日 2026/04/22 → 提前还清应还 ¥1693.75，省利息 ¥73.13（calc.mjs 验证）
   - 借据2：借款 ¥6000，放款日 2026/05/10 → 提前还清应还 ¥5054.04，省利息 ¥247.25（calc.mjs 验证）
   - 借据3：借款 ¥3000，放款日 2026/07/17（今日借出，明日起可还，不可选）
   - 可还上限（今日可还借据合计）= 1693.75 + 5054.04 = ¥6747.79
6. **Partial-repay product params (assumed)** — 三个方案统一用户意图「今天还 ¥3000」便于对比；
   方案 A/C 的自动分配规则为「优先冲抵较早借据」；部分还款直接冲减该借据应还
   （剩余应还 = 原应还 − 本次还款额）。方案 B 演示手动指定：只勾借据2 还 ¥3000。
7. **Nav titles** — 方案 A/B 沿用生产标题「提前还清借款」（同一页面新增能力，不造新页名）；
   方案 C 为确认步，沿用 收银台.html 的空标题 chrome（title=""）。
8. **CTA forms（按源模板追溯）** — 方案 B 保留 提前还清.html 的 canonical CTA（卡底操作栏
   全选/总计/还款）；方案 A 金额输入区取自 输入金额.html，故 CTA 沿用该模板的底部全宽金色胶囊
   + disclaimer 形态；方案 C 布局取自 收银台.html，CTA 沿用其内容后居中胶囊形态。

## Product knowledge

- `提前还清.html` 在 PRODUCT.md 中映射为 "not yet in bundled KB" —— 无 bundled product rules
  覆盖此屏，设计仅依赖视觉模板与 PROFILE.md 产品法则（按 bridge 文件要求一行说明，未虚构规则）。

## Source templates

- `提前还清.html` — 基底：借据列表、勾选、禁用态（明日起可还 + info 图标）、卡底操作栏、屏内局部样式
- `输入金额.html` — 方案 A 金额输入区、快捷金额 chips（4px 圆角，非胶囊）、底部 CTA + disclaimer
- `收银台.html` — 方案 C 居中金额摘要 + 内容后居中 CTA
- `本期应还.html` — 方案 C 借据明细行（左标题+日期 / 右主值+副值，0.5px 缩进分隔线）

## Chosen direction (Step 5, no user available)

**方案 B 按借据调整（Receipt-first）** → `repay-partial.html`。
理由：与生产 提前还清.html 的勾选借据交互模型最一致、模板可追溯性最强；保留该屏 canonical CTA
（卡底操作栏）；「改金额」是对现有模型的最小增量，同时覆盖整笔与部分两种还法。

## Passes run

- **Simplify Pass**（references/embedded-workflows.md）：
  - 可编辑借据行用「改金额」文字链接替代 info 图标，避免右侧图标堆叠（禁用/未勾选行保留 info 图标）
  - 方案 A disclaimer 精简为「按日计息，免违约金」（"次日起可提前还" 与还款屏无关）
  - 分配卡只保留一行分配规则副标题「优先冲抵较早借据」，不加解释性文案
  - 方案 C 不加「修改金额」链接（返回导航即修改路径），不加无法验证的
    "每期应还相应减少" 类说明
  - 保留全部禁用态解释、还款术语（全选/总计/还款）与免违约金文案；每屏恰好一个金色 CTA
- **Fix Details Pass**（profile/passes/fix-details.md）：所有借据数字经 `profile/tools/calc.mjs`
  计算（10.8% 单利、等额本息、earlyRepaymentDate 2026-07-17），未手算利息：
  - 借据1 应还 1693.75 / 省利息 73.13；借据2 应还 5054.04（calc.mjs 输出）
  - 可还上限 1693.75 + 5054.04 = 6747.79（方案 A hint）
  - 方案 A/C：3000 = 还清借据1 1693.75 + 借据2 部分还 1306.25；借据2 剩余应还
    5054.04 − 1306.25 = 3747.79
  - 方案 B：借据2 还 3000.00，剩余应还 5054.04 − 3000 = 2054.04；总计 ¥3000.00
  - 跨屏一致性：三方案与 repay-partial.html 共用同一借据数据集与「还 ¥3000」意图
  - 无千分位；本金整数、计算值两位小数；不展示利率（生产提前还清模板亦不展示）

## Deviations / blocked values

- 借据2 部分还款后的「省利息」未展示：calc.mjs 仅支持整笔提前还清（earlyRepaymentDate），
  缺少「部分还款重算」输入，按 Fix Details 规则留空并在此记录（省利息仅标注给整笔结清的借据1）。
- Step 2 服务器与浏览器截图验证跳过（benchmark 指令）；肉眼检查项（chrome 占位符、无溢出、
  产品法则、无自定义 JS）已按清单人工核对。

## QA gate result

```
repay-partial.html: 0 error(s), 0 warning(s)
solutions.html:     0 error(s), 0 warning(s)
qa-gate: 0 error(s), 0 warning(s) across 2 file(s)  (exit 0)
```
