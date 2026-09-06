---
name: brainstorm
description: 用于基于当前产品档案进行移动端 UI 头脑风暴：生成并比较3个方案、迭代反馈，并将选定方向交给档案声明的后续分支。Use when exploring mobile UI directions with the active workspace or bundled product profile.
---

# Design Brainstorm

Interactive design exploration for mobile screens. Users describe an idea, compare three directions in phone mockups, iterate with live feedback, then choose a direction for a profile-declared follow-up branch.

Resolve this skill directory as `skillDir` and the current project root as `projectDir`. The preview server selects `projectDir/wld-design-profile` whenever that directory exists, even when incomplete; otherwise it selects `skillDir/profile`. Save the selected `profileDir` and its diagnostics from the server response. Paths named with the profileDir prefix are under the selected profile; all other relative paths are under `skillDir`.

**This file is the method — it names no product.** Every product-specific fact (which screens exist, the design laws, the palette, the passes to run) lives in the selected profile. Use `$setup-profile` to create `projectDir/wld-design-profile` or add production templates without editing the installed plugin.

**The product profile** (in `profileDir`) — everything specific to this product:
- `PROFILE.md` — **Read this at Step 3.** Its frontmatter is the machine-readable profile config (product, platform, page class, token prefix); its body carries the screen table, template routing, design language, product laws, passes, and quick reference
- `screens/` — Production screen templates (the ground truth)
- `design-system/` — `tokens.css` (the single source of truth), `components.css`, and profile icons
- `quality/` — Product generation contracts, rules, passes, and deterministic tools
- `branches/` — Optional product-owned Step 5 branch documents declared by the profile's Branches table

**Platform packs** (in `platforms/`) — the surface's furniture, shared by any product on it. The profile's `platform` field selects exactly one named directory. Each pack contains a single `chrome.html`: one style block plus the nav markup the server stamps into each `<preview-chrome>` tag. Only the selected pack defines its variant vocabulary.

**Shared machinery**:
- `assets/page-template.html` — Canonical scaffold used by deterministic assembly. Agents never copy or edit it.
- `assets/frame.css` — Preview-only reset, frame, phone mockup, and gallery styles. The server links it automatically; generated files never copy or link it.
- `assets/live-reload.js` — Browser-side SSE client auto-injected by the preview server.
- `assets/annotate.js` — Browser-side click-to-annotate client auto-injected by the preview server.
- `scripts/serve-preview.cjs` — Local preview server with SSE hot reload.
- `scripts/workflow.mjs` — Prepares exact context and editable fragments, assembles canonical pages, enforces the terminal/browser contract, and writes usage reports.
- `scripts/run-qa-gate.mjs` — Deterministic universal checks plus optional product rules.

The profile's screen table lists every production template on disk, and `npm run validate` checks the two against each other in both directions.

**Brainstorm-specific references**:
- `references/solution-archetypes.md` — UX and visual exploration archetypes for diversifying 3-solution sets
- `references/design-review.md` — Read during the finishing cycle to critique rendered composition, component craft, and the usefulness of the set

---

## Deterministic Generation Contract

Every brainstorm comparison belongs to one named workflow stage. Prepare it before authoring anything:

```bash
node "<skill-dir>/scripts/workflow.mjs" prepare \
  --run-dir "<runDir>" \
  --stage "<lowercase-kebab-stage>" \
  --kind solutions \
  --approach "<rework|compose>" \
  [--brand-mode "<preserve|explore>"] \
  [--template "<production-template.html>"] \
  --output "solutions.html:3"
```

For a solutions stage, choose the approach explicitly:

- `rework` when the requested screen already exists in production and the task is to improve, simplify, or reprioritize it. `prepare` copies its DOM into three editable variant roots and keeps the production base CSS read-only. The worker may reorder, regroup, merge, or introduce components in each screen plus write additive scoped CSS and captions. The profile contract declares brand identity anchors and meaningful diversity anchors without freezing their implementation.
- `compose` when the requested page or state does not exist in production. If a useful analogue exists, pass it with `--template`; `prepare` creates editable page-root scaffolds and supplies that declared context. If no production screen is a meaningful analogue, omit `--template`; `prepare` supplies the selected profile, design system, and solution archetypes without pretending an unrelated screen is the source. The worker composes new DOM in the product's language and mechanics.

For `rework`, choose one brand mode:

- `preserve` is the default. Keep every profile-declared brand identity anchor, required asset, and required text, but freely change its layout, typography, spacing, shape, modifier classes, and scoped styling. Use resolvable profile CSS variables for colors.
- `explore` only when the user explicitly asks to explore or change brand identity, palette, or art direction. Keep identity anchors and required product content, but allow new color treatments. The parent must judge brand coherence and contrast from the validation screenshot before showing the work.

`prepare` deterministically writes a generation contract, a self-contained `worker-brief.md`, a role-labeled context manifest, screen fragments, captions, base styles, and editable styles under `state/workflow/stages/<stage>/fragments/`. The returned `workerBriefFile` is the worker's entry point. Both approaches include the profile's design language, design system, and solution archetypes. Authoritative files carry task facts and product/design laws; production templates outside the primary source are read-only design references.

Run each authoring stage in a fresh context. Dispatch a worker with the user's stage-local intent and `workerBriefFile`; the worker reads that brief, then only the files it names. The brief exposes the active profile's complete screen corpus so the worker can borrow, combine, and adapt proven app patterns without treating reference-screen content as task requirements. The worker must not read this `SKILL.md`, the parent transcript, another stage, assembled reference HTML, or undeclared profile material.

The authoring worker makes one coherent edit pass, runs no commands, and emits no progress narration. The parent owns user interaction, stage preparation, profile passes, assembly, validation, repair, reporting, selection, and handoffs.

Edit only the files named editable by `worker-brief.md`. Each screen fragment owns exactly one profile `pageClass` root and must never contain gallery, phone, or caption wrappers; assembly owns those boundaries. Caption JSON is plain text plus an optional boolean `recommended`; style fragments are CSS only. Never edit `screenDir/*.html`, `assets/page-template.html`, production `.base.css`, or generation/context contracts. The parent is the only actor that assembles. Assembly is the only writer of `screenDir/*.html`; it verifies all selected sources are unchanged and injects the fragments into the canonical page scaffold. Direct screen edits are drift and validation blocks them.

**Finishing cycle:** Once a stage's editable fragments are ready, the parent reads only the pass documents declared in the active profile's Passes table and applies them to the fragments in table order. Then assemble and run the terminal contract:

```bash
node "<skill-dir>/scripts/workflow.mjs" assemble --run-dir "<runDir>" --stage "<stage>"
node "<skill-dir>/scripts/workflow.mjs" validate --run-dir "<runDir>" --stage "<stage>"
```

Before validation, ensure the preview server is still running at the saved `url`; if not, resume the same run as described in Step 2. `validate` checks deterministic assembly, canonical shell, screen counts, per-screen required content/assets, brand identity anchors, unresolved CSS variables, the profile QA gate, rendered counts and dimensions, preview-chrome expansion, horizontal overflow, runtime exceptions, and UTF-8 rendering. DOM composition and landmark order are diagnostics, not measures of design quality. It also captures each output in the stage's `renders/` directory. Browser unavailability is blocking in production; `--allow-browser-unavailable` exists only for nonvisual automated tests.

Read `references/design-review.md` and inspect the rendered set, each whole screen, and important component details. Save the concrete findings in the stage's `design-review.md`. When there are mechanical failures or worthwhile visual improvements, keep the first screenshot as `renders/<output>.before-review.png` and dispatch one fresh revision worker with `workerBriefFile`, the screenshots, and the highest-impact findings. The worker edits the declared fragments; the parent reruns the finishing cycle and checks whether the changes helped. Keep the final screenshots and record remaining limitations. A mechanically valid result may be shown with unresolved aesthetic tradeoffs; avoid repeated polishing without user feedback.

Finish every cycle, passed or blocked, by recording its result:

```bash
node "<skill-dir>/scripts/workflow.mjs" report --run-dir "<runDir>" --stage "<stage>"
```

Show or select only a stage whose validation passed and whose screenshots have been reviewed. After any later fragment change, restart the finishing cycle.

`report` writes context bytes, stage timings, validation status, artifact hashes, and token fields. Interactive token fields are deliberately `null`; exact token counts are recorded only when a `codex exec --json` event file is supplied with `--codex-events`.

After a solutions stage passes and the user chooses a direction, record it for the selected follow-up branch:

```bash
node "<skill-dir>/scripts/workflow.mjs" select \
  --run-dir "<runDir>" \
  --stage solutions \
  --choice <1-based-index>
```

`select` hashes the chosen screen, styles, and caption into a compact typed handoff. Feedback keeps editing the same solutions stage; a profile-declared branch may consume the handoff. Brainstorm does not expand the chosen direction into additional screens or a complete flow.

Three stable URL prefixes are mapped by the server: `/profile/` is the selected product profile, `/platform/` is the active platform pack, and `/assets/` is shared machinery. Switching profiles or platforms requires no URL rewrites, although screen content remains profile-specific. The server injects the platform pack's chrome styles, links `assets/frame.css`, and injects `assets/live-reload.js` plus `assets/annotate.js` — do not link or add those yourself.

**Preview chrome** is always written as `<preview-chrome variant="…" title="…">`. The server expands it using the active platform pack; which variants exist is the pack's business, and the profile documents which to use where.

**Generated-file name:** Use `solutions.html` for the Step 4 comparison page and keep editing that same file's fragments during feedback. A different brainstorm request gets a new run; Brainstorm does not create per-screen or flow deliverables after selection.

---

## Steps

### Step 1: Understand the Idea

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled — the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Each question should be formatted like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree — settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, sources from Internet, etc.), dispatch a sub-agent to find it — don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report — ask the rest of the frontier now. The _decisions_ are the user's — put each to them and wait.

**Step 1 is complete only when** the frontier is empty, the user confirms the shared understanding, and you can answer: What screens? What's on each? What do buttons do? Do not start the server before these conditions hold.

**Before generating, write a brief snapshot for yourself:**
- Core user action
- Screen(s) and state(s) to show
- Data required on each screen
- Non-goals or constraints from the user
- Brand mode: `preserve` unless the user explicitly requested brand-identity exploration
- `runLabel`: lowercase alphanumeric segments in kebab-case, at most 80 characters, identifying the whole brainstorm rather than an individual screen; for example, `account-detail-redesign`

Continue only when `runLabel` matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

### Step 2: Start the Brainstorm Server

```bash
node "<skill-dir>/scripts/serve-preview.cjs" \
  --project-dir /path/to/project \
  --run-label "<runLabel>" \
  --port 3210
```

Each new start with `--run-label` creates `runDir` at `projectDir/wld-design-brainstorms/<YYYYMMDD-HHmmss>-<runLabel>/`; a same-second collision receives `-2`, then `-3`. The returned `screenDir` is `runDir/screens/`; deterministic assembly writes generated HTML there, while `profileDir/screens/` contains production templates. The returned `stateDir` is `runDir/state/` and holds server state plus the workflow contracts, fragments, renders, validation results, and usage reports. Treat it as machine-owned workflow state except for the prepared fragment files.

To recover the same brainstorm after its server stops, resume the saved run explicitly instead of creating another one:

```bash
node "<skill-dir>/scripts/serve-preview.cjs" \
  --project-dir /path/to/project \
  --run-dir "<runDir>" \
  --port 3210
```

`--run-dir` and `--run-label` are mutually exclusive. A resumed server keeps the run's original profile, screens, workflow state, telemetry timeline, page revisions, and annotation sequence, while returning a new `url` and `sessionId` for the server process.

Save `runDir`, `runName`, `runLabel`, `profileDir`, `profileSource`, `profileComplete`, `profileIssues`, `screenDir`, `stateDir`, `telemetryPath`, `annotationsPath`, and `url` from the JSON response. `profileSource` is `workspace` when `projectDir/wld-design-profile` is active and `bundled` otherwise. Use the returned paths rather than reconstructing them, and use `url` for all subsequent API calls. Tell user to open the URL; they can click the button at the bottom-right of the page to annotate an element directly instead of describing it in words.

If `profileComplete` is false, inspect every available workspace-profile file before deciding what the issues mean for this task. Continue with the workspace profile when its existing templates, design assets, rules, and the user's supplied evidence are enough to finish; missing unrelated or optional material is not a blocker. Never borrow missing bundled files silently.

Only if the current task cannot be grounded, generated, validated, or previewed with the available workspace material, stop before producing a design and offer two choices:

1. **Use bundled for this run** — restart the server with `--use-bundled-profile`; do not change the workspace profile.
2. **Fix workspace first** — invoke `$setup-profile`, preserve existing files, and resume after the blocking gaps are repaired.

Explain which exact issue blocks the current task and recommend the choice that best preserves the user's intended customization. A missing file alone is not enough reason to stop.

**Server features:** Serves the newest `.html` from `screenDir`, hot-reloads it through SSE, appends annotations to `annotationsPath`, records session performance events at `telemetryPath`, and auto-shuts down after 30 minutes idle. Telemetry is passive: it observes file writes, automatic QA gate runs, and page reads, not completion of profile passes or visual review. When diagnosing latency, summarize it with `node "<skill-dir>/scripts/report-session-telemetry.mjs" "<stateDir>"` after the session.

### Step 3: Resolve the Generation Grounding

**CRITICAL — Resolve and prepare before editing any fragments.**

When entering the selected profile, read only `profileDir/PROFILE.md` first. It carries the screen table, product laws, pass declarations, and routing needed to decide whether this is a production-screen refinement, an analogous composition, or a genuinely new page. When it is absent or partial, apply the incomplete-profile decision from Step 2; do not broaden profile context speculatively.

Use the routing table to choose one primary template when it is genuinely useful. For a new page with no useful analogue, choose `--approach compose` without `--template`.

**If no row matches:** list only the filenames in `profileDir/screens/`, then read header comments one at a time while a plausible analogue remains. Use the closest template only when its structure or mechanics materially ground the new page. Otherwise stop searching and use template-free `compose`.

**Preview chrome:** Choose the `<preview-chrome>` variant and slots from the production template when present, otherwise from `PROFILE.md`. The server expands this presentation-only placeholder from the active platform pack.

**Screen-specific styles:** With a template, `prepare` extracts its last `<style>` block into the output's `.styles.css` fragment and puts one screen DOM root or placeholder into each `.screen-N.html`. Without a template, it creates empty page-root placeholders and a blank style fragment. Adapt working production classes when present; for a new page, build from profile tokens and components.

Run `workflow.mjs prepare` with `--stage solutions --kind solutions --approach rework|compose --output solutions.html:3` plus the selected template when present. It exposes the profile, design system, template invariants, and every production template to the authoring worker without requiring parent-side context curation. Save the returned `workerBriefFile` for Step 4.

### Step 4: Explore 3 Design Directions

Both approaches include `references/solution-archetypes.md`. The worker uses it to consider several short directions, select three useful alternatives, and decide each screen's composition before detailing components. Choose a diversity mode from the user's wording:

| Mode | Use when | Required diversity |
|------|----------|--------------------|
| UX Strategy | Unclear product direction, "best way", "how should this work" | Options differ by interaction strategy, information hierarchy, decision model, or state grouping |
| Visual Exploration | user asks for visual possibilities, style directions, "更有设计感", "换个视觉", or the interaction model is fixed | Options differ visibly in composition, density, rhythm, emphasis, surface treatment, or component styling. They may share DOM structure. |
| Mixed (default) | Intent is unclear | Two UX-meaningful variants + one visual-treatment variant |

Unless the user is explicitly exploring visual direction, the options must not differ only by surface styling. In Visual Exploration mode, style variation is allowed, but each option must name the visual hypothesis and stay within the profile's product laws.

**Visual-mode invariants:** Preserve the interaction model, required actions and navigation, legal/rate/disclaimer text, and real data. Use the profile to distinguish identity requirements from production styling defaults. Adapt defaults such as grouping, CTA placement, spacing, and shape when permitted by the profile and useful to the direction. Each caption names the meaningful changes.

In `rework`, keep production `.base.css` immutable and edit the seeded screen fragments. Retain prepared content requirements and brand identity anchors; freely regroup composition landmarks. Follow the selected brand mode and write additive rules below `.brainstorm-option-1`, `.brainstorm-option-2`, and `.brainstorm-option-3`. In `compose`, replace the page-root placeholders with intentional alternatives grounded in the profile and useful corpus patterns. In either approach, use the profile's exact `pageClass`, write captions with exactly one `recommended: true`, and leave presentation wrappers to assembly.

Caption each solution with its intent:
- UX mode: `Hypothesis` + `Tradeoff`
- Visual mode: `Visual hypothesis` + `What changes`
- Mixed mode: label which options are UX variants and which one is visual

**Writing direction for the solutions worker:** Words are design material, not decoration. Use only copy that helps someone understand or navigate the experience. Apply these rules during the worker's single coherent edit pass to every screen in `solutions.html`:
1. Treat the prepared template invariants and product laws as must-keep. Reference-screen content is not a constraint unless the user intent or selected template independently requires it.
2. Remove or merge anything that fails these checks:
   - The user does not need it to complete the task.
   - The text says something already obvious from nearby UI.
   - It competes with the one focal action or one focal number.
   - It adds visual noise without improving hierarchy, comprehension, or the profile's intended character.
   - It can merge cleanly with an adjacent label, value, or row.
3. Never remove product rules, legal/compliance text, error states, navigation, selected user data, status indicators, tap targets, or the primary CTA.
4. Re-read the fragments for product requirements and a coherent design language. Use the corpus as precedent for craft, with composition chosen for this task.

**Make it feel real with light interaction.** Where a direction has a natural tap — open a popup, expand an option group, switch a tab, toggle a filter, step a carousel — wire it up so the user can test the idea rather than infer it from a static screen. Prefer pure CSS (`:checked` checkbox/radio hack, `:target` popovers, `<details>`, `@keyframes`), reach for minimal native JS only when CSS falls short. Encouraged, not required: add it when it aids understanding, never as decoration. Keep any motion short and contained inside the phone frame.

Dispatch one fresh solutions worker with the selected mode and the preceding stage-local direction, using the prepared `workerBriefFile` as its only file entry point.

After the worker returns, run the finishing cycle. If it passes after a repair, tell the user what was fixed before asking them to open the preview.

Tell the user to open the saved `url` to compare. Ask which direction they prefer. Only proceed after the user chooses.

### Step 5: Choose the Next Branch

Record the chosen direction with `workflow.mjs select`, then present the available paths in this exact order:

1. **Feedback** — always available. Edit the current stage's fragments, rerun the finishing cycle, and let the browser hot-reload the assembled screen through SSE. Repeat for each new round of user feedback.
2. **Profile branches** — read the optional Branches table in `profileDir/PROFILE.md` and append every declared row in table order. Use the row's Branch value as the display name and its Doc value as the branch document. Resolve a `profile/`-prefixed Doc inside `profileDir`. If the section or table has no rows, append nothing.
Assign display letters (`A`, `B`, `C`, …) to the assembled list only when presenting it. Letters are presentation-local and never part of a branch document's identity. Show the description already available from this method or the profile row's Notes text; do not open any branch workflow document yet.

**Critical for Feedback:** Before acting, read `annotationsPath`. For each file, find the greatest numeric ID in the `through` field of its `consumed` entries; annotations for that file with greater IDs are pending. Capture the last pending ID you actually read for each file. Annotations and typed feedback are the same input and may arrive together in one turn. Apply both directly without restating annotations; hot reload is the confirmation. Always edit the SAME solutions-stage fragments for iterative changes. Start a new run only for a different brainstorm request.

After the finishing cycle passes, acknowledge only the last ID you captured for that file:

```bash
node "<skill-dir>/scripts/acknowledge-annotations.cjs" "<stateDir>" "<screen-file>" "<through-id>"
```

Run it once per edited file that had pending annotations. Never acknowledge an ID that arrived after your read; file writes do not consume annotations automatically.

For per-screen feedback about preview chrome, change only the `variant` or `title` attributes on `<preview-chrome …>` in that screen's content fragment. Never edit `screenDir/*.html`, `platforms/*/chrome.html`, `assets/page-template.html`, or `assets/frame.css` in response to feedback.

**Critical for profile branches:** After the user chooses, load only that branch's document. Do not load unselected branch workflows into context. If the required input for the selected branch is missing, ask for it in one short message and do not substitute a screenshot-only or text-only deliverable unless that branch explicitly allows it.
