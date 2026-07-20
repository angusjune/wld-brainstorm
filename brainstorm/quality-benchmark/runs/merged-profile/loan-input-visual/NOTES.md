# NOTES — 输入金额视觉方向探索（benchmark run, merged-profile）

Benchmark mode: Step 1 questions skipped; every default recorded here. Step 2
(server) and browser screenshot verification skipped per benchmark deviations.

## Step 1 snapshot (defaults chosen, no user interview)

- **Core user action:** 输入借款金额并确认借款条款，点击「下一步」。流程已定，
  本次只探索视觉方向。(Default A: complete the primary task.)
- **Screens/states:** 单屏（输入金额），展示「已填入金额」这一个状态：金额
  &#165;10000 已填、清除按钮可见、CTA 亮金可用。不展示键盘态/空态。
- **Data on screen:** &#165;10000、快捷金额（借 1 万 / 借 2 万 / 借全部）、
  前30天0利息 省利息&#165;150.00、借款期数 24 个月、还款计划 首次6月16日应还
  &#165;683.00、收款账户 工商银行 (2004)、借款用途 个人日常消费、年利率 (单利)
  10.8%、CTA「下一步」、免责文案「按日计息，次日起可提前还，免违约金」。
  全部沿用生产模板数值（见 Fix Details 一节的标记）。
- **Source production template:** `profile/screens/输入金额.html`（routing 表
  Amount input / form 行的唯一模板，单模板覆盖，无需拼接）。
- **Product rules loaded:** COMP_ID = `COMP_WLD_LOAN_AMOUNT`（PRODUCT.md 映射表）。
  按 filter rule 注入：

  【Product rules — bundled memory】
  - PAT-WLD-001 (confidence: high): 首借/非首借两条独立路径（键盘 CTA、利息气泡差异）
  - PAT-WLD-003 (confidence: high): 借款期数默认选中三分支
  - （PAT-WLD-002 仅 `kb_generation`，涉及期数浮层，静态视觉稿不展示浮层，已读备查）

  【Pitfalls to avoid — bundled memory】
  - PIT-001 (stage: state_machine_confirm): 空态下「下一步」禁用（浅黄），不可点
  - PIT-002 (stage: state_machine_identification): 浮层是独立状态
  - PIT-003 (stage: state_machine_confirm): 首借/非首借键盘 CTA 不能合并

  对静态视觉稿的落地：展示「已填入金额」态 → CTA 用亮金启用态，符合 PIT-001；
  不展示键盘与浮层，PAT-WLD-001/002、PIT-002/003 不影响视觉方向本身，
  但三个方向都未改动任何会与这些状态规则冲突的结构。
- **Non-goals:** 不改流程、不改信息架构层级顺序、不改任何数据/法定文案、
  不加 JS、不展示键盘态与期数浮层。

## Diversity mode

**Visual Exploration**（用户明说「流程已经定了……三个视觉方向」）。
三个方案共享同一 journey，各自命名视觉假设，全部保持 visual-mode invariants：
canonical CTA（全宽金色 pill「下一步」+ 模板原位的底部渐变区 + 免责文案）、
preview chrome（`variant="inner" title="微粒贷"`）、全部利率/协议/免责文案、
全部数据值，均与生产模板一致。

- 方案 A「留白聚焦」(Premium / spacious)：金额区留白 35px→56/40px、促销行并入
  选项卡成单卡（减少竞争模块）、行高 44→52px。
- 方案 B「静谧原生」(Calmer / native)：结构与生产完全一致；输入下划线金色→
  灰色发丝线（--wld-black-300）、省利息降为常规字重、提示文字降为 tertiary。
- 方案 C「柔和暖意」(Softer / warmer)：促销行改浅金底（--wld-theme-100）、
  两张卡加 --wld-shadow-card 轻投影；布局不变。

## Direction chosen for Step 5 (user could not pick — default)

**方案 A（留白聚焦 / Premium-spacious）** — 最直接回应「更高级、更平静」：
大留白让 44px 金额成为唯一主角，促销与选项收进一张卡减少同屏竞争，
行高放宽形成平静节奏，且未触碰任何产品法则与数据。
产出 `amount-input.html`（单机展示，presentation--single）。

## Fix Details pass — flagged values (blocked on missing input)

用 `profile/tools/calc.mjs` 核算（never hand-compute），本金 10000、24 期、
年利率 10.8%、首次账单 6月16日，放款日在屏上缺失，按 pass 规则扫了合理区间
（2026-05-16 ～ 2026-06-15）：

- **首次应还 &#165;683.00**：无券区间为 &#165;461.70–465.85，含 30 天免息券区间为
  &#165;375.85–458.70。&#165;683.00 在整个区间外 → 整段区间内不可能，已标记。
- **省利息 &#165;150.00**：券省息区间为 &#165;86.01–90.00。&#165;150.00 整段区间内
  不可能，已标记。

两个值均为可证伪的模板演示数据错误，但**精确修正值取决于缺失的放款日**
（以及还款计划是否已计入该免息券）。按 PROFILE.md Passes 表的规则
（"If a calculation needs missing loan parameters, leave the value unchanged and
note the exact input needed"）和 visual-mode invariant（数据值随模板不变），
三个方案统一保留模板原值不改。**需要的输入：放款日（YYYY-MM-DD）+
还款计划是否含 30 天免息券**；给定后可一次修正两处（例如放款日 2026-05-16、
含券时应为：省利息 &#165;90.00、首次应还 &#165;375.85）。

屏内其余一致性检查通过：金额未超出快捷额度语义、免息券不改标题年利率
（10.8% 保留，符合 pass 的 coupon 规则）、术语与 CTA 口径与生产一致。

## Other defaults

- 模板选项行的 inline style 提为局部类（`.lo-row/.lo-label/.lo-value/...`），
  值逐一对应模板 inline 值，颜色全部走 token（qa-gate token-color 为 error）。
- `.wld-loan-bottom` 渐变起点 `rgba(245,245,245,0)` 改写为
  `var(--wld-transparent)`，避免 off-token 字面量告警；视觉等价。
- 银行图标沿用模板内联 SVG（#C41230 为工行品牌色，SVG paint 属性不在
  gate 扫描范围，且属品牌 logo 合法例外）。
- 方案 A 促销行并入选项卡后保留图标、文案、省利息橙色强调与 chevron，
  仅位置与容器变化（caption 的 What changes 已点名）。
- 快捷金额 chips 保持 4px 圆角、rgba(0,0,0,0.06) 底（组件规范：不是按钮，
  永不做 pill），三个方案均未触碰。
- 「输入合法金额」提示为模板自带槽位文案，保留（visual mode：未点名即不变）。

## Passes run

1. Simplify Pass（references/embedded-workflows.md）— solutions.html 与
   amount-input.html 各跑一遍：无可删项——屏上每个元素（清除按钮、提示、
   chips、促销行、五个选项行、免责文案）都是生产模板自带的产品事实或
   任务必需件；PIT 规则均为 must-keep 约束，无删改。方案 A 的模块合并
   发生在生成时且已在 caption 点名，非 Simplify 删除。
2. Fix Details（profile/passes/fix-details.md）— 见上文：两处模板演示数据
   被 calc.mjs 判为整段放款日区间内不可能，因缺放款日按规则保留原值并标记。
3. Pre-user QA gate（qa-gate.mjs，core + profile rules.mjs）—
   solutions.html: 0 error / 0 warning；amount-input.html: 0 error / 0 warning。
   人工 eyeball 项：chrome 用 placeholder、无自定义 JS、单金 CTA、内页
   #F5F5F5 未强制白底、无 emoji/急迫文案/千分位。
4. 浏览器截图验证 — 按 benchmark 偏差跳过。
