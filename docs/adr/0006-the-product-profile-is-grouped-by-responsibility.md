# The product profile is grouped by responsibility

We organize `brainstorm/profile/` by the responsibility and lifecycle of its contents:

- `screens/` is the production screen corpus and stays at the profile root because it is the primary authoring input and the most frequently read directory.
- `design-system/` owns tokens, reusable component styles, and icons.
- `knowledge/` owns the optional knowledge bridge plus its read-only memory and spec caches.
- `quality/` owns the optional product rule pack, passes, deterministic tools, and product benchmark data.
- `prototype/` remains a top-level product implementation because it is a real, independently replaceable corpus used by the platform Prototype branch.
- `research/` remains isolated working material so experiments cannot be mistaken for runtime instructions.

The root keeps only the profile entry documents and the high-value corpora. This makes fork-day ownership visible without adding configuration or a profile-selection mechanism.

## Rejected alternatives

We rejected keeping every file at the profile root. That layout mixed design assets, read-only snapshots, executable rules, evaluation history, and production templates in one undifferentiated list.

We rejected a generic `implementations/` layer around `prototype/`. There is only one product implementation in the profile today, so that extra seam would be hypothetical rather than useful.

We also rejected merging `tokens.css` and `components.css`. Tokens have independent machine consumers—the QA gate and Mini Program token generator—while component styles are the HTML implementation that consumes them. Their separate interface is real.
