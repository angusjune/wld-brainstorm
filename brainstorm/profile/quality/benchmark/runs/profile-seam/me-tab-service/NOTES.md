# NOTES — benchmark run: me-tab-service

Task: 在"我的"页面加一个在线客服入口，顺便把整体布局优化一下

## Benchmark deviations applied

- Step 1 interview skipped (benchmark mode) — every default recorded below.
- Step 2 (server start) and all browser screenshot verification skipped.
- Output written to `profile/quality/benchmark/runs/profile-seam/me-tab-service/` instead of `screenDir`.
- Stopped after Step 5 (one full screen of the chosen direction); no feedback loop.

## Step 1 defaults (would have been asked one-by-one)

1. **Core user action:** 从「我的」页快速找到并进入在线客服（默认 A：完成主任务）。
2. **How many screens:** 1 屏 — 「我的」Tab 默认态。不做消息未读态 / 会话页（属客服系统本身）。
3. **Data shown:** 与模板一致（道明、已实名、补充信息、借还记录/优惠券/更换还款卡/微卡/开具证明/帮助中心、专属福利行）。新增入口文案为「在线客服」。方案 B 的副文案「人工服务 9:00-21:00」为占位 —— **真实客服时段是缺失输入**，落地前需确认（Fix Details pass 按规则不猜测，已标注）。
4. **Source production template:** `profile/screens/我的Tab.html`（路由表 Account / profile (我的) tab 行）。
5. **Product rules loaded:** `profile/knowledge/README.md` 的映射表中「我的Tab」无 COMP_ID —— 无捆绑产品规则覆盖此屏，设计仅依据视觉模板（按 profile 规则跳过注入）。
6. **Diversity mode:** Mixed（默认）— 方案 A、B 为 UX 变体（入口层级与分组不同），方案 C 为视觉变体。
7. **Chosen direction (user unavailable):** 方案 A「高频入口置顶」— 推荐默认：同时满足「客服入口一屏可见」与「整体布局优化」（高频功能一行直达 + 低频账户功能改为列表行）。
8. **Non-goals / constraints:** 不加悬浮客服气泡、不加未读角标、不改 Tab 栏与预览 chrome、无促销/催促文案、静态页面无 JS。

## Passes run

- **Simplify Pass**（references/embedded-workflows.md）：solutions.html 与 me.html 各跑一遍。删除了方案 A 账户管理行的冗余副文案（“更换微众银行还款卡”等与标签重复）；保留全部产品事实（已实名、补充信息提示、专属福利券文案）、导航与点击目标；确认 CTA 形态、背景色（#F5F5F5 inner/tab 规则）、chrome 与 Tab 栏遵循模板。
- **Fix Details Pass**（profile/quality/passes/fix-details.md）：本屏无借款金额/利率数字，计算校验按规则跳过；文案口径与模板一致（「借还记录」「更换还款卡」「开具证明」等生产术语）；方案 B 的「人工服务 9:00-21:00」标记为 blocked on 真实客服时段。
- **QA gate:** `node qa-gate.mjs` on both files — final result 0 error(s), 0 warning(s)（见任务总结）。

## Files

- `solutions.html` — 3 方案对比页（Mixed 模式）
- `me.html` — 方案 A 完整单屏（Step 5 第一屏）
