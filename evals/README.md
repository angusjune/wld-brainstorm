# Skill Evaluation Harness

Evaluation-driven skill development for the WLD Design skills. Each skill has a
`<skill>.cases.json` file holding >=3 realistic PM scenarios (mixed Chinese +
English, drawn from the README usage examples and variations of them).

These cases grade **routing** (which skill wins for a prompt). The *output
quality* of brainstorm-generated screens is measured separately by the
UI-quality benchmark in `ui-quality/` — see `ui-quality/README.md`.

Run it:

```bash
npm run eval
# or
node scripts/run-evals.mjs
```

The runner is deterministic and CI-safe: **no LLM calls, no network, no build.**
It exits non-zero if any auto-graded assertion fails.

## Case file shape

```json
[
  {
    "prompt": "realistic user message",
    "expectedSkill": "brainstorm",
    "expectedBehaviors": ["observable behavior the skill SHOULD exhibit", "..."],
    "mustNotTrigger": ["other skill that must NOT win (optional)"]
  }
]
```

## What is auto-graded (deterministic) vs. fixture-only

**Auto-graded by `scripts/run-evals.mjs` (pass/fail, affects exit code):**

1. **JSON shape** — every `*.cases.json` parses, is an array of >=3 cases, and
   each case has a non-empty `prompt`, `expectedSkill`, and `expectedBehaviors`;
   `mustNotTrigger` (if present) is an array of strings.
2. **Skill existence** — `expectedSkill` (and every `mustNotTrigger` entry)
   resolves to a real `plugins/wld-design/skills/<name>/` directory.
3. **Routing / description-collision** — a transparent keyword-overlap scorer
   ranks the SKILL.md frontmatter descriptions against the prompt. The
   `expectedSkill` must be the **unique** top scorer; any `mustNotTrigger` skill
   must score **strictly lower**. Ties at the top fail as ambiguous-routing
   findings.

**NOT auto-graded (fixtures for future runs):**

- `expectedBehaviors` are **not** executed or judged here. The skills are agent
  workflows (they edit HTML, start servers, read Figma via MCP, write Mini
  Program files) — verifying them requires an LLM judge or a human. The runner
  prints them as a labeled `[ ]` checklist marked
  `(manual / LLM-judge - NOT auto-graded)`. They are honest fixtures, not
  pass-faked assertions.

## How the routing scorer works

Tokenize the prompt and each skill's frontmatter `description`: lowercase, strip
punctuation, drop English + common CJK-particle stopwords, split CJK runs into
character bigrams (keeping short whole runs like `小程序`). Each skill scores by
the number of tokens it shares with the prompt, plus a small boost (`+3` each)
for that skill's **distinctive trigger terms** found in the prompt (e.g.
`微信小程序` / `wxml` -> prototype; `push-to-figma` / `editable frames` ->
push-to-figma; `三个方案` / `hot-reload` -> brainstorm; `缺失状态` /
`state machine` -> find-missing-states; `精简` / `too cluttered` -> simplify).
The distinctive boost is what disambiguates the deliberately
overlapping `brainstorm` vs `prototype` cases, since the `brainstorm` description
itself contains the words "prototype" and "demo".

## Deliberately ambiguous cases

`brainstorm` and `prototype` both legitimately mention prototype/demo. At least
one pair of cases leans into that overlap (a brainstorm prompt asking to
"prototype/demo" a WLD feature with browser preview, vs. a prototype prompt
asking to turn an approved design into a WeChat Mini Program demo). They route
correctly **only** via distinctive terms — that is the routing check earning its
keep.

If the current SKILL.md descriptions were ever genuinely un-disambiguable, the
correct response is to report the collision (so the description gets fixed
upstream) rather than to weaken the scorer to hide it. The runner is not allowed
to edit SKILL.md.
