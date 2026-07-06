# Benchmark Run Notes — me-tab-service

Task (from WLD PM): 在"我的"页面加一个在线客服入口，顺便把整体布局优化一下

Executed per `plugins/wld-design/skills/brainstorm/SKILL.md` with headless benchmark-mode
deviations (no clarifying questions, no server, no browser screenshot verification,
simplify applied inline, stop after Step 5 first screen).

## Step 1 defaults (chosen instead of asking)

1. **Core user action** — Reach 在线客服 (online customer service) from the 我的 tab
   when the user has a loan/repayment question. Secondary: keep all existing 我的
   entries reachable (借还记录 / 优惠券 / 更换还款卡 / 微卡 / 开具证明 / 帮助中心 / 福利).
2. **How many screens** — A) One screen. The request touches only the 我的 tab; the
   customer-service conversation itself is a WeChat-native surface and out of scope.
3. **Data shown** — User identity (avatar, 昵称 道明, 已实名 tag), 补充信息 CTA, feature
   entries listed above, 专属福利 row (添加福利小助手 · 领 15 天免息券), new 在线客服 entry,
   tab bar with 我的 active. All content values reused verbatim from the production template.
4. **Specific requirements** — None assumed beyond the two stated: (a) add an
   在线客服 entry, (b) optimize the overall layout. No new marketing content invented;
   no service-hours copy invented (unverifiable).
5. **User state default** — Logged-in, real-name verified user, exactly the state the
   production template `我的Tab.html` shows.
6. **Diversity mode** — Mixed (default): the request combines a UX change (new entry)
   with layout optimization and the PM's intent between UX restructure and visual
   cleanup is unclear → two UX variants + one visual variant.
7. **Chosen direction (no user available)** — 方案 A「服务直达」. Rationale: it delivers
   both halves of the ask (a findable service entry near the top + moderate layout
   optimization) without the riskier full restructure of 方案 B, and with a bigger
   findability win than the conservative 方案 C.

## Step 1 snapshot

- Core user action: open 在线客服 from 我的 tab
- Screen/state: 我的 tab, verified logged-in user, one state
- Data: identity header, 补充信息, service/help entries, feature grid, welfare row, tab bar
- Source production template: `plugins/wld-design/assets/screens/我的Tab.html`
  (canonical home reference `个人中心.html` consulted for pattern-majority rules)
- Product rules loaded: none — `product-memory.md` maps no COMP_ID for `我的Tab.html`,
  so per the bridge filter rule the pm-memory load is skipped silently
- Non-goals: chat screen itself, new promotions, changing tab bar, adding JS

## Template-derived decisions

- Background stays `#F5F5F5`: the production `我的Tab.html` header comment specifies it
  (the "home screens use #FFFFFF" rule applies to 个人中心 variants; the copied template wins).
- WeChat chrome: `<wld-wechat-chrome variant="home" title="">` — copied verbatim from the template.
- Local styles (`.wld-me-*`) copied from the template's `<style>` block; additions kept
  minimal: `.wld-me-divider` (0.5px row divider) and `.wld-me-header--flat` (header row
  inside a merged card).
- New icons follow the template's stroke style (`rgba(0,0,0,0.85)`, 1.4–1.6 stroke):
  在线客服 = chat bubble (the production 帮助中心 headset icon is kept for 帮助中心 to
  avoid two entries sharing one icon meaning). No gold on the new entry — gold stays
  reserved (补充信息 icon is the template's only accent).

## Simplify pass (wld-design:simplify applied inline)

Run on `solutions.html` and `me-tab.html`:

- Removed: `专属福利` section title (single self-explanatory row below it — merged, Q5).
- Kept: `有助于提升信用` sub (tells the user why to supply info — Q2 pass),
  `领 15 天免息券` (factual offer from production, no urgency language),
  已实名 tag, all navigation entries, tab bar (boundaries: navigation must stay).
- Not added: service-hours subtitle, "温馨提示" copy, badges, any decorative art.
- Focal point check: zero gold CTAs on this screen (≤1 rule satisfied); single gold
  accent remains the 补充信息 icon from production.
- No emojis; body copy ≤15 chars per line.
- Product correctness pass: skipped — no COMP_ID mapped for this screen.

## Pre-user QA gate (self-checked; screenshot verification skipped per benchmark mode)

- `<wld-wechat-chrome>` placeholder used, no hand-built chrome ✓
- `mockup-chrome.css` linked ✓
- ≤1 primary gold CTA per screen ✓ (zero)
- Inner-page `#F5F5F5` background per source template ✓
- No urgency copy, no custom JS, no emojis ✓
- Required copy preserved (已实名, 补充信息 rationale, welfare offer) ✓

## Files written

- `NOTES.md` — this file
- `solutions.html` — Step 4, 3-option phone gallery (Mixed mode)
- `me-tab.html` — Step 5, full screen for chosen direction 方案 A
