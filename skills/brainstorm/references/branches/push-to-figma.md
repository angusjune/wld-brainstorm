# Push to Figma

Use when the user selects this branch at Step 5.

Use the `profileDir` selected at Brainstorm Step 2. All other relative paths are under the Brainstorm skill directory.

Required inputs: the approved brainstorm session directory containing `solutions.html` and its selected-direction handoff, plus a target Figma page link. If either is missing, ask for it and stop this branch until provided.

If no writable Figma MCP tool is available, stop and explain that this branch requires writable Figma access.

Workflow:

1. Read the selected direction's handoff and approved `solutions.html`, plus `profileDir/design-system/tokens.css`, `profileDir/design-system/components.css`, and the closest production templates in `profileDir/screens/`.
2. Parse the target Figma URL and verify the target page/node is writable.
3. Search the product's component library and the target file for existing components before drawing. The profile's Figma section lists which components to prioritize; when it names none, search by the class names used in the approved HTML.
4. Keep a mapping table: brainstorm element -> searched/preferred Figma component -> component instance used or primitive fallback -> fallback reason.
5. Create one editable frame for the selected brainstorm direction, at the page width the profile's tokens declare. Preserve copy, amounts, agreement text, hierarchy, and the direction name exactly.
6. Use component instances first; use primitives only for missing components. Avoid flattening screens into screenshots.
7. Screenshot the created Figma frames when the tool supports it, compare to the brainstorm source, fix obvious mismatches, then report the Figma link, created frames, fallback rows, MCP mode, and font limitation if any.
