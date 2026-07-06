# WLD Design Plugin

## What This Is

An AI agent plugin bundle for WLD (微粒贷) design work. It contains WLD design skills, shared WLD design assets, generated provider manifests, and bundled product knowledge snapshots.

The available skills are:

- **`wld-design:brainstorm`** — Full design workflow: clarify idea → 3 solution options → build screens with live server.
- **`wld-design:prototype`** — Approved design → high-fidelity WeChat Mini Program demo using the WLD design system and bundled Mini Program template.
- **`wld-design:push-to-figma`** — Approved brainstorm design → editable Figma frames on a user-provided page.
- **`wld-design:simplify`** — Design cleanup pass: strips clutter, shortens text, merges redundant elements.
- **`wld-design:find-missing-states`** — Coverage diff for redesigns: compare Figma frames against bundled `state_machine` specs and common pitfalls.
- **`wld-design:fix-details`** — Detail-correctness pass on a screen or flow: loan numbers, UX copy, intra-screen conflicts, and cross-screen consistency.
- **`wld-design:beyblade-battle`** — Fun demo: turn 2-7 Figma screens into screenshot-skinned spinning beyblades that fight in a local arena.

## Iron Laws

- **The bundle is self-contained.** Do not add public source-control URLs, remote marketplace registration commands, or instructions that require fetching extra source code.
- **Use Chinese for user-facing copy.** This applies to `README.md`, `site/`, install instructions, and public-facing docs.
- **Do not hand-edit generated provider packages.** Edit canonical source, then run `npm run build`.
- **Treat product knowledge snapshots as read-only.** Do not hand-edit `plugins/wld-design/assets/pm-memory-cache/` or `plugins/wld-design/assets/pm-spec-cache/` unless explicitly preparing a refreshed local package.
- **`AGENTS.local.md` prevails.** If local instructions contradict this file, follow `AGENTS.local.md`.

## Architecture

```text
wld-design-plugin/
├─ .claude-plugin/              ← generated Claude-compatible plugin directory
├─ .opencode/                   ← generated opencode-compatible plugin directory
├─ .agents/                     ← generated Codex local marketplace config
├─ plugins/
│  ├─ wld-design/
│  │  ├─ .codex-plugin/         ← generated Codex-compatible plugin directory
│  │  ├─ .cursor-plugin/        ← generated Cursor-compatible plugin directory
│  │  ├─ assets/                ← design system + bundled product knowledge
│  │  │  ├─ tokens.css, components.css, mockup-chrome.css, phone-mockup.css
│  │  │  ├─ snippets/
│  │  │  ├─ screens/
│  │  │  ├─ pm-memory-cache/
│  │  │  ├─ pm-spec-cache/
│  │  │  ├─ product-memory.md
│  │  ├─ skills/                ← canonical skill source
│  │  │  ├─ brainstorm/
│  │  │  ├─ prototype/
│  │  │  ├─ push-to-figma/
│  │  │  ├─ simplify/
│  │  │  ├─ find-missing-states/
│  │  │  ├─ fix-details/
│  │  │  ├─ beyblade-battle/
├─ scripts/
│  ├─ build-plugin.mjs
│  ├─ validate-plugin.mjs
```

`plugins/wld-design/skills/` and `plugins/wld-design/assets/` are canonical source. Run `npm run build` after editing them. Never hand-edit generated files under `.claude-plugin/`, `plugins/wld-design/.codex-plugin/`, `plugins/wld-design/.cursor-plugin/`, `.cursor-plugin/`, `.agents/`, or `.opencode/`.

## Scripts

- `npm run build` — regenerates provider packages from `plugins/wld-design/skills/` and `plugins/wld-design/assets/`.
- `npm run validate` — validates manifests, skills, design docs, bundled product knowledge headers, provider packages, and doc wording rules.
- `npm test` — runs `npm run build && npm run validate && npm run test:qa-gate`.
- `npm run test:qa-gate` — self-test for the brainstorm QA gate.
- `npm run test:ui-report` — smoke test for the UI-quality benchmark report script.
- `npm run eval` — deterministic skill-routing checks.

Docs-only edits such as `README.md`, `AGENTS.md`, or `CONTRIBUTING.md` usually do not need the full test suite unless they affect validation rules or generated-package assumptions.

## Product Knowledge Snapshots

Two cache directories ship with the plugin:

- `plugins/wld-design/assets/pm-memory-cache/` — product patterns and common pitfalls.
- `plugins/wld-design/assets/pm-spec-cache/` — structured product specs (`index.yaml` + `components/*.yaml`), filtered to `lifecycle_status: active | draft`.

Runtime skills read these snapshots directly. Do not instruct users or agents to fetch another source of product knowledge.

## Design Reference

`plugins/wld-design/assets/DESIGN.md` is the human-friendly design-system summary. It should follow this H2 order. Sections can be omitted, but no other H2 headings should be added.

```markdown
## Overview

## Colors

## Typography

## Elevation

## Components

## Do’s and Don’ts
```
