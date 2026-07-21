# Run notes — me-tab-service (merged-profile)

**PM prompt:** 在"我的"页面加一个在线客服入口，顺便把整体布局优化一下

**Benchmark mode:** no clarifying questions, no server (Step 2 skipped), no browser
screenshot verification. Stopped after Step 5 first screen of the chosen direction.

## Step 1 defaults (in place of clarifying questions)

| Question | Default chosen | Why |
|---|---|---|
| Core user action | Reach 在线客服 from the 我的 tab; secondary: cleaner overall layout | Direct reading of the prompt |
| Screens | One screen — 我的Tab only; the customer-service chat screen itself is out of scope | The request is about the entry, not the conversation |
| Entry behavior | Static entry row/item; no state variants | Screens must be static; no user state named |
| Service availability copy | 人工服务 9:00-21:00 | A sensible, factual availability line; **placeholder — real hours need PM confirmation** |
| Data shown | Everything the production template shows (道明 / 已实名 / 补充信息 / 6 grid features / 专属福利), plus the new entry | "顺便优化布局" ≠ permission to drop production features — nothing was removed, only regrouped |
| Diversity mode | Mixed (default): 2 UX variants + 1 visual variant | Prompt is part-UX (add entry), part-visual (整体布局优化), intent not purely visual |
| Source template | `profile/screens/我的Tab.html` (routing row: Account / profile (我的) tab) | Exact match |
| Non-goals | No tab-bar changes, no new gold CTA, no chat screen | Keep the change scoped to the tab |

## Step 3

- Read `profile/PROFILE.md`, `profile/screens/我的Tab.html` (base template, copied
  including its local `<style>` block), `profile/knowledge/README.md`, `profile/design-system/tokens.css`,
  `profile/design-system/components.css`.
- **Bundled product knowledge:** 我的Tab has no COMP_ID in `profile/knowledge/README.md`'s mapping
  table, so no bundled product rules cover this screen — the design relies on the
  visual template alone (per the filter rule, skipped with this note).

## Step 4 — three solutions (`solutions.html`)

Mixed mode: A and B are UX variants, C is the visual variant.

- **方案 A — 独立客服行 (UX · Task-first):** 在线客服 as its own row card directly
  below the feature grid (chat-bubble icon, 人工服务 9:00-21:00 sub, chevron).
  Layout optimization: 补充信息 merges into the user header card (divider-split),
  cutting the floating-card count. Tradeoff: one extra card of vertical space.
- **方案 B — 帮助与客服分组 (UX · Object-first):** page regrouped into titled
  sections — 常用服务 (grid, 5 items), 帮助与客服 (list card: 在线客服 + 帮助中心,
  moved out of the grid), 专属福利. Tradeoff: 帮助中心 leaves the grid; slightly
  taller page.
- **方案 C — 紧凑网格 (视觉变体 · Compact):** module order identical to production;
  在线客服 joins the grid as the 7th item; grid goes 3→4 columns with tighter
  padding (18→16px) and 28px icons. Everything not named stays as the template
  ships it (visual-mode invariants: chrome, tab bar, copy, data unchanged; this
  screen ships no gold CTA and none was added).

Shared decisions: the new 在线客服 icon is a neutral outline chat bubble
(distinct from 帮助中心's headset); the icon got no gold circle so the template's
single gold accent (补充信息) stays the only gold on screen. All new CSS uses
tokens only (`--wld-divider`, `--wld-theme-500`, spacing vars).

## Passes

- **Simplify:** no removable copy or decoration found to add/keep — the one new
  sub-line (人工服务 9:00-21:00) is functional availability info; 常用服务 section
  title kept in B because titled groups are the hypothesis being tested; all
  production copy, the welfare row, tab bar, and chrome preserved; backgrounds
  and CTA form re-checked against the template (#F5F5F5, no gold CTA, 我的 active).
- **Fix Details:** no loan amounts, rates, or terms on this screen — `calc.mjs`
  skipped (nothing to compute). Numeric copy audit: 领 15 天免息券 is verbatim
  production copy; 9:00-21:00 is the recorded placeholder default. Intra- and
  inter-variant consistency checked: identical user data (道明 / 已实名) and
  welfare copy across all three phones and the flow screen.

## Step 5 — chosen direction

**Chosen: 方案 B (帮助与客服分组)** — recommended because it satisfies both halves
of the prompt: the entry gets a permanent, scannable home next to 帮助中心 (matching
the "I need help" mental model), and the grouping is a genuine layout optimization
rather than a bolt-on. Built as `me-tab.html` (single-phone presentation).

Single screen — no flow overview file needed.

## QA gate

```
node qa-gate.mjs solutions.html me-tab.html
→ 0 error(s), 0 warning(s) across 2 file(s)
```

Manual eyeball checks: preview chrome uses `<preview-chrome variant="home" title="">`
from the template (no hand-built chrome); no custom JS; one gold accent per screen;
product laws (pill radius rule untouched — no buttons restyled; 0.5px dividers;
no urgency copy; no thousands separators; opacity-scale text) hold.

## Files written

- `solutions.html` — 3-phone comparison page
- `me-tab.html` — full screen, chosen direction B
- `NOTES.md` — this file
