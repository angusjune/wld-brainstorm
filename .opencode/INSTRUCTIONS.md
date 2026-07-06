# WLD Design (opencode)

This generated package adapts the canonical WLD Design skills for opencode. The source of truth lives in the repository root under `plugins/wld-design/skills/` and `plugins/wld-design/assets/`.

## How to Use

When the user asks for WLD mobile UI work, match the request to one of these workflows and read that skill file before acting:

- `wld-design:brainstorm` - Clarify a WLD UI idea, generate three options, then iterate on screens with hot reload.
- `wld-design:prototype` - Build high-fidelity WLD WeChat Mini Program demos from approved Figma or brainstorm designs.
- `wld-design:push-to-figma` - Push approved WLD brainstorm designs into editable Figma frames with local MCP and WLD components.
- `wld-design:simplify` - Strip clutter while preserving WLD product correctness and compliance-critical content.
- `wld-design:find-missing-states` - Compare redesign frames against bundled state_machine specs and common pitfalls.
- `wld-design:fix-details` - Catch detail bugs in a WLD screen or flow: wrong loan numbers, copy errors, and values that contradict each other within or across screens.
- `wld-design:beyblade-battle` - Turn 2–7 Figma screens into spinning beyblades that battle in a local arena until one screen is left.

Resolve any `<opencode-package-root>` references to this package root. Read only the skill and shared files needed for the current task.

## Shared Sources

- `plugins/wld-design/assets/DESIGN.md` - WLD visual system summary.
- `plugins/wld-design/assets/mockup-chrome.css` and `plugins/wld-design/assets/snippets/` - presentation-only WeChat preview chrome.
- `plugins/wld-design/assets/screens/` - production-accurate HTML screen templates.
- `plugins/wld-design/assets/pm-memory-cache/` - bundled product patterns and pitfalls.
- `plugins/wld-design/assets/pm-spec-cache/` - bundled state_machine specs.
- `plugins/wld-design/assets/product-memory.md` - screen to COMP_ID bridge and injection format.
- `plugins/wld-design/assets/figma-mcp.md` - provider-neutral instructions for discovering and using Figma MCP tools.

## Safety

- Treat bundled cache files under `plugins/wld-design/assets/pm-*-cache/` as read-only snapshots unless intentionally preparing a refreshed local package.
- If Figma MCP is unavailable for a Figma-dependent workflow, clearly degrade or stop as the skill instructs.
