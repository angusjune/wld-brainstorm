# Merged Brainstorm Workflows

These workflows are embedded branches of `brainstorm`. Load only the pass or branch named by the active step.

All paths are relative to the `brainstorm/` skill directory.

## Simplify Pass

Run after every generated `solutions.html` and after every flow screen.

Completion criterion: the file keeps all required product facts and legal/rate copy, has one clear primary action per screen, and contains no removable copy, decoration, or duplicate element that does not help the user complete the task.

1. Read the generated HTML.
2. Read `assets/product-memory.md` and load matching pitfalls from `assets/pm-memory-cache/common-pitfalls.yaml` when the screen has a COMP_ID. Treat loaded rules as must-keep product constraints.
3. Remove or merge anything that fails these checks:
   - The user does not need it to complete the task.
   - The text says something already obvious from nearby UI.
   - It competes with the one focal action or one focal number.
   - It is decorative rather than functional.
   - It can merge cleanly with an adjacent label, value, or row.
4. Never remove product rules, legal/compliance text, error states, navigation, selected user data, status indicators, tap targets, or the primary CTA.
5. Re-read the result and make sure the HTML still follows the production template's CTA form, background color, chrome, and tab bar rules.

## Fix Details Pass

Invoke after the Simplify Pass in Step 4 and Step 5.

Completion criterion: every visible amount, rate, term, selection state, CTA label, and regulated copy in the current generated file is either consistent, corrected in the HTML, or explicitly listed as blocked on a missing input.

1. Extract every displayed fact from the generated HTML:
   - Amounts: 可借额度, 输入金额, 省利息, 首次还, 每月还, 总利息, 还款总额.
   - Rates: 年利率（单利）, 优惠年利率, daily-rate copy such as `1千元用1天只需 X 元`.
   - Terms: 期数, 还款方式, 收款账户, 用途.
   - Copy: CTA labels, coupon chips, headings, dialog buttons, agreement and footnote text.
   - Selection state: selected coupon, selected term, selected card, selected repayment method.
2. Run four checks:
   - **Calculation correctness:** use `node tools/fix-details/calc.mjs '<params-json>'` for loan math. Never hand-compute interest or repayment amounts. Treat differences over ¥1 as real mismatches.
   - **Intra-screen consistency:** values on the same screen must agree, such as amount not exceeding quota and selected coupon matching the shown rate path.
   - **Inter-screen consistency:** shared values across the flow, dialogs, sheets, and backdrops must stay equal.
   - **UX copy:** units, decimal places, rate口径, terminology, CTA action, and regulated language must be consistent with production templates.
3. Coupon rules:
   - `INTEREST_REDUCTION` / `前N天0利息` does not change the headline annual rate; it only reduces interest for N days.
   - `DESIGNATED_RATE` / `优惠年利率 X%` and `DISCOUNT` / `利率打X折` change the rate path and all derived repayment values.
4. If required inputs such as 借款日期 are missing, do not guess. Either ask the user or mark the exact value as blocked. When needed, sweep a plausible date band with `calc.mjs` and flag only values impossible across the whole band.
5. Correct provable mistakes directly in the HTML. Keep a short note of what changed so Step 4/5 can tell the user before opening the preview.

## Push to Figma Branch

Use when Step 6 choice is **B**.

Required inputs: the approved brainstorm HTML or session directory, and a target Figma page link. If either is missing, ask for it and stop this branch until provided.

Before using Figma, read `references/figma-mcp.md`. If no writable Figma MCP tool is available, stop and explain that this branch requires writable Figma access.

Workflow:

1. Read the approved brainstorm HTML files, sibling flow screens, `tokens.css`, `components.css`, and the closest production templates.
2. Parse the target Figma URL and verify the target page/node is writable.
3. Search the WLD component library and the target file for existing components before drawing. Prioritize `Button 按钮`, `Actions 操作区`, `借钱按钮`, `Input 输入框`, `借款金额输入`, `借款选项`, `Keyboard 键盘`, `Cell 列表项`, `Receipt 借据`, `优惠券`, `Dialog 弹框`, `Drawer 抽屉`, `Header 标题`, `Tabs`, `Tab Bar - 首页 Tab`, `首页主内容`, `首页详情`, and `利率条`.
4. Keep a mapping table: brainstorm element -> searched/preferred Figma component -> component instance used or primitive fallback -> fallback reason.
5. Create one editable 375 x 812 frame per brainstorm screen/state. Preserve Chinese copy, amounts, rates, agreement text, hierarchy, and screen names.
6. Use component instances first; use primitives only for missing components. Avoid flattening screens into screenshots.
7. Screenshot the created Figma frames when the tool supports it, compare to the brainstorm source, fix obvious mismatches, then report the Figma link, created frames, fallback rows, MCP mode, and font limitation if any.

## Prototype Branch

Use when Step 6 choice is **C**.

Required input: an approved brainstorm screen/flow or a Figma source. If the user only has a text idea, return to Step 1 and generate/approve a brainstorm design first.

Workflow:

1. Confirm source, flow order, states, interactions, and copy. Ask only for missing decisions that affect implementation.
2. Read `assets/DESIGN.md`, the closest production templates in `assets/screens/`, and these template anchors from `tools/prototype/assets/miniprogram-template`: `app.json`, `app.js`, `app.wxss`, `project.config.json`, `pages/prototype-home/`, `pages/prototype-loan-input/`, and relevant components.
3. Create a separate demo project named `wld-miniprogram-demo-{slug}` under the current working directory unless the user gives another output path.
4. Copy the bundled Mini Program template into that demo project. Do not edit the bundled template, generated provider folders, product knowledge caches, or `node_modules`.
5. Implement real Mini Program files: `.wxml`, `.wxss`, `.js`, `.json`, `app.json`, `app.wxss`, and `project.config.json`. Use Mini Program components and APIs, not browser HTML/DOM code.
6. Match the approved design: hierarchy, spacing, typography, WLD gold buttons, backgrounds, nav, safe area, bottom actions, sheets, keyboard states, empty/error/loading states, and clickable path with mocked local data.
7. Run `node tools/prototype/verify-miniprogram.mjs <demo-project-dir>` and fix every static error until it passes. Report optional live-check warnings plainly.
8. If WeChat DevTools is available and visual fidelity matters, follow `tools/prototype/conform-design.md` for capture, reference rendering, comparison, and correction.
9. Finish with Chinese PM-facing phone-preview steps: open WeChat DevTools, import the project folder, choose test AppID if needed, compile, preview, scan with WeChat, and test on the phone.

## Beyblade Battle Branch

Use when Step 6 choice is **D**.

Required input: 2-7 screens. Accept approved brainstorm screens, a Figma selection, frame links, or user-attached screenshots. If there are more than 7, ask the user to pick 7.

Workflow:

1. For Figma frames, read `references/figma-mcp.md`, then capture each frame's screenshot and structural features: descendant node count, text node count, max nesting depth, and distinct fill count. If Figma MCP is unavailable, use attached images and omit structure.
2. Start the arena:

   ```bash
   node "tools/beyblade/server.cjs" \
     --project-dir /path/to/project \
     --port 4321
   ```

3. Save the JSON response values: `battleDir`, `screensDir`, `configPath`, and `url`.
4. Save each screen PNG into `screensDir`.
5. Write `battle-config.json` to `configPath` with 2-7 entries:

   ```json
   {
     "screens": [
       { "name": "个人中心", "image": "screens/screen-1.png", "structure": { "nodes": 142, "textNodes": 23, "depth": 8, "fills": 11 } }
     ]
   }
   ```

6. Verify the exact URLs the browser will fetch:

   ```bash
   curl -fsS "<url>/battle-config.json" >/dev/null
   curl -fsS -o /dev/null -w "%{http_code}  /screens/screen-1.png\n" "<url>/screens/screen-1.png"
   ```

7. Every image must return `200`. Fix paths before handoff. Then tell the user to open `url`; the arena starts automatically and supports restart.

Battle stats are derived from structure plus pixels: 重量, 攻击, 防御, 稳定, 耐久, and spin. The output is throwaway under `.wld-beyblade/` and never writes back to Figma.
