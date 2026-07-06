# UI-Quality Benchmark for `brainstorm`

Measures the *output quality* of the brainstorm skill so that any change to
SKILL.md, the templates, or the assets can be shown as a before/after — gate
numbers plus side-by-side renders. (The routing evals in `evals/*.cases.json`
check which skill triggers; this benchmark checks what the skill produces.)

## Layout

```
evals/ui-quality/
├─ prompts.json          ← 6 frozen PM prompts (never edit existing ids; add new ones)
├─ fixtures/             ← known-violation HTML + expected.json (qa-gate self-test)
├─ runs/<version>/       ← one directory per benchmark run
│  ├─ <case-id>/
│  │  ├─ *.html          ← generated screens (committed)
│  │  ├─ *.html.png      ← renders (NOT committed — regenerate from HTML)
│  │  └─ NOTES.md        ← defaults the agent chose in place of clarifying questions
│  ├─ report.json        ← gate numbers per case (committed)
│  ├─ report.md          ← human summary (committed)
│  └─ compare-<other>/   ← side-by-side composites vs another run (NOT committed)
```

`<version>` names the skill state being measured, e.g. `baseline` (current
skill before improvements), then one run per change (`template-index`,
`qa-gate-wired`, …).

## Generation protocol (benchmark mode)

One **fresh agent per case** (no shared context between cases). Each agent gets:

1. The case `prompt` from `prompts.json`, verbatim.
2. This instruction block — nothing else (no hints about templates or assets
   beyond what the skill itself documents):

> Execute the design task by following
> `plugins/wld-design/skills/brainstorm/SKILL.md` exactly, with these
> benchmark-mode deviations (forced by running headless):
> - Do NOT ask clarifying questions. Choose sensible defaults for anything
>   Step 1 would have asked, and record every default in `NOTES.md`.
> - Skip Step 2 (server start) and all browser screenshot verification.
> - Where the skill runs embedded passes, read
>   `plugins/wld-design/skills/brainstorm/references/merged-workflows.md` and
>   apply the Simplify Pass and Fix Details Pass yourself.
> - Write all output HTML files to `evals/ui-quality/runs/<version>/<case-id>/`
>   instead of `screenDir`. Follow the skill's Page Template and file naming.
> - Stop after Step 5 for the first screen of the chosen direction (produce
>   `solutions.html` plus at least one full screen; no feedback loop).

The deviations replace only the *interactive* parts; every design rule in the
skill still applies. Do not coach the agent beyond this block — the benchmark
measures what the skill alone achieves.

## Scoring and comparing

```bash
# Gate numbers + renders for one run
node scripts/ui-quality-report.mjs evals/ui-quality/runs/<version>

# Same, plus [this-run | other-run] composites per shared case file
node scripts/ui-quality-report.mjs evals/ui-quality/runs/<new> --compare evals/ui-quality/runs/baseline
```

Rendering goes through the real `server.cjs` (chrome expansion + frame styles)
into headless Chrome (`CHROME_PATH` or a default install). Without Chrome the
report still carries gate numbers.

**Deterministic:** qa-gate errors/warnings per case (see
`plugins/wld-design/skills/brainstorm/qa-gate.mjs` for codes).
**Judgment:** the side-by-side composites exist for human review — layout
quality, fidelity to production templates, copy tone. Gate numbers catch
mechanical violations; eyes catch taste.

## Harness self-tests

```bash
node scripts/test-qa-gate.mjs           # fixture contract + production calibration
node scripts/test-ui-quality-report.mjs # report/render/composite smoke test
```

The calibration rule: all production templates in
`plugins/wld-design/assets/screens/` must pass the gate with 0 errors.
If the gate flags production, fix the gate (or the template — deliberately),
never the expectation.
