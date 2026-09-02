---
name: brainstorm
description: 用于基于当前产品档案进行移动端 UI 头脑风暴：生成3个方案、迭代完整流程，并在定稿后继续精简、校验细节或推送 Figma。Use when exploring or finishing mobile screens with the active workspace or bundled product profile.
---

# Design Brainstorm

Interactive design and finishing workflow for mobile screens. Users describe ideas, compare solution options in phone mockups, pick a direction, iterate via terminal feedback with live hot-reload preview, then choose whether to keep editing or push to Figma.

Resolve this skill directory as `skillDir` and the current project root as `projectDir`. The preview server selects `projectDir/wld-design-profile` whenever that directory exists, even when incomplete; otherwise it selects `skillDir/profile`. Save the selected `profileDir` and its diagnostics from the server response. Paths named with the profileDir prefix are under the selected profile; all other relative paths are under `skillDir`.

**This file is the method — it names no product.** Every product-specific fact (which screens exist, the design laws, the palette, the passes to run) lives in the selected profile. Use `$setup-profile` to create `projectDir/wld-design-profile` or add production templates without editing the installed plugin.

**The product profile** (in `profileDir`) — everything specific to this product:
- `PROFILE.md` — **Read this at Step 3.** Its frontmatter is the machine-readable profile config (product, platform, page class, token prefix); its body carries the screen table, template routing, design language, product laws, passes, and quick reference
- `screens/` — Production screen templates (the ground truth)
- `design-system/` — `tokens.css` (the single source of truth), `components.css`, and profile icons
- `knowledge/` — Optional bundled product-knowledge bridge and read-only caches
- `quality/` — Product generation contracts, rules, passes, and deterministic tools
- `branches/` — Optional product-owned Step 6 branch documents declared by the profile's Branches table

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
- `references/branches/push-to-figma.md` — Shared Push to Figma branch

---

## Workflow

1. User describes idea
2. **Step 1:** Ask clarifying questions
3. **Step 2:** Start brainstorm server (`node scripts/serve-preview.cjs`)
4. **Step 3:** Resolve one primary template when useful, then prepare a named workflow stage with role-labeled authorities and the read-only app screen corpus
5. **Step 4:** Dispatch one isolated worker from the prepared brief to generate multiple solutions (3 by default), then satisfy the validation contract
6. User picks a direction (or request new options)
7. **Step 5:** Record the chosen solution. Promote it deterministically when it already is the final screen; otherwise dispatch one fresh worker per new screen
8. **Step 6:** Assemble the available branches from Feedback, the shared Push to Figma branch, and the profile's Branches table; assign display letters when presenting them
9. Continue the chosen branch until its completion criterion is met.

---

## Deterministic Generation Contract

Every generated screen belongs to one named workflow stage. Prepare the stage before authoring anything:

```bash
node "<skill-dir>/scripts/workflow.mjs" prepare \
  --run-dir "<runDir>" \
  --stage "<lowercase-kebab-stage>" \
  --kind "<solutions|screen|flow>" \
  [--approach "<rework|compose>"] \
  [--brand-mode "<preserve|explore>"] \
  [--template "<production-template.html>"] \
  --output "<screen-file.html>:<expected-phone-count>" \
  [--from-stage "<selected-stage>"]
```

For a solutions stage, choose the approach explicitly:

- `rework` when the requested screen already exists in production and the task is to improve, simplify, or reprioritize it. `prepare` copies its DOM into three editable variant roots and keeps the production base CSS read-only. The worker may reorder, regroup, merge, or introduce components in each screen plus write additive scoped CSS and captions. The profile contract declares brand identity anchors and meaningful diversity anchors without freezing their implementation.
- `compose` when the requested page or state does not exist in production. If a useful analogue exists, pass it with `--template`; `prepare` creates editable page-root scaffolds and supplies that declared context. If no production screen is a meaningful analogue, omit `--template`; `prepare` supplies the selected profile, design system, and solution archetypes without pretending an unrelated screen is the source. The worker composes new DOM in the product's language and mechanics.

For `rework`, choose one brand mode:

- `preserve` is the default. Keep every profile-declared brand identity anchor, required asset, and required text, but freely change its layout, typography, spacing, shape, modifier classes, and scoped styling. Use resolvable profile CSS variables for colors.
- `explore` only when the user explicitly asks to explore or change brand identity, palette, or art direction. Keep identity anchors and required product content, but allow new color treatments. The parent must judge brand coherence and contrast from the validation screenshot before showing the work.

`prepare` deterministically writes a generation contract, a self-contained `worker-brief.md`, a role-labeled context manifest, screen fragments, captions, base styles, and editable styles under `state/workflow/stages/<stage>/fragments/`. The returned `workerBriefFile` is the worker's only entry point. Authoritative files carry task facts and product/design laws; production templates outside the primary source are read-only design references.

Run each authoring stage in a fresh context. Dispatch a worker with the user's stage-local intent and `workerBriefFile`; the worker reads that brief, then only the files it names. The brief exposes the active profile's complete screen corpus so the worker can borrow, combine, and adapt proven app patterns without treating reference-screen content as task requirements. The worker must not read this `SKILL.md`, the parent transcript, another stage, assembled reference HTML, or undeclared profile material. The parent owns user interaction, stage preparation, selection, and handoffs.

The authoring worker makes one coherent edit pass, runs no commands, and emits no progress narration. The parent assembles, validates, reports, and owns user-facing updates. If validation blocks, dispatch at most one fresh repair worker with only the editable fragment paths and the blocking findings. A `rework` repair may edit screen fragments, captions, and variant CSS; its production base CSS stays immutable. Revalidate in the parent; if it still blocks, report the exact findings instead of expanding context or retrying indefinitely.

Edit only the files named editable by `worker-brief.md`. Each screen fragment owns exactly one profile `pageClass` root and must never contain gallery, phone, or caption wrappers; assembly owns those boundaries. Caption JSON is plain text plus an optional boolean `recommended`; style fragments are CSS only. Never edit `screenDir/*.html`, `assets/page-template.html`, production `.base.css`, or generation/context contracts. Assemble after every fragment change:

```bash
node "<skill-dir>/scripts/workflow.mjs" assemble --run-dir "<runDir>" --stage "<stage>"
```

Assembly is the only writer of `screenDir/*.html`. It verifies all selected sources are unchanged and injects the fragments into the canonical page scaffold. Direct screen edits are drift and validation blocks them.

After Simplify and profile passes, run the terminal contract:

```bash
node "<skill-dir>/scripts/workflow.mjs" validate --run-dir "<runDir>" --stage "<stage>"
node "<skill-dir>/scripts/workflow.mjs" report --run-dir "<runDir>" --stage "<stage>"
```

`validate` must return `status: "passed"`. It checks deterministic assembly, canonical shell, screen counts, per-screen required content/assets, diversity, brand identity anchors, unresolved CSS variables, the profile QA gate, real browser expansion/layout/overflow, runtime exceptions, UTF-8 rendering, and screenshots. Browser unavailability is blocking in production; `--allow-browser-unavailable` exists only for nonvisual automated tests. Fix failures in fragments, assemble, and validate again. `report` writes context bytes, stage timings, validation status, artifact hashes, and token fields. Interactive token fields are deliberately `null`; exact token counts are recorded only when a `codex exec --json` event file is supplied with `--codex-events`.

After a solutions stage passes, record the chosen direction before preparing dependent work:

```bash
node "<skill-dir>/scripts/workflow.mjs" select \
  --run-dir "<runDir>" \
  --stage solutions \
  --choice <1-based-index>
```

`select` hashes the chosen screen, styles, and caption into a compact typed handoff. `prepare --from-stage solutions` seeds the next stage from that handoff. When the template is unchanged, its generation context contains only the worker brief; the selected fragment is promoted without another model pass. When another worker must author the next stage, it receives the selected fragment, styles, and caption as authority plus the active app screen corpus as read-only design references—not `solutions.html` or prior transcript.

Three URL prefixes are mapped by the server: `/profile/` is the product profile, `/platform/` is the active platform pack, and `/assets/` is shared machinery. Screens name neither the product nor the platform by identity, so swapping either needs no screen edits. The server also injects the platform pack's chrome styles, links `assets/frame.css`, and injects `assets/live-reload.js` plus `assets/annotate.js` — do not link or add those yourself.

**Preview chrome** is always written as `<preview-chrome variant="…" title="…">`. The server expands it using the active platform pack; which variants exist is the pack's business, and the profile documents which to use where.

**Generated-file names:** Name files in lowercase kebab-case by user-facing purpose:

- `solutions.html` — the Step 4 comparison page
- `<screen-purpose>.html` — one assembled screen, such as `home.html` or `account-detail.html`
- `<screen-purpose>-<state>.html` — a distinct state of that screen, such as `account-detail-error.html`
- `flow.html` — the Step 5 journey overview

Keep editing the same filename during feedback. Create another file only for a different screen, state, or the flow overview.

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

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

**Step 1 is complete when you can answer:** What screens? What's on each? What do buttons do?

**Before generating, write a brief snapshot for yourself:**
- Core user action
- Screen(s) and state(s) to show
- Data required on each screen
- Primary production template, or `none` for a genuinely new page
- Product rules / pitfalls loaded, if any
- Non-goals or constraints from the user
- Brand mode: `preserve` unless the user explicitly requested brand-identity exploration
- `runLabel`: 2–5 lowercase English words in kebab-case that identify this task, such as `account-detail-redesign`

The `runLabel` names the whole brainstorm, not an individual screen. Continue only when it matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

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

**Server features:** Serves newest `.html` from `screenDir`, injects the live-reload and annotation clients, links the preview frame stylesheet, injects the platform pack's chrome styles, hot-reloads via SSE, appends annotations to `annotationsPath`, serves shared machinery at `/assets/*` and the product profile at `/profile/*`, records session performance events at `telemetryPath`, auto-shuts down after 30 min idle. The telemetry is passive; do not add manual checkpoints during generation. It observes file writes, automatic QA gate runs, and page reads—not completion of Simplify, profile passes, or visual review. When diagnosing latency, summarize it with `node "<skill-dir>/scripts/report-session-telemetry.mjs" "<stateDir>"` after the session.

### Step 3: Resolve the Generation Grounding

**CRITICAL — Resolve and prepare before editing any fragments.**

Read only `profileDir/PROFILE.md` first. It carries the screen table, product laws, and routing needed to decide whether this is a production-screen refinement, an analogous composition, or a genuinely new page. When it is absent or partial, apply the incomplete-profile decision from Step 2; do not broaden context speculatively.

Use the routing table to choose one primary template when it is genuinely useful, then run `workflow.mjs prepare` for the current stage. For a new page with no useful analogue, prepare `--approach compose` without `--template`. Dispatch a fresh worker from the returned `workerBriefFile`. If a prepared authority file declares that a product rule overrides a template, the rule wins and the conflict must be flagged to the user.

**If no row matches:** list only the filenames in `profileDir/screens/`, then read header comments one at a time while a plausible analogue remains. Use the closest template only when its structure or mechanics materially ground the new page. Otherwise stop searching and prepare template-free `compose`. `prepare` exposes every production template to the authoring worker as read-only design precedent, so the parent chooses only the primary source; it does not manually curate secondary visual references.

**The rule:** Every screen must be traceable to the selected product profile; an existing production screen is optional. Use `rework` for an existing screen, template-backed `compose` for a useful analogue, and template-free `compose` for a genuinely new page. Do not force an unrelated production screen into the workflow simply to satisfy provenance.

**Preview chrome:** Use the `<preview-chrome>` placeholder form the profile specifies. A production template is the preferred example when present; a new page uses the variant and slots documented by `PROFILE.md`. Do NOT write status bar, navbar, capsule, or back-arrow markup from scratch — the server expands the placeholder from the active platform pack, which also owns the chrome styles. This chrome is for presentation only, never production code.

**Screen-specific styles:** With a template, `prepare` extracts its last `<style>` block into the output's `.styles.css` fragment and puts one screen DOM root or placeholder into each `.screen-N.html`. Without a template, it creates empty page-root placeholders and a blank style fragment. Adapt working production classes when present; for a new page, build from profile tokens and components.

**Product rules and pitfalls:** A template's workflow contract declares exact task-specific `authorityFiles`. If it maps no product knowledge for this screen, skip silently. Screen templates are discovered separately as design references and must not be declared as authorities. The worker reads exactly its brief and named sources; never scan the whole knowledge tree.

### Shared Simplify Pass

Run after every generated `solutions.html` and after every flow screen.

**Completion criterion:** The file keeps all required product facts and legal/rate copy, has one clear primary action per screen, and contains no removable copy, decoration, or duplicate element that does not help the user complete the task.

1. Read the stage's editable fragments, not generated HTML.
2. Treat product constraints already selected into authoritative sources as must-keep. Reference-screen content is not a constraint unless an authority independently requires it. Do not discover additional knowledge during this pass.
3. Remove or merge anything that fails these checks:
   - The user does not need it to complete the task.
   - The text says something already obvious from nearby UI.
   - It competes with the one focal action or one focal number.
   - It is decorative rather than functional.
   - It can merge cleanly with an adjacent label, value, or row.
4. Never remove product rules, legal/compliance text, error states, navigation, selected user data, status indicators, tap targets, or the primary CTA.
5. Re-read the fragments and make sure they still follow the selected grounding: the template's CTA form, background, chrome, and tab bar when one exists; otherwise the profile's product laws and closest declared component patterns. Assemble before running any subsequent pass or validation.

### Step 4: Generate 3 Design Solutions

The `compose` context includes `references/solution-archetypes.md`; the compact `rework` context embeds its diversity and brand-surface contracts. Choose a diversity mode from the user's wording:

| Mode | Use when | Required diversity |
|------|----------|--------------------|
| UX Strategy | New flow, unclear product direction, "best way", "how should this work" | Options differ by journey, information hierarchy, decision model, or state grouping |
| Visual Exploration | user asks for visual possibilities, style directions, "更有设计感", "换个视觉", or the flow is fixed | Options may keep the same structure but vary visual treatment, density, rhythm, emphasis, card treatment, or component styling |
| Mixed (default) | Intent is unclear | Two UX-meaningful variants + one visual-treatment variant |

Unless the user is explicitly exploring visual direction, the options must not differ only by surface styling. In Visual Exploration mode, style variation is allowed, but each option must name the visual hypothesis and stay within the profile's product laws.

**Visual-mode invariants:** every visual variant keeps, unchanged from the source template: the screen's canonical CTA form exactly as the template ships it (the profile lists the canonical form per screen — never swap one form for another), the preview chrome and tab bar, all legal/rate/disclaimer text, and all data values. Each caption's "What changes" names exactly what varies — everything not named stays as the template has it.

Prepare the stage with `--stage solutions --kind solutions --approach rework|compose --output solutions.html:3`, then dispatch one fresh solutions worker from `workerBriefFile`.

In `rework`, keep the production `.base.css` immutable but edit all three seeded screen fragments. Give each option a different decision hierarchy or component composition; do not make palette changes the main source of variety. Keep every profile-declared diversity anchor exactly once and make all three DOM compositions differ. Anchor order is diagnostic evidence, not the prescribed source of variety, so a solution may distinguish itself through regrouping or a new decision component instead of forced section shuffling. Keep each brand identity anchor present while treating its layout and visual implementation as editable. In `preserve` mode, reuse profile CSS variables for colors; every `var()` reference must resolve or include a fallback. In `explore` mode, new color treatments are allowed and require screenshot review for brand coherence and contrast. Write additive rules below `.brainstorm-option-1`, `.brainstorm-option-2`, and `.brainstorm-option-3`, plus captions with exactly one `recommended: true`. In `compose`, replace the prepared page-root placeholders with three intentional alternatives grounded in the closest analogue when present, the authoritative product/design sources, and useful patterns from anywhere in the supplied app screen corpus. Neither approach adds phone/gallery wrappers or normalizes working production classes. Assembly creates this presentation shape:

```html
<h2 class="frame-title">3 Design Solutions</h2>
<p class="frame-subtitle">Pick one, or mix elements from multiple</p>

<div class="phone-gallery">
  <div class="phone-slide">
    <div class="phone-mockup">
      <div class="phone-screen">
        <div class="<page-class>"><!-- Solution A: adapted from production templates --></div>
      </div>
    </div>
    <div class="phone-caption">
      方案 A: Amount-first
      <span class="phone-caption-sub">Hypothesis: fastest path to borrowing · Tradeoff: less explanation upfront</span>
    </div>
  </div>
  <!-- Repeat phone-slide for B and C -->
</div>
```

`<page-class>` is the `pageClass` from `profileDir/PROFILE.md`'s frontmatter. Use that value verbatim.

Caption each solution with its intent:
- UX mode: `Hypothesis` + `Tradeoff`
- Visual mode: `Visual hypothesis` + `What changes`
- Mixed mode: label which options are UX variants and which one is visual

**Where a solution's flow has an obvious tap** (open a popup, expand options, switch a tab), wire it up with light interaction so the user can click through each option and feel the difference — see Design Principles. Pure-CSS patterns first, minimal native JS only if needed.

**Required passes:** Run the Shared Simplify Pass on `compose` and `rework` screen fragments, then run each pass listed in prepared context in order. In `rework`, preserve required values, actions, assets, legal copy, diversity anchors, and brand identity anchors while simplifying. The parent assembles and runs `workflow.mjs validate`; a later editable-fragment change requires another assembly. Allow at most one focused repair, revalidate, then run `workflow.mjs report`.

Check if the server (the `url` saved from Step 2 — the port may differ from 3210 if it was busy) is still running. If not, restart the same run with `--project-dir "<projectDir>" --run-dir "<runDir>"`; do not pass `--run-label` or create another run.

The terminal contract runs the deterministic QA gate automatically. It always applies universal checks and the active profile's optional rules. Warnings do not block; errors do. It also renders each output in Chrome and writes a screenshot under the stage's `renders/` directory. Inspect that returned screenshot for product-law judgments that cannot be automated:
- Preview chrome uses the profile's placeholder, not hand-built navbar markup
- No overflow, clipped text, or unreadable captions
- Every product law in `profileDir/PROFILE.md` holds
- No interactions or motion that break layout, overflow the frame, or drag performance — light interaction (authored `<script>`, CSS transitions/animations) is allowed

Check the validation screenshot for:
- Preview chrome renders correctly (matches the active platform pack's shell)
- All 3 phones visible and properly spaced
- Text readable, no overflow or clipping
- Colours match the profile's palette and quick reference

If issues are found, fix fragments, assemble, and validate until clean. Tell user what you fixed before asking them to open.

Tell user to open the saved `url` to compare. Ask which they prefer. Only proceed after user chooses.

### Step 5: Build Flow Screens

Record the chosen direction with `workflow.mjs select`. If the requested final artifact is the chosen solution's screen and uses the same template, prepare it with `--kind screen`, an output count of `1`, and `--from-stage solutions`, then assemble and validate the seeded fragments without another authoring worker. This deterministic promotion is the default for “finish the recommended direction.”

For a genuinely new screen, prepare one named stage with `--from-stage solutions`; include its closest template only when one exists. Then dispatch a fresh worker from that stage's `workerBriefFile`. The fresh context isolates stage facts and edit ownership while still exposing the app screen corpus as read-only design evidence; never continue authoring a new stage in the solutions worker. All assembled screens use the same `phone-slide` → `phone-mockup` → `phone-screen` → page-class nesting from Step 4.

**Phone gallery variants:**

| Variant | Wrapper class | Extra markup |
|---------|--------------|-------------|
| Single phone | `<div class="phone-gallery presentation--single">` | One `phone-slide` with its `phone-mockup` (centers the phone) |
| Side-by-side | `<div class="phone-gallery">` | Multiple `phone-slide`s |
| Flow (journey) | `<div class="phone-gallery phone-gallery--flow">` | `<div class="phone-flow-arrow">→</div>` between slides |

**Presentation modifiers:** `presentation--single` (centers one phone), `presentation--dark` (dark bg for screenshots).

**File granularity (per-screen vs. flow):** Each screen is its own output (`detail.html`, `confirm.html`) and stage. Select each completed screen stage, then prepare one additional `--kind flow` stage whose output is `flow.html:<phone-count>` and pass each source as `--from-stage`. Its prepared fragments are seeded from the compact selections. A 2-step flow therefore produces three files and three independently validated stages.

**For each screen:**
1. Prepare a stage from the selected handoff and, when useful, the closest production template
2. Dispatch a fresh worker from `workerBriefFile` unless deterministic promotion already completes it
3. Run the Shared Simplify Pass and each declared profile pass on those fragments
4. Assemble and run the terminal contract until it passes
5. Inspect the contract screenshot for navbar, layout, text, colors, and visual quality; fix fragments and revalidate if needed
6. Write the usage report, then enter the branch loop (Step 6)

**Rules:** Always use phone frame · Chinese caption + English subtitle · Flow arrows between journey screens · Max 3-4 phones per row.

**CTA placement and form follow the source template**, not a default sticky footer — the profile lists the canonical CTA form per screen. When content ends high on the screen, the CTA sits right after the content; a CTA pinned to the screen bottom behind an empty region is a defect.

**Copy quality pass:** Use concise copy in the product's language, production terminology from templates, and task-specific CTA labels. Preserve every required value, agreement, status, compliance statement, and risk disclosure declared by the active profile. Remove fake urgency and generic helper copy.

### Step 6: Choose the Next Branch

After the user has seen the approved screen or flow, assemble the available paths in this exact order:

1. **Feedback** — always available. Edit the current stage's fragments, then assemble and validate; the browser hot-reloads the assembled screen through SSE. Repeat until the user is satisfied.
2. **Push to Figma** — always available. Its branch document is `references/branches/push-to-figma.md`.
3. **Profile branches** — read the optional Branches table in `profileDir/PROFILE.md` and append every declared row in table order. Use the row's Branch value as the display name and its Doc value as the branch document. Resolve a `profile/`-prefixed Doc inside `profileDir`. If the section or table has no rows, append nothing.
Assign display letters (`A`, `B`, `C`, …) to the assembled list only when presenting it. Letters are presentation-local and never part of a branch document's identity. Show the description already available from this method or the profile row's Notes text; do not open any branch workflow document yet.

**Critical for A:** Before acting on feedback, read `annotationsPath`. For each file, find the greatest numeric ID in the `through` field of its `consumed` entries; annotations for that file with greater IDs are pending. Capture the last pending ID you actually read for each file. Annotations and typed feedback are the same input and may arrive together in one turn. Apply both directly without restating annotations; hot reload is the confirmation. Always edit the SAME stage fragments for iterative changes. Only prepare a new stage for a new screen or state.

After the fragments are edited, assembled, and validated, acknowledge only the last ID you captured for that file:

```bash
node "<skill-dir>/scripts/acknowledge-annotations.cjs" "<stateDir>" "<screen-file>" "<through-id>"
```

Run it once per edited file that had pending annotations. Never acknowledge an ID that arrived after your read; file writes do not consume annotations automatically.

For per-screen feedback about preview chrome, change only the `variant` or `title` attributes on `<preview-chrome …>` in that screen's content fragment. Never edit `screenDir/*.html`, `platforms/*/chrome.html`, `assets/page-template.html`, or `assets/frame.css` in response to feedback.

**Critical for non-Feedback branches:** After the user chooses, load only that branch's document. Do not load unselected shared or profile branch workflows into context. If the required input for the selected branch is missing, ask for it in one short message and do not substitute a screenshot-only or text-only deliverable unless that branch explicitly allows it.

---

## Design Principles

- **More on writing in design.** Words appear in a design for one reason: to make it easier to understand, and therefore easier to use. They are design material, not decoration. Bring the same intentionality to copy that you would bring to spacing and color. Before writing anything, ask what the design needs to say, and how it can best be said to help the person navigate the experience. If a design is good enough, it is self-explanatory without extra words. Don't add words that aren't 100% necessary
- **Stay grounded in the design system.** In `preserve` mode, use the profile's tokens and patterns. In explicit `explore` mode, keep identity anchors and product laws while allowing the requested art direction; verify coherence and contrast from the rendered screenshot.
- **Make it feel real with light interaction.** Where a flow has a natural tap — open a popup, expand an option group, switch a tab, toggle a filter, step a carousel — wire it up so the user can click through and feel the journey rather than reading a stack of static screens. Prefer pure CSS (`:checked` checkbox/radio hack, `:target` popovers, `<details>`, `@keyframes`), reach for minimal native JS only when CSS falls short. Encouraged, not required: add it when it aids understanding, never as decoration. Keep any motion short and contained inside the phone frame.

---

## Workflow Principles

- **One question per message, not a batch.** Wait for the answer before asking the next — resolve decisions one at a time.
- **Multiple choice > open-ended.** "A, B, or C?" not "What do you want?" Always give a recommendation.
- **Show, don't describe.** Build the screen, don't write paragraphs.
- **Always present in phone frames.** Never show bare HTML.
- **Encourage light interaction.** Simple UI interactions are welcome and on by default — opening a popup, expanding a section, switching a tab, toggling a state — so the user can feel the flow instead of staring at static screens. Prefer pure-CSS patterns (`:checked` checkbox/radio hack, `:target` popovers, `<details>`, light `@keyframes` transitions); fall back to minimal native JS only when CSS can't express it. This is a recommendation, not a mandate: add interaction when it helps the user understand the flow, not to every element. Keep JS small and self-contained; never ship a dependency.

---

## Common Mistakes

Method mistakes. **The profile's product laws are the other half of this table** — read them at Step 3.

| Mistake | Fix |
|---------|-----|
| Treating a production screen as a hard gate | Use `rework` for an existing screen; otherwise use `compose`, with a useful analogue when available or no template for a genuinely new page |
| Not reading `profileDir/PROFILE.md` before generating | Step 3 is mandatory; every product law lives there |
| Calling a generic simplify routine | Use the Shared Simplify Pass in this method |
| Skipping the profile's passes | Steps 4/5 run Simplify **and** every pass the profile declares |
| Custom/generic navbar | Use the profile-documented `<preview-chrome>` placeholder; copy a production example when one exists |
| Writing navbar SVGs from scratch | Never hand-write chrome; the server expands it from the platform pack |
| Heavy motion or JS that overflows the frame or stalls rendering | Keep interaction light — CSS patterns first, minimal native JS; QA gate flags authored `<script>` only as a warning |
| Showing bare HTML pages | Always wrap in `.phone-mockup` |
| Calling old standalone skills from Step 4/5 | Use the Shared Simplify Pass and the profile-declared passes from this `brainstorm` skill |
| Hard-coding Step 6 letters | Assemble the branch list from shared and profile contributions, then assign letters for that presentation |
| Hardcoding a colour, radius, or font | Use a token from `profileDir/design-system/tokens.css` — it is the single source of truth |
| Freezing a brand surface's implementation | Preserve its declared identity anchors; layout, typography, spacing, shape, modifiers, and scoped styles remain editable |
| Treating brand exploration as normal rework | Use `--brand-mode explore` only for an explicit brand, palette, or art-direction request, then judge the screenshot |
| Referencing an invented CSS variable | Use a declared variable or provide a valid fallback; validation blocks unresolved `var()` references |
| Adding frame styles manually | Server links `assets/frame.css` automatically — no manual linking or copying needed |
| Editing assembled files in `screenDir` | Edit the owning stage's fragments, then assemble and validate |
| Treating the primary template as the worker's only visual vocabulary | Use the role-labeled brief: obey authorities, ground task facts in the primary source, and borrow useful patterns from the supplied read-only app screen corpus |
| Continuing a new stage in the same worker | End the worker at its validation criterion; dispatch the next stage from `workerBriefFile` |
| Passing assembled `solutions.html` forward | Run `select`; hand off the hashed selected fragment, styles, and caption |
| Estimating token use in an interactive run | Leave token fields null; exact counts require a `codex exec --json` event file |
| CTA pinned to screen bottom behind a void | Place the CTA where the source template places it (often centered right after content) |
| Asking which element the user means while annotations are waiting | Read `annotationsPath` first |
| Editing a product fact in this file | Product facts belong in `profileDir`; this file names no product |

---

## Quick Reference

The active product's palette, typography, and chrome are in the Quick reference section of `profileDir/PROFILE.md`. `profileDir/design-system/tokens.css` is the single source of truth for every value.

**Production screens & terminology:** Read `profileDir/PROFILE.md` and the closest matching template in `profileDir/screens/`.
