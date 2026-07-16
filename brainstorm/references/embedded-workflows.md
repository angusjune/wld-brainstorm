# Embedded Brainstorm Workflows

These workflows are embedded branches of `brainstorm`. Load only the pass or branch named by the active step.

All paths are relative to the `brainstorm/` skill directory.

## Simplify Pass

Run after every generated `solutions.html` and after every flow screen.

Completion criterion: the file keeps all required product facts and legal/rate copy, has one clear primary action per screen, and contains no removable copy, decoration, or duplicate element that does not help the user complete the task.

1. Read the generated HTML.
2. Read `profile/product-memory.md` and load matching pitfalls from `profile/pm-memory-cache/common-pitfalls.yaml` when the screen has a COMP_ID. Treat loaded rules as must-keep product constraints.
3. Remove or merge anything that fails these checks:
   - The user does not need it to complete the task.
   - The text says something already obvious from nearby UI.
   - It competes with the one focal action or one focal number.
   - It is decorative rather than functional.
   - It can merge cleanly with an adjacent label, value, or row.
4. Never remove product rules, legal/compliance text, error states, navigation, selected user data, status indicators, tap targets, or the primary CTA.
5. Re-read the result and make sure the HTML still follows the production template's CTA form, background color, chrome, and tab bar rules.

## Profile-contributed passes

Passes beyond Simplify are contributed by the active product profile, not by this file. Read the Passes table in `profile/PROFILE.md` and run each pass it lists, in order, after Simplify. The bundled WLD profile contributes a Fix Details pass (`profile/passes/fix-details.md`), which verifies loan arithmetic; a profile that declares no passes runs Simplify only.

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

Required input: an approved brainstorm screen/flow. If the user only has a text idea or external design source, return to Step 1 and generate/approve a brainstorm design first.

**WeChat DevTools driver (optional):** when the `wechatide` CLI is installed, drive WeChat DevTools directly — open the demo project, compile it, screenshot the running screens, and push a real-device preview — by following `tools/prototype/references/miniprogram-dev-skill/SKILL.md`. That bundled skill-pack runs its own login/environment check (`check_devtools_status`) and routes each job to the right scene (initializer / compiler / automator / previewer). Treat it as a strict enhancement: if `wechatide` is missing, say so and degrade to the bundled scripts and manual steps below — never block the demo on it.

**Mini Program pitfalls:**
- No `100vh` inside `wld-page` — use `height:100%`. `wld-page` already owns the viewport height, nav offset, safe-area padding, and scrolling; `100vh` overflows it and can clip bottom CTAs. (`verify-miniprogram.mjs` warns on this.)
- Don't draw the status bar or 胶囊 capsule (`··· ⊙`) — it is system chrome WeChat renders itself, and a hand-drawn copy sits under the real one. Set the title only through `wld-page`'s `navTitle` / `navSubtitle` / `navBack`. A brainstorm source draws a fake status bar + capsule (`<preview-chrome>`, expanded from the platform pack) — that is presentation chrome: reproduce the title via `wld-page` props and drop the rest.

Workflow:

1. Confirm source, flow order, states, interactions, and copy. Ask only for missing decisions that affect implementation.
2. Read `profile/DESIGN.md`, the closest production templates in `profile/screens/`, and these template anchors from `tools/prototype/assets/miniprogram-template`: `app.json`, `app.js`, `app.wxss`, `project.config.json`, `pages/prototype-home/`, `pages/prototype-loan-input/`, and relevant components.
3. Create a separate demo project named `wld-miniprogram-demo-{slug}` under the current working directory unless the user gives another output path.
4. Copy the bundled Mini Program template into that demo project. Do not edit the bundled template, generated provider folders, product knowledge caches, or `node_modules`.
5. Implement real Mini Program files: `.wxml`, `.wxss`, `.js`, `.json`, `app.json`, `app.wxss`, and `project.config.json`. Use Mini Program components and APIs, not browser HTML/DOM code.
6. Match the approved design: hierarchy, spacing, typography, WLD gold buttons, backgrounds, nav, safe area, bottom actions, sheets, keyboard states, empty/error/loading states, and clickable path with mocked local data.
7. Run `node tools/prototype/verify-miniprogram.mjs <demo-project-dir>` and fix every static error until it passes. Report optional live-check warnings plainly. When the `wechatide` driver is available, prefer it as the live-verify channel — opening the project window through it is itself a real compile and needs no per-project `miniprogram-automator` install.
8. If WeChat DevTools is available and visual fidelity matters, follow `tools/prototype/conform-design.md` for capture, reference rendering, comparison, and correction. When driving DevTools through the `wechatide` driver, the automator scene's screenshot is an equivalent source for the `.conform/impl/` frames.
9. Get the demo onto a phone. If the `wechatide` driver is available, push the preview yourself: confirm login via `check_devtools_status`, then use the previewer scene's `auto_preview` (sends the demo straight to the logged-in developer's WeChat, no QR scan) or `create_preview_qrcode`, and report exactly what you pushed and what the PM must still do. Otherwise finish with Chinese PM-facing phone-preview steps: open WeChat DevTools, import the project folder, choose test AppID if needed, compile, preview, scan with WeChat, and test on the phone.

## Beyblade Battle Branch

Use when Step 6 choice is **D**.

Required input: 2-3 approved brainstorm screens.

Workflow:

1. Use the approved brainstorm screens as battle entrants. Derive screenshots and visual features from those local brainstorm HTML files.
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
