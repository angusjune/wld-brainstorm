# Benchmark run notes — overdue-flow (merged-profile)

Task: 设计一个逾期还款的提醒和处理流程，大概两三个屏幕。
Benchmark mode: Step 1 questions skipped (defaults below), Step 2 server + all
browser screenshot verification skipped, shared and profile passes applied by hand.
Stopped after Step 5 first screen, per benchmark instructions.

## Step 1 defaults (recorded in place of clarifying questions)

- **Core user action:** 用户发现一笔借款逾期，看清逾期金额与罚息构成，完成还款。
- **Screens (3):** ① 首页逾期提醒（个人中心-有借款 变体）→ ② 逾期详情（状态先行屏）
  → ③ 收银台还款。满足"大概两三个屏幕"。
- **Data shown:** 逾期天数、逾期应还合计（本期应还 + 罚息）、借据信息
  （借款金额 / 放款日 / 期数）、下一期应还、还款方式（银行卡 / 转账）。
- **Diversity mode:** UX Strategy（新流程、产品方向未定——"设计一个…流程"）。
  三个方案取自 profile 的 Repayment / due amount 原型，按信息层级与路径分化：
  - 方案 A 状态先行 Status-first（基于 本期应还）：先看清状态与费用构成再行动
  - 方案 B 最短路径 Task-first（基于 收银台）：提醒与收银台合一屏，最快完成还款
  - 方案 C 修复导向 Risk-reduction（基于 本期应还 + 提前还清 卡片行）：
    以"还清后什么会变好"促成行动，不施压
- **Source templates（无单一模板覆盖逾期场景，按 SKILL Step 3 组合）：**
  `本期应还.html`（金额汇总 + 借据列表 + 无底栏）、`收银台.html`（居中金额 +
  还款方式卡 + 居中 CTA）、`个人中心-有借款.html`（首页提醒入口）、
  `更换还款卡.html`（银行 logo 圆片图案，`/profile/design-system/icons/logo-icbc.svg`）、
  `借款详情.html`（状态点 + 文本样式参照，逾期态换用 danger token）。
- **Chosen direction (no user available):** 方案 A 状态先行 — 最符合品牌
  "Trustworthy, Simple, Calm"：不催逼、先给用户完整的状态与费用事实，同时清晰
  覆盖"提醒"（首页卡片）与"处理"（详情 → 收银台）两半任务。Step 5 构建其
  第 1 屏 `home-overdue.html`（首页逾期提醒）。
- **Non-goals:** 不做催收 / 分期协商 / 客服协商等深度流程；不加倒计时或施压文案
  （产品法禁止 artificial urgency）；逾期状态下是否冻结"借钱"入口 / 下调预估可借
  未获产品确认——首页保留模板原有的借钱圆钮与 预估可借 ¥55000 / 总额度 ¥60000
  （开放问题，留给用户决策）。

## Canonical loan data (Fix Details pass)

Computed with
`node profile/quality/tools/calc.mjs '{"annualRate":0.108,"principal":6000,"term":12,"loanDate":"2025-12-10"}'`
（利率取首页利率条的 10.8%，保持全流程唯一利率口径）：

- 借款 ¥6000，2025/12/10 放款，12 期等额本息，年利率(单利) 10.8%。
- 第 7 期到期日 2026-07-09，本期应还 ¥529.96（本金 ¥502.24 + 利息 ¥27.72）。
- 今日 2026-07-17 → 已逾期 8 天（口径：07/10 为第 1 个逾期日，含今日共 8 天）。
- 下一期（第 8 期）2026-08-09 应还 ¥529.96（首页贷款卡行使用）。
- **罚息 ¥1.81 — 假设值，blocked on input：calc.mjs 无罚息参数。**
  假设口径：逾期本金 × 日利率(calc 输出 0.0003) × 1.5 倍 × 8 天
  = 502.24 × 0.0003 × 1.5 × 8 = 1.81。
  需要的确切输入：产品的罚息倍数与计息基数（本金 or 本息）。屏上文案只写
  "逐日计收 / 还清后停止"，不展示未经确认的罚息利率口径。
- 逾期应还合计 = 529.96 + 1.81 = **¥531.77**（方案 A/B/C 与首页间保持一致）。
- 利率条自校验：1000 × 0.108 / 365 ≈ 0.30 元/天，与模板文案"0.3元"一致。
- 首页 预估可借 ¥55000 / 总额度 ¥60000 沿用模板原值（预估值非算术推导，不校验）。
- 还款卡统一为 工商银行 储蓄卡 (1853)（取自 更换还款卡.html 的当前还款卡）。
- 金额均无千分位分隔符（产品法）。

## Product-knowledge injection (Step 3)

本期应还 / 收银台 / 个人中心-有借款 均未映射 COMP_ID（profile/knowledge/README.md 标注
"not yet in bundled KB"），**无捆绑产品规则覆盖这些屏幕，设计仅依据视觉模板**。
未凭空补造 patterns / pitfalls。方案 C 的"减少信用影响 / 自动还款恢复"两行文案
属设计假设，需产品与合规确认（已写入方案 C 的 Tradeoff caption）。

## Deviations / repairs noted

- 收银台模板的内联 ICBC SVG 含 off-token 色 `#C41230`；改用 更换还款卡.html 的
  银行 logo 圆片图案（`/profile/design-system/icons/logo-icbc.svg`），避免 off-palette 字面量。
  分隔线缩进相应从 56px 调整为 64px（20 边距 + 32 圆片 + 12 间距），
  "其他银行卡"缩进 44px 对齐。
- 收银台模板"已选中"勾选框缺 `margin-left: auto`（模板内其他行均有），
  按多数模式补齐右对齐；未沿用模板 off-token 的
  `.wld-cashier-row .wld-checkbox { border-color: rgba(0,0,0,0.25) }` 覆盖。
- 逾期状态色：借款详情 的"还款中"状态用 emphasis 橙；逾期为错误态，
  改用 danger token（状态点/状态文字 `--wld-text-error`，首页提醒卡
  `--wld-danger-100` 底 + `--wld-danger-700` 文），色值全部走 token。
- 首页保留模板的利率条与页脚（产品法：模板已有的费率/免责文案必须保留）。
- CTA 位置：方案 A/C 内容结束即放居中金色胶囊（内容短，不吸底）；
  方案 B 沿用 收银台 模板的居中吸底 CTA（该屏的 canonical CTA form）。
  每屏仅一个金色主操作。

## Passes run

1. **Simplify Pass**（`SKILL.md`）— 罚息口径并入摘要副行
   一句话（"含罚息 ¥1.81，逐日计收，还清后停止"），借据行承载金额拆分，
   不与摘要重复"已逾期 8 天"；无装饰性元素；保留费率 / 免责 / 主 CTA /
   状态指示与导航。
2. **Fix Details**（profile/quality/passes/fix-details.md）— 全部贷款数字经 calc.mjs
   验证（见上）；罚息标记为 blocked-on-input 假设；跨屏一致性
   （¥531.77 / 8 天 / ¥1.81 / 借款 ¥6000 / 2025/12/10 / 第 7 期 /
   工商银行 (1853)）已核对。
3. **Pre-user QA gate** — `node qa-gate.mjs solutions.html home-overdue.html`：
   两文件均 **0 error(s), 0 warning(s)**，exit 0。
   人工核对：preview-chrome 占位（home / inner）正确、无手写 chrome、
   无自定义 JS、无 emoji、金色 CTA 每屏一个、首页白底 + tab 栏、
   内页默认 #F5F5F5、按钮全部胶囊形。

## Files

- `solutions.html` — Step 4 三方案页（UX Strategy 模式）
- `home-overdue.html` — Step 5 方案 A 第 1 屏：首页逾期提醒
- `NOTES.md` — 本文件
