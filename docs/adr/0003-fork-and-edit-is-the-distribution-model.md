# Fork-and-edit is the distribution model

Another product team adopts this skill by copying `brainstorm/` once and editing it into their own — separate repo, no upstream, no shared configuration. We decided to design for that rather than for runtime parameterization, because nothing needs to be *selected* at runtime when there is exactly one product per copy, forever.

The design goal that follows is legibility on fork day, not abstraction: it must be obvious which files are the forking team's to rewrite, and the rest should be inert and unmentioned. This is why product knowledge is consolidated into one directory (ADR 0004) instead of being made configurable, and why there is no profile-selection mechanism, no active-profile pointer, and no template engine.

## Considered options

We rejected **generating `SKILL.md` from a method template plus the profile**. It conflicts head-on with "copy the directory and edit whatever you want": a forker who hand-edits a generated file loses the edit, and one who must learn a template pipeline has not had an easier setup. ADR 0002 also requires the skill to run standalone after being copied, so the template would have to ship inside the skill anyway — paying the cost of codegen to solve a problem a forker solves with an editor. `SKILL.md` stays hand-written and product-neutral; the forking team rewrites only `profile/`.

We rejected **declarative rules in YAML** for the same reason: a forking team writing product QA rules would rather write JavaScript than learn a DSL we invented. See ADR 0005.

## Consequences

The skill ships with WLD in the profile slot rather than a neutral demo, because a fork starts from a working example and edits it — an empty slot would make the first run a cliff. This means WLD's production corpus, its bundled PM specs, and a live Figma URL travel with every copy; that exposure was reviewed and accepted as in-scope for this distribution.

Because each copy is edited freely and never merges back, nothing here is a compatibility surface. There is no migration path to maintain, no versioned profile schema, and no reason to keep a seam stable for downstream — a forked copy is on its own the moment it is copied.
