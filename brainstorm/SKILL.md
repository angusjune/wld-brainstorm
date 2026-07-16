---
name: brainstorm
description: 用于微粒贷 UI 头脑风暴：生成3个方案、迭代完整流程，并在定稿后继续精简、校验细节、推送 Figma、小程序 Demo 或界面陀螺 battle。Use when exploring or finishing WLD mobile screens.
---

# Design Brainstorm

Interactive design and finishing workflow for mobile screens. Users describe ideas, compare solution options in phone mockups, pick a direction, iterate via terminal feedback with live hot-reload preview, then choose whether to keep editing, push to Figma, build a Mini Program prototype, or run a beyblade battle.

Resolve this skill directory as `skillDir`. Every path below is relative to `skillDir`; this directory is self-contained for upload.

**This file is the method — it names no product.** Every product-specific fact (which screens exist, the design laws, the palette, the passes to run) lives in `profile/PROFILE.md`. The bundled profile is WLD (微粒贷); replacing `profile/` is how this skill is pointed at a different product.

**The product profile** (in `profile/`) — everything specific to this product, and the only directory a forking team rewrites:
- `PROFILE.md` — **Read this at Step 3.** Screen table, template routing, product laws, passes, quick reference
- `profile.json` — Machine-readable profile config (platform, page class, paths)
- `tokens.css` — All CSS custom properties (the single source of truth for the palette)
- `components.css` — Full CSS for every component
- `DESIGN.md` — Colors, typography, buttons, components, layout rules
- `screens/` — Production screen templates (the ground truth)
- `product-memory.md` — Bridge to bundled product knowledge (screen ↔ COMP_ID mapping, filter rules, injection format)
- `production-reference.md` — Current app screens, structure, and terminology
- `rules.mjs` — Optional product QA rules loaded by `qa-gate.mjs`

**Platform packs** (in `platforms/`) — the surface's furniture, shared by any product on it. The profile's `platform` field selects exactly one:
- `wechat/` — WeChat Mini Program: status bar, 88px navbar, capsule; contributes the Prototype branch
- `ios/` — iOS: status bar, 44px nav bar, home indicator
- Each pack's `platform.json` declares its chrome stylesheet, its chrome variants, and any branches it contributes.

**Shared machinery** (in `assets/`) — names no product and no platform:
- `reset.css` — The only style rule belonging to no product (auto-injected by the server)
- `phone-mockup.css` — iPhone frame + gallery layout for presentations
- `frame-template.html` — Source for frame styles (auto-injected by the server into every served HTML page). Do NOT copy this file directly.

The profile's screen table lists every production template on disk, and `npm run validate` checks the two against each other in both directions.

**Figma MCP reference:** when this skill tells you to use Figma MCP tools directly, first read `references/figma-mcp.md`.

**Brainstorm-specific files** (in this directory):
- `server.cjs` — Local Node.js server with SSE hot-reload
- `helper.js` — Browser-side SSE live reload client
- `references/solution-archetypes.md` — UX and visual exploration archetypes for diversifying 3-solution sets
- `references/embedded-workflows.md` — Embedded Simplify pass, plus the Push to Figma, Prototype, and Beyblade Battle branches
- **Playwright MCP / Chrome dev tool MCP / browser tool** — Used for screenshot verification when available. If no browser automation tool is available in the current provider, skip verification for that session and tell the user.

---

## Workflow

1. User describes idea
2. **Step 1:** Ask clarifying questions
3. **Step 2:** Start brainstorm server (`node server.cjs`)
4. **Step 3:** Read `profile/PROFILE.md`, then the production templates from `profile/screens/`
5. **Step 4:** Generate multiple solutions (3 by default, if the user didn't specify), then run Simplify and the profile's passes before showing them
6. User picks a direction (or request new options)
7. **Step 5:** Build full flow screens, then run Simplify and the profile's passes before showing them
8. **Step 6:** User chooses the next branch:
   - **A. Give feedback** — edit the same HTML file and hot-reload
   - **B. Push to Figma** — draw editable frames in the user's Figma page
   - **C. Prototype** — a branch the platform pack contributes, if it has one
   - **D. Beyblade battle** — turn selected screens into a local battle arena
9. Continue the chosen branch until its completion criterion is met.

---

## Page Template

**Every HTML file written to `screenDir` MUST use this structure.** Both the 3-solution page and individual screens use the same shell. The server auto-injects frame styles and helper.js — do NOT manually add frame styles or helper scripts.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="/profile/tokens.css">
  <link rel="stylesheet" href="/profile/components.css">
  <link rel="stylesheet" href="/platform/chrome.css">
  <link rel="stylesheet" href="/assets/phone-mockup.css">
</head>
<body>
  <div class="frame-header">
    <h1>Design</h1>
  </div>

  <div class="frame-main">
    <div id="frame-content">
      <!-- CONTENT GOES HERE -->
    </div>
  </div>

</body>
</html>
```

Three URL prefixes, mapped by the server: `/profile/` is the product profile, `/platform/` is the active platform pack, and `/assets/` is shared machinery. Screens name neither the product nor the platform by identity, so swapping either needs no screen edits. The server also injects `reset.css`, the platform's chrome stylesheet, frame styles and `helper.js` — do not link or add those yourself.

**Preview chrome** is always written as `<preview-chrome variant="…" title="…">`. The server expands it using the active platform pack; which variants exist is the pack's business, and the profile documents which to use where.

**File naming:** Semantic names: `solutions.html`, `home.html`, `detail.html`. Iterations: `home-v2.html`. Never reuse filenames.

---

## Steps

### Step 1: Understand the Idea

Interview the user relentlessly about every aspect of the plan until a shared understanding is reached. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer. Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering. 

Examples:

1. **What is the core user action?** — e.g. "A) Complete the primary task (default), B) Check status, C) …"
2. **How many screens?** — "A) One screen (default), B) 2-3 step flow, C) Home + detail pages"
3. **What data needs to be shown?** — Amounts, lists, forms, status results?

**You have enough when you can answer:** What screens? What's on each? What do buttons do?

**Before generating, write a brief snapshot for yourself:**
- Core user action
- Screen(s) and state(s) to show
- Data required on each screen
- Source production template(s)
- Product rules / pitfalls loaded, if any
- Non-goals or constraints from the user

### Step 2: Start the Brainstorm Server

```bash
node "<skill-dir>/server.cjs" \
  --project-dir /path/to/project \
  --port 3210
```

Save `screenDir` and `url` from the JSON response. You will write all screen HTML files to `screenDir` and use `url` for all subsequent API calls. Tell user to open the URL.

**Server features:** Serves newest `.html` from `screenDir`, auto-injects helper.js + reset + frame styles, hot-reloads via SSE, serves shared machinery at `/assets/*` and the product profile at `/profile/*`, auto-shuts down after 30 min idle.

### Step 3: Read Production Templates

**CRITICAL — Do this before writing ANY screen HTML (including solutions).**

**Read `profile/PROFILE.md` now.** It carries this product's screen table, template routing, design laws, preview-chrome placeholder, and passes. Everything in Steps 4–6 assumes you have read it. Also read `profile/DESIGN.md` for colour/typography/component rules.

Then read the closest matching template from `profile/screens/`, using the routing table in the profile.

**If no row matches:** list `profile/screens/` and read each file's header comment — every template self-describes its purpose, layout, and background. Only combine sections from multiple templates after confirming no single template covers the screen.

**The rule:** Every screen must be traceable to a production template. Copy and adapt — never invent from scratch. If no single template matches, combine sections from multiple templates.

**Preview chrome:** Use the placeholder form the profile specifies, taken from the production template. Do NOT write status bar, navbar, capsule, or back-arrow markup from scratch — the server expands the placeholder from the active platform pack, which also owns the chrome styles. This chrome is for presentation only, never production code.

**Screen-specific styles:** Each production template defines its own CSS classes in a `<style>` block at the bottom of the file. These are NOT in `components.css`. When adapting a template, copy these local styles along with the HTML structure.

**Product rules and pitfalls:** Follow the profile's product-knowledge section — it names the bridge file, the filter rule, and the injection format. If a product rule conflicts with a template, the rule wins; flag the conflict to the user. If the profile maps no knowledge for this screen, skip silently.

### Step 4: Generate 3 Design Solutions

Read `references/solution-archetypes.md`, then choose a diversity mode from the user's wording:

| Mode | Use when | Required diversity |
|------|----------|--------------------|
| UX Strategy | New flow, unclear product direction, "best way", "how should this work" | Options differ by journey, information hierarchy, decision model, or state grouping |
| Visual Exploration | user asks for visual possibilities, style directions, "更有设计感", "换个视觉", or the flow is fixed | Options may keep the same structure but vary visual treatment, density, rhythm, emphasis, card treatment, or component styling |
| Mixed (default) | Intent is unclear | Two UX-meaningful variants + one visual-treatment variant |

Unless the user is explicitly exploring visual direction, the options must not differ only by surface styling. In Visual Exploration mode, style variation is allowed, but each option must name the visual hypothesis and stay within the profile's product laws.

**Visual-mode invariants:** every visual variant keeps, unchanged from the source template: the screen's canonical CTA form exactly as the template ships it (the profile lists the canonical form per screen — never swap one form for another), the preview chrome and tab bar, all legal/rate/disclaimer text, and all data values. Each caption's "What changes" names exactly what varies — everything not named stays as the template has it.

Write `solutions.html` to `screenDir` using the Page Template. Inside `#frame-content`, use a `phone-gallery` with 3 phones:

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

`<page-class>` is the page class from `profile/profile.json` (the bundled WLD profile uses `wld-page`).

Caption each solution with its intent:
- UX mode: `Hypothesis` + `Tradeoff`
- Visual mode: `Visual hypothesis` + `What changes`
- Mixed mode: label which options are UX variants and which one is visual

**Required passes:** Read only the Simplify Pass section from `references/embedded-workflows.md` and run it on `solutions.html`. Then run each pass listed in the profile's Passes table, in order, on the simplified file. Fix every clear issue in the HTML before user review. If a pass cannot complete for want of an input, leave the value unchanged and note the exact input needed.

Check if the server (the `url` saved from Step 2 — the port may differ from 3210 if it was busy) is still running. If not, start it again.

**Pre-user QA gate:** Before asking the user to open the browser, first run the automated gate on the generated file(s) and fix every reported error:

```bash
node "<skill-dir>/qa-gate.mjs" "<screenDir>/solutions.html"
```

The gate is deterministic. It always runs universal checks (off-token colours, emoji, custom JS, missing stylesheets), plus this profile's own rules if it ships a `rules.mjs`. Exit code 1 means at least one error — fix the HTML and re-run until it exits 0. Warnings are advisory. Then eyeball the checks the gate cannot automate:
- Preview chrome uses the profile's placeholder, not hand-built navbar markup
- No overflow, clipped text, or unreadable captions
- Every product law in `profile/PROFILE.md` holds
- No custom JavaScript unless user explicitly requested interactivity

**Verify screenshot:** Navigate to the saved `url` from Step 2 with Playwright MCP (`mcp__playwright__browser_navigate` + `mcp__playwright__browser_take_screenshot` with `fullPage: true`). Check for:
- Preview chrome renders correctly (88px, capsule button visible)
- All 3 phones visible and properly spaced
- Text readable, no overflow or clipping
- Colours match the profile's palette and quick reference

If issues found, fix the HTML, re-screenshot until clean. Tell user what you fixed before asking them to open.

Tell user to open the saved `url` to compare. Ask which they prefer. Only proceed after user chooses.

### Step 5: Build Flow Screens

For the chosen direction, build each screen as a separate HTML file in `screenDir`. All screens use the same `phone-slide` → `phone-mockup` → `phone-screen` → page-class nesting from Step 4, where the page class is the one the profile declares.

**Phone gallery variants:**

| Variant | Wrapper class | Extra markup |
|---------|--------------|-------------|
| Single phone | `<div class="phone-gallery presentation--single">` | One `phone-slide` with its `phone-mockup` (centers the phone) |
| Side-by-side | `<div class="phone-gallery">` | Multiple `phone-slide`s |
| Flow (journey) | `<div class="phone-gallery phone-gallery--flow">` | `<div class="phone-flow-arrow">→</div>` between slides |

**Presentation modifiers:** `presentation--single` (centers one phone), `presentation--dark` (dark bg for screenshots).

**File granularity (per-screen vs. flow):** Each screen is its own file (`detail.html`, `confirm.html`) — this is what the user iterates on in the Feedback branch, so one screen per file is the rule. The Flow (journey) variant is **not** a replacement for those files: build one additional presentation page (e.g. `flow.html`) that embeds each screen's `phone-slide` side by side with `phone-flow-arrow` between them, purely to show the journey. So a 2-step flow produces three files: two editable per-screen files plus one flow overview. Do not put flow arrows inside the individual per-screen files.

**For each screen:**
1. Copy closest matching production template and adapt
2. Write to `screenDir` (e.g., `home.html`, `detail.html`)
3. Run the embedded Simplify Pass from `references/embedded-workflows.md`
4. Run each pass in the profile's Passes table, in order
5. Run the Pre-user QA gate and copy quality pass
6. **Verify screenshot:** Same as Step 4 — navigate, screenshot, check navbar/layout/text/colors. Fix and inform user of any corrections.
7. Enter the branch loop (Step 6)

**Rules:** Always use phone frame · Chinese caption + English subtitle · Flow arrows between journey screens · Max 3-4 phones per row.

**CTA placement and form follow the source template**, not a default sticky footer — the profile lists the canonical CTA form per screen. When content ends high on the screen, the CTA sits right after the content; a CTA pinned to the screen bottom behind an empty region is a defect.

**Copy quality pass:** Use concise copy in the product's language, production terminology from templates, and task-specific CTA labels. Preserve any required rate, agreement, repayment, or risk text. Remove fake urgency and generic helper copy.

### Step 6: Choose the Next Branch

Ask the user to choose one of these paths after they have seen the approved screen or flow:

| Choice | Branch | What to do |
|--------|--------|------------|
| A | Feedback | Edit the current HTML in `screenDir`; the browser hot-reloads through SSE. Repeat until the user is satisfied. |
| B | Push to Figma | Use the Push to Figma branch in `references/embedded-workflows.md`. Requires the approved brainstorm source and a target Figma page link. |
| C | Prototype | Only offered when the active platform pack contributes it (`platform.json` → `branches`). Follow the branch doc the pack names — on `wechat` that is `platforms/wechat/branches/prototype.md`, which builds a Mini Program demo. Do not offer this choice when the pack contributes no branches. |
| D | Beyblade battle | Use the Beyblade Battle branch in `references/embedded-workflows.md`. Uses 2-7 approved brainstorm screens as battle entrants. |

**Critical for A:** Always edit the SAME file for iterative changes. Only create new files for new screens.

**Critical for B/C/D:** Load only the selected branch from `references/embedded-workflows.md`; do not carry unrelated branch instructions into context. If the required input for that branch is missing, ask for it in one short message and do not substitute a screenshot-only or text-only deliverable unless that branch explicitly allows it.

---

## Design Principles

- **More on writing in design.** Words appear in a design for one reason: to make it easier to understand, and therefore easier to use. They are design material, not decoration. Bring the same intentionality to copy that you would bring to spacing and color. Before writing anything, ask what the design needs to say, and how it can best be said to help the person navigate the experience. If a design is good enough, it is self-explanatory without extra words. Don't add words that aren't 100% necessary
- **Stay in the design system.** Every component uses the profile's tokens and patterns. Never introduce a colour, radius, or font that isn't in `profile/tokens.css`.

---

## Workflow Principles

- **One question per message, not a batch.** Wait for the answer before asking the next — resolve decisions one at a time.
- **Multiple choice > open-ended.** "A, B, or C?" not "What do you want?" Always give a recommendation.
- **Show, don't describe.** Build the screen, don't write paragraphs.
- **Always present in phone frames.** Never show bare HTML.
- **Every screen MUST be static.** No animations, no transitions, no interactive JS. Show state changes as separate screens unless asked otherwise.

---

## Common Mistakes

Method mistakes. **The profile's product laws are the other half of this table** — read them at Step 3.

| Mistake | Fix |
|---------|-----|
| Inventing layouts from scratch | Always copy from `profile/screens/` templates |
| Not reading `profile/PROFILE.md` before generating | Step 3 is mandatory; every product law lives there |
| Calling a generic simplify routine | Use the embedded Simplify Pass in `references/embedded-workflows.md` |
| Skipping the profile's passes | Steps 4/5 run Simplify **and** every pass the profile declares |
| Custom/generic navbar | Use the preview-chrome placeholder from a production template |
| Writing navbar SVGs from scratch | Never hand-write chrome; the server expands it from the platform pack |
| Adding JS interactivity | Screens are static — show states as separate screens |
| Showing bare HTML pages | Always wrap in `.phone-mockup` |
| Calling old standalone skills from Step 4/5 | Use the embedded passes in `references/embedded-workflows.md` from this `brainstorm` skill |
| Hardcoding a colour, radius, or font | Use a token from `profile/tokens.css` — it is the single source of truth |
| Adding frame styles manually | Server auto-injects frame styles from frame-template.html — no manual linking or copying needed |
| CTA pinned to screen bottom behind a void | Place the CTA where the source template places it (often centered right after content) |
| Editing a product fact in this file | Product facts belong in `profile/`; this file names no product |

---

## Quick Reference

The active product's palette, typography, and chrome are in the Quick reference section of `profile/PROFILE.md`. `profile/tokens.css` is the single source of truth for every value.

**Full design specs:** Read `profile/DESIGN.md`.
**Production screens & terminology:** Read `profile/production-reference.md`.
