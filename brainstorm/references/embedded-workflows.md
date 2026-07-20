# Embedded Brainstorm Workflows

These workflows are embedded branches of `brainstorm`. Load only the pass or branch named by the active step.

All paths are relative to the `brainstorm/` skill directory.

## Simplify Pass

Run after every generated `solutions.html` and after every flow screen.

Completion criterion: the file keeps all required product facts and legal/rate copy, has one clear primary action per screen, and contains no removable copy, decoration, or duplicate element that does not help the user complete the task.

1. Read the generated HTML.
2. Read `profile/PRODUCT.md` and load matching pitfalls from `profile/pm-memory-cache/common-pitfalls.yaml` when the screen has a COMP_ID. Treat loaded rules as must-keep product constraints.
3. Remove or merge anything that fails these checks:
   - The user does not need it to complete the task.
   - The text says something already obvious from nearby UI.
   - It competes with the one focal action or one focal number.
   - It is decorative rather than functional.
   - It can merge cleanly with an adjacent label, value, or row.
4. Never remove product rules, legal/compliance text, error states, navigation, selected user data, status indicators, tap targets, or the primary CTA.
5. Re-read the result and make sure the HTML still follows the production template's CTA form, background color, chrome, and tab bar rules.

## Profile-contributed passes

Passes beyond Simplify are contributed by the active product profile, not by this file. Read the Passes table in `profile/PROFILE.md` and run each pass it lists, in order, after Simplify. The bundled profile contributes a Fix Details pass (`profile/passes/fix-details.md`), which verifies loan arithmetic; a profile that declares no passes runs Simplify only.

## Push to Figma Branch

Use when Step 6 choice is **B**.

Required inputs: the approved brainstorm HTML or session directory, and a target Figma page link. If either is missing, ask for it and stop this branch until provided.

If no writable Figma MCP tool is available, stop and explain that this branch requires writable Figma access.

Workflow:

1. Read the approved brainstorm HTML files, sibling flow screens, `profile/tokens.css`, `profile/components.css`, and the closest production templates.
2. Parse the target Figma URL and verify the target page/node is writable.
3. Search the product's component library and the target file for existing components before drawing. The profile's Figma section lists which components to prioritize; when it names none, search by the class names used in the approved HTML.
4. Keep a mapping table: brainstorm element -> searched/preferred Figma component -> component instance used or primitive fallback -> fallback reason.
5. Create one editable frame per brainstorm screen/state, at the page width the profile's tokens declare. Preserve copy, amounts, agreement text, hierarchy, and screen names exactly.
6. Use component instances first; use primitives only for missing components. Avoid flattening screens into screenshots.
7. Screenshot the created Figma frames when the tool supports it, compare to the brainstorm source, fix obvious mismatches, then report the Figma link, created frames, fallback rows, MCP mode, and font limitation if any.

## Prototype Branch

Contributed by the active platform pack, not by this file — building a Mini Program only makes sense on WeChat. When the profile targets `wechat`, follow `platforms/wechat/branches/prototype.md`. A platform pack that contributes no branches simply does not offer this choice.

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

Battle stats are derived from structure plus pixels: 重量, 攻击, 防御, 稳定, 耐久, and spin. The output is throwaway under `.beyblade/` and never writes back to Figma.
