# template-index run — qualitative findings (vs baseline)

Run date: 2026-07-06 · Skill state: commit `faa8af3` (template-index fix) ·
Same 6 prompts, fresh agents, identical benchmark protocol as `runs/baseline`.
Gate numbers in `report.json`; composites in `compare-baseline/` (regenerate via
`--compare`). Single variable changed since baseline: template discovery
(SKILL.md tables completed + browse-the-directory fallback + validator guard).

## Verdict

**Template traceability: 6/6 (baseline: 5/6).** The failure case is fixed:

| Case | Baseline | template-index |
|------|----------|----------------|
| cashier-redesign | missed 收银台.html — composed from 4 other templates | **based all 3 solutions + cashier.html on 收银台.html** (via the new Step 3 row) |
| me-tab-service | found 我的Tab.html by luck (browsed dir) | found via table; template's `#F5F5F5` note overrode the home-white heuristic |
| overdue-flow | found 收银台.html by luck | routed via table; also pulled 借款详情.html for status figures |
| other 3 (listed templates) | traceable | traceable (unchanged) |

Concrete deltas visible in `compare-baseline/cashier-redesign__cashier.html.png`:
production 「还款金额」 label restored (baseline borrowed 「9月16日应还」),
「其他银行卡」 row restored, arrow-glyph transfer icon (baseline invented a
penguin), production amount ¥10006.00, CTA centered below the cards
(baseline pinned it to the bottom behind a void), production-accurate empty
navbar title.

- **Gate: 0 errors / 6 warnings** (baseline 0 / 5). The +1 warning is
  production-literal colors copied verbatim from 收银台.html — a fidelity
  *improvement* showing up as a warning; acceptable.
- Agents in this run also **self-ran qa-gate.mjs** on their output (it now
  ships in the skill directory) — 4 of 6 reported gate results unprompted.

## Unfixed weaknesses persisted (controls behaved as expected)

These were deliberately left out of this change; their recurrence isolates the
template-index fix as the cause of the traceability delta:

1. **Visual-mode canonical-element swap** — loan-input outputs again contain
   zero `wld-btn-circle` (production 输入金额 uses the 84px circle 下一步) in
   both runs. Still needs the "visual-mode invariants" fix.
2. **Thousands-separator drift** — 「最多可借 ¥60,000」 again in
   loan-input-visual (production writes ¥60000). Still needs the qa-gate check.
3. **pm-memory coverage** — 5 of 6 cases still load zero product rules (only
   COMP_WLD_LOAN_AMOUNT exists upstream).
