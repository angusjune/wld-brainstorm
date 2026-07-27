# NOTES — 收银台重设计（benchmark run, merged-profile）

Benchmark mode: Step 1 clarifying questions skipped, defaults recorded below. Step 2
(server) and all browser screenshot verification skipped per benchmark deviations.
Passes applied inline per `references/passes/simplify.md` and the profile's Passes table.

## Step 1 snapshot (defaults chosen, no user interview)

- **Core user action:** 完成还款 — 确认还款金额，选择还款方式（银行卡 / 转账），点「下一步」。
  (Default A: complete the primary task.)
- **Screens/states:** 单屏（收银台），静态展示「银行卡还款已选中」一个状态；切换后状态
  不加 JS，由方案说明描述。(Default A: one screen — so Step 5 needs no flow overview file.)
- **Data on screen:** 还款金额 &#165;10006.00、工商银行 (2004)、其他银行卡入口、
  转账还款（还款不限额，实时到账）。全部沿用生产模板数值，不新增产品事实。
- **Source production templates:** `profile/screens/收银台.html`（主模板）；
  `profile/screens/本期应还.html`（白底金额摘要图样）；
  `profile/screens/更换还款卡.html`（圆形银行 logo chip、金色 ✓ 选中图样、「储蓄卡」术语）。
- **Product rules loaded:** 无 — `profile/knowledge/README.md` 的 Screen ↔ COMP_ID 映射表没有收银台
  条目（`profile/knowledge/memory-cache` 中也无 cashier/收银 相关 pattern/pitfall），按 filter rule 跳过。
  **没有捆绑的产品规则覆盖此屏，设计仅依据视觉模板。**
- **Non-goals:** 不新增还款方式；不发明限额、手续费等产品事实；无交互 JS；
  不改金额、卡号、必要文案（还款不限额，实时到账）。

## Diversity mode

**Mixed（默认）** — 需求同时要求信息层级（突出金额）与决策模型（两种方式更易理解、切换），
意图介于 UX 与视觉之间。按规则产出 2 个 UX 方案 + 1 个视觉方案：

- **方案 A（UX · Comparison-first）对等方式卡：** 两张同构方式卡（标题 + radio ／ 分隔线 ／
  一行细节），radio 表达单选语义，整卡可点即切换；银行卡方式的细节行就是当前扣款卡
  （chip + 卡名 + chevron 换卡）。
- **方案 B（UX · Task-first 单列表）：** 一张列表卡两行方式（更换还款卡的金 ✓ 选中图样），
  每行自述（银行卡行 sub = 当前卡；转账行 sub = 不限额/实时到账），切换 = 点另一行；
  其他银行卡作为选中方式下的缩进次级行。
- **方案 C（视觉 · 金额优先白底层级）：** 结构、勾选控件、文案、数据全部保持生产模板，
  仅命名三处变化：金额移入白底 hero 面板、银行图标换生产 logo chip、行距放松（12→14/16px）。

## Direction chosen for Step 5 (no user available — recommended default)

**方案 A（对等方式卡）** — 最直接同时回应两个诉求：金额独占白底 hero 是唯一焦点数字；
两种方式获得完全同构的卡片解剖（名称 + 单选 radio + 一行细节），
「理解」靠对等结构与就地细节，「切换」靠整卡单击 + radio 语义。
产出 `cashier.html`（银行卡还款选中态，单屏，`presentation--single`）。

## Template vs. product-law conflict (flagged per PROFILE.md / profile/knowledge/README.md)

生产模板 `收银台.html` 的 `.wld-cashier-bottom` 用 `position: absolute; bottom: 0` 将 CTA
钉在屏底；但 PROFILE.md Canonical CTA forms 规定收银台 CTA「centered directly below the
content」，且产品法则明说「CTA pinned to the screen bottom behind an empty region is a
defect」。按「规则赢过模板」的裁决，三个方案与 `cashier.html` 均把「下一步」居中置于
内容正下方（`.cx-cta`，非 absolute）。

## Simplify Pass（references/passes/simplify.md）

对 `solutions.html` 与 `cashier.html` 各运行一遍：

- 方案 A 起草时曾有「使用已绑定的银行卡还款」方式说明行 — 与下方当前卡行信息重复
  （"says something already obvious from nearby UI"），删除；方式卡最终只剩
  名称 + radio + 一行细节。
- 方案 A 将生产模板的「其他银行卡」独立行合并进当前卡行（chip + 卡名 + chevron，点行换卡）
  — "can merge cleanly with an adjacent row"；换卡功能保留在 tap target 上，未丢失入口。
- 方案 B / C 无可删项；C 按视觉模式不变式保持生产结构与文案。
- 保留项核对：还款金额、卡号 (2004)、还款不限额实时到账、选中态、单个金色 CTA、
  inner chrome、#F5F5F5 背景 — 全部保留。

## Fix Details pass（profile/quality/passes/fix-details.md）

- **Calculation correctness:** 屏上唯一金额 &#165;10006.00 来自生产模板；收银台为还款方式
  选择屏，无本金/年利率/期数/借款日期可供 `calc.mjs` 验证 — 按 pass 规则跳过计算检查。
  **Blocked inputs（如需精确校验）：** principal、annualRate、term、loanDate。金额保持模板原值。
- **Intra-screen consistency:** 每屏恰好一个选中态（A: radio 金圈金点仅银行卡；B: 金 ✓ 仅
  银行卡行；C: 勾选框仅工商银行行）；一个金色 CTA；金额唯一。通过。
- **Inter-screen consistency:** `solutions.html` 三方案与 `cashier.html` 金额、卡号、
  转账文案完全一致。通过。
- **UX copy:** 「下一步」「还款金额」「其他银行卡」「还款不限额，实时到账」均为生产用词；
  A/B 的「工商银行 储蓄卡 (2004)」借用 `更换还款卡.html` 的生产术语「储蓄卡」+ 收银台的
  卡号 (2004)，未发明新口径；两位小数、无千分位。通过。

## Other defaults

- 银行 logo 用 `/profile/design-system/icons/logo-icbc.svg`（真实文件路径），替换收银台模板手绘
  矩形图标（其 `#C41230` 为 off-palette，替换后无 nontoken-color 警告）。
- 收银台模板第一行选中勾选框未右贴边（无 `margin-left:auto`），与转账行及
  `更换还款卡.html` 的多数图样不一致 — 按 PROFILE「prefer the majority pattern」，
  方案 C 将勾选框统一右贴边。
- 勾选框对勾 stroke 用 PROFILE 规范的 `rgba(0,0,0,0.9)`（模板写 0.85，规范赢）。
- preview chrome 沿用生产模板 `variant="inner" title=""`（收银台无导航标题）。
- CTA 文案保留「下一步」— 两种方式的下一步动作都成立。

## Passes / gate 执行顺序与结果

1. Simplify Pass — 见上，2 处修改（删除冗余说明行、合并其他银行卡行，均在方案 A）。
2. Fix Details — 见上，无 HTML 更正；calc 检查按规则跳过并记录 blocked inputs。
3. Pre-user QA gate：

   ```
   node qa-gate.mjs .../solutions.html .../cashier.html
   solutions.html: 0 error(s), 0 warning(s)
   cashier.html:   0 error(s), 0 warning(s)
   ```

4. 人工核对（gate 无法自动化的项）：chrome 为占位符非手写；单屏内容约 615px < 812px
   无溢出；产品法则逐条核对（单金 CTA、胶囊按钮、无 urgency、无千分位、44px weight 500、
   透明度层级、0.5px 分隔线、无 emoji、inner 页默认灰底）；无自定义 JS。
5. 浏览器截图验证 — 按 benchmark 偏差跳过。

## Files written

- `solutions.html` — 3 方案对比页（Mixed：A/B UX + C 视觉）
- `cashier.html` — 方案 A 首屏（银行卡还款选中态）
- `NOTES.md` — 本文件
