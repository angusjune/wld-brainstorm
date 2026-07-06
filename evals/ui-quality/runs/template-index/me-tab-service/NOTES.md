# Benchmark Run Notes — me-tab-service

Task: 在“我的”页面加一个在线客服入口，顺便把整体布局优化一下
Mode: headless benchmark (no clarifying questions, no server, no screenshots)

## Defaults chosen (in place of Step 1 clarifying questions)

1. **Core user action:** Reach 在线客服 (online customer service) from the 我的 tab in one tap. Secondary: keep every existing 我的 tab capability (补充信息, feature grid, 专属福利).
2. **Screen count:** One screen — the 我的 tab itself (option A). The customer-service chat screen is out of scope; the task asks only for the entry point.
3. **Data shown:** Same as production 我的Tab.html — avatar, 用户名 (道明), 已实名 tag, 补充信息 (有助于提升信用), 6-item feature grid, 专属福利 row, 借钱/我的 tab bar — plus the new 在线客服 entry (sub-line: 7×24小时在线).
4. **User state:** Default logged-in, verified (已实名) user, matching the production template. No loan-state variants (the 我的 tab does not vary by loan state in the template).
5. **Diversity mode:** Mixed (default) — the request mixes a UX change (add entry) with an ambiguous "整体布局优化", so intent is unclear → two UX-meaningful variants + one visual-treatment variant, labelled in the captions.
6. **Chosen direction for Step 5 (user pick simulated):** 方案 A 服务直达 — most directly answers "加一个在线客服入口" (top-level, one-tap discoverability) while delivering 布局优化 via card consolidation, with the least disruption to grid muscle memory.
7. **Naming:** 在线客服 (production-adjacent terminology; 帮助中心 already exists and is kept as a separate self-service entry).
8. **Interactivity:** None — static screens per skill rules.

## The 3 solutions (Mixed mode)

- **方案 A 服务直达 (UX):** standalone 在线客服 card directly below a merged profile card (header + 补充信息 combined into one card = the layout optimization). Grid unchanged.
- **方案 B 客服归组 (UX):** new bottom 客服与帮助 group card (在线客服 + 帮助中心 rows); 帮助中心 leaves the grid (grid 3+2). Matches WeChat-native bottom-help placement.
- **方案 C 紧凑四列 (Visual):** identical IA to production; 在线客服 joins the grid as the 7th item; grid goes 3→4 columns with tighter spacing and 24px icons.

## Skill-mandated checks

- **Production templates read:** `assets/screens/我的Tab.html` (base for every phone), plus `assets/DESIGN.md`, `assets/components.css`, `assets/tokens.css`, `assets/phone-mockup.css` structure, `skills/brainstorm/references/solution-archetypes.md`, `skills/brainstorm/production-reference.md`.
- **pm-memory pass:** `assets/product-memory.md` mapping table has no COMP_ID for 我的Tab.html (only 输入金额.html maps to COMP_WLD_LOAN_AMOUNT) → skipped silently per the skill.
- **Background:** kept `#F5F5F5` with `variant="home"` chrome — copied from the production 我的Tab template (template header comment states `Background: #F5F5F5`; the "home screens are white" rule applies to 个人中心 variants, and the production template being copied wins).
- **simplify (applied manually per benchmark mode):**
  - Product Correctness Pass: no COMP_ID → skipped.
  - Merged label+card: profile header + 补充信息 combined into one card (Q5) in A / me-tab.
  - Kept: 已实名 (status), 有助于提升信用 (unique motivation), 7×24小时在线 (unique availability info), 领 15 天免息券 (production welfare copy, no urgency language).
  - Not added: no 温馨提示/boilerplate, no emojis, no decorative backgrounds, no duplicate icons, single-line rows in B's help group (section title carries context).
  - Nothing removed from production content — grid features and welfare row are existing product capabilities (Boundaries: navigation/features stay).
- **Pre-user QA gate:** `<wld-wechat-chrome>` used (no hand-built chrome); all four shared CSS files linked; zero gold CTA buttons (tab page has none — gold appears only in the small production-style icon circles); no overflow expected at 375×812 (A ≈ 700px content, B/C fit within scrollable body); no urgency copy; no custom JS.
- **Screenshot verification:** skipped (benchmark mode — no browser).

## Files written

- `solutions.html` — Step 4 three-solution phone gallery
- `me-tab.html` — Step 5 first screen of chosen direction (方案 A)
- `NOTES.md` — this file
