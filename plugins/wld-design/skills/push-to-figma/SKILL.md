---
name: push-to-figma
description: 用于把 wld-design:brainstorm 生成或确认的微粒贷界面推送到用户提供的 Figma 页面。Use when drawing approved WLD brainstorm screens into Figma, especially with the local Figma desktop MCP and WLD component library.
---

# WLD Push to Figma

Convert an approved `wld-design:brainstorm` design into editable Figma frames on a user-provided Figma page. Build with existing WLD Figma components whenever possible, and use primitives only for gaps.

## Required Inputs

Collect both before drawing:

1. **Brainstorm source** — approved HTML screen file, `.wld-brainstorm` session directory, or clear reference to the chosen brainstorm option.
2. **Target Figma page link** — a Figma Design URL pointing at the file/page/node where the frames should be created.

If either is missing, stop and ask for it. If the user only has an idea and no approved brainstorm output, offer to run `wld-design:brainstorm` first.

## Figma MCP Priority

Before using Figma, read `<plugin-root>/plugins/wld-design/assets/figma-mcp.md` for provider-neutral setup, URL parsing, and fallback rules.

If Figma tools are not visible, use tool discovery for `figma`. If no Figma write tool is available, stop and explain that this workflow needs a writable Figma MCP; do not produce a screenshot-only substitute unless the user asks for one.

## Component Library

Use this WLD component library whenever possible:

`https://www.figma.com/design/rLd17aVUwgOe9GQOJG9npo/%F0%9F%A7%A9-WLD-Components?node-id=1084-33`

When the MCP provides design-system or component search tools, `search_design_system` against this file (scoped to the `🧩 WLD Components` library) **and** the target file before drawing. The library is the source of truth and evolves over time, so always confirm against the live file; the inventory below is the snapshot at time of writing to show what exists and what to prioritize.

This file also subscribes to companion libraries you can pull from for things the WLD set does not cover: `模板组件` (page templates / scaffolding), `00 Utility Components`, and `01 Global Icons`.

### How to read the inventory

- **The names below are the exact search terms.** Most are Chinese or bilingual; `search_design_system` matches on these names, so query with them verbatim.
- Most entries are **component sets** with variants — insert one instance, then set its variant/properties instead of rebuilding each state by hand.
- The inventory lists component *names*, not their variants or internal composition. Before placing a set, call `get_design_context` on it (or inspect it in Figma) to see the available variants/properties and choose the right one (e.g. which `Button 按钮` variant is the gold primary, whether a button lives inside `Actions 操作区`).
- Names prefixed with `弃用-` are **deprecated** (弃用 = abandoned). Never use these; pick the un-prefixed equivalent (e.g. `Cell 列表项`, not `弃用-Cell`).
- Names prefixed with `.` (e.g. `.bubble`, `.keys`, `.Quota`) are **private sub-parts** hidden from the assets panel — internals of larger components, not standalone pieces. Insert the parent component instead.

### Components to prioritize

- **Buttons & actions:** `Button 按钮`, `Actions 操作区` (bottom action area + agreement row), `借钱按钮` (borrow-money button), `按钮下内容` (below-button content)
- **Inputs & forms:** `Input 输入框`, `Checkbox 勾选框`, `Radio 单选框`, `Select 选择项`, `Block Selection`, `借款金额输入` (loan amount input), `借款选项` (loan options), `Keyboard 键盘`
- **Cells, lists & data:** `Cell 列表项`, `Data List`
- **Cards, receipts & coupons:** `Receipt 借据` (loan receipt), `优惠券` (coupon), `借款优惠` (loan discount)
- **Overlays:** `Dialog 弹框`, `Modal 弹窗`, `Drawer 抽屉`, `Toast`, `Bubble 气泡`, `TextIcon Sheet 抽屉结果页` (drawer result sheet)
- **Page chrome:** `Header 标题`, `Footer 页脚`, `Tabs`, `Tab Bar - 首页 Tab`, `Notification 通知栏`
- **Status, tags & indicators:** `Status 状态图标`, `Tag 标签`, `Countdown 倒计时`, `Milestone`, `Contained Icon 带底 icon`, `Text Icon`
- **Banners & home / quota modules:** `Banner 运营位`, `我的_banner`, `首页主内容` (home main content), `首页详情` (home detail), `利率条` (interest-rate bar), `应还利息模块` (interest-due module)
- **Icons** (search by glyph name):
  - UI Icons — `arrow`, `expand`, `collapse`, `close`, `Phone`, `info`, `tick`, `spinner`, `refresh`, `warn` / `warn-solid`, `question`, `backspace`, `HideKeyb`, `forward`, `error` / `error-solid`, `add`, `minus`, `notice` / `notice-solid`, `wait`, `gift`, `clear`, `card`
  - Duo-tone — `network-fail`, `add-circle`, `image`, `notice-colored`, `ring`
  - Colored — `Red Packet`, `WLD`, `coupon`

Only create raw Figma rectangles/text layers when no matching component exists. When using primitives, match WLD tokens from the brainstorm source and keep layer names explicit so designers can replace them later.

## Workflow

1. **Load the brainstorm source**
   - Read the approved brainstorm HTML and any sibling screens in the chosen flow.
   - Read `plugins/wld-design/assets/tokens.css`, `plugins/wld-design/assets/components.css`, and the closest `plugins/wld-design/assets/screens/` production template.
   - Capture the intended screen order, state names, visible copy, key amounts, component types, and local CSS that affects layout.

2. **Open the target Figma page**
   - Parse the user-provided Figma URL with the shared MCP guide.
   - Confirm the target node/page is writable before creating anything.
   - Inspect existing local components, variables, text styles, and any already-imported WLD library components.

3. **Map HTML to Figma components**
   - Keep a brief component mapping table: brainstorm element → searched/preferred Figma component → component instance used or fallback primitive → fallback reason.
   - Preserve Chinese copy exactly unless the user explicitly changed it.
   - Preserve WLD product values and financial/legal text; do not rewrite money, interest, coupon, or repayment copy.

4. **Draw the frames**
   - Create one Figma frame per brainstorm screen/state, named with the screen/state in Chinese when available.
   - Use mobile frame dimensions matching the brainstorm/prod template, normally 375 x 812 unless the source clearly differs.
   - Use PingFang SC when available. If the MCP cannot apply it, use the closest available CJK system font and report the limitation.
   - Use WLD component instances first, then primitives for missing components.
   - Keep auto-layout and constraints practical for designer editing; avoid flattening everything into images.

5. **Verify visually**
   - Get screenshots of the created Figma frames when the MCP supports it.
   - Compare against the brainstorm HTML/screenshots for hierarchy, spacing, typography weight, button states, bottom safe area, and WeChat chrome.
   - Fix obvious mismatches before handing off.

6. **Report**
   - Give the user the Figma file/page link and list the frames created.
   - For every primitive fallback, include the mapping table row: brainstorm element, searched/preferred component, primitive layer group name, and fallback reason.
   - State whether local desktop MCP or remote MCP was used, and whether PingFang SC was applied.

## Quality Rules

- Do not draw into Figma without a user-provided Figma page link.
- Do not use a bitmap screenshot as the main deliverable; the goal is editable Figma design.
- Do not invent states not present in the approved brainstorm source.
- Do not modify bundled product knowledge caches or generated provider folders.
- If the target Figma file already contains related frames, place the new frames in a clearly separated section and avoid overwriting designer work unless the user asks.
