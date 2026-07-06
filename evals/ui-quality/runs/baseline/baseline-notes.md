# Baseline run — qualitative findings

Run date: 2026-07-03 · Skill state: commit `9ecd1ec` (pre-improvement) ·
Generation: 6 fresh agents, benchmark mode per `evals/ui-quality/README.md`.
Gate numbers in `report.json` / `report.md` (auto-generated — do not edit).

## Headline numbers

- **Gate: 0 errors, 5 warnings across 12 files.** Careful agents produce
  mechanically clean output under the current skill; the gate's error codes
  guard against sloppier executions and feedback-loop drift, while the
  discriminating baseline signal is template fidelity (below).
- **Template traceability: 5/6 cases fully traceable to production templates.
  1/6 (cashier-redesign) missed its exact production template.**

## Template-discovery evidence (weakness W1: stale SKILL.md template tables)

| Case | Right template on disk | Listed in SKILL.md? | Agent found it? |
|------|------------------------|---------------------|-----------------|
| cashier-redesign | 收银台.html | no | **NO — composed from 本期应还 + 提前还清 + 输入金额 + 双offer instead** |
| me-tab-service | 我的Tab.html | no | yes (browsed assets/screens/ on its own) |
| overdue-flow | 收银台.html (for pay step) | no | yes (browsed on its own) |
| loan-input-visual | 输入金额.html | yes | yes |
| home-repay-reminder | 个人中心-有借款.html | yes | yes |
| early-repay-partial | 提前还清.html | yes | yes |

Discovery of unlisted templates is agent-diligence-dependent (2 of 3 got
lucky). Where it failed, the cost is visible in the render:

**cashier-redesign vs production 收银台.html:**
- invented a penguin icon for 转账还款 (production: arrow glyph in a light
  yellow square)
- label 「9月16日应还」 borrowed from 本期应还 (production cashier: 「还款金额」)
- dropped the 「其他银行卡」 row entirely
- CTA pinned to the screen bottom leaving a large void (production: CTA
  centered directly below the method cards)

## Other recurring quality gaps (candidates for skill/gate improvements)

1. **Layout fidelity — bottom bars vs centered CTAs.** 4 of 6 cases pinned
   the primary CTA to the bottom with a large empty void above it, even when
   the source template centers the CTA after content (收银台, 输入金额's
   circle). Screens read as "web page with sticky footer", not WLD.
2. **Canonical element swapped silently in visual mode.** loan-input-visual
   replaced the production 84px gold circle 下一步 with a full-width pill in
   ALL THREE "visual variants" — including the 平静原生 (native) option whose
   whole hypothesis is "closest to production". Visual exploration currently
   has no "what must NOT change" anchor.
3. **Number formatting drifts.** Production writes amounts without thousands
   separators (¥60000, ¥10006.00). Baseline outputs mix ¥8,040.00 / ¥3000 /
   ¥60,000 within the same gallery (early-repay-partial, loan-input-visual).
   Cheap deterministic gate check candidate.
4. **pm-memory coverage is one screen wide.** Only 输入金额 has a COMP_ID, so
   5 of 6 cases loaded zero product rules ("skip silently" per bridge). Not a
   skill bug — an bundled data gap worth surfacing to the maintainers.

## What agents did well (keep; don't regress)

- All screens wrapped in phone mockups with `<wld-wechat-chrome>` placeholders;
  zero hand-built chrome; zero custom JS; zero urgency copy; zero emoji.
- Local `<style>` blocks copied along with template structure (per Step 3).
- Legal/disclaimer text consistently preserved through simplify passes.
- 3-solution diversity was real in all six gallery pages (different decision
  models, not re-skins), with Hypothesis/Tradeoff captions.
