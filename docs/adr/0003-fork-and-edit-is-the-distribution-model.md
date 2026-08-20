# Fork-and-edit plus one fixed workspace seam

`brainstorm/` remains a self-contained publishable skill directory. A team may replace its bundled `profile/`, while a project may instead keep custom product material at the one fixed runtime seam: `<projectDir>/wld-design-profile/`.

This is not a multi-profile configuration system. If the workspace directory exists, it is selected even when incomplete and its diagnostics are returned; otherwise runtime uses the bundled `profile/`. An explicit `--use-bundled-profile` bypasses the workspace directory for a run. Runtime never merges the two profiles.

## Considered options

We rejected **generating `SKILL.md` from a method template plus the profile**. It conflicts head-on with "copy the directory and edit whatever you want": a forker who hand-edits a generated file loses the edit, and one who must learn a template pipeline has not had an easier setup. ADR 0002 also requires the skill to run standalone after being copied, so the template would have to ship inside the skill anyway — paying the cost of codegen to solve a problem a forker solves with an editor. `SKILL.md` stays hand-written and product-neutral; the forking team rewrites only `profile/`.

We rejected arbitrary paths, named profiles, registries, and fallback merging. They would turn one visible seam into configuration and make incomplete profiles fail unpredictably.

## Consequences

The skill ships with WLD in the profile slot rather than a neutral demo, because a fork starts from a working example and edits it — an empty slot would make the first run a cliff. This means WLD's production corpus, its bundled PM specs, and a live Figma URL travel with every copy; that exposure was reviewed and accepted as in-scope for this distribution.

The fixed seam is the only runtime selection contract. There is no migration or compatibility layer for older directory names.
