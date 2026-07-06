# Benchmark Run Notes — me-tab-service

Task (from WLD PM): 在"我的"页面加一个在线客服入口，顺便把整体布局优化一下

Executed per `plugins/wld-design/skills/brainstorm/SKILL.md` in headless benchmark mode
(no clarifying questions, no server, no browser screenshot verification).

## Step 1 defaults (questions the skill would have asked)

1. **Core user action** → A (default): reach 在线客服 within one tap from the 我的 tab.
   The new entry supplements 帮助中心 (FAQ), it does not replace it.
2. **How many screens** → A (default): one screen — the 我的 tab itself.
3. **Data to show** → existing production 我的Tab content unchanged (user 道明/已实名,
   补充信息, 6-item feature grid, 专属福利 row) plus the new 在线客服 entry with a
   service-hours hint. "9:00-21:00 人工在线" is mock data (no product source available).
4. **Diversity mode** → Mixed (default): the request combines a UX/IA question (where the
   service entry lives) with an ambiguous "布局优化" — so 2 UX variants + 1 visual variant.
5. **Direction chosen after Step 4** (no user available to pick) → 方案 B (独立客服行):
   least destructive — keeps all 6 grid features and grid muscle memory, adds a dedicated
   在线客服 row below the grid, and delivers the layout optimization by merging 补充信息
   into the header card (4 stacked cards → 3).
6. **Background / chrome** → kept `#F5F5F5` page background and
   `<wld-wechat-chrome variant="home" title="">` exactly as the production 我的Tab template
   (this tab is not a 个人中心 home screen, so the white-home rule does not apply).
7. **No new tab-bar items, no changes to the 借钱 home, no interactivity** (screens static).

## Step 1 snapshot

- Core user action: open online customer service from 我的 tab
- Screen/state: 我的 tab, default state only
- Data: production template data + 在线客服 row (title + hours hint)
- Source production template: `plugins/wld-design/assets/screens/我的Tab.html`
- Product rules/pitfalls: none loaded — 我的Tab has no COMP_ID in
  `assets/product-memory.md`, so the pm-memory pass is skipped per the bridge filter rule
- Non-goals: redesigning other tabs/screens; removing existing features

## Step 4 — three solutions (solutions.html)

- 方案 A 客服进网格 (UX): 在线客服 takes a grid slot; grid reordered by frequency
  (借还记录/优惠券/在线客服 top row); 帮助中心 demoted to a quiet bottom row card.
- 方案 B 独立客服行 (UX, chosen): grid untouched; dedicated 在线客服 row card directly
  below the grid; 补充信息 merged into the header card behind a 0.5px divider.
- 方案 C 原生简化 (Visual): same content/journey as template + service row placed as in B;
  what changes — flat native header (no card), tighter grid padding, quieter section title.

## Simplify pass (wld-design:simplify applied manually)

- Product Correctness Pass: skipped (no COMP_ID mapped for 我的Tab).
- Q1–Q5 sweep: no decorations added; no boilerplate ("请…"/"温馨提示") anywhere; new copy
  limited to "在线客服" + "9:00-21:00 人工在线" (informative, ≤15 chars); A's demoted
  帮助中心 row is title-only (no redundant sub); B merges header + 补充信息 into one card
  (label/value merge at card level); no emojis; production welfare copy kept verbatim
  ("领 15 天免息券" — production text, not urgency language).
- Kept both 帮助中心 and 在线客服 (distinct functions: FAQ vs human chat); flagged as the
  named tradeoff in captions rather than silently merging.

## Pre-user QA gate

- Mechanical gate: `node plugins/wld-design/skills/brainstorm/qa-gate.mjs` →
  0 errors, 0 warnings on both files.
- Manual checks: `<wld-wechat-chrome>` placeholder used (no hand-built chrome);
  mockup-chrome.css linked; zero gold CTAs (matches production 我的Tab — only gold accent
  is the 补充信息 icon dot); inner bg `#F5F5F5`; no urgency copy; no custom JS; estimated
  content height ~630–700px < 812px screen (no overflow).
- Screenshot verification: skipped (benchmark mode — no browser).

## Files written

- `solutions.html` — Step 4 three-solution phone gallery
- `me-tab.html` — Step 5 first screen of chosen direction 方案 B
- `NOTES.md` — this file

Stopped after Step 5 first screen per benchmark instructions (no feedback loop).
