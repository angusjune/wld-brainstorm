# NOTES — 收银台重设计（benchmark run, profile-seam）

Benchmark mode: Step 1 questions skipped; every default recorded here. Step 2
(server) and browser screenshot verification skipped per benchmark deviations.

## Step 1 snapshot (defaults chosen, no user interview)

- **Core user action:** 完成还款 — 确认还款金额，选择还款方式（银行卡 / 转账），点击「下一步」。
  (Default A: complete the primary task.)
- **Screens/states:** 单屏（收银台）。静态展示「银行卡还款已选中」这一个状态；
  切换后的状态由方案说明文字描述，不加 JS。(Default A: one screen.)
- **Data on screen:** 还款金额 &#165;10006.00、工商银行 (2004)、其他银行卡入口、
  转账还款（还款不限额，实时到账）。全部沿用生产模板数值，不新增数据。
- **Source production templates:** `profile/screens/收银台.html`（主模板）；
  `profile/screens/更换还款卡.html`（圆形银行标 chip 图样）；
  `profile/screens/本期应还.html`（金额摘要参照）。
- **Product rules loaded:** 无 —— `profile/knowledge/README.md` 的映射表中收银台没有
  COMP_ID，按 filter rule 跳过：**没有捆绑的产品规则覆盖此屏，设计仅依据视觉模板。**
- **Non-goals:** 不新增还款方式；不发明银行卡限额等产品事实；无交互 JS；
  不改动金额、卡号、法定文案。

## Diversity mode

Mixed（默认）：任务既要求信息层级变化（突出金额、两种方式更易理解和切换 = UX），
又允许视觉打磨。产出 2 个 UX 方案 + 1 个视觉方案：

- 方案 A（UX, Comparison-first）：两张对等的可选卡片 + 单选 radio，点卡即切换。
- 方案 B（UX, Task-first / segmented）：金额下方分段切换器，先选方式再看明细。
- 方案 C（Visual, Premium/spacious）：保持生产结构，只调整留白、选中态高亮、图标。

## Direction chosen for Step 5 (user could not pick — default)

**方案 A（Comparison-first）** — 最直接回应「两种方式更容易理解和切换」：
两种方式获得对等的解释文案，整卡可点、radio 表达单选语义，金额保持顶部 44px 焦点。
产出 `cashier.html`（银行卡还款选中态）。

## Template vs. product-law conflict (flagged per PROFILE.md)

生产模板 `收银台.html` 的 `.wld-cashier-bottom` 用 `position: absolute; bottom: 0`
把 CTA 钉在屏幕底部；但 PROFILE.md 产品法则规定收银台的 CTA「centered directly
below the content」，且「CTA pinned to the screen bottom behind an empty region
is a defect」。按「规则赢过模板」的裁决，所有方案把「下一步」居中放在内容正下方。

## Fix Details pass — blocked inputs

屏上唯一金额 &#165;10006.00 来自生产模板，属还款方式选择屏，无本金/年利率/借款日期
等参数可供 `calc.mjs` 验证（按 pass 规则：无贷款数字可算则跳过）。若需精确校验，
需要输入：principal、annualRate、term、loanDate。数值保持模板原值不变。

## Other defaults

- 银行图标路径使用 `/profile/design-system/assets/logo-icbc.svg`（真实文件位置）。
  `更换还款卡.html` 模板里写的 `/assets/icons/...` 与服务器路由不符（icons 在
  profile 目录），本次按实际路由写。
- CTA 文案保留生产用词「下一步」（两种方式的下一步动作都成立）。
- 方案 A 银行卡方式的说明文案用中性的「使用绑定的银行卡还款」，
  不发明限额等产品声明；转账说明沿用生产文案「还款不限额，实时到账」。

## Passes run

1. Simplify Pass（`SKILL.md`）— solutions.html 与 cashier.html
   各跑一遍：去掉方案 A 方式卡头部的装饰性图标（radio+文字已足够），
   未删任何产品事实/选中态/CTA。
2. Fix Details（profile/quality/passes/fix-details.md）— 见上文 blocked inputs；
   屏内一致性（金额、选中态、CTA）与生产口径核对通过。
3. Pre-user QA gate（qa-gate.mjs）— 结果见最终汇报。
