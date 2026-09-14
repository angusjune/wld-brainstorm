# Brainstorm Solution Archetypes

The machine-readable catalog is `references/archetypes.json`. This document explains how it
works; the JSON is the source of truth, and `workflow.mjs prepare` reads it directly.

## What an archetype is

An archetype is a named design direction defined by two axes:

- **`focus`** — what dominates the screen: `single-object`, `choice-set`, `record-list`,
  `form`, `narrative`, `hub`
- **`commitment`** — where the primary action sits: `focal`, `inline`, `pinned`, `deferred`

Each archetype also carries `intent` (the hypothesis it tests), `moves` (the structural edits
that produce it), `avoid` (what collapses it into a neighbour), and `requires` (the data
preconditions that make it legal for a given screen).

These two axes are the only ones in the catalog because they are the only ones that separated
the bundled product's 13-screen corpus. Density, grouping and disclosure were measured and did
not discriminate — they survive inside `intent` and `moves` as authoring guidance, not as
dimensions.

## The diversity rule

`prepare` assigns one archetype per option and enforces this before any authoring starts:

- **`focus` must differ for every pair** of `ux` archetypes in the set.
- **`commitment` needs at least two distinct values** across the set, so one option may carry
  its difference on `focus` alone.

The second rule is deliberate slack. A screen whose usable commitment values are
`{inline, pinned, deferred}` has exactly three for exactly three options; without slack the
third option comes out contrived.

A `visual` archetype inherits both axes from the baseline and is exempt from the rule. Visual
options hold structure and vary treatment; the visual-mode invariants in `SKILL.md` govern them.

Because that exemption leaves a visual option free to land on the same layout as a ux option,
`validate` measures each rendered screen's layout signature — focal type size and band, primary
action band, surface count, block count — and blocks a visual option matching a ux option on
every field. This is the one check that needs a rendered measurement rather than a declaration.

## The baseline

In `rework`, `prepare` also excludes any archetype whose axes match the template's own, read from
`baselineAxes` in the profile's `workflow-contracts.json`. An option assigned the archetype the
screen already is can only subtract, so it spends a slot on a direction the user can already see.
Exclusion applies to the deterministic default; an explicit `--archetype` may take the baseline
archetype anyway, and the assignment records it under `baselineOverrides`.

## Assignment

`prepare` picks a deterministic default set for the chosen `--diversity-mode`, so a run
reproduces. Pass `--archetype <id>` once per option to choose explicitly; the rule is enforced
either way and a violation fails `prepare` rather than surfacing later.

The assignment is written into the generation contract, rendered into `worker-brief.md`, and
seeded into the caption fragment. Each caption must declare the `archetype` id it was assigned;
`assemble` and `validate` reject a set whose captions drift from the assignment.

## Product archetypes

A profile may extend the catalog with `profileDir/quality/archetypes.json` using the same
schema. Entries merge by id and the profile wins on collision, so a fork can retune a shared
archetype or add product-specific ones without editing shared machinery. A profile must not
redeclare the axis vocabulary — the shared catalog owns it.

Numeric bands are deliberately absent from the shared catalog. A type-scale ratio or a spacing
band only means something against a product's design system, so those belong in a profile.

## Caption Format

UX archetype:

```text
方案 A: Amount-first
Hypothesis: fastest path to borrowing
Tradeoff: less explanation upfront
```

Visual archetype:

```text
方案 A: Premium / spacious
Visual hypothesis: make the amount feel calmer and more trustworthy
What changes: larger whitespace, quieter cards, stronger single CTA
```

Every caption carries its assigned `archetype` id alongside the text, and exactly one caption
in a solutions set carries `recommended: true`.
