---
name: brainstorm
description: 用于微粒贷 UI 头脑风暴：生成3个方案、迭代完整流程，并在定稿后继续精简、校验细节、推送 Figma、小程序 Demo 或界面陀螺 battle。Use when exploring or finishing WLD mobile screens.
---

# WLD Design Brainstorm

Design system and interactive finishing workflow for WLD (微粒贷) mobile screens. Users describe ideas, compare 3 solution options in phone mockups, pick a direction, iterate via terminal feedback with live hot-reload preview, then choose whether to keep editing, push to Figma, build a Mini Program prototype, or run a beyblade battle.

Resolve this skill directory as `skillDir`. Every path below is relative to `skillDir`; this directory is self-contained for upload.

**Shared files** (in `assets/`):
- `tokens.css` — All CSS custom properties
- `components.css` — Full CSS for every component
- `mockup-chrome.css` — Presentation-only WeChat status/navbar/capsule chrome
- `phone-mockup.css` — iPhone frame + gallery layout for presentations
- `frame-template.html` — Source for frame styles (auto-injected by the server into every served HTML page). Do NOT copy this file directly.
- `product-memory.md` — Bridge to bundled product knowledge (screen ↔ COMP_ID mapping, filter rules, injection format)
- `snippets/wechat-chrome-home.html`, `snippets/wechat-chrome-inner.html` — Server-expanded preview chrome snippets

**Screen templates** (in `assets/screens/`) — production-accurate HTML from Figma:

| Screen name | File | Description |
|-------------|------|-------------|
| 个人中心 | `个人中心.html` | Home — new user (预估可借 + 借钱 circle button) |
| 个人中心-有借款 | `个人中心-有借款.html` | Home — active loan (总额度, loan details card) |
| 个人中心-双offer | `个人中心-双offer.html` | Home — dual offer cards (前30天0利息 vs 优惠年利率7.2%) |
| 个人中心-单offer | `个人中心-单offer.html` | Home — single offer badge (限1笔 前30天0利息) |
| 输入金额 | `输入金额.html` | Loan amount input (form + options + bottom CTA) |
| 提前还清 | `提前还清.html` | Early repayment (receipt list + checkboxes + action bar) |
| 本期应还 | `本期应还.html` | Current period due (amount summary + receipt list) |
| 收银台 | `收银台.html` | Cashier — repayment method (amount summary + bank card / transfer cards + centered CTA) |
| 借款详情 | `借款详情.html` | Loan details — principal & status header + installments list (no bottom bar) |
| 欢迎页 | `欢迎页.html` | Welcome / first-run landing — value prop + 3 feature icons + primary CTA (white bg) |
| 更换还款卡 | `更换还款卡.html` | Change repayment card — current card selected + alternatives + add new |
| 我的Tab | `我的Tab.html` | Account tab — avatar header, feature grid, welfare row (我的 active, `#F5F5F5` bg) |

This table is checked against `assets/screens/` by `npm run validate` — if a template exists on disk it is listed here.

**When the user mentions a screen by Chinese name** (e.g., "优化个人中心样式"), read the matching file from `assets/screens/` and use it as the base template.

**Figma MCP reference:** when this skill tells you to use Figma MCP tools directly, first read `references/figma-mcp.md`.

**Brainstorm-specific files** (in this directory):
- `server.cjs` — Local Node.js server with SSE hot-reload
- `helper.js` — Browser-side SSE live reload client
- `references/solution-archetypes.md` — UX and visual exploration archetypes for diversifying 3-solution sets
- `references/merged-workflows.md` — Embedded Simplify, Fix Details, Push to Figma, Prototype, and Beyblade Battle branches
- `assets/DESIGN.md` — Colors, typography, buttons, components, layout rules
- `production-reference.md` — Current app screens, structure, and terminology
- **Playwright MCP / Chrome dev tool MCP / browser tool** — Used for screenshot verification when available. If no browser automation tool is available in the current provider, skip verification for that session and tell the user.

---

## Workflow

1. User describes idea
2. **Step 1:** Ask clarifying questions in one message
3. **Step 2:** Start brainstorm server (`node server.cjs`)
4. **Step 3:** Read production templates from `screens/`
5. **Step 4:** Generate 3 solutions, then run Simplify and Fix Details before showing them
6. User picks a direction (or request new options)
7. **Step 5:** Build full flow screens, then run Simplify and Fix Details before showing them
8. **Step 6:** User chooses the next branch:
   - **A. Give feedback** — edit the same HTML file and hot-reload
   - **B. Push to Figma** — draw editable frames in the user's Figma page
   - **C. Prototype** — build a WeChat Mini Program demo from the approved screens
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
  <link rel="stylesheet" href="/assets/tokens.css">
  <link rel="stylesheet" href="/assets/components.css">
  <link rel="stylesheet" href="/assets/mockup-chrome.css">
  <link rel="stylesheet" href="/assets/phone-mockup.css">
</head>
<body>
  <div class="frame-header">
    <h1>WLD Design</h1>
    <div class="frame-status">Live</div>
  </div>

  <div class="frame-main">
    <div id="frame-content">
      <!-- CONTENT GOES HERE -->
    </div>
  </div>

  <div class="frame-indicator">
    <span>Live preview — give feedback in terminal</span>
  </div>
</body>
</html>
```

Asset paths use `/assets/` prefix — the server maps this to the `assets/` directory automatically.

**File naming:** Semantic names: `solutions.html`, `home.html`, `loan-input.html`. Iterations: `home-v2.html`. Never reuse filenames.

---

## Steps

### Step 1: Understand the Idea

Ask all clarifying questions in **one message** — at most 3, each multiple-choice with a marked default:

1. **What is the core user action?** — e.g. "A) Apply for a loan (default), B) Check balance, C) …"
2. **How many screens?** — "A) One screen (default), B) 2-3 step flow, C) Home + detail pages"
3. **What data needs to be shown?** — Amounts, lists, forms, status results?

Skip any question the request already answers; tell the user they can reply "defaults" to proceed. Ask a follow-up in a later message only when an answer opens a genuinely new decision.

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

**Server features:** Serves newest `.html` from `screenDir`, auto-injects helper.js + frame styles, hot-reloads via SSE, serves shared assets at `/assets/*`, auto-shuts down after 30 min idle.

### Step 3: Read Production Templates

**CRITICAL — Do this before writing ANY screen HTML (including solutions).**

Read the closest matching file from `assets/screens/`. Also read `assets/DESIGN.md` for color/typography/component rules.

| Screen type | Read this file |
|-------------|---------------|
| Home / landing | `个人中心.html` (or the -有借款/-双offer/-单offer variant) |
| Amount input / form | `输入金额.html` |
| Repayment / receipt list | `提前还清.html` |
| Due amount / info | `本期应还.html` |
| Pay / repayment method / cashier | `收银台.html` |
| Loan detail / installment list | `借款详情.html` |
| Onboarding / welcome | `欢迎页.html` |
| Bank card management | `更换还款卡.html` |
| Account / profile (我的) tab | `我的Tab.html` |
| Any card/cell layout | Also read `assets/components.css` |

**If no row matches:** list `assets/screens/` and read each file's header comment — every template self-describes its purpose, layout, and background. Only combine sections from multiple templates after confirming no single template covers the screen.

**The rule:** Every screen must be traceable to a production template. Copy and adapt — never invent from scratch. If no single template matches, combine sections from multiple templates.

**WeChat preview chrome:** Use the placeholder from the production template, e.g. `<wld-wechat-chrome variant="home" title="微粒贷"></wld-wechat-chrome>` or `<wld-wechat-chrome variant="inner" title="提前还清借款"></wld-wechat-chrome>`. Do NOT write status bar, navbar, capsule, or back-arrow markup from scratch. The server expands the placeholder from `assets/snippets/`, and `assets/mockup-chrome.css` owns the chrome styles. This chrome is for presentation only, not WLD production code.

**Background colors:** Home screens use `background: #FFFFFF` on `.wld-page` (and white navbar). Inner/detail screens use the default `background: #F5F5F5`. Check the production template you're copying from.

**Screen-specific styles:** Each production template defines its own CSS classes in a `<style>` block at the bottom of the file (e.g., `.wld-rate-bar`, `.wld-home-content`, `.wld-loan-amount`). These are NOT in components.css. When adapting a template, copy these local styles along with the HTML structure.

**Canonical reference:** When production templates use inconsistent patterns (e.g., inline styles vs. classes), prefer the pattern used by the majority. The `个人中心.html` template is the canonical home screen reference.

**Product rules and pitfalls:** After reading the template, read `assets/product-memory.md` to find the screen's COMP_ID. If one exists, load matching entries from `assets/pm-memory-cache/product-patterns.yaml` and `assets/pm-memory-cache/common-pitfalls.yaml` per the bridge file's filter rule, and inject them under the bridge's labelled headers before generating solutions. Patterns describe state splits, hidden product variants, and default-selection rules that the visual template alone does not capture (e.g., 首借/非首借 keyboard CTA differs, 期数 sheet has two independent variants). Pitfalls are must-avoid constraints, not cleanup suggestions. If a rule conflicts with the template, the rule wins — flag the conflict to the user. If no COMP_ID is mapped or the cache file is missing, skip silently. **Do not edit `pm-memory-cache/` during normal use**; it is a bundled product knowledge snapshot.

### Step 4: Generate 3 Design Solutions

Read `references/solution-archetypes.md`, then choose a diversity mode from the user's wording:

| Mode | Use when | Required diversity |
|------|----------|--------------------|
| UX Strategy | New flow, unclear product direction, "best way", "how should this work" | Options differ by journey, information hierarchy, decision model, or state grouping |
| Visual Exploration | user asks for visual possibilities, style directions, "更有设计感", "换个视觉", or the flow is fixed | Options may keep the same structure but vary visual treatment, density, rhythm, emphasis, card treatment, or component styling |
| Mixed (default) | Intent is unclear | Two UX-meaningful variants + one visual-treatment variant |

Unless the user is explicitly exploring visual direction, the options must not differ only by surface styling. In Visual Exploration mode, style variation is allowed, but each option must name the visual hypothesis and stay within WLD rules.

**Visual-mode invariants:** every visual variant keeps, unchanged from the source template: the screen's canonical CTA form exactly as the template ships it (个人中心 uses the 84px gold circle 借钱; 输入金额 uses the full-width gold pill 下一步 — never swap one form for the other), the preview chrome and tab bar, all legal/rate/disclaimer text, and all data values. Each caption's "What changes" names exactly what varies — everything not named stays as the template has it.

Write `solutions.html` to `screenDir` using the Page Template. Inside `#frame-content`, use a `phone-gallery` with 3 phones:

```html
<h2 class="frame-title">3 Design Solutions</h2>
<p class="frame-subtitle">Pick one, or mix elements from multiple</p>

<div class="phone-gallery">
  <div class="phone-slide">
    <div class="phone-mockup">
      <div class="phone-screen">
        <div class="wld-page"><!-- Solution A: adapted from production templates --></div>
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

Caption each solution with its intent:
- UX mode: `Hypothesis` + `Tradeoff`
- Visual mode: `Visual hypothesis` + `What changes`
- Mixed mode: label which options are UX variants and which one is visual

**Required embedded passes:** Read only the Simplify Pass and Fix Details Pass sections from `references/merged-workflows.md`, run Simplify on `solutions.html`, then invoke Fix Details on the simplified file before proceeding. Fix every clear issue in the HTML before user review; if a calculation needs missing loan parameters, leave the value unchanged and note the exact input needed.

Check if the server (the `url` saved from Step 2 — the port may differ from 3210 if it was busy) is still running. If not, start it again.

**Pre-user QA gate:** Before asking the user to open the browser, verify:
- WLD preview chrome uses `<wld-wechat-chrome>`, not hand-built navbar markup
- `mockup-chrome.css` is linked when using `<wld-wechat-chrome>`
- One primary gold CTA per screen
- No overflow, clipped text, or unreadable captions
- Home screens use white background; inner screens use `#F5F5F5`
- No artificial urgency copy (`立即领取`, countdowns, pressure language)
- Required financial/legal text remains if the template has it
- No custom JavaScript unless user explicitly requested interactivity

**Verify screenshot:** Navigate to the saved `url` from Step 2 with Playwright MCP (`mcp__playwright__browser_navigate` + `mcp__playwright__browser_take_screenshot` with `fullPage: true`). Check for:
- Preview chrome renders correctly (88px, capsule button visible)
- All 3 phones visible and properly spaced
- Text readable, no overflow or clipping
- Colors match WLD palette (gold buttons, `#F5F5F5` background)

If issues found, fix the HTML, re-screenshot until clean. Tell user what you fixed before asking them to open.

Tell user to open the saved `url` to compare. Ask which they prefer. Only proceed after user chooses.

### Step 5: Build Flow Screens

For the chosen direction, build each screen as a separate HTML file in `screenDir`. All screens use the same `phone-slide` → `phone-mockup` → `phone-screen` → `wld-page` nesting from Step 4.

**Phone gallery variants:**

| Variant | Wrapper class | Extra markup |
|---------|--------------|-------------|
| Single phone | `<div class="phone-gallery presentation--single">` | One `phone-slide` with its `phone-mockup` (centers the phone) |
| Side-by-side | `<div class="phone-gallery">` | Multiple `phone-slide`s |
| Flow (journey) | `<div class="phone-gallery phone-gallery--flow">` | `<div class="phone-flow-arrow">→</div>` between slides |

**Presentation modifiers:** `presentation--single` (centers one phone), `presentation--dark` (dark bg for screenshots).

**For each screen:**
1. Copy closest matching production template and adapt
2. Write to `screenDir` (e.g., `home.html`, `loan-input.html`)
3. Run the embedded Simplify Pass from `references/merged-workflows.md`
4. Invoke the embedded Fix Details Pass from `references/merged-workflows.md`
5. Run the Pre-user QA gate and copy quality pass
6. **Verify screenshot:** Same as Step 4 — navigate, screenshot, check navbar/layout/text/colors. Fix and inform user of any corrections.
7. Enter the branch loop (Step 6)

**Rules:** Always use phone frame · Chinese caption + English subtitle · Flow arrows between journey screens · Max 3-4 phones per row.

**CTA placement and form follow the source template**, not a default sticky footer: 收银台 and 更换还款卡 center the CTA directly below the content; 个人中心 uses the centered gold circle; 输入金额 uses its full-width pill in the template's own position; only 提前还清 uses a fixed bottom action bar. When content ends high on the screen, the CTA sits right after the content — a CTA pinned to the screen bottom behind an empty region is a defect.

**Copy quality pass:** Use concise Chinese, production terminology from templates, and task-specific CTA labels. Preserve required rate, agreement, repayment, or risk text. Remove fake urgency and generic helper copy like "点击下方按钮".

### Step 6: Choose the Next Branch

Ask the user to choose one of these paths after they have seen the approved screen or flow:

| Choice | Branch | What to do |
|--------|--------|------------|
| A | Feedback | Edit the current HTML in `screenDir`; the browser hot-reloads through SSE. Repeat until the user is satisfied. |
| B | Push to Figma | Use the Push to Figma branch in `references/merged-workflows.md`. Requires the approved brainstorm source and a target Figma page link. |
| C | Prototype | Use the Prototype branch in `references/merged-workflows.md`. Builds a WeChat Mini Program demo from the approved brainstorm output. |
| D | Beyblade battle | Use the Beyblade Battle branch in `references/merged-workflows.md`. Uses 2-7 approved screens or Figma frames as battle entrants. |

**Critical for A:** Always edit the SAME file for iterative changes. Only create new files for new screens.

**Critical for B/C/D:** Load only the selected branch from `references/merged-workflows.md`; do not carry unrelated branch instructions into context. If the required input for that branch is missing, ask for it in one short message and do not substitute a screenshot-only or text-only deliverable unless that branch explicitly allows it.

---

## Design Principles

- **More on writing in design.** Words appear in a design for one reason: to make it easier to understand, and therefore easier to use. They are design material, not decoration. Bring the same intentionality to copy that you would bring to spacing and color. Before writing anything, ask what the design needs to say, and how it can best be said to help the person navigate the experience. If a design is good enough, it is self-explanatory without extra words. Don't add words that aren't 100% necessary
- **Stay in WLD.** Every component uses WLD tokens and patterns.

---

## Workflow Principles

- **One message of questions, not one question per message.** At most 3, batched, each with a default.
- **Multiple choice > open-ended.** "A, B, or C?" not "What do you want?"
- **Show, don't describe.** Build the screen, don't write paragraphs.
- **Always present in phone frames.** Never show bare HTML.
- **Every screen MUST be static.** No animations, no transitions, no interactive JS. Show state changes as separate screens unless asked otherwise.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Inventing layouts from scratch | Always copy from `assets/screens/` templates |
| Calling a generic simplify routine | Use the embedded Simplify Pass in `references/merged-workflows.md` |
| White text on gold buttons | Always `rgba(0,0,0,0.9)` on gold |
| Square buttons | Always pill-shaped (`border-radius: 999px`) |
| Custom/generic navbar | Use the `<wld-wechat-chrome>` placeholder from a production template |
| Writing navbar SVGs from scratch | Never hand-write chrome; the server expands `assets/snippets/` |
| Adding JS interactivity | Screens are static — show states as separate screens |
| Showing bare HTML pages | Always wrap in `.phone-mockup` |
| Calling old standalone WLD skills from Step 4/5 | Use the embedded passes in `references/merged-workflows.md` from this `brainstorm` skill |
| Using `#F5F5F5` on home screens | Home screens use `#FFFFFF` background; only inner pages use `#F5F5F5` |
| Using `font-family: sans-serif` | Use `var(--wld-font-family)` from tokens.css |
| Making quick-amount chips pill-shaped | Quick amount chips use `border-radius: 4px`, NOT `999px` |
| Currency amount at weight 600 | Large amounts use `font-weight: 500`, NOT semibold (600) |
| Adding frame styles manually | Server auto-injects frame styles from frame-template.html — no manual linking or copying needed |
| CTA pinned to screen bottom behind a void | Place the CTA where the source template places it (often centered right after content) |
| Thousands separators in amounts (¥60,000) | Production writes ¥60000 — no commas, consistent across every screen |

---

## Quick Reference

```
Theme: #FFD143 | Text: rgba(0,0,0,0.9)
Bg: #F5F5F5 (inner pages) | #FFFFFF (home screens)
Emphasis: #F7852C | Promo text: #EE8A27 | Info: #5C8EE6 | Danger: #FF5A4F
Font: var(--wld-font-family) | Numbers: var(--wld-font-number) 44px weight 500
Buttons: border-radius 999px | Preview chrome: <wld-wechat-chrome> expands to 88px WeChat navbar
Page: 375x812 | Cards: white, 12px radius
```

**Full design specs:** Read `assets/DESIGN.md` in the package root.
**Production screens & terminology:** Read `production-reference.md` in this directory.
