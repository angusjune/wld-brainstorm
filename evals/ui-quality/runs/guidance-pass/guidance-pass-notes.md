# guidance-pass run — qualitative findings (vs template-index)

Run date: 2026-07-06 · Skill state: commit `b35b2e3` (CTA placement + visual
invariants + batched questions + separator gate check) · Same 6 prompts, fresh
agents, identical protocol. Compare composites in `compare-template-index/`.

## Verdict

- **Gate: 0 errors / 4 warnings (template-index: 0 / 6)** — and the 4 remaining
  warnings are all production-literal bank colors copied verbatim from
  收银台.html (correct fidelity). Zero separator warnings despite the NEW
  `thousands-separator` check being active this run.
- **Number formats: fixed at the source.** Zero comma-formatted amounts across
  all 12 files (template-index had 「最多可借 ¥60,000」; baseline mixed
  ¥3000/¥8,040.00). Agents explicitly recorded "no thousands separators" in
  their defaults.
- **CTA placement guidance visibly applied.** overdue-flow borrowed 收银台's
  centered-CTA pattern by name; cashier-redesign cited "SKILL.md Step 5's
  explicit 收银台 rule" and placed the CTA in-flow below content.
- **Visual invariants held.** loan-input-visual kept production data, hint copy
  (「输入合法金额」 — template-index had invented replacement copy), and CTA
  form across all three variants; its caption reads "Same flow, data, and CTA
  as production".
- **Traceability stayed 6/6.** No regression from the template-index fix.

## The run caught a documentation bug of ours (best finding)

The loan-input agent flagged a conflict: production-reference.md's Screen 5
sketch and the new invariants example both claimed 输入金额 uses an 84px
circle 下一步 — but the template ships a **full-width gold pill**
(`输入金额.html:140`). The agent correctly kept the template as source of
truth. Both docs corrected in commit `222b140`.

**This reclassifies baseline finding #3:** the "circle→pill swap" observed in
baseline and template-index was template-faithful behavior all along; the
defect was doc drift in production-reference.md (the same failure mode as the
stale template tables — hand-written duplication of what the templates already
encode). The invariants rule earns its keep differently than expected: it made
an agent *check and flag* the inconsistency instead of silently picking a side.

## Still open

- pm-memory coverage: only COMP_WLD_LOAN_AMOUNT exists upstream; 5 of 6 cases
  load zero product rules (raise with maintainers).
- Batched-questions change (Step 1) is not exercised by the headless benchmark;
  measure rounds-to-first-preview in live sessions.
- One composite missing: overdue-flow named its screen `overdue-bill.html`
  this run vs `home-overdue.html` before — cross-run pairing is by filename,
  so flow-screen naming drift breaks pairs. Consider pinning Step 5 first-screen
  filenames per case in the benchmark protocol.
